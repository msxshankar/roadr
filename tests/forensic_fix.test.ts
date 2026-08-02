import { describe, expect, it } from 'vitest';
import { normaliseAppState } from '../lib/state';

describe('Forensic Bug Fixes', () => {
  describe('Bug A: TIMESTAMPTZ Date object handling', () => {
    it('preserves recorded routes when recordedAt is a JavaScript Date object (as returned by PostgreSQL TIMESTAMPTZ)', () => {
      const state = normaliseAppState({
        vehicles: [{ id: 'v1', nickname: 'Car', make: '', model: '', year: '', fuelType: 'petrol', mpg: 40, tankLiters: 50 }],
        activeVehicleId: 'v1',
        savedPlaces: [],
        recordedRoutes: [
          {
            id: 'drive-1',
            name: 'Test Drive',
            vehicleId: 'v1',
            origin: { name: 'A', lng: -0.1, lat: 51.5 },
            destination: { name: 'B', lng: -0.2, lat: 51.6 },
            stops: [],
            recordedAt: new Date('2026-08-02T12:00:00.000Z'), // Date object, NOT string!
            distanceMiles: 10,
            fuelLiters: 1.5,
            fuelCostGbp: 2.3,
            durationSeconds: 1200,
          },
        ],
      });

      // CRITICAL: This MUST be 1, not 0! Previously the Date object caused normaliseRecordedRoute to return null.
      expect(state.recordedRoutes).toHaveLength(1);
      expect(state.recordedRoutes[0].name).toBe('Test Drive');
      expect(state.recordedRoutes[0].recordedAt).toBe('2026-08-02T12:00:00.000Z');
    });

    it('still works correctly when recordedAt is an ISO string (as sent from frontend)', () => {
      const state = normaliseAppState({
        vehicles: [{ id: 'v1', nickname: 'Car', make: '', model: '', year: '', fuelType: 'petrol', mpg: 40, tankLiters: 50 }],
        activeVehicleId: 'v1',
        savedPlaces: [],
        recordedRoutes: [
          {
            id: 'drive-2',
            name: 'String Date Drive',
            vehicleId: 'v1',
            origin: { name: 'C', lng: -0.3, lat: 51.7 },
            destination: { name: 'D', lng: -0.4, lat: 51.8 },
            stops: [],
            recordedAt: '2026-08-02T14:00:00.000Z', // string, as sent from frontend
            distanceMiles: 20,
            fuelLiters: 2.5,
            fuelCostGbp: 3.8,
            durationSeconds: 2400,
          },
        ],
      });

      expect(state.recordedRoutes).toHaveLength(1);
      expect(state.recordedRoutes[0].recordedAt).toBe('2026-08-02T14:00:00.000Z');
    });

    it('rejects invalid recordedAt values (neither string nor Date)', () => {
      const state = normaliseAppState({
        vehicles: [],
        activeVehicleId: null,
        savedPlaces: [],
        recordedRoutes: [
          {
            id: 'drive-3',
            name: 'Bad Date Drive',
            vehicleId: 'v1',
            origin: { name: 'E', lng: -0.5, lat: 51.9 },
            destination: { name: 'F', lng: -0.6, lat: 52.0 },
            stops: [],
            recordedAt: 12345, // number - invalid
            distanceMiles: 5,
            fuelLiters: 0.8,
            fuelCostGbp: 1.2,
            durationSeconds: 600,
          },
        ],
      });

      expect(state.recordedRoutes).toHaveLength(0);
    });

    it('simulates full database read/write cycle without data loss', () => {
      // Step 1: Frontend creates a drive with string recordedAt
      const frontendState = {
        vehicles: [{ id: 'v1', nickname: 'Car', make: 'Ford', model: 'Focus', year: '2020', fuelType: 'petrol', mpg: 42, tankLiters: 50 }],
        activeVehicleId: 'v1',
        savedPlaces: [],
        recordedRoutes: [
          {
            id: 'drive-100',
            name: 'London to Oxford',
            vehicleId: 'v1',
            origin: { name: 'London', lng: -0.1276, lat: 51.5074 },
            destination: { name: 'Oxford', lng: -1.2577, lat: 51.752 },
            stops: [],
            recordedAt: '2026-08-02T15:00:00.000Z',
            distanceMiles: 56,
            fuelLiters: 6.1,
            fuelCostGbp: 9.5,
            durationSeconds: 5400,
          },
        ],
      };

      // Step 2: normaliseAppState on PUT (frontend -> database) works fine
      const putNormalised = normaliseAppState(frontendState);
      expect(putNormalised.recordedRoutes).toHaveLength(1);
      expect(putNormalised.vehicles).toHaveLength(1);

      // Step 3: Simulate database GET returning Date objects (as PostgreSQL does)
      const dbResponse = {
        ...putNormalised,
        recordedRoutes: putNormalised.recordedRoutes.map((r) => ({
          ...r,
          recordedAt: new Date(r.recordedAt), // PostgreSQL TIMESTAMPTZ -> Date object
        })),
      };

      // Step 4: normaliseAppState on GET (database -> frontend) MUST preserve the drive
      const getNormalised = normaliseAppState(dbResponse);
      expect(getNormalised.recordedRoutes).toHaveLength(1);
      expect(getNormalised.recordedRoutes[0].name).toBe('London to Oxford');
      expect(getNormalised.vehicles).toHaveLength(1);
      expect(getNormalised.vehicles[0].nickname).toBe('Car');
    });
  });
});
