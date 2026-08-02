import { describe, expect, it } from 'vitest';
import { snapToNearestRoad } from '../lib/geocoding';
import { isolateRoutingError } from '../lib/mapbox';

describe('Map Click Road Snapping & Routing Error Isolation', () => {
  it('snaps arbitrary coordinates to a formatted location with road details', async () => {
    // London coordinates (Big Ben / Westminster area)
    const result = await snapToNearestRoad(-0.1246, 51.5007);
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('lng');
    expect(result).toHaveProperty('lat');
    expect(typeof result.name).toBe('string');
    expect(result.name.length).toBeGreaterThan(0);
    expect(Number.isFinite(result.lng)).toBe(true);
    expect(Number.isFinite(result.lat)).toBe(true);
  });

  it('isolates unroutable waypoints and generates suggested road coordinates', async () => {
    const validOrigin = { name: 'London', lng: -0.1276, lat: 51.5074 };
    const invalidOffroad = { name: 'Middle of Ocean', lng: -30.0, lat: 30.0 };
    const validDestination = { name: 'Oxford', lng: -1.2577, lat: 51.752 };

    const errorDetail = await isolateRoutingError(validOrigin, validDestination, [invalidOffroad]);
    expect(errorDetail).toBeDefined();
    expect(errorDetail).toHaveProperty('failingIndex');
    expect(errorDetail).toHaveProperty('message');
    expect(errorDetail).toHaveProperty('suggestedLocation');
    expect(errorDetail.suggestedLocation).toHaveProperty('name');
  });
});
