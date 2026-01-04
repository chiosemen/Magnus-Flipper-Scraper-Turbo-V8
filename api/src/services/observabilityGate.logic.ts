export const OBSERVABILITY_GATE_ERROR_CODES = {
  CONFIG_UNAVAILABLE: 'OBSERVABILITY_CONFIG_UNAVAILABLE',
  GATE_CLOSED: 'OBSERVABILITY_GATE_CLOSED',
} as const;

export type ConfigSource = 'cache' | 'db' | 'fallback';

export type ObservabilityGateConfig = {
  enabled: boolean;
  windowMinutes: number;
  maxErrorRatePercent: number;
  maxMedianMs: number;
  maxP95Ms: number;
  maxQueueDepth: number;
  maxWorkerCrashes: number;
  maxJobsPerMinute: number;
};

export type ObservabilityMetrics = {
  total: number;
  failed: number;
  errorRatePercent: number;
  successRatePercent: number;
  medianMs: number;
  p95Ms: number;
  queueDepth: number;
  workerCrashes: number;
  jobsPerMinute: number;
};

export type GateDecision = {
  allowed: boolean;
  reasons: string[];
  code: string;
  metrics: ObservabilityMetrics;
};

const isFiniteMetric = (value: number) => Number.isFinite(value);

export const evaluateGate = (
  config: ObservabilityGateConfig,
  metrics: ObservabilityMetrics,
  configSource: ConfigSource
): GateDecision => {
  if (configSource === 'fallback') {
    return {
      allowed: false,
      reasons: ['config_unavailable'],
      code: OBSERVABILITY_GATE_ERROR_CODES.CONFIG_UNAVAILABLE,
      metrics,
    };
  }

  if (!config.enabled) {
    return {
      allowed: true,
      reasons: [],
      code: OBSERVABILITY_GATE_ERROR_CODES.GATE_CLOSED,
      metrics,
    };
  }

  const invalidMetrics = [
    metrics.total,
    metrics.failed,
    metrics.errorRatePercent,
    metrics.successRatePercent,
    metrics.medianMs,
    metrics.p95Ms,
    metrics.queueDepth,
    metrics.workerCrashes,
    metrics.jobsPerMinute,
  ].some((value) => !isFiniteMetric(value));

  if (invalidMetrics) {
    return {
      allowed: false,
      reasons: ['metrics_invalid'],
      code: OBSERVABILITY_GATE_ERROR_CODES.GATE_CLOSED,
      metrics,
    };
  }

  const reasons: string[] = [];

  if (metrics.errorRatePercent > config.maxErrorRatePercent) {
    reasons.push('error_rate_high');
  }

  if (metrics.medianMs > config.maxMedianMs) {
    reasons.push('median_latency_high');
  }

  if (metrics.p95Ms > config.maxP95Ms) {
    reasons.push('p95_latency_high');
  }

  if (metrics.queueDepth > config.maxQueueDepth) {
    reasons.push('queue_depth_high');
  }

  if (metrics.workerCrashes > config.maxWorkerCrashes) {
    reasons.push('worker_crashes_high');
  }

  if (metrics.jobsPerMinute > config.maxJobsPerMinute) {
    reasons.push('jobs_per_minute_high');
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    code: OBSERVABILITY_GATE_ERROR_CODES.GATE_CLOSED,
    metrics,
  };
};
