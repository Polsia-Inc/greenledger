module.exports = {
  name: 'create_greenledger_tables',
  up: async (client) => {
    // Companies table - stores company profiles for report generation
    await client.query(`
      CREATE TABLE companies (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        abn VARCHAR(20),
        industry VARCHAR(100),
        employee_count INTEGER,
        financial_year VARCHAR(20) NOT NULL,
        address TEXT,
        contact_email VARCHAR(255),
        contact_name VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX companies_user_id_idx ON companies(user_id)`);

    // Emissions data - individual emission line items
    await client.query(`
      CREATE TABLE emissions_data (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        category VARCHAR(20) NOT NULL CHECK (category IN ('scope1', 'scope2', 'scope3')),
        source_type VARCHAR(100) NOT NULL,
        description TEXT,
        quantity DECIMAL(15,4) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        emission_factor DECIMAL(15,8),
        co2e_tonnes DECIMAL(15,4),
        period_start DATE,
        period_end DATE,
        data_source VARCHAR(50) DEFAULT 'manual',
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX emissions_company_id_idx ON emissions_data(company_id)`);
    await client.query(`CREATE INDEX emissions_category_idx ON emissions_data(category)`);

    // Reports table - generated AASB S2 reports
    await client.query(`
      CREATE TABLE reports (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        financial_year VARCHAR(20) NOT NULL,
        status VARCHAR(50) DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
        report_html TEXT,
        governance_section TEXT,
        strategy_section TEXT,
        risk_management_section TEXT,
        metrics_targets_section TEXT,
        total_scope1 DECIMAL(15,4) DEFAULT 0,
        total_scope2 DECIMAL(15,4) DEFAULT 0,
        total_scope3 DECIMAL(15,4) DEFAULT 0,
        total_emissions DECIMAL(15,4) DEFAULT 0,
        ai_model_used VARCHAR(100),
        generated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX reports_company_id_idx ON reports(company_id)`);
    await client.query(`CREATE INDEX reports_status_idx ON reports(status)`);
  }
};
