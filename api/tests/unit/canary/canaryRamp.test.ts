import { describe, expect, it } from 'vitest';
import { chooseCanary, normalizeRampPercent } from '../../../src/services/canary.logic';

describe('canary ramp logic (unit)', () => {
  it('normalizes ramp percent within 0-100', () => {
    expect(normalizeRampPercent(-10)).toBe(0);
    expect(normalizeRampPercent(10.5)).toBe(10);
    expect(normalizeRampPercent(150)).toBe(100);
  });

  it('assigns canary based on ramp percent', () => {
    expect(chooseCanary(10, 0.05)).toBe(true);
    expect(chooseCanary(10, 0.5)).toBe(false);
  });
});
