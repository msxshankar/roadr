import { LocationPoint, RouteData, RouteTelemetry } from '@/types';

export const DEFAULT_MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export const DEFAULT_UK_MPG = 36.5; // UK average vehicle MPG (SMMT / DVLA stats)
export const DEFAULT_UK_PETROL_PRICE_PENCE = 159.4; // UK average unleaded petrol price (159.4p / L - FuelMap.co.uk)
export const DEFAULT_UK_PETROL_PRICE_GBP = 1.594; // Legacy alias

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} mins`;
}

export function computeTelemetry(
  distanceMeters: number,
  durationSeconds: number,
  mpg: number = DEFAULT_UK_MPG,
  pricePerLiterPence: number = DEFAULT_UK_PETROL_PRICE_PENCE
): RouteTelemetry {
  const distanceMiles = parseFloat((distanceMeters * 0.000621371).toFixed(1));
  const durationHours = durationSeconds / 3600;
  const averageSpeedMph = durationHours > 0 ? Math.round(distanceMiles / durationHours) : 0;
  
  // Fuel estimate using dynamic MPG and fuel price in pence per liter
  const validMpg = mpg > 0 ? mpg : DEFAULT_UK_MPG;
  const gallons = distanceMiles / validMpg;
  const estimatedFuelLiters = parseFloat((gallons * 4.54609).toFixed(1)); // UK Imperial gallon = 4.54609 L
  const estimatedFuelCostGbp = parseFloat(((estimatedFuelLiters * pricePerLiterPence) / 100).toFixed(2));

  // Estimate pace notes based on distance profile
  const hairpins = Math.max(1, Math.floor(distanceMiles * 0.15));
  const sweepingCurves = Math.max(2, Math.floor(distanceMiles * 0.45));
  const fastStraights = Math.max(1, Math.floor(distanceMiles * 0.4));

  return {
    distanceMeters,
    distanceMiles,
    durationSeconds,
    durationFormatted: formatDuration(durationSeconds),
    averageSpeedMph,
    estimatedFuelLiters,
    estimatedFuelCostGbp,
    paceNotesSummary: {
      hairpins,
      sweepingCurves,
      fastStraights,
    },
  };
}

export async function fetchRoute(
  origin: LocationPoint,
  destination: LocationPoint,
  token?: string,
  mpg: number = DEFAULT_UK_MPG,
  pricePerLiterPence: number = DEFAULT_UK_PETROL_PRICE_PENCE
): Promise<RouteData> {
  const activeToken = token || DEFAULT_MAPBOX_TOKEN;

  if (activeToken && activeToken.trim().length > 0) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&access_token=${activeToken.trim()}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
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
      }
    } catch (err) {
      console.warn('Mapbox Directions API error, falling back to OSRM:', err);
    }
  }

  // Fallback to OSRM Public Routing API
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
  const res = await fetch(osrmUrl);
  if (!res.ok) {
    throw new Error('Failed to compute route from both Mapbox and OSRM services.');
  }

  const data = await res.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No driving route found between specified points.');
  }

  const route = data.routes[0];
  return {
    origin,
    destination,
    geometry: route.geometry,
    telemetry: computeTelemetry(route.distance, route.duration, mpg, pricePerLiterPence),
    provider: 'osrm',
  };
}
