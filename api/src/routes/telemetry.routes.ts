import { Hono } from 'hono';
import { DecodedIdToken } from 'firebase-admin/auth';
import { and, desc, eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { db, schema } from '../lib/db';
import type {
  TelemetryEnforcementEvent,
  TelemetryUsageResponse,
  TelemetryUsageSnapshot,
  TelemetryEntitlementsSnapshot,
} from '@repo/types/src/telemetry';

type Env = {
  Variables: {
    user: DecodedIdToken;
    token: string;
  };
};

const app = new Hono<Env>();
app.use('*', authMiddleware);
app.use('*', adminMiddleware);

const emptyResponse: TelemetryUsageResponse = {
  usageTelemetry: [],
  enforcementEvents: [],
  entitlements: null,
};

app.get('/usage', async (c) => {
  const userId = c.req.query('userId')?.trim();
  const date = c.req.query('date')?.trim();

  if (!userId) {
    return c.json({ success: true, data: emptyResponse });
  }

  const usageRows = date
    ? await db.query.usageTelemetry.findMany({
        where: and(
          eq(schema.usageTelemetry.userId, userId),
          eq(schema.usageTelemetry.dayKey, date)
        ),
        orderBy: [desc(schema.usageTelemetry.updatedAt)],
      })
    : [];

  const enforcementRows = await db.query.enforcementEvents.findMany({
    where: eq(schema.enforcementEvents.userId, userId),
    orderBy: [desc(schema.enforcementEvents.createdAt)],
    limit: 20,
  });

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.userId, userId),
    orderBy: [desc(schema.subscriptions.updatedAt)],
  });

  const usageTelemetry: TelemetryUsageSnapshot[] = usageRows.map((row) => ({
    userId: row.userId,
    marketplace: row.marketplace,
    dayKey: row.dayKey,
    fullRuns: row.fullRuns,
    partialRuns: row.partialRuns,
    signalChecks: row.signalChecks,
    proxyGbEstimated: row.proxyGbEstimated,
    costUsdEstimated: row.costUsdEstimated,
    cooldownUntil: row.cooldownUntil ? row.cooldownUntil.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  }));

  const enforcementEvents: TelemetryEnforcementEvent[] = enforcementRows.map((row) => ({
    userId: row.userId,
    marketplace: row.marketplace,
    tier: row.tier,
    decision: row.decision,
    mode: row.mode,
    reasonCode: row.reasonCode,
    jobId: row.jobId ?? null,
    audit: (row.audit as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  }));

  const entitlements = (subscription?.entitlementsJson ?? null) as TelemetryEntitlementsSnapshot | null;

  const data: TelemetryUsageResponse = {
    usageTelemetry,
    enforcementEvents,
    entitlements,
  };

  return c.json({ success: true, data });
});

export default app;
