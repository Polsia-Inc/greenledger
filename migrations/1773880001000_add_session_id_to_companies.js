module.exports = {
  name: 'add_session_id_to_companies',
  up: async (client) => {
    // Add session_id column to companies for visitor-based data isolation
    await client.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS session_id VARCHAR(36)
    `);
    // Index for fast lookups by session
    await client.query(`
      CREATE INDEX IF NOT EXISTS companies_session_id_idx ON companies(session_id)
    `);
  },
  down: async (client) => {
    await client.query(`DROP INDEX IF EXISTS companies_session_id_idx`);
    await client.query(`ALTER TABLE companies DROP COLUMN IF EXISTS session_id`);
  }
};
