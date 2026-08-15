import { describe, it, expect } from 'vitest';
import {
  projectPointOnSegment,
  findNearestPointOnPolyline,
  findWaypointLegIndex,
} from '../lib/mapbox';
import { LocationPoint } from '../types';

describe('Route Polyline Projection & Leg Index Determination', () => {
  it('projects a point perpendicularly onto a horizontal segment', () => {
    const a: [number, number] = [0, 0];
    const b: [number, number] = [10, 0];
    const p: [number, number] = [5, 2];

    const result = projectPointOnSegment(p, a, b);
    expect(result.point[0]).toBeCloseTo(5);
    expect(result.point[1]).toBeCloseTo(0);
    expect(result.fraction).toBeCloseTo(0.5);
  });

  it('clamps projection to segment endpoints when point is beyond bounds', () => {
    const a: [number, number] = [0, 0];
    const b: [number, number] = [10, 0];
    const p: [number, number] = [-5, 2];

    const result = projectPointOnSegment(p, a, b);
    expect(result.point[0]).toBeCloseTo(0);
    expect(result.point[1]).toBeCloseTo(0);
    expect(result.fraction).toBe(0);
  });

  it('finds the nearest point and segment along a multi-point polyline', () => {
    const polyline: [number, number][] = [
      [-0.1, 51.5], // London
      [-1.2, 51.7], // Oxford
      [-1.9, 52.4], // Birmingham
    ];

    // Point near Oxford
    const query: [number, number] = [-1.22, 51.72];
    const result = findNearestPointOnPolyline(query, polyline);

    expect(result.point).toBeDefined();
    expect(result.segmentIndex).toBeGreaterThanOrEqual(0);
    expect(result.distanceAlongPolyline).toBeGreaterThan(0);
  });

  it('correctly identifies which stop leg a dragged point belongs to', () => {
    const polyline: [number, number][] = [
      [-0.1, 51.5], // Origin: London
      [-0.6, 51.6],
      [-1.2, 51.7], // Stop 1: Oxford
      [-1.5, 52.0],
      [-1.9, 52.4], // Destination: Birmingham
    ];

    const stops: LocationPoint[] = [
      { name: 'Oxford', lng: -1.2, lat: 51.7 },
    ];

    // Point between London and Oxford -> should be inserted at index 0 (before Oxford)
    const legBeforeOxford = findWaypointLegIndex([-0.5, 51.58], polyline, stops);
    expect(legBeforeOxford).toBe(0);

    // Point between Oxford and Birmingham -> should be inserted at index 1 (after Oxford)
    const legAfterOxford = findWaypointLegIndex([-1.6, 52.1], polyline, stops);
    expect(legAfterOxford).toBe(1);
  });
});
