export type TelemetryEntitlementsSnapshot = {
  tierKey: string;
  maxConcurrencyUser: number;
  maxMonitors: number;
  maxBoostedMonitors: number;
  refreshIntervalFloorSeconds: number;
  maxDailyRuns: number;
  maxProxyGbPerDay: number;
  entitlementsVersion?: number;
};

export type TelemetryUsageSnapshot = {
  userId: string;
  marketplace: string;
  dayKey: string;
  fullRuns: number;
  partialRuns: number;
  signalChecks: number;
  proxyGbEstimated: number;
  costUsdEstimated: number;
  cooldownUntil: string | null;
  updatedAt: string;
};

export type TelemetryEnforcementEvent = {
  userId: string;
  marketplace: string;
  tier: string;
  decision: string;
  mode: string;
  reasonCode: string;
  jobId: string | null;
  audit: Record<string, unknown> | null;
  createdAt: string;
};

export type TelemetryUsageResponse = {
  usageTelemetry: TelemetryUsageSnapshot[];
  enforcementEvents: TelemetryEnforcementEvent[];
  entitlements: TelemetryEntitlementsSnapshot | null;
};
