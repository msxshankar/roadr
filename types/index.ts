export interface LocationPoint {
  name: string;
  lng: number;
  lat: number;
}

export interface FuelConfig {
  mpg: number;
  pricePerLiterGbp: number;
}

export interface RouteTelemetry {
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
  durationFormatted: string;
  averageSpeedMph: number;
  estimatedFuelLiters: number;
  estimatedFuelCostGbp: number;
  paceNotesSummary: {
    hairpins: number;
    sweepingCurves: number;
    fastStraights: number;
  };
}

export interface RouteData {
  origin: LocationPoint;
  destination: LocationPoint;
  geometry: GeoJSON.LineString;
  telemetry: RouteTelemetry;
  provider: 'mapbox' | 'osrm';
}

export interface UKPresetRoute {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  origin: LocationPoint;
  destination: LocationPoint;
}
