import { runApifyActor } from '../lib/apify';
import {
  SCRAPING_ACTORS,
  SCRAPING_ENABLED,
} from '../config/scraping.config';
import { CreateDeal } from '@repo/types';
import { logger } from '@repo/logger';

interface CraigslistApifyItem {
  id?: string;
  postingId?: string;
  title?: string;
  price?: number;
  url?: string;
  image?: string;
  images?: string[];
  location?: string;
  hood?: string;
  description?: string;
  body?: string;
  category?: string;
  geotag?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Pure Apify-first Craigslist scraper
 */
export async function scrapeCraigslist(params: {
  query: string;
  maxItems?: number;
  userId: string;
  monitorId?: string;
}): Promise<{ items: CreateDeal[] }> {
  if (!SCRAPING_ENABLED) {
    logger.warn('[Craigslist] Scraping disabled via SCRAPING_ENABLED');
    return { items: [] };
  }

  const config = SCRAPING_ACTORS.craigslist;

  if (!config.enabled) {
    logger.warn('[Craigslist] Actor disabled via config');
    return { items: [] };
  }

  const items = await runApifyActor<CraigslistApifyItem>({
    actorId: config.actorId,
    input: {
      search: params.query,
      maxItems: params.maxItems ?? config.defaultMaxItems,
    },
    timeout: config.timeoutSecs,
  });

  const now = new Date();
  const normalized: CreateDeal[] = items.map((item) => {
    const sourceId =
      item.id ??
      item.postingId ??
      String(item.url ?? '').split('/').pop()?.replace('.html', '') ??
      'unknown';

    return {
      source: 'craigslist',
      sourceId,
      sourceUrl: item.url ?? '',
      title: item.title ?? 'Unknown Listing',
      description: item.description ?? item.body ?? '',
      category: item.category ?? 'general',
      condition: 'unknown', // Craigslist doesn't always specify condition
      listPrice: item.price ?? 0,
      currency: 'USD', // Craigslist is primarily US-based
      shippingCost: 0, // Craigslist is typically local pickup
      location: item.location ?? item.hood,
      coordinates: item.geotag
        ? { latitude: item.geotag.latitude, longitude: item.geotag.longitude }
        : undefined,
      sellerName: 'Craigslist Seller',
      images: item.images ?? (item.image ? [item.image] : []),
      thumbnailUrl: item.image ?? item.images?.[0],
      status: 'active',
      firstSeenAt: now,
      lastSeenAt: now,
      scrapedAt: now,
      monitorId: params.monitorId ?? '',
      userId: params.userId,
    };
  });

  logger.info('[Craigslist] Scrape completed', {
    query: params.query,
    items: normalized.length,
  });

  return { items: normalized };
}
