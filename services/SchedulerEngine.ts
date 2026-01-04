import { redis } from './infra/RedisAdapter';
import { TierPolicy } from '../config/TierPolicy';
import { Monitor, Marketplace, ScrapeJob } from '../types';
import { ledgerService } from './LedgerService';

const JOB_QUEUE_KEY = 'mf:queue:refresh';
const JOB_KEY_PREFIX = 'mf:job:';
const MONITOR_LOCK_PREFIX = 'mf:lock:monitor:';
const RUN_LOCK_PREFIX = 'mf:lock:run:';
const DEDUPE_PREFIX = 'mf:dedupe:';
const USER_CONC_PREFIX = 'mf:conc:user:';
const MP_CONC_PREFIX = 'mf:conc:mp:';
const USER_BUCKET_PREFIX = 'mf:bucket:user:';
const MP_BUCKET_PREFIX = 'mf:bucket:mp:';

const BACKOFF_STEPS_MS = [30000, 90000, 300000];
const BACKOFF_MAX_MS = 15 * 60 * 1000;

/**
 * PRODUCTION SCHEDULER ENGINE
 * Implements the "Redis ZSET + Lock + Throttle" architecture.
 */
class SchedulerEngine {
  private isRunning = false;
  private logCallback: (jobId: string, msg: string, level: any) => void = () => {};

  // Attach a logger from the parent service
  setLogger(callback: (jobId: string, msg: string, level: any) => void) {
    this.logCallback = callback;
  }

  /**
   * 1. The Main Loop (Runs every 10-30s)
   */
  async startLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextTick();
  }

  private scheduleNextTick() {
    if (!this.isRunning) return;
    const delay = 10000 + Math.floor(Math.random() * 20000);
    setTimeout(async () => {
      await this.processDueJobs();
      this.scheduleNextTick();
    }, delay);
  }

  /**
   * 2. Scheduler: Fetch Due Jobs from ZSET
   */
  private async processDueJobs() {
    const now = Date.now();
    
    // ZRANGEBYSCORE mf:queue:refresh -inf now LIMIT 0 5
    const dueJobIds = await redis.zrangebyscore(JOB_QUEUE_KEY, '-inf', now, { limit: { offset: 0, count: 5 } });

    for (const jobId of dueJobIds) {
      // Atomic Claim: ZREM
      const removed = await redis.zrem(JOB_QUEUE_KEY, jobId);
      if (!removed) continue;

      const record = await redis.hgetall(`${JOB_KEY_PREFIX}${jobId}`);
      if (!record || Object.keys(record).length === 0) {
        this.logCallback(jobId, `[Scheduler] Missing job payload`, 'error');
        continue;
      }

      let monitor: Monitor;
      try {
        monitor = this.normalizeMonitorPayload(record, jobId);
      } catch (error) {
        this.logCallback(jobId, `[Scheduler] Invalid monitor payload: ${(error as Error).message}`, 'error');
        continue;
      }

      if (!monitor.is_enabled) {
        this.logCallback(jobId, `[Scheduler] Monitor disabled, skipping run`, 'warning');
        await this.scheduleNextRun(jobId, monitor, monitor.refresh_interval_sec);
        continue;
      }

      await this.dispatchMonitorRefresh(jobId, monitor);
    }
  }

  /**
   * 3. Refresh Logic: Locking & Dedupe
   */
  private async dispatchMonitorRefresh(jobId: string, monitor: Monitor) {
    const lockKey = `${MONITOR_LOCK_PREFIX}${monitor.id}`;
    
    // SET NX EX 60 (Prevent double refresh)
    const acquired = await redis.set(lockKey, jobId, { nx: true, ex: 60 });
    
    if (!acquired) {
      this.logCallback(jobId, `[Scheduler] Monitor ${monitor.id} locked. Skipping.`, 'warning');
      return;
    }

    try {
      const intervalSec = this.getEffectiveIntervalSec(monitor);
      const dedupeKey = this.buildDedupeKey(monitor, intervalSec);

      const isDuplicate = await redis.get(`${DEDUPE_PREFIX}${dedupeKey}`);
      if (isDuplicate) {
        this.logCallback(jobId, `[Scheduler] Run deduplicated`, 'warning');
        await ledgerService.recordEvent(monitor.user_id, 'throttle', monitor.id, 0, { reason: 'dedupe' });
        await this.scheduleNextRun(jobId, monitor, intervalSec);
        return;
      }

      await redis.set(`${DEDUPE_PREFIX}${dedupeKey}`, '1', { ex: Math.max(1, Math.floor(intervalSec / 2)) });

      const nextRun = Date.now() + (intervalSec * 1000);
      monitor.last_refresh_at = Date.now();
      monitor.next_refresh_at = nextRun;
      await this.persistJobPayload(jobId, monitor);
      await redis.zadd(JOB_QUEUE_KEY, nextRun, jobId);

      if (this.isBoostedMonitor(monitor)) {
        await ledgerService.recordEvent(monitor.user_id, 'boost', monitor.id, 1, { interval_sec: intervalSec });
      }

      for (const mp of monitor.marketplaces) {
        void this.pipelineRun(monitor, mp, jobId, dedupeKey);
      }
    } finally {
      await redis.del(lockKey);
    }
  }

  /**
   * 4. Run Pipeline & Throttling
   */
  private async pipelineRun(monitor: Monitor, mp: Marketplace, jobId: string, dedupeKey: string) {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Create Job Object for tracking
    const job: ScrapeJob = {
      id: runId,
      monitorId: monitor.id,
      userId: monitor.user_id,
      site: mp,
      url: monitor.query,
      status: 'pending',
      currentStep: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      resultCount: 0,
      logs: [],
      retryCount: 0
    };

    // --- GATE 1: User Concurrency Cap ---
    const userKey = `${USER_CONC_PREFIX}${monitor.user_id}`;
    const userLimit = await this.getUserLimit(monitor.user_id);
    const userActive = await redis.incr(userKey);
    
    if (userActive > userLimit) {
      await redis.decr(userKey);
      await this.handleThrottle(job, monitor, jobId, dedupeKey, 'user_concurrency_cap');
      return;
    }

    // --- GATE 2: Global Marketplace Cap ---
    const mpKey = `${MP_CONC_PREFIX}${mp}`;
    const mpLimit = this.getMarketplaceLimit(mp);
    const mpActive = await redis.incr(mpKey);
    if (mpActive > mpLimit) {
      await redis.decr(userKey);
      await redis.decr(mpKey);
      await this.handleThrottle(job, monitor, jobId, dedupeKey, 'marketplace_concurrency_cap');
      return;
    }

    // --- RUN LOCK ---
    const runLockKey = `${RUN_LOCK_PREFIX}${monitor.id}:${mp}`;
    const runLock = await redis.set(runLockKey, jobId, { nx: true, ex: 120 });
    if (!runLock) {
      await redis.decr(userKey);
      await redis.decr(mpKey);
      await this.handleThrottle(job, monitor, jobId, dedupeKey, 'run_lock');
      return;
    }

    // --- GATE 3: User Token Bucket ---
    const userBucket = await this.getUserBucketConfig(monitor.user_id);
    const userBucketOk = await this.consumeTokenBucket(`${USER_BUCKET_PREFIX}${monitor.user_id}`, userBucket.capacity, userBucket.refillPerSec);
    if (!userBucketOk) {
      await redis.decr(userKey);
      await redis.decr(mpKey);
      await redis.del(runLockKey);
      await this.handleThrottle(job, monitor, jobId, dedupeKey, 'user_bucket');
      return;
    }

    // --- GATE 4: Marketplace Token Bucket ---
    const mpBucket = this.getMarketplaceBucketConfig(mp);
    const mpBucketOk = await this.consumeTokenBucket(`${MP_BUCKET_PREFIX}${mp}`, mpBucket.capacity, mpBucket.refillPerSec);
    if (!mpBucketOk) {
      await this.restoreTokenBucket(`${USER_BUCKET_PREFIX}${monitor.user_id}`, userBucket.capacity);
      await redis.decr(userKey);
      await redis.decr(mpKey);
      await redis.del(runLockKey);
      await this.handleThrottle(job, monitor, jobId, dedupeKey, 'marketplace_bucket');
      return;
    }

    await this.resetThrottleCount(jobId);
    this.notifyJobStart(job);
    await ledgerService.recordEvent(monitor.user_id, 'run', monitor.id, 1, { marketplace: mp, job_id: job.id });
  }

  private async handleThrottle(job: ScrapeJob, monitor: Monitor, jobId: string, dedupeKey: string, reason: string) {
    const attempt = await this.incrementThrottleCount(jobId, reason);
    const backoffMs = this.computeBackoffMs(attempt);

    job.status = 'throttled';
    job.throttleReason = reason;
    job.retryCount = attempt;
    job.nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

    this.logCallback(job.id, `[Throttle] ${reason}. Backoff ${Math.round(backoffMs / 1000)}s`, 'warning');
    this.notifyJobStart(job);

    await ledgerService.recordEvent(monitor.user_id, 'throttle', monitor.id, 0, {
      reason,
      attempt,
      backoff_ms: backoffMs,
      marketplace: job.site,
    });

    await redis.del(`${DEDUPE_PREFIX}${dedupeKey}`);
    await this.scheduleBackoff(jobId, monitor, backoffMs);
  }

  private async scheduleBackoff(jobId: string, monitor: Monitor, backoffMs: number) {
    const nextRun = Date.now() + backoffMs;
    monitor.next_refresh_at = nextRun;
    await this.persistJobPayload(jobId, monitor);
    await redis.zadd(JOB_QUEUE_KEY, nextRun, jobId);
  }

  private async scheduleNextRun(jobId: string, monitor: Monitor, intervalSec: number) {
    const nextRun = Date.now() + (intervalSec * 1000);
    monitor.next_refresh_at = nextRun;
    await this.persistJobPayload(jobId, monitor);
    await redis.zadd(JOB_QUEUE_KEY, nextRun, jobId);
  }

  private computeBackoffMs(attempt: number) {
    const index = Math.min(Math.max(attempt, 1) - 1, BACKOFF_STEPS_MS.length - 1);
    const base = BACKOFF_STEPS_MS[index];
    const jitter = base * 0.2;
    const delta = (Math.random() * (jitter * 2)) - jitter;
    return Math.min(base + delta, BACKOFF_MAX_MS);
  }

  private async persistJobPayload(jobId: string, monitor: Monitor) {
    const jobKey = `${JOB_KEY_PREFIX}${jobId}`;
    await redis.hset(jobKey, 'monitor', JSON.stringify(monitor));
  }

  private async incrementThrottleCount(jobId: string, reason: string) {
    const jobKey = `${JOB_KEY_PREFIX}${jobId}`;
    const record = await redis.hgetall(jobKey);
    const current = Number(record?.throttle_count || 0);
    const next = current + 1;
    await redis.hset(jobKey, 'throttle_count', String(next));
    await redis.hset(jobKey, 'last_throttle_reason', reason);
    return next;
  }

  private async resetThrottleCount(jobId: string) {
    const jobKey = `${JOB_KEY_PREFIX}${jobId}`;
    await redis.hset(jobKey, 'throttle_count', '0');
  }

  private normalizeMonitorPayload(rawRecord: any, jobId: string): Monitor {
    const base = rawRecord?.monitor ?? rawRecord?.data ?? rawRecord;
    const parsed = this.parsePayload(base);

    const marketplaces = this.normalizeMarketplaces(parsed.marketplaces ?? parsed.marketplace);
    const userId = parsed.user_id ?? parsed.userId;
    if (!userId) throw new Error('monitor.user_id missing');

    const refreshInterval = parsed.refresh_interval_sec ?? parsed.refreshIntervalSec;
    const refreshIntervalNum = Number(refreshInterval);
    if (!Number.isFinite(refreshIntervalNum) || refreshIntervalNum <= 0) {
      throw new Error('monitor.refresh_interval_sec invalid');
    }

    const boostIntervalRaw = parsed.boost_interval_sec ?? parsed.boostIntervalSec ?? null;
    const boostIntervalNum = boostIntervalRaw === null || boostIntervalRaw === undefined ? null : Number(boostIntervalRaw);
    const priorityRaw = parsed.priority ?? 0;
    const priorityNum = Number(priorityRaw) || 0;

    const query = parsed.query;
    if (!query || typeof query !== 'string') {
      throw new Error('monitor.query missing');
    }

    const normalized: Monitor = {
      id: String(parsed.id || jobId),
      user_id: String(userId),
      name: String(parsed.name || 'Monitor'),
      query,
      marketplaces,
      refresh_interval_sec: refreshIntervalNum,
      boost_interval_sec: boostIntervalNum,
      is_enabled: parsed.is_enabled !== undefined ? Boolean(parsed.is_enabled) : (parsed.isEnabled !== undefined ? Boolean(parsed.isEnabled) : true),
      priority: priorityNum,
      next_refresh_at: parsed.next_refresh_at ?? parsed.nextRefreshAt,
      last_refresh_at: parsed.last_refresh_at ?? parsed.lastRefreshAt,
    };

    const boostFlag = Boolean(parsed.is_boosted ?? parsed.isBoosted);
    if (boostFlag || this.isBoostedMonitor(normalized)) {
      normalized.priority = Math.max(10, normalized.priority || 0);
      if (!normalized.boost_interval_sec || !Number.isFinite(normalized.boost_interval_sec)) {
        normalized.boost_interval_sec = TierPolicy.boost_settings.interval_sec;
      }
    }

    if (!Array.isArray(normalized.marketplaces)) {
      throw new Error('monitor.marketplaces is not iterable');
    }

    return normalized;
  }

  private parsePayload(raw: any) {
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch (error) {
        throw new Error('monitor payload is not valid JSON');
      }
    }
    return raw || {};
  }

  private normalizeMarketplaces(raw: unknown): Marketplace[] {
    if (Array.isArray(raw)) {
      const items = raw.map(String).filter(Boolean);
      if (!items.length) throw new Error('monitor.marketplaces is not iterable');
      return items as Marketplace[];
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) throw new Error('monitor.marketplaces is not iterable');
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            const items = parsed.map(String).filter(Boolean);
            if (!items.length) throw new Error('monitor.marketplaces is not iterable');
            return items as Marketplace[];
          }
        } catch {
          // fall through to wrap
        }
      }
      return [trimmed] as Marketplace[];
    }
    throw new Error('monitor.marketplaces is not iterable');
  }

  private isBoostedMonitor(monitor: Monitor) {
    return Boolean(monitor.boost_interval_sec && monitor.priority >= 10);
  }

  private getEffectiveIntervalSec(monitor: Monitor) {
    if (this.isBoostedMonitor(monitor) && monitor.boost_interval_sec) {
      return monitor.boost_interval_sec;
    }
    return monitor.refresh_interval_sec;
  }

  private buildDedupeKey(monitor: Monitor, intervalSec: number) {
    const bucket = Math.floor(Date.now() / (intervalSec * 1000));
    const markets = [...monitor.marketplaces].sort().join(',');
    const raw = `${monitor.id}:${bucket}:${markets}`;
    return this.hashString(raw);
  }

  private hashString(value: string) {
    let hash = 5381;
    for (let i = 0; i < value.length; i += 1) {
      hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }

  private async getUserLimit(userId: string): Promise<number> {
    const tierName = await redis.get(`mf:user:${userId}:tier`);
    const tier = TierPolicy.tiers[tierName as keyof typeof TierPolicy.tiers] || TierPolicy.tiers.free;
    return tier.max_concurrency_user;
  }

  private getMarketplaceLimit(mp: Marketplace): number {
    return TierPolicy.marketplace_limits[mp]?.max_concurrency_global || 10;
  }

  private async getUserBucketConfig(userId: string) {
    const tierName = await redis.get(`mf:user:${userId}:tier`);
    const tier = TierPolicy.tiers[tierName as keyof typeof TierPolicy.tiers] || TierPolicy.tiers.free;
    const capacity = Math.max(1, tier.max_concurrency_user);
    const refillPerSec = capacity / tier.default_interval_sec;
    return { capacity, refillPerSec };
  }

  private getMarketplaceBucketConfig(mp: Marketplace) {
    const limits = TierPolicy.marketplace_limits[mp] || { max_concurrency_global: 10, min_spacing_ms: 1000 };
    const capacity = Math.max(1, limits.max_concurrency_global);
    const refillPerSec = 1000 / Math.max(1, limits.min_spacing_ms);
    return { capacity, refillPerSec };
  }

  private async consumeTokenBucket(key: string, capacity: number, refillPerSec: number) {
    const now = Date.now();
    const raw = await redis.get(key);
    let tokens = capacity;
    let lastRefill = now;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        tokens = Number(parsed.tokens);
        lastRefill = Number(parsed.last_refill_ms);
      } catch {
        tokens = capacity;
        lastRefill = now;
      }
    }

    const elapsedSec = Math.max(0, (now - lastRefill) / 1000);
    const refilled = Math.min(capacity, tokens + (elapsedSec * refillPerSec));

    if (refilled < 1) {
      await redis.set(key, JSON.stringify({ tokens: refilled, last_refill_ms: now }));
      return false;
    }

    const remaining = refilled - 1;
    await redis.set(key, JSON.stringify({ tokens: remaining, last_refill_ms: now }));
    return true;
  }

  private async restoreTokenBucket(key: string, capacity: number) {
    const raw = await redis.get(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const tokens = Math.min(capacity, Number(parsed.tokens) + 1);
      await redis.set(key, JSON.stringify({ tokens, last_refill_ms: Number(parsed.last_refill_ms) || Date.now() }));
    } catch {
      await redis.set(key, JSON.stringify({ tokens: capacity, last_refill_ms: Date.now() }));
    }
  }

  // --- External Hooks (to connect with mockScraperService) ---
  public onJobStart: (job: ScrapeJob) => void = () => {};
  public onJobUpdate: (job: ScrapeJob) => void = () => {};

  private notifyJobStart(job: ScrapeJob) {
    this.onJobStart(job);
  }

  private notifyJobUpdate(job: ScrapeJob) {
    this.onJobUpdate(job);
  }

  /**
   * Called when the worker finishes (Success or Fail)
   * Decrements counters and releases locks.
   */
  async completeRun(job: ScrapeJob) {
    if (job.status !== 'throttled' && job.status !== 'skipped') {
      await redis.decr(`${USER_CONC_PREFIX}${job.userId}`);
      await redis.decr(`${MP_CONC_PREFIX}${job.site}`);
    }

    if (job.monitorId) {
      await redis.del(`${RUN_LOCK_PREFIX}${job.monitorId}:${job.site}`);
    }
  }
}

export const scheduler = new SchedulerEngine();
