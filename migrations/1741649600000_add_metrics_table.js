module.exports = {
  name: 'add_metrics_table',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        metric_date DATE NOT NULL UNIQUE,
        visitors INTEGER NOT NULL DEFAULT 0,
        signups INTEGER NOT NULL DEFAULT 0,
        companies_created INTEGER NOT NULL DEFAULT 0,
        reports_generated INTEGER NOT NULL DEFAULT 0,
        conversion_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS metrics_date_idx ON metrics(metric_date DESC)`);
  }
};
