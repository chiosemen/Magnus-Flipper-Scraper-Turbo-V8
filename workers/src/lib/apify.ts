import { ApifyClient } from 'apify-client';
import { logger } from '@repo/logger';

<<<<<<< HEAD
// Apify Actor IDs - overridable via env vars for cost control
export const APIFY_ACTORS = {
  amazon: process.env.APIFY_ACTOR_AMAZON ?? 'apify/amazon-scraper',
  ebay: process.env.APIFY_ACTOR_EBAY ?? 'mfr355/ebay-scraper',
  facebook: process.env.APIFY_ACTOR_FACEBOOK ?? 'apify/facebook-marketplace-scraper',
  vinted: process.env.APIFY_ACTOR_VINTED ?? 'kliment/vinted-scraper',
  craigslist: process.env.APIFY_ACTOR_CRAIGSLIST ?? 'apify/craigslist-scraper',
} as const;

// Initialize Apify client once
const client = new ApifyClient({
  token: process.env.APIFY_TOKEN,
});

export type ApifyActorInput = {
  actorId: string;
  input: Record<string, any>;
  timeout?: number;
};

/**
 * Run an Apify actor and wait for results
 * This is the ONLY execution surface for scraping
 * No browsers, no Playwright, no local headless Chrome
 */
export async function runApifyActor<T = any>(params: ApifyActorInput): Promise<T[]> {
  const { actorId, input, timeout = 300 } = params;

  logger.info('Starting Apify actor run', {
    actorId,
    input,
    timeout,
  });

  try {
    // Start actor run
    const run = await client.actor(actorId).call(input, {
      timeout,
      waitSecs: timeout,
    });

    if (!run || !run.id) {
      throw new Error('Apify run failed to start');
    }

    logger.info('Apify actor run completed', {
      actorId,
      runId: run.id,
      status: run.status,
    });

    // Fetch results from default dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    logger.info('Apify results fetched', {
      actorId,
      runId: run.id,
      itemCount: items.length,
    });

    return items as T[];
  } catch (error) {
    logger.error(`Apify actor run failed for ${actorId}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
=======
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
): Promise<ApifyRunResult<T>> {
  const { actorId, input, timeoutSecs = 120, memoryMbytes = 2048, maxItems } = options;

  logger.info(`[Apify] Starting actor run`, {
    actorId,
    timeoutSecs,
    memoryMbytes,
    maxItems,
    inputKeys: Object.keys(input),
  });

  try {
    // Start the actor run
    const run = await client.actor(actorId).call(input, {
      timeout: timeoutSecs,
      memory: memoryMbytes,
    });

    logger.info(`[Apify] Actor run completed`, {
      actorId,
      runId: run.id,
      status: run.status,
      defaultDatasetId: run.defaultDatasetId,
    });

    // Validate run succeeded
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

    // Fetch dataset items with pagination
    const items: T[] = [];
    let offset = 0;
    const limit = 100; // Fetch in chunks of 100

    while (true) {
      const dataset = await client.dataset(run.defaultDatasetId).listItems({
        offset,
        limit,
      });

      if (!dataset.items || dataset.items.length === 0) {
        break; // No more items
      }

      items.push(...(dataset.items as T[]));

      logger.info(`[Apify] Fetched ${dataset.items.length} items from dataset`, {
        actorId,
        runId: run.id,
        offset,
        totalFetched: items.length,
      });

      // Check if we've reached maxItems limit
      if (maxItems && items.length >= maxItems) {
        logger.info(`[Apify] Reached maxItems limit`, {
          actorId,
          runId: run.id,
          maxItems,
          totalFetched: items.length,
        });
        break;
      }

      // Check if we've fetched all items
      if (dataset.items.length < limit) {
        break; // Last page
      }

      offset += limit;
    }

    logger.info(`[Apify] Successfully fetched all items from dataset`, {
      actorId,
      runId: run.id,
      totalItems: items.length,
      datasetId: run.defaultDatasetId,
    });

    return {
      items: maxItems ? items.slice(0, maxItems) : items,
      runId: run.id,
      status: run.status,
      defaultDatasetId: run.defaultDatasetId,
    };
  } catch (error) {
    logger.error(`[Apify] Actor run failed`, {
      actorId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get actor configuration constants
 * These can be overridden via environment variables
 */
export const APIFY_ACTORS = {
  AMAZON: process.env.APIFY_ACTOR_AMAZON || 'apify/amazon-scraper',
  EBAY: process.env.APIFY_ACTOR_EBAY || 'apify/ebay-scraper',
  FACEBOOK: process.env.APIFY_ACTOR_FACEBOOK || 'apify/facebook-marketplace-scraper',
  VINTED: process.env.APIFY_ACTOR_VINTED || 'apify/vinted-scraper',
  CRAIGSLIST: process.env.APIFY_ACTOR_CRAIGSLIST || 'apify/craigslist-scraper',
} as const;

/**
 * Default configuration for actor runs
 * Can be overridden via environment variables
 */
export const APIFY_DEFAULTS = {
  TIMEOUT_SECS: parseInt(process.env.APIFY_TIMEOUT_SECS_DEFAULT || '120', 10),
  MEMORY_MBYTES: parseInt(process.env.APIFY_MEMORY_MBYTES_DEFAULT || '2048', 10),
  MAX_ITEMS: parseInt(process.env.APIFY_MAX_ITEMS_DEFAULT || '50', 10),
} as const;
>>>>>>> main
