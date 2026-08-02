import { describe, expect, it } from 'vitest';
import { calculateVehicleRangeMiles, DEFAULT_VEHICLE, parseVehicleProfile } from '../lib/vehicle';
import { normaliseAppState } from '../lib/state';

describe('Electric Vehicle (EV) and Estimated MPG Features', () => {
  it('calculates electric vehicle range directly using rangeMiles', () => {
    const evVehicle = {
      id: 'ev-1',
      nickname: 'Tesla Model 3',
      make: 'Tesla',
      model: 'Model 3',
      year: '2024',
      fuelType: 'electric' as const,
      mpg: 1,
      tankLiters: 1,
      rangeMiles: 300,
    };

    const range = calculateVehicleRangeMiles(evVehicle);
    expect(range).toBe(300);
  });

  it('calculates fuel vehicle range using MPG and tank capacity formula', () => {
    const petrolVehicle = {
      id: 'petrol-1',
      nickname: 'Mazda MX-5',
      make: 'Mazda',
      model: 'MX-5',
      year: '2023',
      fuelType: 'petrol' as const,
      mpg: 42,
      tankLiters: 50,
      rangeMiles: 250,
    };

    const range = calculateVehicleRangeMiles(petrolVehicle);
    // (42 * 50) / 4.54609 = 461.93 -> 462
    expect(range).toBe(462);
  });

  it('normalises vehicle state preserving rangeMiles', () => {
    const rawState = {
      vehicles: [
        {
          id: 'v-elec',
          nickname: 'EV SUV',
          make: 'Kia',
          model: 'EV6',
          year: '2024',
          fuelType: 'electric',
          mpg: 1,
          tankLiters: 1,
          rangeMiles: 328,
        },
      ],
      activeVehicleId: 'v-elec',
      savedPlaces: [],
      recordedRoutes: [],
    };

    const state = normaliseAppState(rawState);
    expect(state.vehicles).toHaveLength(1);
    expect(state.vehicles[0].fuelType).toBe('electric');
    expect(state.vehicles[0].rangeMiles).toBe(328);
  });
});
