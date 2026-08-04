import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getPool, query, initDb } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth';
import { isRoadrAppStatePayload, stateFromRows, normaliseAppState } from '@/lib/state';
import { RoadrAppState } from '@/types';

export const dynamic = 'force-dynamic';

async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getSessionUser(token);
}

function unauthorisedResponse() {
  return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return unauthorisedResponse();

    const [vehicleRows, placeRows, routeRows, settingRows] = await Promise.all([
      query('SELECT id, nickname, make, model, year, fuel_type, mpg, tank_liters, range_miles FROM vehicles WHERE user_id = $1 ORDER BY created_at ASC', [user.id]),
      query('SELECT name, lng, lat FROM saved_places WHERE user_id = $1 ORDER BY created_at ASC', [user.id]),
      query('SELECT id, vehicle_id, name, origin, destination, stops, recorded_at, distance_miles, fuel_liters, fuel_cost_gbp, duration_seconds, is_planned, time_of_day, no_specific_date FROM recorded_routes WHERE user_id = $1 ORDER BY created_at ASC', [user.id]),
      query('SELECT active_vehicle_id FROM user_settings WHERE user_id = $1', [user.id]),
    ]);

    const state = stateFromRows({
      vehicles: vehicleRows.rows as Array<Record<string, unknown>>,
      savedPlaces: placeRows.rows as Array<Record<string, unknown>>,
      recordedRoutes: routeRows.rows as Array<Record<string, unknown>>,
      activeVehicleId: settingRows.rows[0]?.active_vehicle_id,
    });

    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Unable to read state:', error);
    return NextResponse.json({ error: 'Storage unavailable.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return unauthorisedResponse();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    if (!isRoadrAppStatePayload(body)) {
      return NextResponse.json({ error: 'Invalid application state.' }, { status: 400 });
    }

    const state: RoadrAppState = normaliseAppState(body);
    await initDb();
    const client = await getPool().connect();

    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM vehicles WHERE user_id = $1', [user.id]);
      for (const vehicle of state.vehicles) {
        await client.query(
          `INSERT INTO vehicles (id, user_id, nickname, make, model, year, fuel_type, mpg, tank_liters, range_miles)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [vehicle.id, user.id, vehicle.nickname, vehicle.make, vehicle.model, vehicle.year, vehicle.fuelType, vehicle.mpg, vehicle.tankLiters, vehicle.rangeMiles ?? 250]
        );
      }

      await client.query('DELETE FROM saved_places WHERE user_id = $1', [user.id]);
      for (const place of state.savedPlaces) {
        await client.query(
          'INSERT INTO saved_places (id, user_id, name, lng, lat) VALUES (gen_random_uuid()::text, $1, $2, $3, $4)',
          [user.id, place.name, place.lng, place.lat]
        );
      }

      await client.query('DELETE FROM recorded_routes WHERE user_id = $1', [user.id]);
      for (const route of state.recordedRoutes) {
        await client.query(
          `INSERT INTO recorded_routes
            (id, user_id, vehicle_id, name, origin, destination, stops, recorded_at, distance_miles, fuel_liters, fuel_cost_gbp, duration_seconds, is_planned, time_of_day, no_specific_date)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            route.id,
            user.id,
            route.vehicleId,
            route.name,
            JSON.stringify(route.origin),
            JSON.stringify(route.destination),
            JSON.stringify(route.stops),
            route.recordedAt,
            route.distanceMiles,
            route.fuelLiters,
            route.fuelCostGbp,
            route.durationSeconds,
            Boolean(route.isPlanned),
            route.timeOfDay || 'morning',
            Boolean(route.noSpecificDate),
          ]
        );
      }

      await client.query(
        `INSERT INTO user_settings (user_id, active_vehicle_id, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET active_vehicle_id = EXCLUDED.active_vehicle_id, updated_at = NOW()`,
        [user.id, state.activeVehicleId]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Unable to write state:', error);
    return NextResponse.json({ error: 'Storage unavailable.' }, { status: 500 });
  }
}
