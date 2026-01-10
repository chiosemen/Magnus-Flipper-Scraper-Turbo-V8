import { ScrapeResult, ScrapeOptions } from './base.scraper';
import { SearchCriteria, CreateDeal, DealSource } from '@repo/types';
import { PriceParser } from '../parsers/price.parser';
import { TitleParser } from '../parsers/title.parser';
import { runApifyActor, APIFY_ACTORS, APIFY_DEFAULTS } from '../lib/apify';
import { StorageService } from '../services/storage.service';
import { logger } from '@repo/logger';
import { createHash } from 'crypto';

interface EbayApifyItem {
  itemId?: string;
  title?: string;
  price?: number | string;
  currency?: string;
  url?: string;
  image?: string;
  images?: string[];
  sellerName?: string;
  sellerUsername?: string;
  condition?: string;
  itemLocation?: string;
}

export class EbayScraper {
  readonly source: DealSource = 'ebay';
  readonly baseUrl = 'https://www.ebay.com';
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  buildSearchUrl(criteria: SearchCriteria): string {
    const params = new URLSearchParams();
    params.append('_nkw', criteria.keywords.join(' '));
    if (criteria.minPrice) params.append('_udlo', criteria.minPrice.toString());
    if (criteria.maxPrice) params.append('_udhi', criteria.maxPrice.toString());
    params.append('_sop', '10'); // Newly Listed
    params.append('LH_BIN', '1'); // Buy It Now

    return `${this.baseUrl}/sch/i.html?${params.toString()}`;
  }

  async search(criteria: SearchCriteria, options: ScrapeOptions): Promise<ScrapeResult> {
    logger.info('[eBay] Starting Apify actor scrape', {
      keywords: criteria.keywords,
      jobId: options.jobId,
    });

    try {
      // Build Apify actor input
      const input: Record<string, any> = {
        query: criteria.keywords.join(' '),
        maxItems: APIFY_DEFAULTS.MAX_ITEMS,
        sortBy: 'newly-listed',
      };

      // Add price filters if provided
      if (criteria.minPrice) input.minPrice = criteria.minPrice;
      if (criteria.maxPrice) input.maxPrice = criteria.maxPrice;

      // Run Apify actor
      const result = await runApifyActor<EbayApifyItem>({
        actorId: APIFY_ACTORS.EBAY,
        input,
        timeoutSecs: APIFY_DEFAULTS.TIMEOUT_SECS,
        maxItems: APIFY_DEFAULTS.MAX_ITEMS,
      });

      logger.info('[eBay] Apify actor completed', {
        itemCount: result.items.length,
        runId: result.runId,
      });

      // Map Apify items to CreateDeal format
      const deals: CreateDeal[] = [];
      for (const item of result.items) {
        try {
          const deal = this.mapToDeal(item, options);
          if (deal) {
            await this.storageService.saveDeal(deal, options.jobId, options.userId);
            deals.push(deal);
          }
        } catch (error) {
          logger.warn('[eBay] Failed to map item', ({
            error: error instanceof Error ? error.message : String(error),
            item: JSON.stringify(item).substring(0, 100),
          } as any));
        }
      }

      return {
        dealsFound: deals.length,
        dealsNew: deals.length,
        deals,
      };
    } catch (error) {
      logger.error('[eBay] Scrape failed', ({
        error: error instanceof Error ? error.message : String(error),
      } as any));
      throw error;
    }
  }

  private mapToDeal(item: EbayApifyItem, options: ScrapeOptions): CreateDeal | null {
    // Extract and validate required fields
    const title = item.title?.trim();
    if (!title) return null;

    // Price parsing
    let price: number | null = null;
    let currency = 'USD';

    if (typeof item.price === 'number') {
      price = item.price;
    } else if (typeof item.price === 'string') {
      const parsed = PriceParser.parse(item.price);
      price = parsed.value;
      currency = parsed.currency || 'USD';
    }

    if (price === null || price <= 0) return null;

    // Determine source ID (prefer itemId, fallback to URL extraction or hash)
    let sourceId = item.itemId?.trim();
    if (!sourceId && item.url) {
      const idMatch = item.url.match(/\/(\d+)\?/);
      sourceId = idMatch ? idMatch[1] : undefined;
    }
    if (!sourceId) {
      const url = item.url || '';
      const hash = createHash('sha256').update(url + title).digest('hex');
      sourceId = hash.substring(0, 16);
    }

    // Build source URL
    let sourceUrl = item.url || '';
    if (!sourceUrl) {
      sourceUrl = sourceId ? `https://www.ebay.com/itm/${sourceId}` : this.baseUrl;
    }

    // Images
    const thumbnail = item.image || (item.images && item.images[0]) || '';
    const images = item.images || (thumbnail ? [thumbnail] : []);

    // Seller name
    const sellerName = item.sellerName || item.sellerUsername || 'eBay User';

    // Condition
    const conditionStr = item.condition?.toLowerCase() || '';
    let condition: any = TitleParser.extractCondition(title);
    if (conditionStr.includes('new')) condition = 'new';
    else if (conditionStr.includes('like new')) condition = 'like_new';
    else if (conditionStr.includes('good')) condition = 'good';
    else if (conditionStr.includes('fair')) condition = 'fair';

    return {
      source: 'ebay',
      sourceId,
      sourceUrl,
      title: TitleParser.clean(title),
      category: 'general',
      condition,
      listPrice: price,
      currency: currency as any,
      images: images.filter(Boolean),
      thumbnailUrl: thumbnail || undefined,
      status: 'active',
      sellerName,
      location: item.itemLocation,
      monitorId: options.monitorId || '',
      userId: options.userId,
      scrapedAt: new Date(),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      shippingCost: 0,
    };
  }
}

