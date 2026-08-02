import { describe, expect, it } from 'vitest';
import { RoadrAppState, VehicleProfile, RecordedRoute } from '../types';

describe('Synchronous AppStateRef Engine', () => {
  it('merges partial state updates cleanly without dropping existing vehicles or recorded routes', () => {
    const appStateRef: { current: RoadrAppState } = {
      current: {
        vehicles: [
          { id: 'car-1', nickname: 'Family SUV', make: 'Volvo', model: 'XC90', year: '2022', fuelType: 'petrol', mpg: 35, tankLiters: 70 },
        ],
        activeVehicleId: 'car-1',
        savedPlaces: [],
        recordedRoutes: [
          {
            id: 'drive-101',
            name: 'Road trip to Cornwall',
            vehicleId: 'car-1',
            origin: { name: 'London', lng: -0.1276, lat: 51.5074 },
            destination: { name: 'Cornwall', lng: -4.8, lat: 50.4 },
            stops: [],
            recordedAt: new Date().toISOString(),
            distanceMiles: 250,
            fuelLiters: 32,
            fuelCostGbp: 48,
            durationSeconds: 16000,
          },
        ],
      },
    };

    const updateAppState = (next: Partial<RoadrAppState>) => {
      const updated: RoadrAppState = {
        vehicles: next.vehicles ?? appStateRef.current.vehicles,
        activeVehicleId: next.activeVehicleId !== undefined ? next.activeVehicleId : appStateRef.current.activeVehicleId,
        savedPlaces: next.savedPlaces ?? appStateRef.current.savedPlaces,
        recordedRoutes: next.recordedRoutes ?? appStateRef.current.recordedRoutes,
      };
      appStateRef.current = updated;
      return updated;
    };

    // 1. Add a second car
    const newCar: VehicleProfile = { id: 'car-2', nickname: 'Sports Car', make: 'Porsche', model: '911', year: '2023', fuelType: 'petrol', mpg: 28, tankLiters: 64 };
    const stateAfterCarAdd = updateAppState({
      vehicles: [...appStateRef.current.vehicles, newCar],
      activeVehicleId: 'car-2',
    });

    expect(stateAfterCarAdd.vehicles).toHaveLength(2);
    expect(stateAfterCarAdd.recordedRoutes).toHaveLength(1); // Recorded drive is NOT lost!
    expect(stateAfterCarAdd.recordedRoutes[0].name).toBe('Road trip to Cornwall');

    // 2. Record a second drive
    const newDrive: RecordedRoute = {
      id: 'drive-102',
      name: 'Sunday drive',
      vehicleId: 'car-2',
      origin: { name: 'London', lng: -0.1276, lat: 51.5074 },
      destination: { name: 'Brighton', lng: -0.1372, lat: 50.8225 },
      stops: [],
      recordedAt: new Date().toISOString(),
      distanceMiles: 54,
      fuelLiters: 8.7,
      fuelCostGbp: 13,
      durationSeconds: 3600,
    };

    const stateAfterDriveRecord = updateAppState({
      recordedRoutes: [newDrive, ...appStateRef.current.recordedRoutes],
    });

    expect(stateAfterDriveRecord.vehicles).toHaveLength(2); // Vehicles are NOT lost!
    expect(stateAfterDriveRecord.recordedRoutes).toHaveLength(2);
    expect(stateAfterDriveRecord.recordedRoutes[0].name).toBe('Sunday drive');
    expect(stateAfterDriveRecord.recordedRoutes[1].name).toBe('Road trip to Cornwall');
  });
});
