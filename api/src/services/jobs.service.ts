import { db, schema } from '../lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { Job, CreateJob, JobPayload, JobTypeEnum } from '@repo/types';
import { AppError, NotFoundError } from '../utils/errors';
import { createScrapeTask } from '../lib/cloudTasks';
import { updateJobStatus } from '../lib/firestore';
import { assertScrapingEnabled, resolveWorkerClass } from './killSwitch.service';
import { assignCanaryMeta, assertGateOpenForDispatch } from './canary.service';
import { logger } from '@repo/logger';
import { assertMarketplaceWithinLimits } from './marketplaceRate.service';
import { assertDemoModeAllowsDispatch, getDemoRateOverrides } from './demoMode.service';
import { recordEnforcementEvent, resolveTuning } from '@repo/core';
import { TierKey } from '@repo/billing';
import type { Marketplace } from '../../../packages/economics/src/tieredRefresh.model';
import { evaluateEnforcementGate } from '../../../packages/telemetry/src/enforcementGate';
import {
  buildTelemetryIncrement,
  recordEnforcementEventIfNeeded,
} from '../../../packages/telemetry/src/costTelemetry';

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

    const now = new Date();
    const entitlements = subscription?.entitlementsJson as EntitlementsSnapshot | null;

    const runningJobs = await db.execute(sql`
      SELECT count(*) as count FROM ${schema.jobs}
      WHERE user_id = ${userId} AND status = 'running'
    `);
    const runningCount = Number(runningJobs[0]?.count || 0);

    let monitorLastRunAt: Date | null = null;
    if (data.monitorId) {
      const monitor = await db.query.monitors.findFirst({
        where: and(eq(schema.monitors.id, data.monitorId), eq(schema.monitors.userId, userId))
      });
      if (!monitor) throw new NotFoundError('Monitor not found');
      monitorLastRunAt = monitor.lastRunAt ?? null;
    }

    const marketplaceKey = ['facebook', 'vinted', 'ebay', 'gumtree'].includes(data.source)
      ? (data.source as 'facebook' | 'vinted' | 'ebay' | 'gumtree')
      : 'ebay';
    const dayKey = now.toISOString().slice(0, 10);
    const telemetryRow = await db.query.usageTelemetry.findFirst({
      where: and(
        eq(schema.usageTelemetry.userId, userId),
        eq(schema.usageTelemetry.marketplace, marketplaceKey),
        eq(schema.usageTelemetry.dayKey, dayKey)
      )
    });

    const usageTelemetry = telemetryRow ? {
      fullRuns: telemetryRow.fullRuns,
      partialRuns: telemetryRow.partialRuns,
      signalChecks: telemetryRow.signalChecks,
      proxyGbEstimated: telemetryRow.proxyGbEstimated,
      marketplace: telemetryRow.marketplace as Marketplace,
    } : null;

    const enforcementDecision = evaluateEnforcementGate({
      userId,
      entitlements,
      usageTelemetry,
      jobContext: {
        runningJobs: runningCount,
        monitorLastRunAt,
        now,
      },
    });

    const enforcementDecisionLabel = enforcementDecision.enforcement_mode === 'BLOCKED'
      ? 'BLOCK'
      : enforcementDecision.enforcement_mode === 'THROTTLED'
        ? 'THROTTLE'
        : 'ALLOW';

    if (!enforcementDecision.allowed) {
      await recordEnforcementEventIfNeeded(db, schema, {
        userId,
        marketplace: data.source,
        tier: entitlements?.tierKey || 'unknown',
        jobId: null,
        enforcement_mode: enforcementDecision.enforcement_mode,
        decision: enforcementDecisionLabel,
        reason_code: enforcementDecision.reason_code,
        violated_limit: enforcementDecision.violated_limit,
        suggested_action: enforcementDecision.suggested_action,
        snapshot: enforcementDecision.snapshot,
      });
      if (enforcementDecision.reason_code === 'ENTITLEMENTS_MISSING') {
        throw new AppError(
          'Entitlements snapshot missing',
          403,
          'ENTITLEMENTS_MISSING'
        );
      }
      throw new AppError(
        'Enforcement blocked request',
        429,
        'ENFORCEMENT_BLOCKED',
        {
          reason: enforcementDecision.reason_code,
          violated_limit: enforcementDecision.violated_limit || null,
        }
      );
    }

    if (!entitlements) {
      throw new AppError(
        'Entitlements snapshot missing',
        403,
        'ENTITLEMENTS_MISSING'
      );
    }

    if (!usageTelemetry) {
      throw new AppError(
        'Usage telemetry snapshot missing',
        429,
        'ENFORCEMENT_BLOCKED'
      );
    }

    const tierKey = entitlements.tierKey;

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
      }
    };

    if (enforcementDecision.enforcement_mode === 'THROTTLED') {
      payload.meta.enforcementReason = enforcementDecision.reason_code;
      payload.meta.enforcementAudit = {
        enforcement_mode: enforcementDecision.enforcement_mode,
        decision: enforcementDecisionLabel,
        violated_limit: enforcementDecision.violated_limit || null,
        suggested_action: enforcementDecision.suggested_action || null,
        snapshot: enforcementDecision.snapshot,
      };
    }

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

    await recordEnforcementEventIfNeeded(db, schema, {
      userId,
      marketplace: data.source,
      tier: tierKey,
      jobId: job.id,
      enforcement_mode: enforcementDecision.enforcement_mode,
      decision: enforcementDecisionLabel,
      reason_code: enforcementDecision.reason_code,
      violated_limit: enforcementDecision.violated_limit,
      suggested_action: enforcementDecision.suggested_action,
      snapshot: enforcementDecision.snapshot,
    });

    const telemetrySnapshot = {
      proxyUsageRatio: entitlements.maxProxyGbPerDay > 0
        ? usageTelemetry.proxyGbEstimated / entitlements.maxProxyGbPerDay
        : 0,
      fullScrapeRatio: entitlements.maxDailyRuns > 0
        ? usageTelemetry.fullRuns / entitlements.maxDailyRuns
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

    const increment = buildTelemetryIncrement({
      marketplace: marketplaceKey,
      action: 'full_scrape',
    });
    const deltaFull = increment.fullScrapes;
    const deltaPartial = increment.partialFetches;
    const deltaSignal = increment.signalChecks;
    const deltaProxy = increment.proxyGbEstimated;
    const deltaCost = increment.costUsdEstimated;
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
