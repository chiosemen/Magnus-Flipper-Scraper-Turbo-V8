import { runApifyActor } from '../lib/apify';
import {
  SCRAPING_ACTORS,
  SCRAPING_ENABLED,
} from '../config/scraping.config';
import { CreateDeal, Currency } from '@repo/types';
import { logger } from '@repo/logger';

interface AmazonApifyItem {
  asin?: string;
  id?: string;
  title?: string;
  name?: string;
  price?: number | { value?: number; currency?: string };
  currency?: string;
  url?: string;
  detailUrl?: string;
  image?: string;
  images?: string[];
  thumbnailUrl?: string;
  description?: string;
  category?: string;
  seller?: {
    name?: string;
    location?: string;
    rating?: number;
    reviewsCount?: number;
  };
  shippingPrice?: {
    value?: number;
  };
}

const mapCurrency = (currency?: string): Currency => {
  const upper = (currency || '').toUpperCase();
  const valid: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
  return valid.includes(upper as Currency) ? (upper as Currency) : 'USD';
};

/**
 * Pure Apify-first Amazon scraper
 * NO browsers, NO Playwright, NO local execution
 * Apify handles proxies, fingerprints, antibot
 */
export async function scrapeAmazon(params: {
  query: string;
  maxItems?: number;
  userId: string;
  monitorId?: string;
}): Promise<{ items: CreateDeal[] }> {
  if (!SCRAPING_ENABLED) {
    logger.warn('[Amazon] Scraping disabled via SCRAPING_ENABLED');
    return { items: [] };
  }

  const config = SCRAPING_ACTORS.amazon;

  if (!config.enabled) {
    logger.warn('[Amazon] Actor disabled via config');
    return { items: [] };
  }

  const items = await runApifyActor<AmazonApifyItem>({
    actorId: config.actorId,
    input: {
      search: params.query,
      maxItems: params.maxItems ?? config.defaultMaxItems,
    },
    timeout: config.timeoutSecs,
  });

  const now = new Date();
  const normalized: CreateDeal[] = items.map((item) => {
    const price = typeof item.price === 'object' ? item.price.value ?? 0 : item.price ?? 0;
    const currency = typeof item.price === 'object' ? item.price.currency : item.currency;

    return {
      source: 'amazon',
      sourceId: item.asin ?? item.id ?? String(item.url ?? item.detailUrl ?? '').split('/').pop() ?? 'unknown',
      sourceUrl: item.url ?? item.detailUrl ?? '',
      title: item.title ?? item.name ?? 'Unknown Product',
      description: item.description ?? '',
      category: item.category ?? 'general',
      condition: 'new', // Amazon search typically returns new items
      listPrice: price,
      currency: mapCurrency(currency),
      shippingCost: item.shippingPrice?.value ?? 0,
      location: item.seller?.location,
      sellerName: item.seller?.name ?? 'Amazon',
      sellerRating: item.seller?.rating,
      sellerReviews: item.seller?.reviewsCount,
      images: item.images ?? (item.thumbnailUrl ? [item.thumbnailUrl] : []),
      thumbnailUrl: item.thumbnailUrl ?? item.image ?? item.images?.[0],
      status: 'active',
      firstSeenAt: now,
      lastSeenAt: now,
      scrapedAt: now,
      monitorId: params.monitorId ?? '',
      userId: params.userId,
    };
  });

  logger.info('[Amazon] Scrape completed', {
    query: params.query,
    items: normalized.length,
  });

  return { items: normalized };
}
