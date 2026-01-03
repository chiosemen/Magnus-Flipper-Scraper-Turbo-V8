
import { redis } from './infra/RedisAdapter';
import { TierPolicy } from '../config/TierPolicy';
import { Monitor, Marketplace, TierConfig, ScrapeJob } from '../types';
import { ledgerService } from './LedgerService';

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
   * 1. The Main Loop (Runs every 10-30s in prod, faster here for demo)
   */
  async startLoop() {
    if (this.isRunning) return;
    this.isRunning = true;

    setInterval(async () => {
      await this.processDueMonitors();
    }, 2000); // 2s tick for demo purposes
  }

  /**
   * 2. Scheduler: Fetch Due Jobs from ZSET
   */
  private async processDueMonitors() {
    const now = Date.now();
    
    // ZRANGEBYSCORE mf:queue:refresh -inf now LIMIT 0 5
    const dueMonitorIds = await redis.zrangebyscore('mf:queue:refresh', '-inf', now, { limit: { offset: 0, count: 5 } });

    for (const monitorId of dueMonitorIds) {
      // Atomic Claim: ZREM
      const removed = await redis.zrem('mf:queue:refresh', monitorId);
      if (removed) {
        // Load Payload
        const record = await redis.hgetall(`mf:monitor:${monitorId}`);
        const monitor = (record?.data || record) as Monitor;
        
        if (monitor && Array.isArray(monitor.marketplaces)) {
          this.dispatchMonitorRefresh(monitor);
        } else {
            console.warn(`[Scheduler] Invalid monitor payload for ID ${monitorId}:`, monitor);
        }
      }
    }
  }

  /**
   * 3. Refresh Logic: Locking & Dedupe
   */
  private async dispatchMonitorRefresh(monitor: Monitor) {
    const lockKey = `mf:lock:monitor:${monitor.id}`;
    
    // SET NX EX 60 (Prevent double refresh)
    const acquired = await redis.set(lockKey, '1', { nx: true, ex: 60 });
    
    if (!acquired) {
      console.log(`[Scheduler] Monitor ${monitor.id} locked. Skipping.`);
      return;
    }

    // Dedupe Check
    // Generate a dedupe key based on monitor ID, marketplaces, and time bucket (5 min)
    const timeBucket = Math.floor(Date.now() / (5 * 60 * 1000));
    const marketsHash = (monitor.marketplaces || []).sort().join('_');
    const dedupeKey = `${monitor.id}:${marketsHash}:${timeBucket}`;

    const isDuplicate = await redis.get(`mf:dedupe:${dedupeKey}`);
    if (isDuplicate) {
      console.log(`[Scheduler] Skipped duplicate run for ${monitor.id} (Key: ${dedupeKey})`);
      this.logCallback(monitor.id, `[Scheduler] Run deduplicated.`, 'warning');
      await redis.del(lockKey);
      return;
    }

    // Set dedupe marker
    await redis.set(`mf:dedupe:${dedupeKey}`, '1', { ex: 300 });

    // Determine Interval (Boost logic)
    const isBoosted = monitor.isBoosted || false;
    const interval = isBoosted && monitor.boostIntervalSec ? monitor.boostIntervalSec : monitor.refreshIntervalSec;

    // Reschedule Next Run immediately (ZADD)
    const nextRun = Date.now() + (interval * 1000);
    await redis.zadd('mf:queue:refresh', nextRun, monitor.id);
    
    // Update Monitor State
    monitor.lastRefreshAt = Date.now();
    monitor.nextRefreshAt = nextRun;
    await redis.hset(`mf:monitor:${monitor.id}`, 'data', monitor);

    // Ledger Event
    await ledgerService.recordEvent(monitor.userId, 'refresh', monitor.id, 1, { boosted: isBoosted });

    // Fan-out to Marketplaces
    for (const mp of monitor.marketplaces) {
      this.pipelineRun(monitor, mp, dedupeKey);
    }

    // Release Lock (early release allowed since ZSET is updated)
    await redis.del(lockKey);
  }

  /**
   * 4. Run Pipeline & Throttling
   */
  private async pipelineRun(monitor: Monitor, mp: Marketplace, dedupeKey: string) {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Create Job Object for tracking
    const job: ScrapeJob = {
      id: runId,
      monitorId: monitor.id,
      userId: monitor.userId,
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
    const userKey = `mf:conc:user:${monitor.userId}`;
    const userLimit = await this.getUserLimit(monitor.userId);
    
    // Atomic Increment: Returns the new value
    const userActive = await redis.incr(userKey);
    
    if (userActive > userLimit) {
      await redis.decr(userKey); // Rollback immediately
      
      // Throttle Job
      job.status = 'throttled';
      job.throttleReason = 'user_concurrency_cap';
      job.nextRetryAt = new Date(Date.now() + 5000).toISOString(); // 5s Backoff
      
      this.logCallback(job.id, `[Throttle] User cap exceeded (${userActive-1}/${userLimit}). Requeuing in 5s`, 'warning');
      ledgerService.recordEvent(monitor.userId, 'throttle', monitor.id, 0, { reason: 'user_cap' });
      
      // REQUEUE LOGIC:
      // 1. Clear dedupe key so the retry isn't skipped
      // 2. Schedule the monitor to run again in 5s (overriding the standard interval)
      await redis.del(`mf:dedupe:${dedupeKey}`);
      await redis.zadd('mf:queue:refresh', Date.now() + 5000, monitor.id);

      // Notify System (Job created but throttled)
      this.notifyJobStart(job);
      return;
    }

    // --- GATE 2: Global Marketplace Cap ---
    const mpKey = `mf:conc:mp:${mp}`;
    const mpLimit = TierPolicy.marketplace_limits[mp]?.max_concurrency_global || 10;
    
    const mpActive = await redis.incr(mpKey);
    if (mpActive > mpLimit) {
      await redis.decr(userKey); // Rollback User
      await redis.decr(mpKey);   // Rollback MP
      
      // Throttle Job
      job.status = 'throttled';
      job.throttleReason = 'global_mp_cap';
      job.nextRetryAt = new Date(Date.now() + 2000).toISOString();
      
      this.logCallback(job.id, `[Throttle] Global ${mp} cap exceeded. Backoff 2s`, 'warning');
      this.notifyJobStart(job);
      return;
    }

    // --- EXECUTION ---
    // If Gates Passed: Pass to the "Apify" executor
    this.notifyJobStart(job);
  }

  private async getUserLimit(userId: string): Promise<number> {
    // Check Redis for user's tier, default to free
    const tierName = await redis.get(`mf:user:${userId}:tier`);
    const tier = TierPolicy.tiers[tierName as keyof typeof TierPolicy.tiers] || TierPolicy.tiers.free;
    return tier.max_concurrency_user;
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
    // Only decrement if the job was actually running (i.e., not throttled initially)
    // However, if it was throttled, we didn't keep the increment.
    // If it *was* running and then finished, we must decrement.
    if (job.status !== 'throttled' && job.status !== 'skipped') {
       await redis.decr(`mf:conc:user:${job.userId}`);
       await redis.decr(`mf:conc:mp:${job.site}`);
    }
  }
}

export const scheduler = new SchedulerEngine();
