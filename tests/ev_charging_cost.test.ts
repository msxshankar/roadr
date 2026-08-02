import { describe, expect, it } from 'vitest';

describe('EV Charging Cost & Multi-Tier Energy Calculations', () => {
  it('calculates EV energy in kWh accurately from distance and efficiency', () => {
    const distanceMiles = 190.0;
    const efficiencyMiPerKwh = 3.8;
    const energyKwh = distanceMiles / efficiencyMiPerKwh;
    expect(energyKwh).toBeCloseTo(50.0, 2);
  });

  it('calculates trip costs across Home Off-Peak, Home Standard, and Public Rapid Charger tiers', () => {
    const energyKwh = 50.0;
    const homeOffPeakPence = 8.0;
    const homeStandardPence = 26.1;
    const rapidChargerPence = 79.0;

    const costOffPeak = (energyKwh * homeOffPeakPence) / 100;
    const costStandard = (energyKwh * homeStandardPence) / 100;
    const costRapid = (energyKwh * rapidChargerPence) / 100;

    expect(costOffPeak).toBeCloseTo(4.0, 2);    // £4.00
    expect(costStandard).toBeCloseTo(13.05, 2); // £13.05
    expect(costRapid).toBeCloseTo(39.5, 2);     // £39.50
    expect(costOffPeak).toBeLessThan(costStandard);
    expect(costStandard).toBeLessThan(costRapid);
  });
});
