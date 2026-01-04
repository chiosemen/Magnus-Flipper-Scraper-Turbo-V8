import { describe, expect, it } from 'vitest';
import {
  KILL_SWITCH_ERROR_CODES,
  SAFE_OFF_CONFIG,
  evaluateKillSwitch,
  resolveWorkerClass,
  type KillSwitchConfig,
} from '../../../src/services/killSwitch.logic';

describe('kill switch evaluation (unit)', () => {
  const baseConfig: KillSwitchConfig = {
    scrapersEnabled: true,
    facebookEnabled: true,
    vintedEnabled: true,
    realtimeEnabled: true,
    scheduledEnabled: true,
    manualEnabled: true,
  };

  it('fails closed on fallback config source', () => {
    const decision = evaluateKillSwitch(SAFE_OFF_CONFIG, 'amazon', 'manual', 'fallback');
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe(KILL_SWITCH_ERROR_CODES.CONFIG_UNAVAILABLE);
  });

  it('blocks when global scrapers are disabled', () => {
    const config = { ...baseConfig, scrapersEnabled: false };
    const decision = evaluateKillSwitch(config, 'amazon', 'manual', 'db');
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe(KILL_SWITCH_ERROR_CODES.SCRAPERS_DISABLED);
  });

  it('blocks marketplace when disabled', () => {
    const config = { ...baseConfig, facebookEnabled: false };
    const decision = evaluateKillSwitch(config, 'facebook', 'manual', 'db');
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe(KILL_SWITCH_ERROR_CODES.MARKETPLACE_DISABLED);
  });

  it('blocks worker class when disabled', () => {
    const config = { ...baseConfig, scheduledEnabled: false };
    const decision = evaluateKillSwitch(config, 'amazon', 'scheduled', 'db');
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe(KILL_SWITCH_ERROR_CODES.WORKER_DISABLED);
  });

  it('derives scheduled worker class from monitorId', () => {
    expect(resolveWorkerClass({ type: 'monitor_search', monitorId: 'abc' })).toBe('scheduled');
  });
});
