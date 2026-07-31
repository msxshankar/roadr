import { LocationPoint, RouteData, RouteTelemetry } from '@/types';

export const DEFAULT_MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Default UK Market Averages
export const DEFAULT_UK_PETROL_PRICE_PENCE = 159.4; // 159.4p per liter
export const DEFAULT_UK_MPG = 42; // Average UK vehicle MPG

const LITERS_PER_GALLON = 4.54609; // UK Imperial Gallon

/**
 * Compute route telemetry including distance, duration, fuel volume (liters) and cost (GBP £)
 */
export function computeTelemetry(
  distanceMeters: number,
  durationSeconds: number,
  mpg: number = DEFAULT_UK_MPG,
  pricePerLiterPence: number = DEFAULT_UK_PETROL_PRICE_PENCE
): RouteTelemetry {
  const miles = distanceMeters * 0.000621371;
  const gallons = miles / Math.max(mpg, 1);
  const liters = gallons * LITERS_PER_GALLON;
  const costPounds = (liters * pricePerLiterPence) / 100;
  const hours = durationSeconds / 3600;
  const avgMph = hours > 0 ? Math.round(miles / hours) : 0;

  return {
    distanceMeters,
    distanceMiles: parseFloat(miles.toFixed(1)),
    durationSeconds,
    durationFormatted: formatDuration(durationSeconds),
    averageSpeedMph: avgMph,
    estimatedFuelLiters: parseFloat(liters.toFixed(1)),
    estimatedFuelCostGbp: parseFloat(costPounds.toFixed(2)),
    paceNotesSummary: {
      hairpins: Math.max(1, Math.round(miles * 0.4)),
      sweepingCurves: Math.max(2, Math.round(miles * 1.2)),
      fastStraights: Math.max(1, Math.round(miles * 0.8)),
    },
  };
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins} min`;
}

/**
 * Compute Haversine distance in meters between two [lng, lat] coordinates
 */
export function haversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371000; // Earth radius in meters
  const [lng1, lat1] = coord1.map((deg) => (deg * Math.PI) / 180);
  const [lng2, lat2] = coord2.map((deg) => (deg * Math.PI) / 180);

  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Precalculate cumulative distances (meters) along route polyline
 */
export function computeCumulativeDistances(coordinates: [number, number][]): number[] {
  if (!coordinates || coordinates.length === 0) return [0];
  const cumulative = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const dist = haversineDistance(coordinates[i - 1], coordinates[i]);
    cumulative.push(cumulative[i - 1] + dist);
  }
  return cumulative;
}

/**
 * Calculate bearing angle in degrees between two coordinates [lng1, lat1] and [lng2, lat2]
 */
export function calculateBearing(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lng1, lat1] = coord1.map((deg) => (deg * Math.PI) / 180);
  const [lng2, lat2] = coord2.map((deg) => (deg * Math.PI) / 180);

  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Shortest-path exponential angle interpolation (dampened lerp)
 * Prevents camera spin when crossing 0° / 360° boundary and smooths out sharp turn jerks
 */
export function lerpAngle(currentAngle: number, targetAngle: number, alpha: number): number {
  const delta = ((targetAngle - currentAngle + 540) % 360) - 180;
  return (currentAngle + delta * Math.min(Math.max(alpha, 0), 1) + 360) % 360;
}

/**
 * Interpolate coordinate and bearing along route coordinates based on PHYSICAL METERS (Constant Speed)
 */
export function interpolateRoutePosition(
  coordinates: [number, number][],
  progress: number,
  cachedCumulativeDistances?: number[]
): { position: [number, number]; bearing: number; index: number } {
  if (!coordinates || coordinates.length === 0) {
    return { position: [-2.5, 54.5], bearing: 0, index: 0 };
  }
  if (coordinates.length === 1) {
    return { position: coordinates[0], bearing: 0, index: 0 };
  }

  const cumulativeDistances =
    cachedCumulativeDistances && cachedCumulativeDistances.length === coordinates.length
      ? cachedCumulativeDistances
      : computeCumulativeDistances(coordinates);

  const totalDistanceMeters = cumulativeDistances[cumulativeDistances.length - 1];
  const targetMeters = Math.min(Math.max(progress, 0), 1) * totalDistanceMeters;

  // Find exact segment index by physical distance
  let startIndex = 0;
  while (
    startIndex < cumulativeDistances.length - 2 &&
    cumulativeDistances[startIndex + 1] < targetMeters
  ) {
    startIndex++;
  }

  const endIndex = Math.min(startIndex + 1, coordinates.length - 1);
  const segmentStartDist = cumulativeDistances[startIndex];
  const segmentEndDist = cumulativeDistances[endIndex];
  const segmentLen = Math.max(segmentEndDist - segmentStartDist, 0.001);

  const segmentRatio = (targetMeters - segmentStartDist) / segmentLen;

  const startCoord = coordinates[startIndex];
  const endCoord = coordinates[endIndex];

  // Physical distance interpolation
  const lng = startCoord[0] + (endCoord[0] - startCoord[0]) * segmentRatio;
  const lat = startCoord[1] + (endCoord[1] - startCoord[1]) * segmentRatio;

  // Look ahead ~50 meters for smooth forward bearing
  let lookAheadMeters = targetMeters + 40;
  let lookAheadIndex = startIndex;
  while (
    lookAheadIndex < cumulativeDistances.length - 1 &&
    cumulativeDistances[lookAheadIndex] < lookAheadMeters
  ) {
    lookAheadIndex++;
  }
  const targetCoord = coordinates[lookAheadIndex] || endCoord;
  const bearing = calculateBearing(startCoord, targetCoord);

  return {
    position: [lng, lat],
    bearing,
    index: startIndex,
  };
}

/**
 * Fetch directions route from Mapbox Directions API with OSRM fallback
 */
export async function fetchRoute(
  origin: LocationPoint,
  destination: LocationPoint,
  token?: string,
  mpg: number = DEFAULT_UK_MPG,
  pricePerLiterPence: number = DEFAULT_UK_PETROL_PRICE_PENCE
): Promise<RouteData> {
  const hasValidToken = Boolean(token && token.trim().startsWith('pk.'));

  if (hasValidToken) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&access_token=${token?.trim()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          origin,
          destination,
          geometry: route.geometry,
          telemetry: computeTelemetry(route.distance, route.duration, mpg, pricePerLiterPence),
          provider: 'mapbox',
        };
      }
    } catch (err) {
      console.warn('Mapbox Directions API failed, attempting OSRM fallback...', err);
    }
  }

  // OSRM Public Routing Fallback
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
  const osrmResponse = await fetch(osrmUrl);
  const osrmData = await osrmResponse.json();

  if (osrmData.routes && osrmData.routes.length > 0) {
    const route = osrmData.routes[0];
    return {
      origin,
      destination,
      geometry: route.geometry,
      telemetry: computeTelemetry(route.distance, route.duration, mpg, pricePerLiterPence),
      provider: 'osrm',
    };
  }

  throw new Error('Unable to compute route between the selected locations.');
}
