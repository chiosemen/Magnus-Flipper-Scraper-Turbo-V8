import { ScrapeResult, ScrapeOptions } from './base.scraper';
import { SearchCriteria, CreateDeal, DealSource } from '@repo/types';
import { PriceParser } from '../parsers/price.parser';
import { TitleParser } from '../parsers/title.parser';
import { runApifyActor, APIFY_ACTORS, APIFY_DEFAULTS } from '../lib/apify';
import { StorageService } from '../services/storage.service';
import { logger } from '@repo/logger';
import { createHash } from 'crypto';

interface CraigslistApifyItem {
  id?: string;
  postingId?: string;
  title?: string;
  price?: number | string;
  currency?: string;
  url?: string;
  image?: string;
  images?: string[];
  location?: string;
  description?: string;
}

export class CraigslistScraper {
  readonly source: DealSource = 'craigslist';
  readonly baseUrl = 'https://craigslist.org';
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  buildSearchUrl(criteria: SearchCriteria): string {
    // Defaulting to sfbay for demo, in production should map location to CL subdomain
    const region = criteria.location ? 'sfbay' : 'sfbay';
    const baseUrl = `https://${region}.craigslist.org/search/sss`;
    const params = new URLSearchParams();

    if (criteria.keywords.length > 0) params.append('query', criteria.keywords.join(' '));
    if (criteria.minPrice) params.append('min_price', criteria.minPrice.toString());
    if (criteria.maxPrice) params.append('max_price', criteria.maxPrice.toString());
    params.append('sort', 'date'); // Newest first

    return `${baseUrl}?${params.toString()}`;
  }

  async search(criteria: SearchCriteria, options: ScrapeOptions): Promise<ScrapeResult> {
    logger.info('[Craigslist] Starting Apify actor scrape', {
      keywords: criteria.keywords,
      jobId: options.jobId,
    });

    try {
      // Build Apify actor input
      const input: Record<string, any> = {
        query: criteria.keywords.join(' '),
        maxItems: APIFY_DEFAULTS.MAX_ITEMS,
        region: 'sfbay', // Default region
        sortBy: 'date',
      };

      // Add price filters if provided
      if (criteria.minPrice) input.minPrice = criteria.minPrice;
      if (criteria.maxPrice) input.maxPrice = criteria.maxPrice;

      // TODO: Verify actor ID for Craigslist - may need configuration
      // apify/craigslist-scraper is a placeholder; check Apify store for the correct actor
      const result = await runApifyActor<CraigslistApifyItem>({
        actorId: APIFY_ACTORS.CRAIGSLIST,
        input,
        timeoutSecs: APIFY_DEFAULTS.TIMEOUT_SECS,
        maxItems: APIFY_DEFAULTS.MAX_ITEMS,
      });

      logger.info('[Craigslist] Apify actor completed', {
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
          logger.warn('[Craigslist] Failed to map item', {
            error: error instanceof Error ? error.message : String(error),
            item: JSON.stringify(item).substring(0, 100),
          });
        }
      }

      return {
        dealsFound: deals.length,
        dealsNew: deals.length,
        deals,
      };
    } catch (error) {
      logger.error('[Craigslist] Scrape failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private mapToDeal(item: CraigslistApifyItem, options: ScrapeOptions): CreateDeal | null {
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

    // Determine source ID (prefer id/postingId, fallback to URL extraction or hash)
    let sourceId = item.id?.trim() || item.postingId?.trim();
    if (!sourceId && item.url) {
      const idMatch = item.url.match(/\/(\d+)\.html/);
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
      sourceUrl = this.baseUrl;
    }

    // Images
    const thumbnail = item.image || (item.images && item.images[0]) || '';
    const images = item.images || (thumbnail ? [thumbnail] : []);

    return {
      source: 'craigslist',
      sourceId,
      sourceUrl,
      title: TitleParser.clean(title),
      category: 'general',
      condition: TitleParser.extractCondition(title),
      listPrice: price,
      currency: currency as any,
      images: images.filter(Boolean),
      thumbnailUrl: thumbnail || undefined,
      status: 'active',
      sellerName: 'Private Seller',
      location: item.location,
      description: item.description,
      monitorId: options.monitorId || '',
      userId: options.userId,
      scrapedAt: new Date(),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    };
  }
}
