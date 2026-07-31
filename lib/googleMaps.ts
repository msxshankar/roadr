import { LocationPoint } from '@/types';
import { searchLocations } from './geocoding';

const GOOGLE_HOST_PATTERN = /(^|\.)google\.[a-z.]+$|(^|\.)google\.com$/i;
const SHORT_GOOGLE_HOSTS = new Set(['goo.gl', 'maps.app.goo.gl']);
const MAX_IMPORTED_POINTS = 8;

interface ParsedGoogleMapsRoute {
  coordinates: Array<{ lat: number; lng: number }>;
  labels: string[];
}

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' ')).trim();
  } catch {
    return value.replace(/\+/g, ' ').trim();
  }
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function uniqueCoordinates(coordinates: Array<{ lat: number; lng: number }>): Array<{ lat: number; lng: number }> {
  return coordinates.filter((coordinate, index) => {
    const previous = coordinates[index - 1];
    return !previous || Math.abs(previous.lat - coordinate.lat) > 0.000001 || Math.abs(previous.lng - coordinate.lng) > 0.000001;
  });
}

function cleanLabel(value: string): string {
  const atIndex = value.indexOf('@');
  const bangIndex = value.indexOf('!');
  const cutIndex = [atIndex, bangIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0];
  const cleaned = cutIndex === undefined ? value : value.slice(0, cutIndex);
  return decodePart(cleaned).replace(/^place\//i, '').trim();
}

function extractCoordinatePairs(rawUrl: string): Array<{ lat: number; lng: number }> {
  const coordinates: Array<{ lat: number; lng: number }> = [];
  const coordinatePattern = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = coordinatePattern.exec(rawUrl))) {
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (isValidCoordinate(lat, lng)) coordinates.push({ lat, lng });
  }
  return uniqueCoordinates(coordinates);
}

function extractPathLabels(url: URL): string[] {
  const pathParts = url.pathname.split('/').map(cleanLabel).filter(Boolean);
  const dirIndex = pathParts.findIndex((part) => /^dir$/i.test(part));
  if (dirIndex < 0) return [];
  return pathParts
    .slice(dirIndex + 1)
    .filter((part) => !/^data=/i.test(part) && !/^search$/i.test(part))
    .map(cleanLabel)
    .filter((part) => part.length > 1 && !/^@/.test(part));
}

function extractQueryLabels(url: URL): string[] {
  const origin = url.searchParams.get('origin');
  const destination = url.searchParams.get('destination');
  const waypoints = url.searchParams.get('waypoints');
  const labels = [origin, ...(waypoints ? waypoints.split('|') : []), destination]
    .filter((value): value is string => Boolean(value))
    .map(decodePart)
    .map(cleanLabel)
    .filter((value) => value.length > 1);
  return labels;
}

function normaliseUrl(rawValue: string): URL {
  const trimmed = rawValue.trim();
  if (!trimmed) throw new Error('Paste a Google Maps directions URL to import a route.');
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error('That is not a valid URL. Paste the full link from Google Maps.');
  }

  const hostname = url.hostname.toLowerCase();
  if (SHORT_GOOGLE_HOSTS.has(hostname) || (hostname === 'goo.gl' && url.pathname.startsWith('/maps'))) {
    throw new Error('Short Google Maps links cannot be inspected safely here. Open the link in Google Maps and copy the full directions URL.');
  }
  if (!GOOGLE_HOST_PATTERN.test(hostname) && hostname !== 'maps.google.com' && hostname !== 'maps.google.co.uk') {
    throw new Error('Use a full URL copied from Google Maps, such as google.com/maps/dir/...');
  }
  if (!/\/maps(?:\/|$)/i.test(url.pathname) && hostname !== 'maps.google.com') {
    throw new Error('That Google URL is not a Maps route link. Copy the directions URL after choosing your stops.');
  }
  return url;
}

function parseGoogleMapsRoute(rawValue: string): ParsedGoogleMapsRoute {
  const url = normaliseUrl(rawValue);
  const coordinates = extractCoordinatePairs(url.href);
  const labels = extractPathLabels(url).length > 0 ? extractPathLabels(url) : extractQueryLabels(url);
  if (coordinates.length < 2 && labels.length < 2) {
    throw new Error('I could not find at least an origin and destination in that link. Copy a Google Maps directions URL, not a place or search link.');
  }
  if (coordinates.length > MAX_IMPORTED_POINTS || labels.length > MAX_IMPORTED_POINTS) {
    throw new Error(`This link contains more than ${MAX_IMPORTED_POINTS} route points. Import a shorter journey or add the stops manually.`);
  }
  return { coordinates, labels };
}

function pointFromCoordinate(coordinate: { lat: number; lng: number }, label: string, index: number): LocationPoint {
  return {
    name: label || `Google Maps point ${index + 1}`,
    lat: coordinate.lat,
    lng: coordinate.lng,
  };
}

/**
 * Convert a full Google Maps directions URL into route points. Coordinate-rich
 * links are used as-is; text-only links are resolved one point at a time so a
 * malformed URL can never silently rewrite the route.
 */
export async function importGoogleMapsRoute(rawValue: string, token?: string): Promise<LocationPoint[]> {
  const parsed = parseGoogleMapsRoute(rawValue);
  if (parsed.coordinates.length >= 2) {
    return parsed.coordinates.map((coordinate, index) => pointFromCoordinate(coordinate, parsed.labels[index] || '', index));
  }

  const points: LocationPoint[] = [];
  for (let index = 0; index < parsed.labels.length; index += 1) {
    const label = parsed.labels[index];
    const results = await searchLocations(label, token);
    const match = results[0];
    if (!match) throw new Error(`Google Maps point “${label}” could not be located. Check the link or enter this point manually.`);
    points.push({ name: match.fullName || match.name || label, lat: match.lat, lng: match.lng });
    if (index < parsed.labels.length - 1) await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
  return points;
}
