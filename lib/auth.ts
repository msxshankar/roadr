import { query } from '@/lib/db';
import { User, UserRole } from '@/types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const SESSION_COOKIE_NAME = 'roadr_session';
export const SESSION_DURATION_SECONDS = 2592000; // 30 days in seconds

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  await query(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
    [token, userId, expiresAt]
  );

  return token;
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  await query('DELETE FROM sessions WHERE id = $1', [token]);
}

export async function getSessionUser(token?: string | null): Promise<User | null> {
  if (!token) return null;

  const result = await query<{
    id: string;
    username: string;
    role: string;
    created_at: Date | string;
  }>(
    `SELECT u.id, u.username, u.role, u.created_at
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.id = $1 AND s.expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    role: row.role as UserRole,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export interface UserWithPasswordHash {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  created_at: Date | string;
}

export async function getUserByUsername(username: string): Promise<UserWithPasswordHash | null> {
  const normalizedUsername = username.trim();
  if (!normalizedUsername) return null;

  const result = await query<{
    id: string;
    username: string;
    password_hash: string;
    role: string;
    created_at: Date | string;
  }>(
    'SELECT id, username, password_hash, role, created_at FROM users WHERE username = $1',
    [normalizedUsername]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    password_hash: row.password_hash,
    role: row.role as UserRole,
    created_at: row.created_at,
  };
}

export async function createUser(username: string, password: string): Promise<User> {
  const normalizedUsername = username.trim();
  const passwordHash = await hashPassword(password);
  const result = await query<{
    id: string;
    username: string;
    role: string;
    created_at: Date | string;
  }>(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, 'user')
     RETURNING id, username, role, created_at`,
    [normalizedUsername, passwordHash]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    role: row.role as UserRole,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}
