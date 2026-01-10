/**
<<<<<<< HEAD
 * Scraping Configuration - Apify Actor Registry
 *
 * Centralized configuration for all marketplace actors.
 * Each marketplace has an actor ID, enabled flag, and default limits.
=======
 * Scraping Configuration
 *
 * Central configuration for scraping behavior after Apify-first migration.
 * All production marketplace scraping uses Apify actors.
>>>>>>> main
 */

import { logger } from '@repo/logger';

// Apify Configuration
export const APIFY_TOKEN = process.env.APIFY_TOKEN;
export const APIFY_TIMEOUT_SECS_DEFAULT = parseInt(
  process.env.APIFY_TIMEOUT_SECS_DEFAULT || '120',
  10
);
export const APIFY_MEMORY_MBYTES_DEFAULT = parseInt(
  process.env.APIFY_MEMORY_MBYTES_DEFAULT || '2048',
  10
);
export const APIFY_MAX_ITEMS_DEFAULT = parseInt(
  process.env.APIFY_MAX_ITEMS_DEFAULT || '50',
  10
);

// Actor IDs (configurable via environment variables)
export const APIFY_ACTOR_AMAZON = process.env.APIFY_ACTOR_AMAZON || 'apify/amazon-scraper';
export const APIFY_ACTOR_EBAY = process.env.APIFY_ACTOR_EBAY || 'apify/ebay-scraper';
export const APIFY_ACTOR_FACEBOOK =
  process.env.APIFY_ACTOR_FACEBOOK || 'apify/facebook-marketplace-scraper';
export const APIFY_ACTOR_VINTED = process.env.APIFY_ACTOR_VINTED || 'apify/vinted-scraper';
export const APIFY_ACTOR_CRAIGSLIST =
  process.env.APIFY_ACTOR_CRAIGSLIST || 'apify/craigslist-scraper';

// Backwards-compatible map used by older scrapers
export const SCRAPING_ACTORS = {
  amazon: { actorId: APIFY_ACTOR_AMAZON, enabled: true, defaultMaxItems: APIFY_MAX_ITEMS_DEFAULT, timeoutSecs: APIFY_TIMEOUT_SECS_DEFAULT },
  ebay: { actorId: APIFY_ACTOR_EBAY, enabled: true, defaultMaxItems: APIFY_MAX_ITEMS_DEFAULT, timeoutSecs: APIFY_TIMEOUT_SECS_DEFAULT },
  facebook: { actorId: APIFY_ACTOR_FACEBOOK, enabled: true, defaultMaxItems: APIFY_MAX_ITEMS_DEFAULT, timeoutSecs: APIFY_TIMEOUT_SECS_DEFAULT },
  vinted: { actorId: APIFY_ACTOR_VINTED, enabled: true, defaultMaxItems: APIFY_MAX_ITEMS_DEFAULT, timeoutSecs: APIFY_TIMEOUT_SECS_DEFAULT },
  gumtree: { actorId: process.env.APIFY_ACTOR_GUMTREE || 'apify/gumtree-scraper', enabled: true, defaultMaxItems: APIFY_MAX_ITEMS_DEFAULT, timeoutSecs: APIFY_TIMEOUT_SECS_DEFAULT },
  craigslist: { actorId: APIFY_ACTOR_CRAIGSLIST, enabled: true, defaultMaxItems: APIFY_MAX_ITEMS_DEFAULT, timeoutSecs: APIFY_TIMEOUT_SECS_DEFAULT },
};

// Scraping Safety Configuration
export const SCRAPING_ENABLED = process.env.SCRAPING_ENABLED !== 'false';
export const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Validate scraping configuration on startup
 * Fail-fast if required configuration is missing in production
 */
export function validateScrapingConfig(): void {
  logger.info('[Config] Validating scraping configuration', {
    nodeEnv: NODE_ENV,
    scrapingEnabled: SCRAPING_ENABLED,
  });

  // Require APIFY_TOKEN in all environments
  if (!APIFY_TOKEN) {
    const error = new Error(
      '[Config] APIFY_TOKEN is required but not set. Cannot initialize scraping services.'
    );
    logger.error('[Config] Missing APIFY_TOKEN', error as any);
    throw error;
  }

  // In production, scraping must be explicitly enabled
  if (NODE_ENV === 'production' && !SCRAPING_ENABLED) {
    logger.warn('[Config] SCRAPING_ENABLED is false in production - scraping is disabled');
  }

  logger.info('[Config] Scraping configuration valid', {
    apifyTokenPresent: !!APIFY_TOKEN,
    apifyTimeout: APIFY_TIMEOUT_SECS_DEFAULT,
    apifyMaxItems: APIFY_MAX_ITEMS_DEFAULT,
    actors: {
      amazon: APIFY_ACTOR_AMAZON,
      ebay: APIFY_ACTOR_EBAY,
      facebook: APIFY_ACTOR_FACEBOOK,
      vinted: APIFY_ACTOR_VINTED,
      craigslist: APIFY_ACTOR_CRAIGSLIST,
    },
  });
}

/**
 * Assert that scraping is enabled before executing scrape jobs
 * @throws Error if scraping is disabled
 */
export function assertScrapingEnabled(): void {
  if (!SCRAPING_ENABLED) {
    throw new Error(
      '[Config] Scraping is disabled (SCRAPING_ENABLED=false). ' +
        'Set SCRAPING_ENABLED=true to enable scraping operations.'
    );
  }
}

/**
 * Get configuration summary for logging/debugging
 */
export function getConfigSummary() {
  return {
    nodeEnv: NODE_ENV,
    scrapingEnabled: SCRAPING_ENABLED,
    apifyTokenPresent: !!APIFY_TOKEN,
    apifyDefaults: {
      timeoutSecs: APIFY_TIMEOUT_SECS_DEFAULT,
      memoryMbytes: APIFY_MEMORY_MBYTES_DEFAULT,
      maxItems: APIFY_MAX_ITEMS_DEFAULT,
    },
    actors: {
      amazon: APIFY_ACTOR_AMAZON,
      ebay: APIFY_ACTOR_EBAY,
      facebook: APIFY_ACTOR_FACEBOOK,
      vinted: APIFY_ACTOR_VINTED,
      craigslist: APIFY_ACTOR_CRAIGSLIST,
    },
  };
}

