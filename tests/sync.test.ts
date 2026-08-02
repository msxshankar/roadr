import { describe, expect, it } from 'vitest';
import { RecordedRoute } from '../types';
import { isRoadrAppStatePayload } from '../lib/state';

describe('Real-Time Cross-Device Synchronization', () => {
  it('validates structured recorded route payloads for cross-device persistence', () => {
    const mockRoute: RecordedRoute = {
      id: 'drive-999',
      name: 'Edinburgh to Glasgow',
      vehicleId: 'car-scotland',
      origin: { name: 'Edinburgh', lng: -3.1883, lat: 55.9533 },
      destination: { name: 'Glasgow', lng: -4.2518, lat: 55.8642 },
      stops: [{ name: 'Falkirk Wheel', lng: -3.8415, lat: 56.0003 }],
      recordedAt: new Date().toISOString(),
      distanceMiles: 46.5,
      fuelLiters: 5.2,
      fuelCostGbp: 8.3,
      durationSeconds: 3200,
    };

    const payload = {
      vehicles: [{ id: 'car-scotland', nickname: 'Scottish Cruiser', make: 'Ford', model: 'Focus', year: '2022', fuelType: 'petrol', mpg: 44, tankLiters: 52 }],
      activeVehicleId: 'car-scotland',
      savedPlaces: [],
      recordedRoutes: [mockRoute],
    };

    expect(isRoadrAppStatePayload(payload)).toBe(true);
    expect(payload.recordedRoutes[0].origin.name).toBe('Edinburgh');
    expect(payload.recordedRoutes[0].destination.name).toBe('Glasgow');
    expect(payload.recordedRoutes[0].stops).toHaveLength(1);
  });
});
