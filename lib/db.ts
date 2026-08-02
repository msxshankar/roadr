import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/roadr';

declare global {
  var roadrPgPool: Pool | undefined;
  var roadrDbInitPromise: Promise<void> | undefined;
}

export function getPool(): Pool {
  if (!globalThis.roadrPgPool) {
    globalThis.roadrPgPool = new Pool({ connectionString });
  }
  return globalThis.roadrPgPool;
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  await initDb();
  const pool = getPool();
  const res = await pool.query(text, params);
  return { rows: res.rows as T[], rowCount: res.rowCount };
}

export async function initDb(): Promise<void> {
  if (globalThis.roadrDbInitPromise) {
    return globalThis.roadrDbInitPromise;
  }

  globalThis.roadrDbInitPromise = (async () => {
    const pool = getPool();

    // 1. Table Creation DDL
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nickname TEXT NOT NULL,
        make TEXT DEFAULT '',
        model TEXT DEFAULT '',
        year TEXT DEFAULT '',
        fuel_type VARCHAR(20) NOT NULL DEFAULT 'petrol',
        mpg DOUBLE PRECISION NOT NULL DEFAULT 42,
        tank_liters DOUBLE PRECISION NOT NULL DEFAULT 50,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS saved_places (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS recorded_routes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vehicle_id TEXT,
        name TEXT NOT NULL,
        origin JSONB NOT NULL,
        destination JSONB NOT NULL,
        stops JSONB NOT NULL DEFAULT '[]',
        recorded_at TIMESTAMPTZ NOT NULL,
        distance_miles DOUBLE PRECISION NOT NULL,
        fuel_liters DOUBLE PRECISION NOT NULL,
        fuel_cost_gbp DOUBLE PRECISION NOT NULL,
        duration_seconds INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        active_vehicle_id TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      UPDATE users SET created_at = NOW() WHERE created_at IS NULL;
    `);

    // 2. Auto-seeding logic for default accounts
    const existingUsers = await pool.query(
      'SELECT username FROM users WHERE username IN ($1, $2)',
      ['mayur', 'admin']
    );
    const foundUsernames = new Set(
      existingUsers.rows.map((r: { username: string }) => r.username)
    );

    if (!foundUsernames.has('mayur')) {
      const mayurHash = await bcrypt.hash('roadr', 10);
      await pool.query(
        'INSERT INTO users (id, username, password_hash, role) VALUES (gen_random_uuid()::text, $1, $2, $3) ON CONFLICT (username) DO NOTHING',
        ['mayur', mayurHash, 'user']
      );
    }

    if (!foundUsernames.has('admin')) {
      const adminHash = await bcrypt.hash('admin', 10);
      await pool.query(
        'INSERT INTO users (id, username, password_hash, role) VALUES (gen_random_uuid()::text, $1, $2, $3) ON CONFLICT (username) DO NOTHING',
        ['admin', adminHash, 'admin']
      );
    }
  })().catch((err) => {
    globalThis.roadrDbInitPromise = undefined;
    throw err;
  });

  return globalThis.roadrDbInitPromise;
}
