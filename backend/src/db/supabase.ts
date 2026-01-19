import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env';
import { Pool, PoolClient } from 'pg';

let supabaseClient: SupabaseClient | null = null;
let pgPool: Pool | null = null;

/**
 * Get Supabase client instance (singleton)
 * Uses anon key for client-side operations
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!config.supabase.url || !config.supabase.anonKey) {
      throw new Error('Supabase URL and anon key must be configured');
    }
    supabaseClient = createClient(config.supabase.url, config.supabase.anonKey);
  }
  return supabaseClient;
}

/**
 * Get Supabase admin client with service role key (for migrations/admin operations)
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error('Supabase URL and service role key must be configured');
  }
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get PostgreSQL connection pool (for direct SQL operations)
 * Use this for migrations and complex queries
 */
export function getPgPool(): Pool {
  if (!pgPool) {
    if (!config.database.url) {
      throw new Error('Database URL must be configured');
    }
    pgPool = new Pool({
      connectionString: config.database.url,
      ssl: config.env === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Handle pool errors
    pgPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }
  return pgPool;
}

/**
 * Execute a query using the PostgreSQL pool
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPgPool();
  const result = await pool.query(text, params);
  return result.rows;
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all database connections (for graceful shutdown)
 */
export async function closeConnections(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}

