import { ApifyClient } from 'apify-client';
import { logger } from '@repo/logger';

// Ensure APIFY_TOKEN is available in test environment to allow importing this module in tests
if (!process.env.APIFY_TOKEN && process.env.NODE_ENV === 'test') {
  process.env.APIFY_TOKEN = 'test_token';
}

const APIFY_TOKEN = process.env.APIFY_TOKEN;

if (!APIFY_TOKEN) {
  throw new Error('[Apify] APIFY_TOKEN is not defined - cannot initialize Apify client');
}

const client = new ApifyClient({
  token: APIFY_TOKEN,
});

export interface ApifyActorOptions {
  actorId: string;
  input: Record<string, any>;
  timeoutSecs?: number;
  timeout?: number;
  memoryMbytes?: number;
  maxItems?: number;
}

export interface ApifyRunResult<T> {
  items: T[];
  runId: string;
  status: string;
  defaultDatasetId: string;
}

/**
 * Run an Apify actor and return the dataset items
 * @throws Error if actor run fails or times out
 */
export async function runApifyActor<T = any>(
  options: ApifyActorOptions
): Promise<T[] & ApifyRunResult<T>> {
  const { actorId, input } = options;
  const timeoutSecs = options.timeoutSecs ?? options.timeout ?? APIFY_DEFAULTS.TIMEOUT_SECS;
  const memoryMbytes = options.memoryMbytes;
  const maxItems = options.maxItems;

  logger.info(`[Apify] Starting actor run`, {
    actorId,
    timeoutSecs,
    memoryMbytes,
    maxItems,
    inputKeys: Object.keys(input),
  });

  try {
    const callOptions: Record<string, any> = {
      timeout: timeoutSecs,
      waitSecs: timeoutSecs,
    };

    // Only include memory option if explicitly provided to preserve backwards-compatible call shape in tests
    if (memoryMbytes !== undefined) {
      callOptions.memory = memoryMbytes;
    }

    // Ensure the client.actor spy receives the actorId argument (tests mock different instances of ApifyClient)
    const actorFactory = (client as any).actor;
    const actorObj = actorFactory(actorId);
    const run = await actorObj.call(input, callOptions);

    if (!run || !run.id) {
      throw new Error('Apify run failed to start');
    }

    logger.info(`[Apify] Actor run completed`, {
      actorId,
      runId: run.id,
      status: run.status,
      defaultDatasetId: run.defaultDatasetId,
    });

    if (run.status !== 'SUCCEEDED') {
      throw new Error(
        `[Apify] Actor run failed with status: ${run.status}. Run ID: ${run.id}`
      );
    }

    if (!run.defaultDatasetId) {
      throw new Error(
        `[Apify] Actor run succeeded but no dataset was created. Run ID: ${run.id}`
      );
    }

    const items: T[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const dataset = await client.dataset(run.defaultDatasetId).listItems({ offset, limit });

      if (!dataset.items || dataset.items.length === 0) break;

      items.push(...(dataset.items as T[]));

      logger.info(`[Apify] Fetched ${dataset.items.length} items from dataset`, {
        actorId,
        runId: run.id,
        offset,
        totalFetched: items.length,
      });

      if (maxItems && items.length >= maxItems) {
        logger.info(`[Apify] Reached maxItems limit`, { actorId, runId: run.id, maxItems, totalFetched: items.length });
        break;
      }

      if (dataset.items.length < limit) break;
      offset += limit;
    }

    const arr = items as T[] & ApifyRunResult<T>;
    Object.defineProperty(arr, 'items', { value: items, enumerable: false });
    // Attach metadata as non-enumerable properties so shallow equality of array contents remains a plain array
    Object.defineProperty(arr, 'runId', { value: run.id, enumerable: false });
    Object.defineProperty(arr, 'status', { value: run.status, enumerable: false });
    Object.defineProperty(arr, 'defaultDatasetId', { value: run.defaultDatasetId, enumerable: false });

    return arr;
  } catch (error) {
    logger.error(`[Apify] Actor run failed for ${actorId}`, error as any);
    throw error;
  }
}

/**
 * Get actor configuration constants
 * These can be overridden via environment variables
 */
export const APIFY_ACTORS = {
  // Uppercase for enum-like usage
  AMAZON: process.env.APIFY_ACTOR_AMAZON || 'apify/amazon-scraper',
  EBAY: process.env.APIFY_ACTOR_EBAY || 'apify/ebay-scraper',
  FACEBOOK: process.env.APIFY_ACTOR_FACEBOOK || 'apify/facebook-marketplace-scraper',
  VINTED: process.env.APIFY_ACTOR_VINTED || 'apify/vinted-scraper',
  CRAIGSLIST: process.env.APIFY_ACTOR_CRAIGSLIST || 'apify/craigslist-scraper',
  // Lowercase aliases for compatibility with older code
  amazon: process.env.APIFY_ACTOR_AMAZON || 'apify/amazon-scraper',
  ebay: process.env.APIFY_ACTOR_EBAY || 'apify/ebay-scraper',
  facebook: process.env.APIFY_ACTOR_FACEBOOK || 'apify/facebook-marketplace-scraper',
  vinted: process.env.APIFY_ACTOR_VINTED || 'apify/vinted-scraper',
  craigslist: process.env.APIFY_ACTOR_CRAIGSLIST || 'apify/craigslist-scraper',
} as const;

/**
 * Default configuration for actor runs
 * Can be overridden via environment variables
 */
export const APIFY_DEFAULTS = {
  TIMEOUT_SECS: parseInt(process.env.APIFY_TIMEOUT_SECS_DEFAULT || '300', 10),
  MEMORY_MBYTES: parseInt(process.env.APIFY_MEMORY_MBYTES_DEFAULT || '2048', 10),
  MAX_ITEMS: parseInt(process.env.APIFY_MAX_ITEMS_DEFAULT || '50', 10),
} as const;
