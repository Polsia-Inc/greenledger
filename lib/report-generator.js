const { chat } = require('./ai');

/**
 * Generates AASB S2 Climate-related Disclosures report sections using AI.
 * AASB S2 requires: Governance, Strategy, Risk Management, Metrics & Targets
 */

async function generateReport(company, emissionsData, totals) {
  const companyContext = buildCompanyContext(company, emissionsData, totals);

  // Generate all four AASB S2 sections
  const [governance, strategy, riskManagement, metricsTargets] = await Promise.all([
    generateGovernanceSection(companyContext),
    generateStrategySection(companyContext),
    generateRiskManagementSection(companyContext),
    generateMetricsTargetsSection(companyContext, totals, emissionsData),
  ]);

  // Build the full HTML report
  const reportHtml = buildReportHtml(company, {
    governance,
    strategy,
    riskManagement,
    metricsTargets,
  }, totals, emissionsData);

  return {
    governance,
    strategy,
    riskManagement,
    metricsTargets,
    reportHtml,
  };
}

function buildCompanyContext(company, emissionsData, totals) {
  const scopeBreakdown = emissionsData.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category].push(`${e.source_type}: ${e.co2e_tonnes} tCO2e (${e.quantity} ${e.unit})`);
    return acc;
  }, {});

  return `
Company: ${company.name}
ABN: ${company.abn || 'Not provided'}
Industry: ${company.industry || 'Not specified'}
Employees: ${company.employee_count || 'Not specified'}
Financial Year: ${company.financial_year}
Location: ${company.address || 'Australia'}

Total Emissions:
- Scope 1 (Direct): ${totals.scope1} tCO2e
- Scope 2 (Electricity): ${totals.scope2} tCO2e
- Scope 3 (Value Chain): ${totals.scope3} tCO2e
- Total: ${totals.total} tCO2e

Emission Sources:
${Object.entries(scopeBreakdown).map(([cat, items]) =>
    `${cat.toUpperCase()}:\n${items.map(i => `  - ${i}`).join('\n')}`
  ).join('\n')}
`.trim();
}

async function generateGovernanceSection(context) {
  return chat(context, {
    system: `You are an expert Australian sustainability reporting consultant. Generate the GOVERNANCE section of an AASB S2 (IFRS S2 aligned) climate disclosure report.

This section must cover:
1. Board oversight of climate-related risks and opportunities
2. Management's role in assessing and managing climate-related risks
3. How climate considerations are integrated into strategy and decision-making
4. Governance bodies or committees responsible for climate oversight

Write in professional third person. Use the company data provided to make it specific and relevant.
Return ONLY the section content in clean HTML (use <h3>, <p>, <ul>, <li> tags). No wrapper div needed.
Be thorough but concise — aim for 300-500 words.`,
    maxTokens: 4096
  });
}

async function generateStrategySection(context) {
  return chat(context, {
    system: `You are an expert Australian sustainability reporting consultant. Generate the STRATEGY section of an AASB S2 (IFRS S2 aligned) climate disclosure report.

This section must cover:
1. Climate-related risks and opportunities identified over short, medium, and long term
2. Impact on the entity's business model and value chain
3. Resilience of strategy under different climate scenarios (including 1.5°C aligned)
4. Transition plans and decarbonisation pathway

Write in professional third person. Use the company data provided to make it specific and relevant.
Return ONLY the section content in clean HTML (use <h3>, <p>, <ul>, <li> tags). No wrapper div needed.
Be thorough but concise — aim for 400-600 words.`,
    maxTokens: 4096
  });
}

async function generateRiskManagementSection(context) {
  return chat(context, {
    system: `You are an expert Australian sustainability reporting consultant. Generate the RISK MANAGEMENT section of an AASB S2 (IFRS S2 aligned) climate disclosure report.

This section must cover:
1. Processes for identifying climate-related risks
2. Processes for assessing and prioritising climate-related risks
3. How climate risks are integrated into overall risk management
4. Processes for managing climate-related opportunities

Write in professional third person. Use the company data provided to make it specific and relevant.
Return ONLY the section content in clean HTML (use <h3>, <p>, <ul>, <li> tags). No wrapper div needed.
Be thorough but concise — aim for 300-500 words.`,
    maxTokens: 4096
  });
}

async function generateMetricsTargetsSection(context, totals, emissionsData) {
  const dataTable = emissionsData.map(e =>
    `| ${e.category} | ${e.source_type} | ${e.quantity} ${e.unit} | ${e.co2e_tonnes} |`
  ).join('\n');

  const enrichedContext = `${context}

Detailed Emissions Data:
| Scope | Source | Activity Data | tCO2e |
|-------|--------|---------------|-------|
${dataTable}`;

  return chat(enrichedContext, {
    system: `You are an expert Australian sustainability reporting consultant. Generate the METRICS AND TARGETS section of an AASB S2 (IFRS S2 aligned) climate disclosure report.

This section must cover:
1. GHG emissions — Scope 1, 2, and 3 with methodology notes
2. Climate-related metrics relevant to the industry
3. Targets set and progress against them
4. Transition risks quantified where possible
5. Include the actual emissions data in a well-formatted table

Write in professional third person. Use the actual emissions data provided.
Return ONLY the section content in clean HTML (use <h3>, <p>, <table>, <ul>, <li> tags). No wrapper div needed.
For tables use class="data-table" and include proper <thead> and <tbody>.
Be thorough — aim for 500-700 words. Include all emissions data in a clear table format.`,
    maxTokens: 4096
  });
}

function buildReportHtml(company, sections, totals, emissionsData) {
  const generatedDate = new Date().toLocaleDateString('en-AU', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AASB S2 Climate Disclosure — ${company.name}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: #ffffff;
    color: #1a1a2e;
    line-height: 1.7;
    padding: 0;
  }
  .report-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 3rem 2rem;
  }
  .report-header {
    text-align: center;
    padding: 3rem 2rem;
    background: linear-gradient(135deg, #0a0f0a 0%, #162016 100%);
    color: #f0fdf4;
    border-radius: 16px;
    margin-bottom: 3rem;
  }
  .report-header h1 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  .report-header .subtitle {
    color: #22c55e;
    font-size: 1.1rem;
    font-weight: 500;
  }
  .report-header .meta {
    color: #86efac;
    font-size: 0.9rem;
    margin-top: 1rem;
  }
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 3rem;
  }
  .summary-card {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 12px;
    padding: 1.5rem;
    text-align: center;
  }
  .summary-card .value {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.8rem;
    font-weight: 700;
    color: #166534;
  }
  .summary-card .label {
    font-size: 0.85rem;
    color: #6b7f6b;
    margin-top: 0.25rem;
  }
  .section {
    margin-bottom: 2.5rem;
    page-break-inside: avoid;
  }
  .section-header {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.4rem;
    color: #166534;
    border-bottom: 2px solid #22c55e;
    padding-bottom: 0.5rem;
    margin-bottom: 1.25rem;
  }
  .section h3 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.1rem;
    color: #1a1a2e;
    margin: 1.25rem 0 0.5rem;
  }
  .section p { margin-bottom: 0.75rem; }
  .section ul, .section ol {
    margin: 0.5rem 0 1rem 1.5rem;
  }
  .section li { margin-bottom: 0.35rem; }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    font-size: 0.9rem;
  }
  .data-table thead th {
    background: #166534;
    color: white;
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 600;
  }
  .data-table tbody td {
    padding: 0.6rem 1rem;
    border-bottom: 1px solid #e5e7eb;
  }
  .data-table tbody tr:nth-child(even) { background: #f9fafb; }
  .data-table tbody tr:hover { background: #f0fdf4; }
  .report-footer {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    color: #6b7f6b;
    font-size: 0.85rem;
  }
  .report-footer .brand {
    color: #22c55e;
    font-weight: 600;
  }
  @media print {
    body { padding: 0; }
    .report-container { padding: 1rem; }
    .report-header { break-after: avoid; }
    .section { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="report-container">
  <div class="report-header">
    <h1>Climate-Related Financial Disclosures</h1>
    <div class="subtitle">AASB S2 Compliance Report</div>
    <div class="meta">
      <strong>${company.name}</strong>${company.abn ? ` | ABN: ${company.abn}` : ''}<br>
      Financial Year: ${company.financial_year} | Generated: ${generatedDate}
    </div>
  </div>

  <div class="summary-cards">
    <div class="summary-card">
      <div class="value">${Number(totals.scope1).toFixed(1)}</div>
      <div class="label">Scope 1 (tCO2e)</div>
    </div>
    <div class="summary-card">
      <div class="value">${Number(totals.scope2).toFixed(1)}</div>
      <div class="label">Scope 2 (tCO2e)</div>
    </div>
    <div class="summary-card">
      <div class="value">${Number(totals.scope3).toFixed(1)}</div>
      <div class="label">Scope 3 (tCO2e)</div>
    </div>
    <div class="summary-card">
      <div class="value">${Number(totals.total).toFixed(1)}</div>
      <div class="label">Total Emissions</div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-header">1. Governance</h2>
    ${sections.governance}
  </div>

  <div class="section">
    <h2 class="section-header">2. Strategy</h2>
    ${sections.strategy}
  </div>

  <div class="section">
    <h2 class="section-header">3. Risk Management</h2>
    ${sections.riskManagement}
  </div>

  <div class="section">
    <h2 class="section-header">4. Metrics & Targets</h2>
    ${sections.metricsTargets}
  </div>

  <div class="report-footer">
    <p>This report was generated in accordance with AASB S2 <em>Climate-related Disclosures</em>,
    aligned with IFRS S2 issued by the International Sustainability Standards Board (ISSB).</p>
    <p style="margin-top: 0.5rem;">Generated by <span class="brand">GreenLedger</span></p>
  </div>
</div>
</body>
</html>`;
}

module.exports = { generateReport };
