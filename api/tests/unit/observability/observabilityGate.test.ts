import { describe, expect, it } from 'vitest';
import {
  evaluateGate,
  OBSERVABILITY_GATE_ERROR_CODES,
  type ObservabilityGateConfig,
  type ObservabilityMetrics,
} from '../../../src/services/observabilityGate.logic';

describe('observability gate evaluation (unit)', () => {
  const config: ObservabilityGateConfig = {
    enabled: true,
    windowMinutes: 15,
    maxErrorRatePercent: 10,
    maxMedianMs: 1000,
    maxP95Ms: 2000,
    maxQueueDepth: 50,
    maxWorkerCrashes: 2,
    maxJobsPerMinute: 100,
  };

  const baseMetrics: ObservabilityMetrics = {
    total: 10,
    failed: 0,
    errorRatePercent: 0,
    successRatePercent: 100,
    medianMs: 500,
    p95Ms: 800,
    queueDepth: 10,
    workerCrashes: 0,
    jobsPerMinute: 10,
  };

  it('fails closed on fallback config source', () => {
    const decision = evaluateGate(config, baseMetrics, 'fallback');
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe(OBSERVABILITY_GATE_ERROR_CODES.CONFIG_UNAVAILABLE);
  });

  it('closes gate when error rate exceeds threshold', () => {
    const metrics = { ...baseMetrics, errorRatePercent: 25 };
    const decision = evaluateGate(config, metrics, 'db');
    expect(decision.allowed).toBe(false);
  });

  it('closes gate when p95 latency exceeds threshold', () => {
    const metrics = { ...baseMetrics, p95Ms: 5000 };
    const decision = evaluateGate(config, metrics, 'db');
    expect(decision.allowed).toBe(false);
  });
});
