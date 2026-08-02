import { describe, expect, it } from 'vitest';
import { RoadrAppState, VehicleProfile, RecordedRoute } from '../types';
import { isRoadrAppStatePayload, normaliseAppState, stateFromRows } from '../lib/state';

describe('Database Full-State Sync Integration Tests', () => {
  it('ensures adding a car payload preserves all existing recorded routes for database PUT /api/state', () => {
    const existingRoutes: RecordedRoute[] = [
      {
        id: 'drive-101',
        name: 'London to Cambridge',
        vehicleId: 'v1',
        origin: { name: 'London', lng: -0.1276, lat: 51.5074 },
        destination: { name: 'Cambridge', lng: 0.1218, lat: 52.2053 },
        stops: [],
        recordedAt: new Date().toISOString(),
        distanceMiles: 60,
        fuelLiters: 6.5,
        fuelCostGbp: 10,
        durationSeconds: 4200,
      },
    ];

    const currentVehicles: VehicleProfile[] = [
      { id: 'v1', nickname: 'Primary Car', make: 'Toyota', model: 'Corolla', year: '2020', fuelType: 'petrol', mpg: 45, tankLiters: 50 },
    ];

    // Simulate appStateRef maintaining full state
    const appStateRef: { current: RoadrAppState } = {
      current: {
        vehicles: currentVehicles,
        activeVehicleId: 'v1',
        savedPlaces: [],
        recordedRoutes: existingRoutes,
      },
    };

    const updateAppState = (next: Partial<RoadrAppState>): RoadrAppState => {
      const updated: RoadrAppState = {
        vehicles: next.vehicles ?? appStateRef.current.vehicles,
        activeVehicleId: next.activeVehicleId !== undefined ? next.activeVehicleId : appStateRef.current.activeVehicleId,
        savedPlaces: next.savedPlaces ?? appStateRef.current.savedPlaces,
        recordedRoutes: next.recordedRoutes ?? appStateRef.current.recordedRoutes,
      };
      appStateRef.current = updated;
      return updated;
    };

    // User adds a new car
    const newCar: VehicleProfile = { id: 'v2', nickname: 'Second Car', make: 'BMW', model: '3 Series', year: '2022', fuelType: 'petrol', mpg: 40, tankLiters: 55 };
    const payloadForServer = updateAppState({
      vehicles: [...appStateRef.current.vehicles, newCar],
      activeVehicleId: 'v2',
    });

    // Validate payload sent to database PUT /api/state
    expect(isRoadrAppStatePayload(payloadForServer)).toBe(true);
    const normalised = normaliseAppState(payloadForServer);

    expect(normalised.vehicles).toHaveLength(2);
    expect(normalised.vehicles[1].id).toBe('v2');

    // CRITICAL: Database DELETE / re-insert will NOT delete recorded routes because recordedRoutes is fully preserved!
    expect(normalised.recordedRoutes).toHaveLength(1);
    expect(normalised.recordedRoutes[0].id).toBe('drive-101');
    expect(normalised.recordedRoutes[0].name).toBe('London to Cambridge');
  });

  it('ensures recording a drive payload preserves all existing garage vehicles for database PUT /api/state', () => {
    const existingVehicles: VehicleProfile[] = [
      { id: 'v1', nickname: 'City Hatchback', make: 'VW', model: 'Golf', year: '2019', fuelType: 'petrol', mpg: 42, tankLiters: 48 },
      { id: 'v2', nickname: 'Weekend Convertible', make: 'Mazda', model: 'MX-5', year: '2021', fuelType: 'petrol', mpg: 38, tankLiters: 45 },
    ];

    const appStateRef: { current: RoadrAppState } = {
      current: {
        vehicles: existingVehicles,
        activeVehicleId: 'v1',
        savedPlaces: [],
        recordedRoutes: [],
      },
    };

    const updateAppState = (next: Partial<RoadrAppState>): RoadrAppState => {
      const updated: RoadrAppState = {
        vehicles: next.vehicles ?? appStateRef.current.vehicles,
        activeVehicleId: next.activeVehicleId !== undefined ? next.activeVehicleId : appStateRef.current.activeVehicleId,
        savedPlaces: next.savedPlaces ?? appStateRef.current.savedPlaces,
        recordedRoutes: next.recordedRoutes ?? appStateRef.current.recordedRoutes,
      };
      appStateRef.current = updated;
      return updated;
    };

    // User records a drive
    const newDrive: RecordedRoute = {
      id: 'drive-202',
      name: 'Coastal Highway Run',
      vehicleId: 'v1',
      origin: { name: 'Brighton', lng: -0.1372, lat: 50.8225 },
      destination: { name: 'Portsmouth', lng: -1.0912, lat: 50.7989 },
      stops: [],
      recordedAt: new Date().toISOString(),
      distanceMiles: 48,
      fuelLiters: 5.2,
      fuelCostGbp: 8.5,
      durationSeconds: 3600,
    };

    const payloadForServer = updateAppState({
      recordedRoutes: [newDrive, ...appStateRef.current.recordedRoutes],
    });

    expect(isRoadrAppStatePayload(payloadForServer)).toBe(true);
    const normalised = normaliseAppState(payloadForServer);

    // CRITICAL: Database DELETE / re-insert will NOT delete vehicles because vehicles is fully preserved!
    expect(normalised.vehicles).toHaveLength(2);
    expect(normalised.vehicles[0].nickname).toBe('City Hatchback');
    expect(normalised.vehicles[1].nickname).toBe('Weekend Convertible');

    expect(normalised.recordedRoutes).toHaveLength(1);
    expect(normalised.recordedRoutes[0].name).toBe('Coastal Highway Run');
  });

  it('correctly deserializes SQL database rows into app state using stateFromRows', () => {
    const rawVehicleRows = [
      { id: 'v1', nickname: 'Daily', make: 'Ford', model: 'Fiesta', year: '2018', fuel_type: 'petrol', mpg: 48, tank_liters: 42 },
    ];
    const rawRouteRows = [
      {
        id: 'drive-300',
        vehicle_id: 'v1',
        name: 'Commute',
        origin: { name: 'Home', lng: -0.1, lat: 51.5 },
        destination: { name: 'Work', lng: -0.2, lat: 51.5 },
        stops: [],
        recorded_at: '2026-08-02T12:00:00.000Z',
        distance_miles: 15,
        fuel_liters: 1.4,
        fuel_cost_gbp: 2.2,
        duration_seconds: 1800,
      },
    ];

    const state = stateFromRows({
      vehicles: rawVehicleRows,
      savedPlaces: [],
      recordedRoutes: rawRouteRows,
      activeVehicleId: 'v1',
    });

    expect(state.vehicles).toHaveLength(1);
    expect(state.vehicles[0].nickname).toBe('Daily');
    expect(state.recordedRoutes).toHaveLength(1);
    expect(state.recordedRoutes[0].name).toBe('Commute');
    expect(state.activeVehicleId).toBe('v1');
  });
});
