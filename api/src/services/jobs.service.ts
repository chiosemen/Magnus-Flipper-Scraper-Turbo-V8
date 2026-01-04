import { db, schema } from '../lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { Job, CreateJob, JobPayload, JobTypeEnum } from '@repo/types';
import { AppError, NotFoundError } from '../utils/errors';
import { createScrapeTask } from '../lib/cloudTasks';
import { updateJobStatus } from '../lib/firestore';
import { TIER_ERROR_CODES } from './tierLimits';
import { assertScrapingEnabled, resolveWorkerClass } from './killSwitch.service';
import { assignCanaryMeta, assertGateOpenForDispatch } from './canary.service';
import { logger } from '@repo/logger';
import { assertMarketplaceWithinLimits } from './marketplaceRate.service';
import { assertDemoModeAllowsDispatch, getDemoRateOverrides } from './demoMode.service';
import { evaluateEnforcement, recordEnforcementEvent, resolveTuning } from '@repo/core';
import { TierKey } from '@repo/billing';

type EntitlementsSnapshot = {
  tierKey: TierKey;
  maxConcurrencyUser: number;
  maxMonitors: number;
  maxBoostedMonitors: number;
  refreshIntervalFloorSeconds: number;
  maxDailyRuns: number;
  maxProxyGbPerDay: number;
  entitlementsVersion?: number;
};


export const jobsService = {
  async listJobs(userId: string) {
    const jobs = await db.query.jobs.findMany({
      where: eq(schema.jobs.userId, userId),
      orderBy: [desc(schema.jobs.createdAt)],
      limit: 50,
    });
    return { items: jobs as unknown as Job[], pagination: { page: 1, limit: 50, total: jobs.length, totalPages: 1, hasNext: false, hasPrev: false } };
  },

  async getJob(jobId: string, userId: string) {
    const job = await db.query.jobs.findFirst({
      where: and(eq(schema.jobs.id, jobId), eq(schema.jobs.userId, userId))
    });
    if (!job) throw new NotFoundError('Job not found');
    return job as unknown as Job;
  },

  async createJob(userId: string, data: CreateJob) {
    // Enforcement hook: jobs.service.ts is the single entrypoint for enforcement decisions.
    const workerClass = resolveWorkerClass({ type: data.type, monitorId: data.monitorId });
    await assertScrapingEnabled(data.source, workerClass);
    await assertGateOpenForDispatch(data.source);
    const demoContext = await assertDemoModeAllowsDispatch(userId, data.source);
    const rateOverrides = demoContext.active ? getDemoRateOverrides() : undefined;
    await assertMarketplaceWithinLimits(data.source, rateOverrides);

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.userId, userId),
      orderBy: [desc(schema.subscriptions.updatedAt)],
    });

    const entitlements = subscription?.entitlementsJson as EntitlementsSnapshot | null;
    const hasValidEntitlements = entitlements
      && entitlements.tierKey
      && Number.isFinite(entitlements.maxConcurrencyUser)
      && Number.isFinite(entitlements.maxMonitors)
      && Number.isFinite(entitlements.maxBoostedMonitors)
      && Number.isFinite(entitlements.refreshIntervalFloorSeconds)
      && Number.isFinite(entitlements.maxDailyRuns)
      && Number.isFinite(entitlements.maxProxyGbPerDay);
    if (!hasValidEntitlements) {
      throw new AppError(
        'Entitlements snapshot missing',
        403,
        'ENTITLEMENTS_MISSING'
      );
    }

    const runningJobs = await db.execute(sql`
      SELECT count(*) as count FROM ${schema.jobs}
      WHERE user_id = ${userId} AND status = 'running'
    `);
    const runningCount = Number(runningJobs[0]?.count || 0);
    if (runningCount >= entitlements.maxConcurrencyUser) {
      throw new AppError(
        'Concurrency limit reached for tier',
        429,
        TIER_ERROR_CODES.CONCURRENCY_LIMIT,
        { tier: entitlements.tierKey, limit: entitlements.maxConcurrencyUser }
      );
    }

    if (data.monitorId) {
      const monitor = await db.query.monitors.findFirst({
        where: and(eq(schema.monitors.id, data.monitorId), eq(schema.monitors.userId, userId))
      });
      if (!monitor) throw new NotFoundError('Monitor not found');

      if (monitor.lastRunAt) {
        const lastRunAtMs = new Date(monitor.lastRunAt).getTime();
        const elapsedSec = (Date.now() - lastRunAtMs) / 1000;
        if (elapsedSec < entitlements.refreshIntervalFloorSeconds) {
          throw new AppError(
            'Refresh interval floor not met for tier',
            429,
            TIER_ERROR_CODES.REFRESH_INTERVAL,
            { tier: entitlements.tierKey, minIntervalSec: entitlements.refreshIntervalFloorSeconds, lastRunAt: monitor.lastRunAt }
          );
        }
      }
    }

    const marketplaceKey = ['facebook', 'vinted', 'ebay', 'gumtree'].includes(data.source)
      ? (data.source as 'facebook' | 'vinted' | 'ebay' | 'gumtree')
      : 'ebay';
    const tierKey = entitlements.tierKey;
    const dayKey = new Date().toISOString().slice(0, 10);
    const telemetryRow = await db.query.usageTelemetry.findFirst({
      where: and(
        eq(schema.usageTelemetry.userId, userId),
        eq(schema.usageTelemetry.marketplace, marketplaceKey),
        eq(schema.usageTelemetry.dayKey, dayKey)
      )
    });

    const recentTelemetry = {
      fullRuns: telemetryRow?.fullRuns ?? 0,
      partialRuns: telemetryRow?.partialRuns ?? 0,
      signalChecks: telemetryRow?.signalChecks ?? 0,
      proxyGbEstimated: telemetryRow?.proxyGbEstimated ?? 0,
      cooldownUntil: telemetryRow?.cooldownUntil ?? null,
    };

    const enforcementDecision = evaluateEnforcement({
      userId,
      tier: tierKey,
      marketplace: marketplaceKey,
      requestedMode: 'FULL',
      now: new Date(),
      recentTelemetry,
    });
    const enforcementDecisionWithEntitlements = {
      ...enforcementDecision,
      audit: {
        ...enforcementDecision.audit,
        entitlementsSnapshot: entitlements,
      },
    };

    if (!enforcementDecisionWithEntitlements.allowed) {
      await recordEnforcementEvent(db, schema, {
        userId,
        marketplace: data.source,
        tier: tierKey,
        jobId: null,
        decision: enforcementDecisionWithEntitlements,
      });
      throw new AppError(
        'Enforcement blocked request',
        429,
        enforcementDecisionWithEntitlements.reason_code,
        { nextAllowedAt: enforcementDecisionWithEntitlements.next_allowed_at || null }
      );
    }

    // 1. Persist Job Record
    const [job] = await db.insert(schema.jobs).values({
      ...data,
      userId,
      status: 'queued',
      progress: 0,
      scheduledAt: new Date(),
    }).returning();

    // 2. Sync to Firestore (for realtime UI)
    await updateJobStatus(job.id, 'queued', 0, {
        type: job.type,
        userId: userId,
        source: job.source,
        url: data.urls?.[0] || 'monitor'
    });

    // 3. Create Cloud Task payload
    const payload: JobPayload = {
      jobId: job.id,
      type: data.type,
      source: data.source,
      params: {
        monitorId: data.monitorId,
        urls: data.urls,
        searchQuery: data.searchQuery
      },
      meta: {
        userId,
        attempt: 1,
        enforcementMode: enforcementDecisionWithEntitlements.mode,
        enforcementDecision: enforcementDecisionWithEntitlements.mode === 'BLOCK'
          ? 'DENY'
          : enforcementDecisionWithEntitlements.audit.degrade_path.length > 1
            ? 'DOWNGRADE'
            : 'ALLOW',
        enforcementReason: enforcementDecisionWithEntitlements.reason_code,
        enforcementAudit: enforcementDecisionWithEntitlements.audit,
      }
    };

    const canaryMeta = demoContext.active
      ? { canary: false, rampPercent: 0 }
      : await assignCanaryMeta(data.source);

    payload.meta.canary = canaryMeta.canary;
    payload.meta.canaryRamp = canaryMeta.rampPercent;

    if (demoContext.active) {
      payload.meta.demo = true;
      payload.meta.demoSessionId = demoContext.demoSessionId;
      payload.meta.timeoutSec = demoContext.timeoutSec;
    }

    logger.info('Job canary assignment', { jobId: job.id, source: data.source, ...canaryMeta });

    const telemetrySnapshot = {
      proxyUsageRatio: entitlements.maxProxyGbPerDay > 0
        ? recentTelemetry.proxyGbEstimated / entitlements.maxProxyGbPerDay
        : 0,
      fullScrapeRatio: entitlements.maxDailyRuns > 0
        ? recentTelemetry.fullRuns / entitlements.maxDailyRuns
        : 0,
    };
    const tuning = resolveTuning({
      marketplace: data.source,
      tier: tierKey,
      country: null,
      telemetrySnapshot,
    });

    if (!tuning.enabled) {
      await recordEnforcementEvent(db, schema, {
        userId,
        marketplace: data.source,
        tier: tierKey,
        jobId: job.id,
        decision: {
          allowed: false,
          mode: 'BLOCK',
          reason_code: tuning.reason || 'marketplace_disabled',
          counters_delta: {},
          audit: { guardrails_hit: ['marketplace_tuning'], degrade_path: ['BLOCK'] },
        },
      });
      throw new AppError('Marketplace disabled by tuning', 429, 'MARKETPLACE_DISABLED', { reason: tuning.reason || null });
    }

    payload.meta.tuning = tuning;

    await recordEnforcementEvent(db, schema, {
      userId,
      marketplace: data.source,
      tier: tierKey,
      jobId: job.id,
      decision: enforcementDecisionWithEntitlements,
    });

    const deltaFull = enforcementDecisionWithEntitlements.counters_delta.full ? 1 : 0;
    const deltaPartial = enforcementDecisionWithEntitlements.counters_delta.partial ? 1 : 0;
    const deltaSignal = enforcementDecisionWithEntitlements.counters_delta.signal ? 1 : 0;
    const deltaProxy = enforcementDecisionWithEntitlements.counters_delta.proxy_gb || 0;
    const deltaCost = 0;
    const lastResetAt = new Date(`${dayKey}T00:00:00.000Z`);

    await db.insert(schema.usageTelemetry)
      .values({
        userId,
        marketplace: marketplaceKey,
        dayKey,
        fullRuns: deltaFull,
        partialRuns: deltaPartial,
        signalChecks: deltaSignal,
        proxyGbEstimated: deltaProxy,
        costUsdEstimated: deltaCost,
        lastResetAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [schema.usageTelemetry.userId, schema.usageTelemetry.marketplace, schema.usageTelemetry.dayKey],
        set: {
          fullRuns: sql`${schema.usageTelemetry.fullRuns} + ${deltaFull}`,
          partialRuns: sql`${schema.usageTelemetry.partialRuns} + ${deltaPartial}`,
          signalChecks: sql`${schema.usageTelemetry.signalChecks} + ${deltaSignal}`,
          proxyGbEstimated: sql`${schema.usageTelemetry.proxyGbEstimated} + ${deltaProxy}`,
          costUsdEstimated: sql`${schema.usageTelemetry.costUsdEstimated} + ${deltaCost}`,
          updatedAt: new Date(),
        },
      });

    // 4. Dispatch Task
    await createScrapeTask(payload);

    return job as unknown as Job;
  },

  async cancelJob(jobId: string, userId: string) {
    const job = await this.getJob(jobId, userId);
    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error('Cannot cancel completed job');
    }

    await db.update(schema.jobs)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(schema.jobs.id, jobId));
    
    await updateJobStatus(jobId, 'cancelled', job.progress);
  }
};
