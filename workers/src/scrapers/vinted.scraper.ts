import { runApifyActor } from '../lib/apify';
import {
  SCRAPING_ACTORS,
  SCRAPING_ENABLED,
} from '../config/scraping.config';
import { CreateDeal, DealCondition, Currency } from '@repo/types';
import { logger } from '@repo/logger';
import crypto from 'crypto';

interface VintedApifyItem {
  id?: string;
  itemId?: string;
  title?: string;
  price?: number | string;
  currency?: string;
  url?: string;
  photo?: string;
  photos?: string[];
  location?: string;
  city?: string;
  description?: string;
  brand?: string;
  size?: string;
  condition?: string;
  user?: {
    login?: string;
    id?: string;
  };
  seller?: {
    name?: string;
    login?: string;
  };
}

const mapVintedCondition = (condition?: string): DealCondition => {
  const lower = (condition || '').toLowerCase();
  if (lower.includes('new') || lower.includes('with tags')) return 'new';
  if (lower.includes('like new') || lower.includes('very good')) return 'like_new';
  if (lower.includes('good')) return 'good';
  if (lower.includes('satisfactory') || lower.includes('fair')) return 'fair';
  return 'unknown';
};

const mapCurrency = (currency?: string): Currency => {
  const upper = (currency || '').toUpperCase();
  const valid: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
  return valid.includes(upper as Currency) ? (upper as Currency) : 'EUR';
};

export async function scrapeVinted(params: {
  query: string;
  maxItems?: number;
  userId: string;
  monitorId?: string;
}): Promise<{ items: CreateDeal[] }> {
  if (!SCRAPING_ENABLED) {
    logger.warn('[Vinted] Scraping disabled via SCRAPING_ENABLED');
    return { items: [] };
  }

  const config = SCRAPING_ACTORS.vinted;

  if (!config.enabled) {
    logger.warn('[Vinted] Actor disabled via config');
    return { items: [] };
  }

  const items = await runApifyActor<VintedApifyItem>({
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
      item.itemId ??
      String(item.url ?? '').split('/').pop() ??
      crypto
        .createHash('sha256')
        .update(item.url ?? item.title ?? Math.random().toString())
        .digest('hex');

    return {
      source: 'vinted',
      sourceId,
      sourceUrl: item.url ?? '',
      title: item.title ?? 'Untitled listing',
      description: item.description ?? '',
      category: item.brand ?? 'clothing',
      condition: mapVintedCondition(item.condition),
      listPrice:
        typeof item.price === 'number'
          ? item.price
          : parseFloat(String(item.price ?? '0')),
      currency: mapCurrency(item.currency),
      shippingCost: 0, // Vinted shipping varies, default to 0
      location: item.location ?? item.city,
      sellerName:
        item.seller?.name ??
        item.seller?.login ??
        item.user?.login ??
        'Unknown Seller',
      images: item.photos ?? (item.photo ? [item.photo] : []),
      thumbnailUrl: item.photo ?? item.photos?.[0],
      status: 'active',
      firstSeenAt: now,
      lastSeenAt: now,
      scrapedAt: now,
      monitorId: params.monitorId ?? '',
      userId: params.userId,
    };
  });

  logger.info('[Vinted] Scrape completed', {
    query: params.query,
    items: normalized.length,
  });

  return { items: normalized };
}
