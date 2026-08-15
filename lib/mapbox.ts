import { LocationPoint, RouteData, RouteDetails, RouteOption, RouteSegment, RouteTelemetry } from '@/types';
import { snapToNearestRoad } from './geocoding';

export const DEFAULT_MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Default UK market averages. A saved vehicle profile replaces MPG everywhere in the app.
export const DEFAULT_UK_PETROL_PRICE_PENCE = 159.4;
export const DEFAULT_UK_MPG = 42;
export const PREVIEW_BASE_DURATION_SECONDS = 48;
export const MAX_PREVIEW_ZOOM = 19;

const LITERS_PER_GALLON = 4.54609;

export interface ElevationRouteSample {
  distanceMeters: number;
  elevationM: number;
}

export interface RouteStepHint {
  startDistanceMeters: number;
  endDistanceMeters: number;
  roadName?: string;
  speedLimitMph?: number;
  speedLimitSource?: 'route data' | 'OSM' | 'estimated';
  surface?: string;
  widthMeters?: number;
  camber?: string;
  highway?: string;
}

/** Compute route telemetry including distance, duration, fuel volume and cost. */
export function computeTelemetry(
  distanceMeters: number,
  durationSeconds: number,
  mpg: number = DEFAULT_UK_MPG,
  pricePerLiterPence: number = DEFAULT_UK_PETROL_PRICE_PENCE
): RouteTelemetry {
  const safeDistance = Math.max(Number.isFinite(distanceMeters) ? distanceMeters : 0, 0);
  const safeDuration = Math.max(Number.isFinite(durationSeconds) ? durationSeconds : 0, 0);
  const safeMpg = Math.max(Number.isFinite(mpg) ? mpg : DEFAULT_UK_MPG, 1);
  const safePrice = Math.max(
    Number.isFinite(pricePerLiterPence) ? pricePerLiterPence : DEFAULT_UK_PETROL_PRICE_PENCE,
    0
  );

  const miles = safeDistance * 0.000621371;
  const gallons = miles / safeMpg;
  const liters = gallons * LITERS_PER_GALLON;
  const costPounds = (liters * safePrice) / 100;
  const hours = safeDuration / 3600;
  const avgMph = hours > 0 ? Math.round(miles / hours) : 0;

  return {
    distanceMeters: safeDistance,
    distanceMiles: Number(miles.toFixed(1)),
    durationSeconds: safeDuration,
    durationFormatted: formatDuration(safeDuration),
    averageSpeedMph: avgMph,
    estimatedFuelLiters: Number(liters.toFixed(1)),
    estimatedFuelCostGbp: Number(costPounds.toFixed(2)),
    paceNotesSummary: {
      hairpins: Math.max(1, Math.round(miles * 0.4)),
      sweepingCurves: Math.max(2, Math.round(miles * 1.2)),
      fastStraights: Math.max(1, Math.round(miles * 0.8)),
    },
  };
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
}

/** Compute Haversine distance in meters between two [lng, lat] coordinates. */
export function haversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371000;
  const [lng1, lat1] = coord1.map((deg) => (deg * Math.PI) / 180);
  const [lng2, lat2] = coord2.map((deg) => (deg * Math.PI) / 180);
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Precalculate cumulative distances in meters along a route polyline. */
export function computeCumulativeDistances(coordinates: [number, number][]): number[] {
  if (!coordinates || coordinates.length === 0) return [0];
  const cumulative = [0];
  for (let i = 1; i < coordinates.length; i += 1) {
    cumulative.push(cumulative[i - 1] + haversineDistance(coordinates[i - 1], coordinates[i]));
  }
  return cumulative;
}

/** Calculate a bearing angle in degrees between two coordinates. */
export function calculateBearing(coord1: [number, number], coord2: [number, number]): number {
  const [lng1, lat1] = coord1.map((deg) => (deg * Math.PI) / 180);
  const [lng2, lat2] = coord2.map((deg) => (deg * Math.PI) / 180);
  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Shortest-path angle interpolation. */
export function lerpAngle(currentAngle: number, targetAngle: number, alpha: number): number {
  const delta = ((targetAngle - currentAngle + 540) % 360) - 180;
  return (currentAngle + delta * Math.min(Math.max(alpha, 0), 1) + 360) % 360;
}

/** Project point p onto line segment ab */
export function projectPointOnSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): { point: [number, number]; distanceMeters: number; fraction: number } {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return {
      point: a,
      distanceMeters: haversineDistance(p, a),
      fraction: 0,
    };
  }

  const fraction = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projectedPoint: [number, number] = [
    ax + fraction * dx,
    ay + fraction * dy,
  ];

  return {
    point: projectedPoint,
    distanceMeters: haversineDistance(p, projectedPoint),
    fraction,
  };
}

/** Find the closest point and segment on a polyline for a given coordinate */
export function findNearestPointOnPolyline(
  target: [number, number],
  polyline: [number, number][]
): {
  point: [number, number];
  distanceMeters: number;
  segmentIndex: number;
  distanceAlongPolyline: number;
} {
  if (!polyline || polyline.length === 0) {
    return { point: target, distanceMeters: 0, segmentIndex: 0, distanceAlongPolyline: 0 };
  }
  if (polyline.length === 1) {
    return {
      point: polyline[0],
      distanceMeters: haversineDistance(target, polyline[0]),
      segmentIndex: 0,
      distanceAlongPolyline: 0,
    };
  }

  const cumulative = computeCumulativeDistances(polyline);
  let bestDist = Infinity;
  let bestPoint: [number, number] = polyline[0];
  let bestSegmentIndex = 0;
  let bestDistanceAlong = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const result = projectPointOnSegment(target, a, b);

    if (result.distanceMeters < bestDist) {
      bestDist = result.distanceMeters;
      bestPoint = result.point;
      bestSegmentIndex = i;
      const segmentDistance = (cumulative[i + 1] || 0) - (cumulative[i] || 0);
      bestDistanceAlong = (cumulative[i] || 0) + result.fraction * segmentDistance;
    }
  }

  return {
    point: bestPoint,
    distanceMeters: bestDist,
    segmentIndex: bestSegmentIndex,
    distanceAlongPolyline: bestDistanceAlong,
  };
}

/**
 * Determine which leg index in stops a dragged point belongs to.
 * Waypoints list is [origin, ...stops, destination].
 * Returns stop insertion index (0 <= index <= stops.length).
 */
export function findWaypointLegIndex(
  target: [number, number],
  polyline: [number, number][],
  stops: LocationPoint[]
): number {
  if (!polyline || polyline.length < 2) return stops.length;

  const targetProjection = findNearestPointOnPolyline(target, polyline);
  const targetDist = targetProjection.distanceAlongPolyline;

  const stopDistances = stops.map((stop) => {
    return findNearestPointOnPolyline([stop.lng, stop.lat], polyline).distanceAlongPolyline;
  });

  for (let i = 0; i < stopDistances.length; i++) {
    if (targetDist < stopDistances[i]) {
      return i;
    }
  }

  return stops.length;
}

/**
 * Fast client-side routing helper for continuous live route dragging preview.
 * Queries Mapbox Directions (if token is valid) or public OSRM.
 */
export async function fetchLiveDragRoute(
  coords: [number, number][],
  token?: string,
  signal?: AbortSignal
): Promise<[number, number][] | null> {
  if (!coords || coords.length < 2) return null;
  const coordString = coords.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
  const hasValidToken = Boolean(token && token.trim().startsWith('pk.'));

  if (hasValidToken) {
    try {
      const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?overview=full&geometries=geojson&steps=false&access_token=${token?.trim()}`;
      const res = await fetch(mapboxUrl, { signal });
      if (res.ok) {
        const data = await res.json();
        if (data.routes?.[0]?.geometry?.coordinates) {
          return data.routes[0].geometry.coordinates as [number, number][];
        }
      }
    } catch {
      // Fallback to OSRM
    }
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=false`;
  try {
    const res = await fetch(osrmUrl, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates as [number, number][];
    }
    return null;
  } catch {
    return null;
  }
}

function findDistanceIndex(cumulative: number[], targetMeters: number): number {
  let low = 0;
  let high = Math.max(cumulative.length - 2, 0);
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (cumulative[middle + 1] < targetMeters) low = middle + 1;
    else high = middle - 1;
  }
  return Math.min(Math.max(low, 0), Math.max(cumulative.length - 2, 0));
}

function coordinateAtDistance(
  coordinates: [number, number][],
  cumulative: number[],
  targetMeters: number
): [number, number] {
  if (coordinates.length === 0) return [-2.5, 54.5];
  if (coordinates.length === 1) return coordinates[0];
  const boundedTarget = Math.min(Math.max(targetMeters, 0), cumulative[cumulative.length - 1]);
  const startIndex = findDistanceIndex(cumulative, boundedTarget);
  const endIndex = Math.min(startIndex + 1, coordinates.length - 1);
  const segmentLength = Math.max(cumulative[endIndex] - cumulative[startIndex], 0.001);
  const ratio = (boundedTarget - cumulative[startIndex]) / segmentLength;
  return [
    coordinates[startIndex][0] + (coordinates[endIndex][0] - coordinates[startIndex][0]) * ratio,
    coordinates[startIndex][1] + (coordinates[endIndex][1] - coordinates[startIndex][1]) * ratio,
  ];
}

/** Interpolate coordinate and bearing at a physical distance along the route. */
export function interpolateRoutePosition(
  coordinates: [number, number][],
  progress: number,
  cachedCumulativeDistances?: number[]
): { position: [number, number]; bearing: number; index: number } {
  if (!coordinates || coordinates.length === 0) {
    return { position: [-2.5, 54.5], bearing: 0, index: 0 };
  }
  if (coordinates.length === 1) return { position: coordinates[0], bearing: 0, index: 0 };

  const cumulative =
    cachedCumulativeDistances && cachedCumulativeDistances.length === coordinates.length
      ? cachedCumulativeDistances
      : computeCumulativeDistances(coordinates);
  const totalDistance = cumulative[cumulative.length - 1];
  const targetMeters = Math.min(Math.max(progress, 0), 1) * totalDistance;
  const startIndex = findDistanceIndex(cumulative, targetMeters);
  const endIndex = Math.min(startIndex + 1, coordinates.length - 1);
  const segmentLength = Math.max(cumulative[endIndex] - cumulative[startIndex], 0.001);
  const ratio = (targetMeters - cumulative[startIndex]) / segmentLength;
  const startCoord = coordinates[startIndex];
  const endCoord = coordinates[endIndex];
  const position: [number, number] = [
    startCoord[0] + (endCoord[0] - startCoord[0]) * ratio,
    startCoord[1] + (endCoord[1] - startCoord[1]) * ratio,
  ];

  const lookAhead = coordinateAtDistance(coordinates, cumulative, targetMeters + 40);
  return { position, bearing: calculateBearing(startCoord, lookAhead), index: startIndex };
}

/** Find the road segment containing a physical route distance in logarithmic time. */
export function findRouteSegmentAtDistance(
  segments: RouteSegment[],
  distanceMeters: number
): RouteSegment | undefined {
  if (segments.length === 0) return undefined;

  const target = Math.max(Number.isFinite(distanceMeters) ? distanceMeters : 0, 0);
  if (target <= segments[0].startDistanceMeters) return segments[0];
  if (target >= segments[segments.length - 1].endDistanceMeters) return segments[segments.length - 1];

  let low = 0;
  let high = segments.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const segment = segments[middle];
    if (target < segment.startDistanceMeters) high = middle - 1;
    else if (target > segment.endDistanceMeters) low = middle + 1;
    else return segment;
  }

  return segments[Math.min(Math.max(low, 0), segments.length - 1)];
}

function normaliseAngle(angle: number): number {
  return Math.abs(((angle + 540) % 360) - 180);
}

function classifyTurn(angle: number): { rating: number; label: string } {
  if (angle >= 120) return { rating: 1, label: 'Hairpin' };
  if (angle >= 85) return { rating: 2, label: 'Very tight' };
  if (angle >= 55) return { rating: 3, label: 'Technical' };
  if (angle >= 35) return { rating: 4, label: 'Sweeping' };
  if (angle >= 15) return { rating: 5, label: 'Fast bend' };
  return { rating: 6, label: 'Slight / flat' };
}

function parseWidth(width: string | number | undefined): number | undefined {
  if (typeof width === 'number' && Number.isFinite(width)) return width;
  if (typeof width !== 'string') return undefined;
  const match = width.replace(',', '.').match(/[0-9]+(?:\.[0-9]+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function qualityFromSurface(surface: string): RouteSegment['surfaceQuality'] {
  const value = surface.toLowerCase();
  if (/(unpaved|gravel|ground|mud|sand|dirt)/.test(value)) return 'Poor';
  if (/(cobblestone|sett|compacted|fine_gravel)/.test(value)) return 'Fair';
  if (/(paved|asphalt|concrete|chipseal)/.test(value)) return 'Excellent';
  return 'Good';
}

function inferWidth(highway?: string): number {
  switch (highway) {
    case 'motorway':
    case 'trunk':
      return 7.3;
    case 'primary':
    case 'secondary':
      return 6.2;
    case 'tertiary':
      return 5.4;
    case 'residential':
      return 5.1;
    case 'track':
    case 'path':
      return 3.2;
    default:
      return 5.5;
  }
}

function inferSpeedLimit(highway?: string): number | undefined {
  switch (highway) {
    case 'motorway':
      return 70;
    case 'trunk':
      return 70;
    case 'primary':
    case 'secondary':
    case 'tertiary':
    case 'unclassified':
      return 60;
    case 'residential':
    case 'living_street':
      return 30;
    default:
      return undefined;
  }
}

function inferSpeedLimitFromRoadName(roadName?: string): number | undefined {
  if (!roadName) return undefined;
  const reference = roadName.match(/\b([MBA])\s?\d+[A-Z]?\b/i)?.[1]?.toUpperCase();
  if (reference === 'M') return 70;
  if (reference === 'A' || reference === 'B') return 60;
  return undefined;
}

function elevationAtDistance(
  distanceMeters: number,
  samples: ElevationRouteSample[]
): number {
  if (samples.length === 0) return 0;
  if (distanceMeters <= samples[0].distanceMeters) return samples[0].elevationM;
  const last = samples[samples.length - 1];
  if (distanceMeters >= last.distanceMeters) return last.elevationM;
  let low = 0;
  let high = samples.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].distanceMeters < distanceMeters) low = middle + 1;
    else high = middle - 1;
  }
  const before = samples[Math.max(high, 0)];
  const after = samples[Math.min(low, samples.length - 1)];
  const distance = Math.max(after.distanceMeters - before.distanceMeters, 0.001);
  const ratio = (distanceMeters - before.distanceMeters) / distance;
  return before.elevationM + (after.elevationM - before.elevationM) * ratio;
}

function hintAtDistance(distanceMeters: number, hints: RouteStepHint[]): RouteStepHint | undefined {
  return hints.find(
    (hint) => distanceMeters >= hint.startDistanceMeters && distanceMeters <= hint.endDistanceMeters
  );
}

function mostCommon(values: string[], fallback: string): string {
  if (values.length === 0) return fallback;
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || fallback;
}

/** Build road/elevation/turn details from route geometry and optional API metadata. */
export function buildRouteDetails(
  coordinates: [number, number][],
  elevationSamples: ElevationRouteSample[] = [],
  stepHints: RouteStepHint[] = []
): RouteDetails {
  if (coordinates.length < 2) {
    return {
      elevationProfile: [],
      totalElevationGainM: 0,
      minimumElevationM: 0,
      maximumElevationM: 0,
      maxGradientPercent: 0,
      averageGradientPercent: 0,
      averageRoadWidthMeters: 0,
      narrowRoadSharePercent: 0,
      surfaceQuality: 'Good',
      surface: 'Paved',
      camber: 'Unknown',
      tightTurnCount: 0,
      speedLimitCoveragePercent: 0,
      segments: [],
      hasElevationData: false,
      source: 'Route geometry estimate',
    };
  }

  const cumulative = computeCumulativeDistances(coordinates);
  const segments: RouteSegment[] = [];
  let elevationGain = 0;
  let weightedGradient = 0;
  let narrowCount = 0;
  let speedLimitCount = 0;
  let widthTotal = 0;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const startDistance = cumulative[index];
    const endDistance = cumulative[index + 1];
    const distance = Math.max(endDistance - startDistance, 0.1);
    const previousBearing =
      index > 0 ? calculateBearing(coordinates[index - 1], coordinates[index]) : calculateBearing(coordinates[index], coordinates[index + 1]);
    const nextBearing =
      index < coordinates.length - 2
        ? calculateBearing(coordinates[index], coordinates[index + 1])
        : previousBearing;
    const turn = classifyTurn(normaliseAngle(nextBearing - previousBearing));
    const hint = hintAtDistance(startDistance + distance / 2, stepHints);
    const elevationStart = elevationAtDistance(startDistance, elevationSamples);
    const elevationEnd = elevationAtDistance(endDistance, elevationSamples);
    const gradient = ((elevationEnd - elevationStart) / distance) * 100;
    const widthMeters = hint?.widthMeters || inferWidth(hint?.highway);
    const widthLabel: RouteSegment['widthLabel'] =
      widthMeters < 4.5 ? 'Narrow' : widthMeters > 7 ? 'Wide' : 'Standard';
    const surface = hint?.surface || 'Paved';
    // Use a road-class default only when a road class is known. A blanket 60 mph
    // value made an un-enriched route look authoritative and hid pending data.
    const speedLimit = hint?.speedLimitMph ?? inferSpeedLimit(hint?.highway) ?? inferSpeedLimitFromRoadName(hint?.roadName);

    if (elevationEnd > elevationStart) elevationGain += elevationEnd - elevationStart;
    if (widthLabel === 'Narrow') narrowCount += 1;
    if (speedLimit) speedLimitCount += 1;
    widthTotal += widthMeters;
    weightedGradient += Math.abs(gradient) * distance;

    segments.push({
      id: `segment-${index}`,
      coordinates: [coordinates[index], coordinates[index + 1]],
      startDistanceMeters: startDistance,
      endDistanceMeters: endDistance,
      distanceMeters: distance,
      roadName: hint?.roadName || 'Unnamed road',
      elevationStartM: Number(elevationStart.toFixed(1)),
      elevationEndM: Number(elevationEnd.toFixed(1)),
      gradientPercent: Number(gradient.toFixed(1)),
      widthMeters: Number(widthMeters.toFixed(1)),
      widthLabel,
      camber: hint?.camber || (turn.rating <= 2 ? 'Variable on tight bend' : 'Typical road crown'),
      surface,
      surfaceQuality: qualityFromSurface(surface),
      turnRating: turn.rating,
      turnLabel: turn.label,
      ...(speedLimit
        ? {
            speedLimitMph: speedLimit,
            speedLimitSource: hint?.speedLimitSource || 'estimated',
          }
        : {}),
    });
  }

  const elevations = coordinates.map((_, index) => elevationAtDistance(cumulative[index], elevationSamples));
  const finiteElevations = elevations.filter((value) => Number.isFinite(value));
  const minimumElevation = finiteElevations.length ? Math.min(...finiteElevations) : 0;
  const maximumElevation = finiteElevations.length ? Math.max(...finiteElevations) : 0;
  const totalDistance = Math.max(cumulative[cumulative.length - 1], 1);
  const elevationProfile: RouteDetails['elevationProfile'] = [];
  const profileStride = Math.max(1, Math.ceil((coordinates.length - 1) / 48));
  for (let index = 0; index < coordinates.length; index += profileStride) {
    const segment = segments[Math.min(index, segments.length - 1)];
    elevationProfile.push({
      distanceMeters: Number(cumulative[index].toFixed(1)),
      elevationM: Number(elevations[index].toFixed(1)),
      gradientPercent: segment?.gradientPercent || 0,
    });
  }
  const lastProfile = elevationProfile[elevationProfile.length - 1];
  if (lastProfile && lastProfile.distanceMeters !== cumulative[cumulative.length - 1]) {
    lastProfile.distanceMeters = Number(totalDistance.toFixed(1));
    lastProfile.elevationM = Number(elevations[elevations.length - 1].toFixed(1));
  }

  const quality = mostCommon(segments.map((segment) => segment.surfaceQuality), 'Good') as RouteDetails['surfaceQuality'];
  const sourceParts = [];
  if (elevationSamples.length > 1) sourceParts.push('terrain');
  if (stepHints.length > 0) sourceParts.push('route hints');
  const source = sourceParts.length ? sourceParts.join(' + ') : 'Route geometry estimate';

  return {
    elevationProfile,
    totalElevationGainM: Number(elevationGain.toFixed(0)),
    minimumElevationM: Number(minimumElevation.toFixed(0)),
    maximumElevationM: Number(maximumElevation.toFixed(0)),
    maxGradientPercent: Number(
      Math.max(...segments.map((segment) => Math.abs(segment.gradientPercent)), 0).toFixed(1)
    ),
    averageGradientPercent: Number((weightedGradient / totalDistance).toFixed(1)),
    averageRoadWidthMeters: Number((widthTotal / Math.max(segments.length, 1)).toFixed(1)),
    narrowRoadSharePercent: Number(((narrowCount / Math.max(segments.length, 1)) * 100).toFixed(0)),
    surfaceQuality: quality,
    surface: mostCommon(segments.map((segment) => segment.surface), 'Paved'),
    camber: mostCommon(segments.map((segment) => segment.camber), 'Typical road crown'),
    tightTurnCount: segments.filter((segment) => segment.turnRating <= 2).length,
    speedLimitCoveragePercent: Number(
      ((speedLimitCount / Math.max(segments.length, 1)) * 100).toFixed(0)
    ),
    segments,
    hasElevationData: elevationSamples.length > 1,
    source,
  };
}

/** Merge slower terrain/OSM enrichment without throwing away fast route hints. */
export function mergeRouteDetails(base: RouteDetails, enrichment: RouteDetails): RouteDetails {
  if (enrichment.segments.length === 0 || base.segments.length === 0) return enrichment;

  const segments = enrichment.segments.map((segment, index) => {
    const original = base.segments[index];
    if (!original) return segment;

    const hasAuthoritativeEnrichment = Boolean(segment.speedLimitSource && segment.speedLimitSource !== 'estimated');
    const hasAuthoritativeBase = Boolean(original.speedLimitSource && original.speedLimitSource !== 'estimated');
    const speedLimitMph = hasAuthoritativeEnrichment || !hasAuthoritativeBase
      ? segment.speedLimitMph
      : original.speedLimitMph;
    const roadName = segment.roadName === 'Unnamed road' ? original.roadName : segment.roadName;
    const surface = segment.surface === 'Paved' && original.surface !== 'Paved' ? original.surface : segment.surface;
    const mergedSegment = {
      ...segment,
      roadName,
      surface,
      surfaceQuality: surface === segment.surface ? segment.surfaceQuality : original.surfaceQuality,
      ...(speedLimitMph !== undefined
        ? {
            speedLimitMph,
            speedLimitSource: hasAuthoritativeEnrichment
              ? segment.speedLimitSource
              : original.speedLimitSource || segment.speedLimitSource || 'estimated',
          }
        : {}),
    };

    return base.hasElevationData && !enrichment.hasElevationData
      ? {
          ...mergedSegment,
          elevationStartM: original.elevationStartM,
          elevationEndM: original.elevationEndM,
          gradientPercent: original.gradientPercent,
        }
      : mergedSegment;
  });

  const terrainDetails = enrichment.hasElevationData ? enrichment : base;
  const averageRoadWidthMeters = segments.reduce((total, segment) => total + segment.widthMeters, 0) / Math.max(segments.length, 1);
  const narrowRoadSharePercent = (segments.filter((segment) => segment.widthLabel === 'Narrow').length / Math.max(segments.length, 1)) * 100;
  const surfaceQuality = mostCommon(segments.map((segment) => segment.surfaceQuality), 'Good') as RouteDetails['surfaceQuality'];
  const surface = mostCommon(segments.map((segment) => segment.surface), 'Paved');
  const camber = mostCommon(segments.map((segment) => segment.camber), 'Typical road crown');
  const source = Array.from(new Set(
    `${base.source} + ${enrichment.source}`
      .split(' + ')
      .map((part) => part.trim())
      .filter((part) => part && part !== 'Route geometry estimate')
  )).join(' + ') || 'Route geometry estimate';

  return {
    ...enrichment,
    elevationProfile: terrainDetails.elevationProfile,
    totalElevationGainM: terrainDetails.totalElevationGainM,
    minimumElevationM: terrainDetails.minimumElevationM,
    maximumElevationM: terrainDetails.maximumElevationM,
    maxGradientPercent: terrainDetails.maxGradientPercent,
    averageGradientPercent: terrainDetails.averageGradientPercent,
    averageRoadWidthMeters: Number(averageRoadWidthMeters.toFixed(1)),
    narrowRoadSharePercent: Number(narrowRoadSharePercent.toFixed(0)),
    surfaceQuality,
    surface,
    camber,
    tightTurnCount: segments.filter((segment) => segment.turnRating <= 2).length,
    hasElevationData: base.hasElevationData || enrichment.hasElevationData,
    source,
    segments,
    speedLimitCoveragePercent: Number(
      ((segments.filter((segment) => Number.isFinite(segment.speedLimitMph)).length / Math.max(segments.length, 1)) * 100).toFixed(0)
    ),
  };
}

function parseSpeedLimit(value: unknown): number | undefined {
  if (value && typeof value === 'object') {
    const speed = (value as { speed?: unknown; value?: unknown }).speed ?? (value as { value?: unknown }).value;
    const unit = String((value as { unit?: unknown }).unit || '');
    if (speed !== undefined) return parseSpeedLimit(`${speed} ${unit}`);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value > 100 ? value * 0.621371 : value;
  if (typeof value !== 'string') return undefined;
  if (/national/i.test(value)) return undefined;
  const match = value.match(/[0-9]+(?:\.[0-9]+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  if (!Number.isFinite(parsed)) return undefined;
  return /km/i.test(value) ? parsed * 0.621371 : parsed;
}

function extractStepSpeed(step: any): number | undefined {
  const direct = parseSpeedLimit(step?.maxspeed);
  if (direct) return direct;
  const annotation = parseSpeedLimit(step?.annotation?.maxspeed);
  if (annotation) return annotation;
  const intersection = step?.intersections?.find((item: any) => item?.maxspeed);
  return parseSpeedLimit(intersection?.maxspeed);
}

function extractAnnotationSpeed(
  leg: any,
  stepStartMeters: number,
  stepEndMeters: number,
  legDistanceMeters: number
): number | undefined {
  const annotation = leg?.annotation;
  const speeds = annotation?.maxspeed;
  if (!Array.isArray(speeds) || speeds.length === 0) return undefined;
  const distances = Array.isArray(annotation.distance) ? annotation.distance : [];
  if (distances.length === speeds.length) {
    let distance = 0;
    for (let index = 0; index < speeds.length; index += 1) {
      const segmentDistance = Math.max(Number(distances[index]) || 0, 0);
      const overlapsStep = distance <= stepEndMeters && distance + segmentDistance >= stepStartMeters;
      if (overlapsStep) {
        const speed = parseSpeedLimit(speeds[index]);
        if (speed) return speed;
      }
      distance += segmentDistance;
    }
    return undefined;
  }

  const midpointRatio = (stepStartMeters + stepEndMeters) / 2 / Math.max(legDistanceMeters, 1);
  const index = Math.min(Math.floor(midpointRatio * speeds.length), speeds.length - 1);
  return parseSpeedLimit(speeds[index]);
}

/** Convert Mapbox/OSRM step metadata into distance-addressable hints. */
export function extractRouteStepHints(route: any): RouteStepHint[] {
  const hints: RouteStepHint[] = [];
  let cumulative = 0;
  for (const leg of route?.legs || []) {
    const legDistance = (leg.steps || []).reduce(
      (total: number, step: any) => total + Math.max(Number(step.distance) || 0, 0),
      0
    );
    let legCumulative = 0;
    for (const step of leg.steps || []) {
      const distance = Math.max(Number(step.distance) || 0, 0);
      const speedLimit = extractStepSpeed(step) || extractAnnotationSpeed(leg, legCumulative, legCumulative + distance, legDistance);
      const roadName = [step.name, step.ref].filter(Boolean).join(' · ');
      hints.push({
        startDistanceMeters: cumulative,
        endDistanceMeters: cumulative + distance,
        roadName: roadName || undefined,
        speedLimitMph: speedLimit,
        speedLimitSource: speedLimit ? 'route data' : undefined,
      });
      cumulative += distance;
      legCumulative += distance;
    }
  }
  return hints;
}

/** Sample a long route without flooding terrain/OSM services with requests. */
export function sampleRouteCoordinates(
  coordinates: [number, number][],
  maxSamples = 48
): Array<{ coordinate: [number, number]; distanceMeters: number }> {
  if (coordinates.length === 0) return [];
  const cumulative = computeCumulativeDistances(coordinates);
  const total = cumulative[cumulative.length - 1];
  const sampleCount = Math.min(Math.max(maxSamples, 2), coordinates.length);
  return Array.from({ length: sampleCount }, (_, index) => {
    const progress = sampleCount === 1 ? 0 : index / (sampleCount - 1);
    const distanceMeters = total * progress;
    return {
      coordinate: coordinateAtDistance(coordinates, cumulative, distanceMeters),
      distanceMeters,
    };
  });
}

async function readJson(response: Response): Promise<any> {
  if (!response.ok) throw new Error(`Route service returned ${response.status}`);
  return response.json();
}

function buildRouteOption(
  route: any,
  index: number,
  origin: LocationPoint,
  destination: LocationPoint,
  stops: LocationPoint[],
  mpg: number,
  pricePerLiterPence: number,
  provider: 'mapbox' | 'osrm'
): RouteOption {
  const coordinates = route.geometry.coordinates as [number, number][];
  return {
    id: `${provider}-route-${index + 1}`,
    origin,
    destination,
    stops,
    geometry: route.geometry,
    telemetry: computeTelemetry(route.distance, route.duration, mpg, pricePerLiterPence),
    details: buildRouteDetails(coordinates, [], extractRouteStepHints(route)),
    provider,
  };
}
export interface RoutingErrorDetail {
  failingIndex: number;
  targetKey: 'origin' | 'destination' | `stop-${number}`;
  failingLocation: LocationPoint;
  message: string;
  suggestedLocation?: LocationPoint;
}

export async function isolateRoutingError(
  origin: LocationPoint,
  destination: LocationPoint,
  stops: LocationPoint[] = [],
  token?: string
): Promise<RoutingErrorDetail> {
  const points = [origin, ...stops, destination];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const legCoords = `${p1.lng},${p1.lat};${p2.lng},${p2.lat}`;
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${legCoords}?overview=false`;
      const res = await fetch(osrmUrl);
      const data = await res.json();
      if (!data.routes || data.routes.length === 0 || data.code !== 'Ok') {
        const failingIndex = i;
        const targetKey: 'origin' | 'destination' | `stop-${number}` =
          failingIndex === 0
            ? 'origin'
            : failingIndex === points.length - 1
              ? 'destination'
              : `stop-${failingIndex - 1}`;
        const failingLocation = points[failingIndex];
        const suggestedLocation = await snapToNearestRoad(failingLocation.lng, failingLocation.lat, token);
        return {
          failingIndex,
          targetKey,
          failingLocation,
          message: `Unable to route to "${failingLocation.name}". Driveable road access required.`,
          suggestedLocation,
        };
      }
    } catch {
      // Continue checking next legs
    }
  }

  const failingIndex = points.length - 1;
  const failingLocation = destination;
  const suggestedLocation = await snapToNearestRoad(failingLocation.lng, failingLocation.lat, token);
  return {
    failingIndex,
    targetKey: 'destination',
    failingLocation,
    message: `Unable to compute a route between the selected locations.`,
    suggestedLocation,
  };
}

export function isSameLocation(a: LocationPoint | null, b: LocationPoint | null): boolean {
  if (!a || !b) return false;
  const sameCoordinates = Math.abs(a.lng - b.lng) < 0.0001 && Math.abs(a.lat - b.lat) < 0.0001;
  const sameName = a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
  return sameCoordinates || sameName;
}

/** Fetch a route through Mapbox when configured, with an OSRM fallback. */
export async function fetchRoute(
  origin: LocationPoint,
  destination: LocationPoint,
  token?: string,
  mpg: number = DEFAULT_UK_MPG,
  pricePerLiterPence: number = DEFAULT_UK_PETROL_PRICE_PENCE,
  stops: LocationPoint[] = []
): Promise<RouteData> {
  if (isSameLocation(origin, destination) && stops.length === 0) {
    const err = new Error(`To calculate a round-trip loop back to ${origin.name}, please add at least one intermediate stop.`);
    (err as any).routingErrorDetail = {
      failingIndex: 0,
      targetKey: 'destination',
      failingLocation: destination,
      message: `To calculate a round-trip loop back to ${origin.name}, please add at least one intermediate stop.`,
    };
    throw err;
  }

  const points = [origin, ...stops, destination];
  const coordinateString = points.map((point) => `${point.lng},${point.lat}`).join(';');
  const hasValidToken = Boolean(token && token.trim().startsWith('pk.'));

  if (hasValidToken) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinateString}?alternatives=true&overview=full&geometries=geojson&steps=true&annotations=maxspeed&language=en-GB&access_token=${token?.trim()}`;
      const data = await readJson(await fetch(url));
      if (data.routes?.length > 0) {
        const options = data.routes.slice(0, 4).map((route: any, index: number) => buildRouteOption(route, index, origin, destination, stops, mpg, pricePerLiterPence, 'mapbox')) as RouteOption[];
        const [primary, ...alternatives] = options;
        return {
          ...primary,
          alternatives,
        };
      }
    } catch (error) {
      console.warn('Mapbox Directions API failed, attempting OSRM fallback.', error);
    }
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinateString}?alternatives=true&overview=full&geometries=geojson&steps=true&annotations=true`;
  const osrmData = await readJson(await fetch(osrmUrl));
  if (osrmData.routes?.length > 0) {
    const options = osrmData.routes.slice(0, 4).map((route: any, index: number) => buildRouteOption(route, index, origin, destination, stops, mpg, pricePerLiterPence, 'osrm')) as RouteOption[];
    const [primary, ...alternatives] = options;
    return {
      ...primary,
      alternatives,
    };
  }

  const detailedError = await isolateRoutingError(origin, destination, stops, token);
  const err = new Error(detailedError.message);
  (err as any).routingErrorDetail = detailedError;
  throw err;
}

/** Enrich the fast geometry estimate with terrain and road tags from the app API route. */
export async function fetchRouteDetails(
  coordinates: [number, number][],
  signal?: AbortSignal
): Promise<RouteDetails> {
  const response = await fetch('/api/route-details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ coordinates, mode: 'terrain' }),
  });
  return readJson(response);
}

/** Fetch road tags separately so speed limits can update before terrain returns. */
export async function fetchRouteRoadDetails(
  coordinates: [number, number][],
  signal?: AbortSignal
): Promise<RouteDetails> {
  const response = await fetch('/api/route-details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ coordinates, mode: 'road' }),
  });
  return readJson(response);
}
