import { ApifyClient } from 'apify-client';
import { logger } from '@repo/logger';

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
