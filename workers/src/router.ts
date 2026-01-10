import { JobPayload, SearchCriteria, CreateDeal } from '@repo/types';
import { scrapeAmazon } from './scrapers/amazon';
import { scrapeEbay } from './scrapers/ebay';
import { scrapeFacebook } from './scrapers/facebook';
import { scrapeVinted } from './scrapers/vinted';
import { scrapeCraigslist } from './scrapers/craigslist';
import { StatusService } from './services/status.service';
import { logger } from '@repo/logger';
import { db, schema } from './lib/db';
import { and, eq, sql } from 'drizzle-orm';

const TIER_ERROR_CODES = {
  MONITOR_LIMIT: 'TIER_MONITOR_LIMIT',
  REFRESH_INTERVAL: 'TIER_REFRESH_INTERVAL',
  CONCURRENCY_LIMIT: 'TIER_CONCURRENCY_LIMIT',
} as const;

type TierKey = 'free' | 'basic' | 'pro' | 'elite' | 'enterprise';

const TIER_LIMITS: Record<TierKey, { maxMonitors: number; minIntervalSec: number; maxConcurrency: number }> = {
  free: { maxMonitors: 3, minIntervalSec: 43200, maxConcurrency: 1 },
  basic: { maxMonitors: 25, minIntervalSec: 43200, maxConcurrency: 2 },
  pro: { maxMonitors: 60, minIntervalSec: 21600, maxConcurrency: 3 },
  elite: { maxMonitors: 100, minIntervalSec: 10800, maxConcurrency: 5 },
  enterprise: { maxMonitors: 180, minIntervalSec: 7200, maxConcurrency: 8 },
};

const DEFAULT_TIER: TierKey = 'free';

const PRICE_ID_BY_TIER: Record<Exclude<TierKey, 'free'>, string | undefined> = {
  basic: process.env.STRIPE_PRICE_ID_BASIC,
  pro: process.env.STRIPE_PRICE_ID_PRO,
  elite: process.env.STRIPE_PRICE_ID_ELITE,
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE,
};

const tierByPriceId: Record<string, TierKey> = Object.entries(PRICE_ID_BY_TIER)
  .reduce((acc, [tier, priceId]) => {
    if (priceId) acc[priceId] = tier as TierKey;
    return acc;
  }, {} as Record<string, TierKey>);

class TierLimitError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const resolveUserTier = async (userId: string): Promise<TierKey> => {
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(schema.subscriptions.userId, userId),
      eq(schema.subscriptions.status, 'active')
    ),
  });
  const storedTier = subscription?.tier as TierKey | undefined;
  const mapped = subscription?.stripePriceId ? tierByPriceId[subscription.stripePriceId] : null;
  return storedTier || mapped || DEFAULT_TIER;
};

const enforceTierLimits = async (payload: JobPayload) => {
  const userId = payload.meta.userId;
  const tier = await resolveUserTier(userId);
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  const runningJobs = await db.execute(sql`
    SELECT count(*) as count FROM ${schema.jobs}
    WHERE user_id = ${userId} AND status = 'running'
  `);
  const runningCount = Number(runningJobs[0]?.count || 0);
  if (runningCount >= limits.maxConcurrency) {
    throw new TierLimitError(TIER_ERROR_CODES.CONCURRENCY_LIMIT, 'Concurrency limit reached for tier');
  }

  const monitorId = payload.params.monitorId;
  if (!monitorId) return;

  const monitor = await db.query.monitors.findFirst({
    where: and(eq(schema.monitors.id, monitorId), eq(schema.monitors.userId, userId))
  });
  if (!monitor) {
    throw new Error('Monitor not found');
  }

  const monitorCount = await db.execute(sql`
    SELECT count(*) as count FROM ${schema.monitors}
    WHERE user_id = ${userId}
  `);
  const totalMonitors = Number(monitorCount[0]?.count || 0);
  if (totalMonitors > limits.maxMonitors) {
    throw new TierLimitError(TIER_ERROR_CODES.MONITOR_LIMIT, 'Monitor limit reached for tier');
  }

  if (monitor.lastRunAt) {
    const lastRunAtMs = new Date(monitor.lastRunAt).getTime();
    const elapsedSec = (Date.now() - lastRunAtMs) / 1000;
    if (elapsedSec < limits.minIntervalSec) {
      throw new TierLimitError(TIER_ERROR_CODES.REFRESH_INTERVAL, 'Refresh interval floor not met for tier');
    }
  }

  await db.update(schema.monitors)
    .set({ lastRunAt: new Date() })
    .where(eq(schema.monitors.id, monitorId));
};

/**
 * Pure function dispatch to Apify-first scrapers
 * NO classes, NO inheritance, NO magic
 */
async function runScrape(source: string, criteria: SearchCriteria): Promise<CreateDeal[]> {
  switch (source) {
    case 'amazon':
      return scrapeAmazon(criteria);
    case 'ebay':
      return scrapeEbay(criteria);
    case 'facebook':
      return scrapeFacebook(criteria);
    case 'vinted':
      return scrapeVinted(criteria);
    case 'craigslist':
      return scrapeCraigslist(criteria);
    default:
      throw new Error(`Unsupported source: ${source}`);
  }
}

export class JobRouter {
  private statusService: StatusService;

  constructor() {
    this.statusService = new StatusService();
  }

  async route(payload: JobPayload) {
    const { jobId, type, source, params, meta } = payload;

    await enforceTierLimits(payload);
    await this.statusService.updateStatus(jobId, 'running', 10, { startedAt: new Date() });

    try {
      let criteria = params.criteria as SearchCriteria;

      // Fallback for legacy searchQuery format
      if (!criteria && typeof params.searchQuery === 'string') {
        const keywords = params.searchQuery
          .split(/[,\n]+/)
          .map((value: string) => value.trim())
          .filter(Boolean);
        if (keywords.length > 0) {
          criteria = { keywords };
        }
      }

      if (!criteria) {
        throw new Error('No search criteria provided');
      }

      let deals: CreateDeal[] = [];

      if (type === 'monitor_search') {
        // Execute Apify-first scrape
        deals = await runScrape(source, criteria);

        // Enrich with metadata
        deals = deals.map(deal => ({
          ...deal,
          userId: meta.userId,
          monitorId: params.monitorId || '',
        }));
      } else if (type === 'single_url') {
        logger.warn('Single URL scrape not implemented, requires URL-specific Apify actors');
        deals = [];
      } else {
        throw new Error(`Unsupported job type: ${type}`);
      }

      const result = {
        dealsFound: deals.length,
        dealsNew: deals.length, // TODO: Implement delta detection
        deals,
      };

      await this.statusService.updateStatus(jobId, 'completed', 100, {
        dealsFound: result.dealsFound,
        dealsNew: result.dealsNew
      });

      return result;

    } catch (error) {
      logger.error(`Job ${jobId} failed`, error as Error);
      const errorCode = (error as any)?.code;
      await this.statusService.updateStatus(jobId, 'failed', 0, {
        error: errorCode ? { code: errorCode, message: (error as Error).message } : (error as Error).message
      });
      throw error;
    }
  }
}
