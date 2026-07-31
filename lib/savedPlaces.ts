import { LocationPoint } from '@/types';

export const SAVED_PLACES_STORAGE_KEY = 'roadr:saved-places:v1';
export const MAX_SAVED_PLACES = 12;

function isLocationPoint(value: unknown): value is LocationPoint {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<LocationPoint>;
  return (
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0 &&
    typeof candidate.lng === 'number' &&
    Number.isFinite(candidate.lng) &&
    typeof candidate.lat === 'number' &&
    Number.isFinite(candidate.lat)
  );
}

export function parseSavedPlaces(serialized: string | null): LocationPoint[] {
  if (!serialized) return [];

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isLocationPoint).slice(0, MAX_SAVED_PLACES);
  } catch {
    return [];
  }
}

function isSamePlace(first: LocationPoint, second: LocationPoint): boolean {
  return Math.abs(first.lng - second.lng) < 0.00001 && Math.abs(first.lat - second.lat) < 0.00001;
}

export function upsertSavedPlace(
  savedPlaces: LocationPoint[],
  location: LocationPoint
): LocationPoint[] {
  return [location, ...savedPlaces.filter((place) => !isSamePlace(place, location))].slice(
    0,
    MAX_SAVED_PLACES
  );
}
