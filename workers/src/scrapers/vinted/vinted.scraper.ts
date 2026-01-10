import { ScrapeResult, ScrapeOptions } from '../base.scraper';
import { SearchCriteria, CreateDeal, DealSource } from '@repo/types';
import { logger } from '@repo/logger';
import { runApifyActor, APIFY_ACTORS, APIFY_DEFAULTS } from '../../lib/apify';
import { StorageService } from '../../services/storage.service';
import { PriceParser } from '../../parsers/price.parser';
import { TitleParser } from '../../parsers/title.parser';
import { createHash } from 'crypto';

interface VintedApifyItem {
  id?: string;
  itemId?: string;
  title?: string;
  price?: number | string;
  currency?: string;
  url?: string;
  photo?: string;
  photos?: string[];
  brand?: string;
  size?: string;
  condition?: string;
  seller?: string;
  location?: string;
}

export class VintedScraper {
  readonly source: DealSource = 'vinted';
  readonly baseUrl = 'https://www.vinted.com/catalog';
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  buildSearchUrl(criteria: SearchCriteria, page = 1): string {
    const params = new URLSearchParams();
    if (criteria.keywords.length) params.append('search_text', criteria.keywords.join(' '));
    if (criteria.location) params.append('location_id', String(criteria.location));
    if (criteria.minPrice) params.append('price_from', criteria.minPrice.toString());
    if (criteria.maxPrice) params.append('price_to', criteria.maxPrice.toString());
    if (page > 1) params.append('page', page.toString());
    return `${this.baseUrl}?${params.toString()}`;
  }

  async search(criteria: SearchCriteria, options: ScrapeOptions): Promise<ScrapeResult> {
    logger.info('[Vinted] Starting Apify actor scrape', {
      keywords: criteria.keywords,
      jobId: options.jobId,
    });

    try {
      // Build Apify actor input
      const input: Record<string, any> = {
        search: criteria.keywords.join(' '),
        maxItems: APIFY_DEFAULTS.MAX_ITEMS,
      };

      // Add price filters if provided
      if (criteria.minPrice) input.priceFrom = criteria.minPrice;
      if (criteria.maxPrice) input.priceTo = criteria.maxPrice;

      // TODO: Verify actor ID for Vinted - may need configuration
      // apify/vinted-scraper is a placeholder; check Apify store for the correct actor
      const result = await runApifyActor<VintedApifyItem>({
        actorId: APIFY_ACTORS.VINTED,
        input,
        timeoutSecs: APIFY_DEFAULTS.TIMEOUT_SECS,
        maxItems: APIFY_DEFAULTS.MAX_ITEMS,
      });

      logger.info('[Vinted] Apify actor completed', {
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
          logger.warn('[Vinted] Failed to map item', {
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
      logger.error('[Vinted] Scrape failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private mapToDeal(item: VintedApifyItem, options: ScrapeOptions): CreateDeal | null {
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

    // Determine source ID (prefer id/itemId, fallback to URL extraction or hash)
    let sourceId = item.id?.trim() || item.itemId?.trim();
    if (!sourceId && item.url) {
      const idMatch = item.url.match(/\/items\/(\d+)-/);
      sourceId = idMatch ? idMatch[1] : undefined;
    }
    if (!sourceId) {
      const url = item.url || '';
      const hash = createHash('sha256').update(url + title).digest('hex');
      sourceId = hash.substring(0, 16);
    }

    // Build source URL
    let sourceUrl = item.url || '';
    if (!sourceUrl.startsWith('http') && sourceId) {
      sourceUrl = `https://www.vinted.com/items/${sourceId}`;
    }
    if (!sourceUrl) {
      sourceUrl = this.baseUrl;
    }

    // Images
    const thumbnail = item.photo || (item.photos && item.photos[0]) || '';
    const images = item.photos || (thumbnail ? [thumbnail] : []);

    // Seller name
    const sellerName = item.seller || 'Vinted User';

    // Map condition from Vinted format
    const conditionStr = (item.condition || '').toLowerCase();
    let condition: any = 'good'; // Default
    if (conditionStr.includes('new') || conditionStr.includes('tags')) condition = 'new';
    else if (conditionStr.includes('excellent') || conditionStr.includes('like new')) condition = 'like_new';
    else if (conditionStr.includes('good')) condition = 'good';
    else if (conditionStr.includes('satisfactory') || conditionStr.includes('fair')) condition = 'fair';

    return {
      source: 'vinted',
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
      location: item.location,
      monitorId: options.monitorId || '',
      userId: options.userId,
      scrapedAt: new Date(),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    };
  }
}
