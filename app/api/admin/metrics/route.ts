import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth';
import { query } from '@/lib/db';
import { AdminMetrics } from '@/types';

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
      user_count: string | number;
      vehicle_count: string | number;
      route_count: string | number;
      saved_place_count: string | number;
    }>(`SELECT
      (SELECT COUNT(*) FROM users) AS user_count,
      (SELECT COUNT(*) FROM vehicles) AS vehicle_count,
      (SELECT COUNT(*) FROM recorded_routes) AS route_count,
      (SELECT COUNT(*) FROM saved_places) AS saved_place_count`);
    const row = result.rows[0];
    const metrics: AdminMetrics = {
      userCount: Number(row?.user_count || 0),
      vehicleCount: Number(row?.vehicle_count || 0),
      routeCount: Number(row?.route_count || 0),
      savedPlaceCount: Number(row?.saved_place_count || 0),
      dbStatus: 'healthy',
    };
    return NextResponse.json(metrics, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Unable to read admin metrics:', error);
    return NextResponse.json({
      userCount: 0,
      vehicleCount: 0,
      routeCount: 0,
      savedPlaceCount: 0,
      dbStatus: 'unhealthy',
    } satisfies AdminMetrics, { status: 503 });
  }
}
