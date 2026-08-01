import { LocationPoint, RecordedRoute, RoadrAppState, VehicleFuelType, VehicleProfile } from '@/types';

export const EMPTY_APP_STATE: RoadrAppState = {
  vehicles: [],
  activeVehicleId: null,
  savedPlaces: [],
  recordedRoutes: [],
};

const FUEL_TYPES: VehicleFuelType[] = ['petrol', 'diesel', 'hybrid', 'electric'];
const MAX_VEHICLES = 32;
const MAX_SAVED_PLACES = 100;
const MAX_RECORDED_ROUTES = 100;
const MAX_TEXT_LENGTH = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function boundedText(value: unknown, maximum = MAX_TEXT_LENGTH): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maximum) return null;
  return trimmed;
}

function validCoordinate(value: unknown, minimum: number, maximum: number): value is number {
  return finiteNumber(value) && value >= minimum && value <= maximum;
}

function normaliseLocation(value: unknown): LocationPoint | null {
  if (!isRecord(value)) return null;
  const name = boundedText(value.name);
  if (!name || !validCoordinate(value.lng, -180, 180) || !validCoordinate(value.lat, -90, 90)) return null;
  return { name, lng: value.lng, lat: value.lat };
}

function normaliseVehicle(value: unknown): VehicleProfile | null {
  if (!isRecord(value)) return null;
  const id = boundedText(value.id, 120);
  const nickname = boundedText(value.nickname, 80);
  const make = typeof value.make === 'string' ? value.make.trim().slice(0, MAX_TEXT_LENGTH) : '';
  const model = typeof value.model === 'string' ? value.model.trim().slice(0, MAX_TEXT_LENGTH) : '';
  const year = typeof value.year === 'string' ? value.year.trim().slice(0, 12) : '';
  const fuelType = typeof value.fuelType === 'string' && FUEL_TYPES.includes(value.fuelType as VehicleFuelType)
    ? value.fuelType as VehicleFuelType
    : 'petrol';
  if (!id || !nickname || !finiteNumber(value.mpg) || !finiteNumber(value.tankLiters)) return null;

  return {
    id,
    nickname,
    make,
    model,
    year,
    fuelType,
    mpg: Math.min(Math.max(value.mpg, 1), 200),
    tankLiters: Math.min(Math.max(value.tankLiters, 1), 200),
  };
}

function normaliseRecordedRoute(value: unknown): RecordedRoute | null {
  if (!isRecord(value)) return null;
  const id = boundedText(value.id, 120);
  const name = boundedText(value.name, MAX_TEXT_LENGTH);
  const vehicleId = boundedText(value.vehicleId, 120);
  const origin = normaliseLocation(value.origin);
  const destination = normaliseLocation(value.destination);
  const stops = Array.isArray(value.stops)
    ? value.stops.map(normaliseLocation).filter((point): point is LocationPoint => point !== null).slice(0, 24)
    : [];
  const recordedAt = typeof value.recordedAt === 'string' && !Number.isNaN(Date.parse(value.recordedAt))
    ? value.recordedAt
    : null;

  if (
    !id ||
    !name ||
    !vehicleId ||
    !origin ||
    !destination ||
    !recordedAt ||
    !finiteNumber(value.distanceMiles) ||
    !finiteNumber(value.fuelLiters) ||
    !finiteNumber(value.fuelCostGbp) ||
    !finiteNumber(value.durationSeconds)
  ) {
    return null;
  }

  return {
    id,
    name,
    vehicleId,
    origin,
    destination,
    stops,
    recordedAt,
    distanceMiles: Math.max(value.distanceMiles, 0),
    fuelLiters: Math.max(value.fuelLiters, 0),
    fuelCostGbp: Math.max(value.fuelCostGbp, 0),
    durationSeconds: Math.max(Math.round(value.durationSeconds), 0),
  };
}

export function isRoadrAppStatePayload(value: unknown): value is Partial<RoadrAppState> {
  return isRecord(value) &&
    Array.isArray(value.vehicles) &&
    Array.isArray(value.savedPlaces) &&
    Array.isArray(value.recordedRoutes) &&
    (value.activeVehicleId === null || typeof value.activeVehicleId === 'string' || value.activeVehicleId === undefined);
}

export function normaliseAppState(value: unknown): RoadrAppState {
  if (!isRecord(value)) return EMPTY_APP_STATE;

  const seenVehicleIds = new Set<string>();
  const vehicles = Array.isArray(value.vehicles)
    ? value.vehicles
      .map(normaliseVehicle)
      .filter((vehicle): vehicle is VehicleProfile => vehicle !== null)
      .filter((vehicle) => {
        if (seenVehicleIds.has(vehicle.id)) return false;
        seenVehicleIds.add(vehicle.id);
        return true;
      })
      .slice(0, MAX_VEHICLES)
    : [];
  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
  const savedPlaces = Array.isArray(value.savedPlaces)
    ? value.savedPlaces.map(normaliseLocation).filter((place): place is LocationPoint => place !== null).slice(0, MAX_SAVED_PLACES)
    : [];
  const seenRouteIds = new Set<string>();
  const recordedRoutes = Array.isArray(value.recordedRoutes)
    ? value.recordedRoutes
      .map(normaliseRecordedRoute)
      .filter((route): route is RecordedRoute => route !== null && vehicleIds.has(route.vehicleId))
      .filter((route) => {
        if (seenRouteIds.has(route.id)) return false;
        seenRouteIds.add(route.id);
        return true;
      })
      .slice(0, MAX_RECORDED_ROUTES)
    : [];
  const requestedActiveId = typeof value.activeVehicleId === 'string' && vehicleIds.has(value.activeVehicleId)
    ? value.activeVehicleId
    : null;

  return {
    vehicles,
    activeVehicleId: requestedActiveId || vehicles[0]?.id || null,
    savedPlaces,
    recordedRoutes,
  };
}

export function stateFromRows(rows: {
  vehicles: Array<Record<string, unknown>>;
  savedPlaces: Array<Record<string, unknown>>;
  recordedRoutes: Array<Record<string, unknown>>;
  activeVehicleId?: unknown;
}): RoadrAppState {
  return normaliseAppState({
    vehicles: rows.vehicles.map((row) => ({
      id: row.id,
      nickname: row.nickname,
      make: row.make || '',
      model: row.model || '',
      year: row.year || '',
      fuelType: row.fuel_type,
      mpg: row.mpg,
      tankLiters: row.tank_liters,
    })),
    activeVehicleId: rows.activeVehicleId || null,
    savedPlaces: rows.savedPlaces,
    recordedRoutes: rows.recordedRoutes.map((row) => ({
      id: row.id,
      name: row.name,
      vehicleId: row.vehicle_id,
      origin: row.origin,
      destination: row.destination,
      stops: row.stops,
      recordedAt: row.recorded_at,
      distanceMiles: row.distance_miles,
      fuelLiters: row.fuel_liters,
      fuelCostGbp: row.fuel_cost_gbp,
      durationSeconds: row.duration_seconds,
    })),
  });
}
