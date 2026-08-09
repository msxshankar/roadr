import { LocationPoint } from '@/types';

export interface PlaceSuggestion {
  id: string;
  name: string;
  fullName: string;
  category?: string;
  distanceMeters?: number;
}

export interface SearchProximity {
  lng: number;
  lat: number;
}

interface PlaceApiError {
  error?: string;
}

async function requestPlaces<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/api/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const payload = await response.json().catch(() => ({})) as T & PlaceApiError;
  if (!response.ok) throw new Error(payload.error || 'Place search is temporarily unavailable.');
  return payload;
}

export async function suggestLocations(
  query: string,
  sessionToken: string,
  proximity?: SearchProximity,
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> {
  const payload = await requestPlaces<{ suggestions?: PlaceSuggestion[] }>({ action: 'suggest', query, sessionToken, proximity }, signal);
  return Array.isArray(payload.suggestions) ? payload.suggestions : [];
}

export async function retrieveLocation(id: string, sessionToken: string): Promise<LocationPoint> {
  const payload = await requestPlaces<{ location?: LocationPoint }>({ action: 'retrieve', id, sessionToken });
  if (!payload.location) throw new Error('That place no longer has a usable location. Try another result.');
  return payload.location;
}

export async function resolveLocation(query: string, proximity?: SearchProximity): Promise<LocationPoint | null> {
  const payload = await requestPlaces<{ location?: LocationPoint | null }>({ action: 'forward', query, proximity });
  return payload.location || null;
}

export async function reverseLocation(lng: number, lat: number): Promise<LocationPoint | null> {
  const payload = await requestPlaces<{ location?: LocationPoint | null }>({ action: 'reverse', lng, lat });
  return payload.location || null;
}
