import { runApifyActor } from '../lib/apify';
import {
  SCRAPING_ACTORS,
  SCRAPING_ENABLED,
} from '../config/scraping.config';
import { CreateDeal, DealCondition, Currency } from '@repo/types';
import { logger } from '@repo/logger';
import crypto from 'crypto';

interface GumtreeApifyItem {
  id?: string;
  adId?: string;
  title?: string;
  price?: number | string;
  currency?: string;
  url?: string;
  adUrl?: string;
  image?: string;
  images?: string[];
  location?: string;
  city?: string;
  description?: string;
  category?: string;
  condition?: string;
  seller?: {
    name?: string;
  };
  sellerName?: string;
}

const mapGumtreeCondition = (condition?: string): DealCondition => {
  const lower = (condition || '').toLowerCase();
  if (lower.includes('new') || lower.includes('brand new')) return 'new';
  if (lower.includes('like new') || lower.includes('as new')) return 'like_new';
  if (lower.includes('good')) return 'good';
  if (lower.includes('fair') || lower.includes('used')) return 'fair';
  return 'unknown';
};

const mapCurrency = (currency?: string): Currency => {
  const upper = (currency || '').toUpperCase();
  const valid: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
  return valid.includes(upper as Currency) ? (upper as Currency) : 'GBP';
};

export async function scrapeGumtree(params: {
  query: string;
  maxItems?: number;
  userId: string;
  monitorId?: string;
}): Promise<{ items: CreateDeal[] }> {
  if (!SCRAPING_ENABLED) {
    logger.warn('[Gumtree] Scraping disabled via SCRAPING_ENABLED');
    return { items: [] };
  }

  const config = SCRAPING_ACTORS.gumtree;

  if (!config.enabled) {
    logger.warn('[Gumtree] Actor disabled via config');
    return { items: [] };
  }

  const items = await runApifyActor<GumtreeApifyItem>({
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
      item.adId ??
      String(item.url ?? item.adUrl ?? '').split('/').pop() ??
      crypto
        .createHash('sha256')
        .update(item.url ?? item.title ?? Math.random().toString())
        .digest('hex');

    return {
      source: 'gumtree',
      sourceId,
      sourceUrl: item.url ?? item.adUrl ?? '',
      title: item.title ?? 'Untitled listing',
      description: item.description ?? '',
      category: item.category ?? 'general',
      condition: mapGumtreeCondition(item.condition),
      listPrice:
        typeof item.price === 'number'
          ? item.price
          : parseFloat(String(item.price ?? '0')),
      currency: mapCurrency(item.currency),
      shippingCost: 0, // Gumtree is typically local pickup
      location: item.location ?? item.city,
      sellerName: item.seller?.name ?? item.sellerName ?? 'Unknown Seller',
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

  logger.info('[Gumtree] Scrape completed', {
    query: params.query,
    items: normalized.length,
  });

  return { items: normalized };
}
