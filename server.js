const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const { calculateEmissions, getSourceTypes } = require('./lib/emission-factors');
const { generateReport } = require('./lib/report-generator');

const app = express();
const port = process.env.PORT || 3000;

// Trust proxy (Vercel, Render, etc.)
app.set('trust proxy', 1);

// Database connection — works with Supabase, Neon, or any Postgres
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check (with DB connectivity)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected', error: err.message });
  }
});

// Download full specification document
app.get('/download-spec', (req, res) => {
  const specPath = path.join(__dirname, 'GREENLEDGER_SPEC.md');
  if (!fs.existsSync(specPath)) {
    return res.status(404).json({ error: 'Specification file not found' });
  }
  res.type('text/plain').sendFile(specPath);
});

// =============================================
// API routes (registered BEFORE static files)
// =============================================

app.get('/api/emission-factors', (req, res) => {
  res.json({ sourceTypes: getSourceTypes() });
});

// --- Companies ---
app.post('/api/companies', async (req, res) => {
  try {
    const { name, abn, industry, employee_count, financial_year, address, contact_email, contact_name } = req.body;
    if (!name || !financial_year) {
      return res.status(400).json({ error: 'Company name and financial year are required' });
    }
    const result = await pool.query(
      `INSERT INTO companies (name, abn, industry, employee_count, financial_year, address, contact_email, contact_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, abn || null, industry || null, employee_count || null, financial_year, address || null, contact_email || null, contact_name || null]
    );
    res.json({ company: result.rows[0] });
  } catch (err) {
    console.error('Create company error:', err);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    res.json({ companies: result.rows });
  } catch (err) {
    console.error('List companies error:', err);
    res.status(500).json({ error: 'Failed to list companies' });
  }
});

app.get('/api/companies/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    res.json({ company: result.rows[0] });
  } catch (err) {
    console.error('Get company error:', err);
    res.status(500).json({ error: 'Failed to get company' });
  }
});

// --- Emissions Data ---
app.post('/api/companies/:companyId/emissions', async (req, res) => {
  try {
    const { companyId } = req.params;
    const items = Array.isArray(req.body) ? req.body : [req.body];

    const companyCheck = await pool.query('SELECT id FROM companies WHERE id = $1', [companyId]);
    if (companyCheck.rows.length === 0) return res.status(404).json({ error: 'Company not found' });

    const inserted = [];
    for (const item of items) {
      const { category, source_type, description, quantity, unit, period_start, period_end, data_source } = item;
      if (!category || !source_type || !quantity || !unit) {
        return res.status(400).json({ error: 'category, source_type, quantity, and unit are required for each item' });
      }

      const calc = calculateEmissions(category, source_type, parseFloat(quantity));
      const co2e = calc ? calc.co2e_tonnes : (item.co2e_tonnes || null);
      const ef = calc ? calc.emission_factor : (item.emission_factor || null);

      const result = await pool.query(
        `INSERT INTO emissions_data (company_id, category, source_type, description, quantity, unit, emission_factor, co2e_tonnes, period_start, period_end, data_source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [companyId, category, source_type, description || null, quantity, unit, ef, co2e, period_start || null, period_end || null, data_source || 'manual']
      );
      inserted.push(result.rows[0]);
    }
    res.json({ emissions: inserted });
  } catch (err) {
    console.error('Add emissions error:', err);
    res.status(500).json({ error: 'Failed to add emissions data' });
  }
});

app.get('/api/companies/:companyId/emissions', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM emissions_data WHERE company_id = $1 ORDER BY category, source_type',
      [req.params.companyId]
    );
    res.json({ emissions: result.rows });
  } catch (err) {
    console.error('List emissions error:', err);
    res.status(500).json({ error: 'Failed to list emissions' });
  }
});

app.delete('/api/emissions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM emissions_data WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete emission error:', err);
    res.status(500).json({ error: 'Failed to delete emission' });
  }
});

// --- Report Generation ---
app.post('/api/companies/:companyId/reports/generate', async (req, res) => {
  try {
    const { companyId } = req.params;

    const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const company = companyResult.rows[0];

    const emissionsResult = await pool.query(
      'SELECT * FROM emissions_data WHERE company_id = $1 ORDER BY category, source_type',
      [companyId]
    );
    if (emissionsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No emissions data found. Add emissions data before generating a report.' });
    }
    const emissionsData = emissionsResult.rows;

    const totals = emissionsData.reduce((acc, e) => {
      const val = parseFloat(e.co2e_tonnes) || 0;
      if (e.category === 'scope1') acc.scope1 += val;
      else if (e.category === 'scope2') acc.scope2 += val;
      else if (e.category === 'scope3') acc.scope3 += val;
      acc.total += val;
      return acc;
    }, { scope1: 0, scope2: 0, scope3: 0, total: 0 });

    totals.scope1 = Math.round(totals.scope1 * 10000) / 10000;
    totals.scope2 = Math.round(totals.scope2 * 10000) / 10000;
    totals.scope3 = Math.round(totals.scope3 * 10000) / 10000;
    totals.total = Math.round(totals.total * 10000) / 10000;

    const reportInsert = await pool.query(
      `INSERT INTO reports (company_id, title, financial_year, status)
       VALUES ($1, $2, $3, 'generating') RETURNING *`,
      [companyId, `AASB S2 Climate Disclosure — ${company.name}`, company.financial_year]
    );
    const reportId = reportInsert.rows[0].id;

    // Generate synchronously — works in both serverless (Vercel) and traditional servers
    try {
      const result = await generateReport(company, emissionsData, totals);
      await pool.query(
        `UPDATE reports SET
          status = 'completed',
          report_html = $1,
          governance_section = $2,
          strategy_section = $3,
          risk_management_section = $4,
          metrics_targets_section = $5,
          total_scope1 = $6,
          total_scope2 = $7,
          total_scope3 = $8,
          total_emissions = $9,
          generated_at = NOW()
         WHERE id = $10`,
        [result.reportHtml, result.governance, result.strategy, result.riskManagement, result.metricsTargets,
         totals.scope1, totals.scope2, totals.scope3, totals.total, reportId]
      );
      console.log(`Report ${reportId} generated successfully`);
      const completed = await pool.query('SELECT * FROM reports WHERE id = $1', [reportId]);
      res.json({ report: completed.rows[0], message: 'Report generated successfully' });
    } catch (genErr) {
      console.error('Report generation failed:', genErr);
      await pool.query("UPDATE reports SET status = 'failed' WHERE id = $1", [reportId]);
      res.status(500).json({ report: { id: reportId, status: 'failed' }, error: genErr.message });
    }
  } catch (err) {
    console.error('Generate report error:', err);
    res.status(500).json({ error: 'Failed to start report generation' });
  }
});

app.get('/api/companies/:companyId/reports', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, financial_year, status, total_scope1, total_scope2, total_scope3, total_emissions, generated_at, created_at
       FROM reports WHERE company_id = $1 ORDER BY created_at DESC`,
      [req.params.companyId]
    );
    res.json({ reports: result.rows });
  } catch (err) {
    console.error('List reports error:', err);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

app.get('/api/reports/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    res.json({ report: result.rows[0] });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

app.get('/api/reports/:id/html', async (req, res) => {
  try {
    const result = await pool.query('SELECT report_html, status FROM reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    if (result.rows[0].status !== 'completed') return res.status(400).json({ error: 'Report not ready yet' });
    res.type('html').send(result.rows[0].report_html);
  } catch (err) {
    console.error('Get report HTML error:', err);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// =============================================
// Static files & SPA fallback (AFTER API routes)
// =============================================
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.json({ message: 'GreenLedger API' });
  }
});

app.get('/app*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Start server — skipped when running on Vercel (serverless)
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`GreenLedger running on port ${port}`);
  });
}

module.exports = app;
