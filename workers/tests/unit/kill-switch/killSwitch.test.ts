import { describe, expect, it } from 'vitest';
import {
  KILL_SWITCH_ERROR_CODES,
  SAFE_OFF_CONFIG,
  evaluateKillSwitch,
  type KillSwitchConfig,
} from '../../../src/services/killSwitch.logic';

describe('worker kill switch evaluation (unit)', () => {
  const baseConfig: KillSwitchConfig = {
    scrapersEnabled: true,
    facebookEnabled: true,
    vintedEnabled: true,
    realtimeEnabled: true,
    scheduledEnabled: true,
    manualEnabled: true,
  };

  it('fails closed when config source is fallback', () => {
    const decision = evaluateKillSwitch(SAFE_OFF_CONFIG, 'amazon', 'manual', 'fallback');
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe(KILL_SWITCH_ERROR_CODES.CONFIG_UNAVAILABLE);
  });

  it('blocks when worker class is disabled', () => {
    const config = { ...baseConfig, manualEnabled: false };
    const decision = evaluateKillSwitch(config, 'amazon', 'manual', 'db');
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe(KILL_SWITCH_ERROR_CODES.WORKER_DISABLED);
  });
});
