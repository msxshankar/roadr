import { RecordedRoute, VehicleFuelType, VehicleProfile } from '@/types';

export const VEHICLE_STORAGE_KEY = 'roadr:vehicle-profile:v1';
export const RECORDED_ROUTES_STORAGE_KEY = 'roadr:recorded-routes:v1';

export const DEFAULT_VEHICLE: Omit<VehicleProfile, 'id'> = {
  nickname: 'My car',
  make: '',
  model: '',
  year: '',
  fuelType: 'petrol',
  mpg: 42,
  tankLiters: 50,
};

const FUEL_TYPES: VehicleFuelType[] = ['petrol', 'diesel', 'hybrid', 'electric'];

function isVehicleFuelType(value: unknown): value is VehicleFuelType {
  return typeof value === 'string' && FUEL_TYPES.includes(value as VehicleFuelType);
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseVehicleProfile(serialized: string | null): VehicleProfile | null {
  if (!serialized) return null;
  try {
    const value = JSON.parse(serialized) as Partial<VehicleProfile>;
    if (!value || typeof value !== 'object') return null;
    return {
      id: typeof value.id === 'string' && value.id ? value.id : 'vehicle-1',
      nickname: typeof value.nickname === 'string' && value.nickname ? value.nickname : DEFAULT_VEHICLE.nickname,
      make: typeof value.make === 'string' ? value.make : '',
      model: typeof value.model === 'string' ? value.model : '',
      year: typeof value.year === 'string' ? value.year : '',
      fuelType: isVehicleFuelType(value.fuelType) ? value.fuelType : DEFAULT_VEHICLE.fuelType,
      mpg: Math.min(Math.max(toFiniteNumber(value.mpg, DEFAULT_VEHICLE.mpg), 1), 200),
      tankLiters: Math.min(Math.max(toFiniteNumber(value.tankLiters, DEFAULT_VEHICLE.tankLiters), 1), 200),
    };
  } catch {
    return null;
  }
}

export function parseRecordedRoutes(serialized: string | null): RecordedRoute[] {
  if (!serialized) return [];
  try {
    const value = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    return value.filter((route): route is RecordedRoute => {
      return Boolean(
        route && typeof route === 'object' && typeof route.id === 'string' &&
        typeof route.name === 'string' && typeof route.vehicleId === 'string' &&
        typeof route.distanceMiles === 'number' && typeof route.fuelCostGbp === 'number'
      );
    }).slice(0, 50);
  } catch {
    return [];
  }
}

export function vehicleLabel(vehicle: VehicleProfile | null): string {
  if (!vehicle) return 'No car configured';
  const details = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  return details ? `${vehicle.nickname} · ${details}` : vehicle.nickname;
}
