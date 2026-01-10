import { runApifyActor } from '../lib/apify';
import {
  SCRAPING_ACTORS,
  SCRAPING_ENABLED,
} from '../config/scraping.config';
import { CreateDeal, DealCondition, Currency } from '@repo/types';
import { logger } from '@repo/logger';
import crypto from 'crypto';

interface FacebookApifyItem {
  id?: string;
  listingId?: string;
  title?: string;
  name?: string;
  price?: number | string;
  currency?: string;
  url?: string;
  listingUrl?: string;
  image?: string;
  images?: string[];
  location?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  category?: string;
  condition?: string;
  seller?: {
    name?: string;
  };
  sellerName?: string;
}

const mapFacebookCondition = (condition?: string): DealCondition => {
  const lower = (condition || '').toLowerCase();
  if (lower.includes('new')) return 'new';
  if (lower.includes('like new') || lower.includes('likenew')) return 'like_new';
  if (lower.includes('good')) return 'good';
  if (lower.includes('fair')) return 'fair';
  return 'unknown';
};

const mapCurrency = (currency?: string): Currency => {
  const upper = (currency || '').toUpperCase();
  const valid: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
  return valid.includes(upper as Currency) ? (upper as Currency) : 'USD';
};

export async function scrapeFacebook(params: {
  query: string;
  maxItems?: number;
  userId: string;
  monitorId?: string;
}): Promise<{ items: CreateDeal[] }> {
  if (!SCRAPING_ENABLED) {
    logger.warn('[Facebook] Scraping disabled via SCRAPING_ENABLED');
    return { items: [] };
  }

  const config = SCRAPING_ACTORS.facebook;

  if (!config.enabled) {
    logger.warn('[Facebook] Actor disabled via config');
    return { items: [] };
  }

  const items = await runApifyActor<FacebookApifyItem>({
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
      item.listingId ??
      String(item.url ?? item.listingUrl ?? '').split('/').pop() ??
      crypto
        .createHash('sha256')
        .update(item.url ?? item.title ?? Math.random().toString())
        .digest('hex');

    return {
      source: 'facebook',
      sourceId,
      sourceUrl: item.url ?? item.listingUrl ?? '',
      title: item.title ?? item.name ?? 'Untitled listing',
      description: item.description ?? '',
      category: item.category ?? 'general',
      condition: mapFacebookCondition(item.condition),
      listPrice:
        typeof item.price === 'number'
          ? item.price
          : parseFloat(String(item.price ?? '0')),
      currency: mapCurrency(item.currency),
      shippingCost: 0, // Facebook Marketplace is typically local pickup
      location: item.location ?? item.city,
      coordinates:
        item.latitude && item.longitude
          ? { latitude: item.latitude, longitude: item.longitude }
          : undefined,
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

  logger.info('[Facebook] Scrape completed', {
    query: params.query,
    items: normalized.length,
  });

  return { items: normalized };
}
