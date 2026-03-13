module.exports = {
  name: 'cleanup_orphaned_companies',
  up: async (client) => {
    // Delete companies that have no session_id — these were created before the
    // session-based isolation was added. They cannot be accessed by any user via
    // the API (all queries filter by session_id) so they are safe to remove.
    // ON DELETE CASCADE on emissions_data and reports means related rows are
    // automatically cleaned up.
    const result = await client.query(`
      DELETE FROM companies WHERE session_id IS NULL
    `);
    console.log(`[migration] Cleaned up ${result.rowCount} orphaned companies with NULL session_id`);
  },
  down: async (client) => {
    // Cannot restore deleted data — this migration is irreversible.
    // The down migration is intentionally a no-op.
  }
};
