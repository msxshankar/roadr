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
 * Interpolate coordinate and bearing along route coordinates array based on progress ratio (0 to 1)
 */
export function interpolateRoutePosition(
  coordinates: [number, number][],
  progress: number
): { position: [number, number]; bearing: number; index: number } {
  if (!coordinates || coordinates.length === 0) {
    return { position: [-2.5, 54.5], bearing: 0, index: 0 };
  }
  if (coordinates.length === 1) {
    return { position: coordinates[0], bearing: 0, index: 0 };
  }

  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const totalPoints = coordinates.length;
  const exactIndex = clampedProgress * (totalPoints - 1);
  const startIndex = Math.floor(exactIndex);
  const endIndex = Math.min(startIndex + 1, totalPoints - 1);
  const segmentRatio = exactIndex - startIndex;

  const startCoord = coordinates[startIndex];
  const endCoord = coordinates[endIndex];

  const lng = startCoord[0] + (endCoord[0] - startCoord[0]) * segmentRatio;
  const lat = startCoord[1] + (endCoord[1] - startCoord[1]) * segmentRatio;

  const lookAheadIndex = Math.min(startIndex + 2, totalPoints - 1);
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
