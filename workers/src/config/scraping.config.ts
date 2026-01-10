/**
 * Scraping Configuration - Apify Actor Registry
 *
 * Centralized configuration for all marketplace actors.
 * Each marketplace has an actor ID, enabled flag, and default limits.
 */

import { logger } from '@repo/logger';

export type Marketplace = 'facebook' | 'ebay' | 'vinted' | 'gumtree' | 'craigslist';

export const SCRAPING_ENABLED = process.env.SCRAPING_ENABLED !== 'false';

interface ActorConfig {
  actorId: string;
  enabled: boolean;
  defaultMaxItems: number;
  timeoutSecs: number;
}

export const SCRAPING_ACTORS: Record<Marketplace, ActorConfig> = {
  facebook: {
    actorId: process.env.APIFY_ACTOR_FACEBOOK || 'apify/facebook-marketplace-scraper',
    enabled: true,
    defaultMaxItems: 50,
    timeoutSecs: 120,
  },
  ebay: {
    actorId: process.env.APIFY_ACTOR_EBAY || 'mfr355/ebay-scraper',
    enabled: true,
    defaultMaxItems: 50,
    timeoutSecs: 120,
  },
  vinted: {
    actorId: process.env.APIFY_ACTOR_VINTED || 'kliment/vinted-scraper',
    enabled: true,
    defaultMaxItems: 50,
    timeoutSecs: 120,
  },
  gumtree: {
    actorId: process.env.APIFY_ACTOR_GUMTREE || 'apify/gumtree-scraper',
    enabled: true,
    defaultMaxItems: 50,
    timeoutSecs: 120,
  },
  craigslist: {
    actorId: process.env.APIFY_ACTOR_CRAIGSLIST || 'apify/craigslist-scraper',
    enabled: true,
    defaultMaxItems: 50,
    timeoutSecs: 120,
  },
};

/**
 * Validate scraping configuration on startup
 */
export function validateScrapingConfig(): void {
  if (!SCRAPING_ENABLED) {
    logger.warn('[Config] Scraping is globally disabled via SCRAPING_ENABLED');
    return;
  }

  const enabledMarketplaces = Object.entries(SCRAPING_ACTORS)
    .filter(([_, config]) => config.enabled)
    .map(([marketplace]) => marketplace);

  logger.info('[Config] Scraping configuration loaded', {
    enabled: SCRAPING_ENABLED,
    marketplaces: enabledMarketplaces,
  });
}
