import { LocationPoint } from '@/types';

export interface PlaceSearchSuggestion {
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

export class PlaceSearchError extends Error {
  constructor(
    message: string,
    public readonly status: number = 502
  ) {
    super(message);
    this.name = 'PlaceSearchError';
  }
}

const MAPBOX_SEARCH_BASE_URL = 'https://api.mapbox.com/search/searchbox/v1';

function getAccessToken(): string {
  const token = process.env.MAPBOX_SEARCH_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
  if (!token.trim()) {
    throw new PlaceSearchError('Landmark search is not configured yet. Choose the location on the map instead.', 503);
  }
  return token.trim();
}

function validCoordinate(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function formatPlaceName(properties: Record<string, unknown>): string {
  const primary = text(properties.name);
  const fullAddress = text(properties.full_address) || text(properties.place_formatted) || text(properties.address);
  if (!primary) return fullAddress || 'Selected place';
  if (!fullAddress) return primary;
  if (fullAddress.toLocaleLowerCase('en-GB').startsWith(primary.toLocaleLowerCase('en-GB'))) return fullAddress;
  return `${primary}, ${fullAddress}`;
}

function formatSuggestionName(properties: Record<string, unknown>): string {
  return text(properties.name) || text(properties.full_address) || text(properties.place_formatted) || 'Unnamed place';
}

function formatSuggestionContext(properties: Record<string, unknown>, name: string): string {
  const fullAddress = text(properties.full_address) || text(properties.place_formatted) || text(properties.address);
  if (!fullAddress || fullAddress.toLowerCase() === name.toLowerCase()) return '';
  return fullAddress;
}

function categoryFor(properties: Record<string, unknown>): string | undefined {
  const categories = Array.isArray(properties.poi_category) ? properties.poi_category : [];
  const category = categories.find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return category || text(properties.feature_type) || undefined;
}

function parseSuggestion(value: unknown): PlaceSearchSuggestion | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const properties = value as Record<string, unknown>;
  const id = text(properties.mapbox_id);
  if (!id) return null;
  const name = formatSuggestionName(properties);
  const distanceMeters = typeof properties.distance === 'number' && Number.isFinite(properties.distance)
    ? Math.max(0, Math.round(properties.distance))
    : undefined;
  return {
    id,
    name,
    fullName: formatSuggestionContext(properties, name),
    ...(categoryFor(properties) ? { category: categoryFor(properties) } : {}),
    ...(distanceMeters !== undefined ? { distanceMeters } : {}),
  };
}

function parseLocation(feature: unknown): LocationPoint | null {
  if (!feature || typeof feature !== 'object' || Array.isArray(feature)) return null;
  const candidate = feature as Record<string, unknown>;
  const properties = candidate.properties && typeof candidate.properties === 'object' && !Array.isArray(candidate.properties)
    ? candidate.properties as Record<string, unknown>
    : {};
  const coordinateProperties = properties.coordinates && typeof properties.coordinates === 'object' && !Array.isArray(properties.coordinates)
    ? properties.coordinates as Record<string, unknown>
    : {};
  const geometry = candidate.geometry && typeof candidate.geometry === 'object' && !Array.isArray(candidate.geometry)
    ? candidate.geometry as Record<string, unknown>
    : {};
  const geometryCoordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  const routablePoints = Array.isArray(coordinateProperties.routable_points) ? coordinateProperties.routable_points : [];
  const routablePoint = routablePoints.find((point) => {
    if (!point || typeof point !== 'object' || Array.isArray(point)) return false;
    const candidatePoint = point as Record<string, unknown>;
    return validCoordinate(candidatePoint.longitude, -180, 180) && validCoordinate(candidatePoint.latitude, -90, 90);
  }) as Record<string, unknown> | undefined;
  const lng = routablePoint?.longitude ?? coordinateProperties.longitude ?? geometryCoordinates[0];
  const lat = routablePoint?.latitude ?? coordinateProperties.latitude ?? geometryCoordinates[1];
  if (!validCoordinate(lng, -180, 180) || !validCoordinate(lat, -90, 90)) return null;
  return { name: formatPlaceName(properties), lng, lat };
}

async function mapboxRequest(path: string, parameters: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(`${MAPBOX_SEARCH_BASE_URL}${path}`);
  Object.entries({ ...parameters, access_token: getAccessToken() }).forEach(([key, value]) => url.searchParams.set(key, value));

  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new PlaceSearchError('Place search is temporarily unavailable. Try again or choose the location on the map.');
  }

  if (!response.ok) {
    if (response.status === 429) throw new PlaceSearchError('Place search is busy. Please wait a moment and try again.', 429);
    if (response.status === 401 || response.status === 403) throw new PlaceSearchError('Landmark search is not configured correctly. Choose the location on the map instead.', 503);
    throw new PlaceSearchError('Place search is temporarily unavailable. Try again or choose the location on the map.');
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new PlaceSearchError('Place search returned an invalid response. Please try again.');
  }
  return payload as Record<string, unknown>;
}

function searchParameters(proximity?: SearchProximity): Record<string, string> {
  return {
    language: 'en',
    country: 'GB',
    limit: '10',
    ...(proximity ? { proximity: `${proximity.lng},${proximity.lat}` } : {}),
  };
}

function normaliseSearchText(value: string): string {
  return value.toLocaleLowerCase('en-GB').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function searchVariants(query: string): string[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const variants = [query.trim()];
  for (let length = words.length - 1; length >= 1 && variants.length < 3; length -= 1) {
    const candidate = words.slice(0, length).join(' ');
    if (!variants.includes(candidate)) variants.push(candidate);
  }
  return variants;
}

function hasAnchorMatch(suggestion: PlaceSearchSuggestion, anchor: string): boolean {
  const haystack = normaliseSearchText(`${suggestion.name} ${suggestion.fullName}`);
  return haystack.includes(anchor);
}

function rankSuggestion(suggestion: PlaceSearchSuggestion, query: string): number {
  const terms = normaliseSearchText(query).split(' ').filter(Boolean);
  const anchor = terms[0] || '';
  const name = normaliseSearchText(suggestion.name);
  const context = normaliseSearchText(suggestion.fullName);
  let score = 0;
  if (anchor && name.startsWith(anchor)) score += 12;
  else if (anchor && name.includes(anchor)) score += 8;
  else if (anchor && context.includes(anchor)) score += 3;
  score += terms.filter((term) => `${name} ${context}`.includes(term)).length;
  if (suggestion.category === 'brand') score -= 4;
  return score;
}

export async function suggestPlaces(query: string, sessionToken: string, proximity?: SearchProximity): Promise<PlaceSearchSuggestion[]> {
  const anchor = normaliseSearchText(query).split(' ')[0] || '';
  const byId = new Map<string, PlaceSearchSuggestion>();

  for (const variant of searchVariants(query)) {
    const payload = await mapboxRequest('/suggest', {
      q: variant,
      session_token: sessionToken,
      ...searchParameters(proximity),
    });
    const suggestions = (Array.isArray(payload.suggestions) ? payload.suggestions : [])
      .map(parseSuggestion)
      .filter((suggestion): suggestion is PlaceSearchSuggestion => suggestion !== null);
    suggestions.forEach((suggestion) => {
      if (!byId.has(suggestion.id)) byId.set(suggestion.id, suggestion);
    });
    if (!anchor || suggestions.some((suggestion) => hasAnchorMatch(suggestion, anchor))) break;
  }

  return Array.from(byId.values())
    .sort((first, second) => rankSuggestion(second, query) - rankSuggestion(first, query))
    .slice(0, 10);
}

export async function retrievePlace(id: string, sessionToken: string): Promise<LocationPoint | null> {
  const payload = await mapboxRequest(`/retrieve/${encodeURIComponent(id)}`, { session_token: sessionToken });
  const features = Array.isArray(payload.features) ? payload.features : [];
  return parseLocation(features[0]);
}

export async function forwardPlace(query: string, proximity?: SearchProximity): Promise<LocationPoint | null> {
  const payload = await mapboxRequest('/forward', { q: query, ...searchParameters(proximity) });
  const features = Array.isArray(payload.features) ? payload.features : [];
  return parseLocation(features[0]);
}

export async function reversePlace(lng: number, lat: number): Promise<LocationPoint | null> {
  const payload = await mapboxRequest('/reverse', {
    longitude: String(lng),
    latitude: String(lat),
    language: 'en',
    country: 'GB',
    limit: '1',
  });
  const features = Array.isArray(payload.features) ? payload.features : [];
  return parseLocation(features[0]);
}

export function isValidSearchQuery(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 256;
}

export function isValidSessionToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(value);
}

export function isValidProximity(value: unknown): value is SearchProximity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return validCoordinate(candidate.lng, -180, 180) && validCoordinate(candidate.lat, -90, 90);
}

export function isValidLngLat(value: unknown): value is SearchProximity {
  return isValidProximity(value);
}
