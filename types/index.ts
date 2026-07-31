export interface LocationPoint {
  name: string;
  lng: number;
  lat: number;
}

export type VehicleFuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric';

export interface VehicleProfile {
  id: string;
  nickname: string;
  make: string;
  model: string;
  year: string;
  fuelType: VehicleFuelType;
  mpg: number;
  tankLiters: number;
}

export interface FuelConfig {
  mpg: number;
  pricePerLiterGbp: number;
}

export interface ElevationSample {
  distanceMeters: number;
  elevationM: number;
  gradientPercent: number;
}

export interface RouteSegment {
  id: string;
  coordinates: [number, number][];
  startDistanceMeters: number;
  endDistanceMeters: number;
  distanceMeters: number;
  roadName: string;
  elevationStartM: number;
  elevationEndM: number;
  gradientPercent: number;
  widthMeters: number;
  widthLabel: 'Narrow' | 'Standard' | 'Wide';
  camber: string;
  surface: string;
  surfaceQuality: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  turnRating: number;
  turnLabel: string;
  speedLimitMph?: number;
  speedLimitSource?: 'route data' | 'OSM' | 'estimated';
}

export interface RouteDetails {
  elevationProfile: ElevationSample[];
  totalElevationGainM: number;
  minimumElevationM: number;
  maximumElevationM: number;
  maxGradientPercent: number;
  averageGradientPercent: number;
  averageRoadWidthMeters: number;
  narrowRoadSharePercent: number;
  surfaceQuality: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  surface: string;
  camber: string;
  tightTurnCount: number;
  speedLimitCoveragePercent: number;
  segments: RouteSegment[];
  hasElevationData: boolean;
  source: string;
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
  stops: LocationPoint[];
  geometry: GeoJSON.LineString;
  telemetry: RouteTelemetry;
  details: RouteDetails;
  provider: 'mapbox' | 'osrm';
}

export interface RecordedRoute {
  id: string;
  name: string;
  vehicleId: string;
  origin: LocationPoint;
  destination: LocationPoint;
  stops: LocationPoint[];
  recordedAt: string;
  distanceMiles: number;
  fuelLiters: number;
  fuelCostGbp: number;
  durationSeconds: number;
}

export interface UKPresetRoute {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  origin: LocationPoint;
  destination: LocationPoint;
}
