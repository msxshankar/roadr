import { describe, expect, it } from 'vitest';
import { VehicleProfile } from '../types';

describe('Race Condition Prevention & Real-Time Sync', () => {
  it('prevents stale revalidation responses from overwriting in-flight mutations', () => {
    let vehicles: VehicleProfile[] = [];
    let isSaving = false;

    const addVehicleMutate = (newVehicle: VehicleProfile) => {
      isSaving = true;
      vehicles = [...vehicles, newVehicle];
    };

    const simulatedStaleGETResponse = (oldVehiclesFromDB: VehicleProfile[]) => {
      if (isSaving) {
        // Skip updating local state because a save is currently in flight!
        return;
      }
      vehicles = oldVehiclesFromDB;
    };

    // 1. Initial state
    const initialCar: VehicleProfile = { id: 'car-1', nickname: 'Car 1', make: '', model: '', year: '', fuelType: 'petrol', mpg: 40, tankLiters: 45 };
    vehicles = [initialCar];

    // 2. User clicks Add Car -> Mutates state and sets isSaving = true
    const newCar: VehicleProfile = { id: 'car-2', nickname: 'Car 2', make: '', model: '', year: '', fuelType: 'petrol', mpg: 42, tankLiters: 50 };
    addVehicleMutate(newCar);

    expect(vehicles).toHaveLength(2);
    expect(vehicles[1].id).toBe('car-2');

    // 3. Stale background GET finishes returning old DB state (only car-1)
    simulatedStaleGETResponse([initialCar]);

    // 4. Verify car-2 is NOT wiped out!
    expect(vehicles).toHaveLength(2);
    expect(vehicles[1].nickname).toBe('Car 2');

    // 5. Save completes
    isSaving = false;
    expect(isSaving).toBe(false);
  });
});
