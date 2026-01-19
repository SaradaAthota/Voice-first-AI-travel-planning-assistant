import { readFileSync } from 'fs';
import { join } from 'path';
import { getPgPool } from './supabase';

/**
 * Run database migrations
 * This script reads SQL files from the migrations folder and executes them
 */
async function migrate() {
  const pool = getPgPool();
  const client = await pool.connect();

  try {
    console.log('Starting database migration...');

    // Read the migration file
    const migrationPath = join(__dirname, '../../migrations/001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');

    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrate };

