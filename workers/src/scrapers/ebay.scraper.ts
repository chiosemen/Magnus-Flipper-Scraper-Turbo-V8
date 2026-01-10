import { runApifyActor } from '../lib/apify';
import {
  SCRAPING_ACTORS,
  SCRAPING_ENABLED,
} from '../config/scraping.config';
import { CreateDeal, DealCondition, Currency } from '@repo/types';
import { logger } from '@repo/logger';
import crypto from 'crypto';

interface EbayApifyItem {
  itemId?: string;
  epid?: string;
  title?: string;
  price?: number | string;
  currency?: string;
  url?: string;
  itemUrl?: string;
  image?: string;
  images?: string[];
  location?: string;
  itemLocation?: string;
  description?: string;
  category?: string;
  categoryPath?: string;
  condition?: string;
  conditionDescription?: string;
  seller?: {
    username?: string;
    feedbackScore?: number;
    feedbackPercentage?: number;
  };
  sellerUsername?: string;
}

const mapEbayCondition = (condition?: string): DealCondition => {
  const lower = (condition || '').toLowerCase();
  if (lower.includes('new') || lower.includes('brand new')) return 'new';
  if (lower.includes('like new') || lower.includes('open box')) return 'like_new';
  if (lower.includes('very good') || lower.includes('excellent')) return 'like_new';
  if (lower.includes('good')) return 'good';
  if (lower.includes('acceptable') || lower.includes('fair')) return 'fair';
  if (lower.includes('for parts') || lower.includes('not working')) return 'for_parts';
  return 'unknown';
};

const mapCurrency = (currency?: string): Currency => {
  const upper = (currency || '').toUpperCase();
  const valid: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
  return valid.includes(upper as Currency) ? (upper as Currency) : 'USD';
};

export async function scrapeEbay(params: {
  query: string;
  maxItems?: number;
  userId: string;
  monitorId?: string;
}): Promise<{ items: CreateDeal[] }> {
  if (!SCRAPING_ENABLED) {
    logger.warn('[eBay] Scraping disabled via SCRAPING_ENABLED');
    return { items: [] };
  }

  const config = SCRAPING_ACTORS.ebay;

  if (!config.enabled) {
    logger.warn('[eBay] Actor disabled via config');
    return { items: [] };
  }

  const items = await runApifyActor<EbayApifyItem>({
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
      item.itemId ??
      item.epid ??
      String(item.url ?? item.itemUrl ?? '').split('/').pop() ??
      crypto
        .createHash('sha256')
        .update(item.url ?? item.title ?? Math.random().toString())
        .digest('hex');

    return {
      source: 'ebay',
      sourceId,
      sourceUrl: item.url ?? item.itemUrl ?? '',
      title: item.title ?? 'Untitled listing',
      description: item.description ?? '',
      category: item.category ?? item.categoryPath ?? 'general',
      condition: mapEbayCondition(item.condition ?? item.conditionDescription),
      listPrice:
        typeof item.price === 'number'
          ? item.price
          : parseFloat(String(item.price ?? '0')),
      currency: mapCurrency(item.currency),
      shippingCost: 0, // eBay shipping varies, default to 0
      location: item.location ?? item.itemLocation,
      sellerName: item.seller?.username ?? item.sellerUsername ?? 'Unknown Seller',
      sellerRating: item.seller?.feedbackPercentage
        ? item.seller.feedbackPercentage / 20
        : undefined,
      sellerReviews: item.seller?.feedbackScore,
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

  logger.info('[eBay] Scrape completed', {
    query: params.query,
    items: normalized.length,
  });

  return { items: normalized };
}
