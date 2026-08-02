import { describe, expect, it } from 'vitest';
import { normaliseAppState } from '../lib/state';
import { RecordedRoute, VehicleProfile } from '../types';

describe('normaliseAppState', () => {
  it('preserves recorded routes even when vehicleIds do not match current garage vehicles', () => {
    const mockVehicle: VehicleProfile = {
      id: 'car-1',
      nickname: 'Daily Driver',
      make: 'Mazda',
      model: 'MX-5',
      year: '2020',
      fuelType: 'petrol',
      mpg: 40,
      tankLiters: 45,
    };

    const mockRoute: RecordedRoute = {
      id: 'drive-123',
      name: 'London to Oxford',
      vehicleId: 'car-different-device',
      origin: { name: 'London', lng: -0.1276, lat: 51.5074 },
      destination: { name: 'Oxford', lng: -1.2577, lat: 51.752 },
      stops: [],
      recordedAt: new Date().toISOString(),
      distanceMiles: 55,
      fuelLiters: 6.2,
      fuelCostGbp: 8.5,
      durationSeconds: 3600,
    };

    const inputState = {
      vehicles: [mockVehicle],
      activeVehicleId: 'car-1',
      savedPlaces: [],
      recordedRoutes: [mockRoute],
    };

    const normalised = normaliseAppState(inputState);

    expect(normalised.vehicles).toHaveLength(1);
    expect(normalised.recordedRoutes).toHaveLength(1);
    expect(normalised.recordedRoutes[0].id).toBe('drive-123');
    expect(normalised.recordedRoutes[0].vehicleId).toBe('car-different-device');
  });

  it('handles null/missing vehicleId in recorded routes by falling back gracefully', () => {
    const mockRouteWithoutVehicle = {
      id: 'drive-456',
      name: 'Scenic Coastal Drive',
      origin: { name: 'Brighton', lng: -0.1372, lat: 50.8225 },
      destination: { name: 'Eastbourne', lng: 0.2805, lat: 50.768 },
      stops: [],
      recordedAt: new Date().toISOString(),
      distanceMiles: 22,
      fuelLiters: 2.5,
      fuelCostGbp: 3.6,
      durationSeconds: 1800,
    };

    const normalised = normaliseAppState({
      vehicles: [],
      savedPlaces: [],
      recordedRoutes: [mockRouteWithoutVehicle],
    });

    expect(normalised.recordedRoutes).toHaveLength(1);
    expect(normalised.recordedRoutes[0].id).toBe('drive-456');
    expect(normalised.recordedRoutes[0].vehicleId).toBe('default-vehicle');
  });
});
