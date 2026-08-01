import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth';
import { query } from '@/lib/db';
import { UserRole } from '@/types';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const user = await getSessionUser(token);
  if (!user) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (user.role !== 'admin') return { response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const access = await requireAdmin();
  if ('response' in access) return access.response;

  try {
    const result = await query<{
      id: string;
      username: string;
      role: string;
      created_at: Date | string;
    }>('SELECT id, username, role, created_at FROM users ORDER BY created_at ASC');
    return NextResponse.json(result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      role: row.role as UserRole,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    })), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Unable to read admin users:', error);
    return NextResponse.json({ error: 'Storage unavailable.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const access = await requireAdmin();
  if ('response' in access) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }
  const userId = body && typeof body === 'object' && 'userId' in body && typeof body.userId === 'string' ? body.userId : null;
  const role = body && typeof body === 'object' && 'role' in body && (body.role === 'user' || body.role === 'admin') ? body.role : null;
  if (!userId || !role) return NextResponse.json({ error: 'userId and role are required.' }, { status: 400 });
  if (userId === access.user.id) return NextResponse.json({ error: 'You cannot change your own admin role.' }, { status: 400 });

  try {
    const result = await query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, userId]);
    if (!result.rowCount) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unable to update admin user:', error);
    return NextResponse.json({ error: 'Storage unavailable.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const access = await requireAdmin();
  if ('response' in access) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }
  const userId = body && typeof body === 'object' && 'userId' in body && typeof body.userId === 'string' ? body.userId : null;
  if (!userId) return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
  if (userId === access.user.id) return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });

  try {
    const result = await query('DELETE FROM users WHERE id = $1', [userId]);
    if (!result.rowCount) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unable to delete admin user:', error);
    return NextResponse.json({ error: 'Storage unavailable.' }, { status: 500 });
  }
}
