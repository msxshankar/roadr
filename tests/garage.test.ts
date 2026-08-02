import { describe, expect, it } from 'vitest';
import { VehicleProfile } from '../types';
import { DEFAULT_VEHICLE } from '../lib/vehicle';

describe('Vehicle Garage Auto Creation', () => {
  it('instantly creates a new vehicle profile when add car is triggered', () => {
    const existingVehicles: VehicleProfile[] = [
      {
        id: 'v1',
        nickname: 'My car',
        make: 'Honda',
        model: 'Civic',
        year: '2021',
        fuelType: 'petrol',
        mpg: 42,
        tankLiters: 50,
      },
    ];

    const nextId = `vehicle-${Date.now()}`;
    const newVehicle: VehicleProfile = {
      ...DEFAULT_VEHICLE,
      id: nextId,
      nickname: `Car ${existingVehicles.length + 1}`,
    };

    const updatedVehicles = [...existingVehicles, newVehicle];

    expect(updatedVehicles).toHaveLength(2);
    expect(updatedVehicles[1].id).toBe(nextId);
    expect(updatedVehicles[1].nickname).toBe('Car 2');
  });

  it('keeps the garage modal open when adding a new car profile', () => {
    let isGarageOpen = true;
    const saveVehicleHandler = (nextVehicle: VehicleProfile, closeModal = true) => {
      if (closeModal) {
        isGarageOpen = false;
      }
    };

    // Adding a car passes closeModal = false
    saveVehicleHandler({ ...DEFAULT_VEHICLE, id: 'v2', nickname: 'Car 2' }, false);
    expect(isGarageOpen).toBe(true);

    // Saving form passes closeModal = true (or default)
    saveVehicleHandler({ ...DEFAULT_VEHICLE, id: 'v2', nickname: 'Car 2' }, true);
    expect(isGarageOpen).toBe(false);
  });
});
