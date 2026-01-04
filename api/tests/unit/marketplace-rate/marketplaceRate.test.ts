import { describe, expect, it } from 'vitest';
import {
  evaluateMarketplaceRate,
  MARKETPLACE_RATE_ERROR_CODES,
  type MarketplaceRateConfig,
  type MarketplaceRateMetrics,
} from '../../../src/services/marketplaceRate.logic';

describe('marketplace rate shaping (unit)', () => {
  const config: MarketplaceRateConfig = {
    enabled: true,
    maxConcurrency: 2,
    jobsPerMinute: 5,
    errorThreshold: 20,
    cooldownSeconds: 60,
    cooldownUntil: null,
  };

  const metrics: MarketplaceRateMetrics = {
    running: 0,
    jobsPerMinute: 0,
    errorRatePercent: 0,
  };

  it('blocks when disabled', () => {
    const decision = evaluateMarketplaceRate({ ...config, enabled: false }, metrics, new Date());
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe(MARKETPLACE_RATE_ERROR_CODES.DISABLED);
  });

  it('blocks on error spike', () => {
    const decision = evaluateMarketplaceRate(config, { ...metrics, errorRatePercent: 50 }, new Date());
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe(MARKETPLACE_RATE_ERROR_CODES.ERROR_SPIKE);
  });
});
