module.exports = {
  name: 'add_waitlist_table',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        source VARCHAR(100) NOT NULL DEFAULT 'landing_page',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS waitlist_created_idx ON waitlist(created_at DESC)`);
  },
  down: async (client) => {
    await client.query(`DROP TABLE IF EXISTS waitlist`);
  }
};
