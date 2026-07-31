import { NextResponse } from 'next/server';
import {
  buildRouteDetails,
  computeCumulativeDistances,
  haversineDistance,
  sampleRouteCoordinates,
} from '@/lib/mapbox';
import { RouteStepHint } from '@/lib/mapbox';

interface OSMWay {
  tags?: Record<string, string>;
  center?: { lat: number; lon: number };
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.replace(',', '.').match(/[0-9]+(?:\.[0-9]+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseSpeed(value: string | undefined): number | undefined {
  if (!value || /national/i.test(value)) return undefined;
  const parsed = parseNumber(value);
  if (!parsed) return undefined;
  return /km/i.test(value) ? parsed * 0.621371 : parsed;
}

function buildOverpassQuery(samples: Array<{ coordinate: [number, number] }>): string {
  const clauses = samples
    .map(({ coordinate: [lng, lat] }) => `way(around:35,${lat},${lng})["highway"];`)
    .join('');
  return `[out:json][timeout:10];(${clauses});out tags center;`;
}

function nearestWay(
  coordinate: [number, number],
  ways: OSMWay[]
): OSMWay | undefined {
  let closest: OSMWay | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const way of ways) {
    if (!way.center) continue;
    const distance = haversineDistance(coordinate, [way.center.lon, way.center.lat]);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = way;
    }
  }
  return closestDistance <= 120 ? closest : undefined;
}

async function fetchElevation(
  samples: Array<{ coordinate: [number, number]; distanceMeters: number }>
) {
  if (samples.length === 0) return [];
  const locations = samples
    .map(({ coordinate: [lng, lat] }) => `${lat},${lng}`)
    .join('|');
  const response = await fetch(
    `https://api.open-elevation.com/api/v1/lookup?locations=${encodeURIComponent(locations)}`,
    { signal: AbortSignal.timeout(9000) }
  );
  if (!response.ok) throw new Error(`Elevation service returned ${response.status}`);
  const data = await response.json();
  return (data.results || [])
    .map((item: { elevation?: number }, index: number) => ({
      distanceMeters: samples[index]?.distanceMeters || 0,
      elevationM: Number(item.elevation),
    }))
    .filter((item: { elevationM: number }) => Number.isFinite(item.elevationM));
}

async function fetchRoadWays(samples: Array<{ coordinate: [number, number] }>) {
  if (samples.length === 0) return [] as OSMWay[];
  const query = buildOverpassQuery(samples);
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Roadr UK route planner' },
        signal: AbortSignal.timeout(11000),
      });
      if (!response.ok) continue;
      const data = await response.json();
      return (data.elements || []) as OSMWay[];
    } catch {
      // Try the secondary public Overpass instance before falling back to estimates.
    }
  }
  throw new Error('OpenStreetMap service unavailable');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const coordinates = Array.isArray(body?.coordinates)
      ? body.coordinates.filter(
          (coordinate: unknown): coordinate is [number, number] =>
            Array.isArray(coordinate) && coordinate.length >= 2 &&
            Number.isFinite(Number(coordinate[0])) && Number.isFinite(Number(coordinate[1]))
        ).map((coordinate: [number, number]) => [Number(coordinate[0]), Number(coordinate[1])] as [number, number])
      : [];

    if (coordinates.length < 2) {
      return NextResponse.json({ error: 'A route geometry is required.' }, { status: 400 });
    }

    const elevationSamples = sampleRouteCoordinates(coordinates, 40);
    const roadSamples = sampleRouteCoordinates(coordinates, 18);
    const [elevationResult, waysResult] = await Promise.allSettled([
      fetchElevation(elevationSamples),
      fetchRoadWays(roadSamples),
    ]);
    const elevations = elevationResult.status === 'fulfilled' ? elevationResult.value : [];
    const ways = waysResult.status === 'fulfilled' ? waysResult.value : [];
    const routeCumulative = computeCumulativeDistances(coordinates);
    const stepHints: RouteStepHint[] = [];

    for (let index = 0; index < roadSamples.length; index += 1) {
      const sample = roadSamples[index];
      const nextSample = roadSamples[index + 1];
      const way = nearestWay(sample.coordinate, ways);
      const tags = way?.tags || {};
      const startDistance = sample.distanceMeters;
      const endDistance = nextSample?.distanceMeters || routeCumulative[routeCumulative.length - 1];
      if (!Object.keys(tags).length) continue;
      stepHints.push({
        startDistanceMeters: startDistance,
        endDistanceMeters: endDistance,
        roadName: tags.name || tags.ref || undefined,
        speedLimitMph: parseSpeed(tags.maxspeed),
        speedLimitSource: tags.maxspeed ? 'OSM' : undefined,
        surface: tags.surface || undefined,
        widthMeters: parseNumber(tags.width),
        camber: tags.camber || undefined,
        highway: tags.highway,
      });
    }

    const details = buildRouteDetails(coordinates, elevations, stepHints);
    const sourceParts = [];
    if (elevations.length > 1) sourceParts.push('Open-Elevation terrain');
    if (stepHints.length > 0) sourceParts.push('OpenStreetMap road tags');
    details.source = sourceParts.length ? sourceParts.join(' + ') : 'Route geometry estimate';

    return NextResponse.json(details);
  } catch (error) {
    console.warn('Unable to enrich route details:', error);
    return NextResponse.json({ error: 'Route details are temporarily unavailable.' }, { status: 502 });
  }
}
