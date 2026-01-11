import { ScrapeResult, ScrapeOptions } from './base.scraper';
import { SearchCriteria, CreateDeal, DealSource } from '@repo/types';
import { PriceParser } from '../parsers/price.parser';
import { TitleParser } from '../parsers/title.parser';
import { runApifyActor, APIFY_ACTORS, APIFY_DEFAULTS } from '../lib/apify';
import { StorageService } from '../services/storage.service';
import { logger } from '@repo/logger';
import { createHash } from 'crypto';

interface AmazonApifyItem {
  asin?: string;
  title?: string;
  price?: number | string;
  currency?: string;
  url?: string;
  thumbnail?: string;
  image?: string;
  images?: string[];
  stars?: number;
  reviews?: number;
  seller?: string;
  availability?: string;
}

export class AmazonScraper {
  readonly source: DealSource = 'amazon';
  readonly baseUrl = 'https://www.amazon.com';
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  buildSearchUrl(criteria: SearchCriteria): string {
    const params = new URLSearchParams();
    params.append('k', criteria.keywords.join(' '));
    params.append('s', 'date-desc-rank'); // Newest arrivals
    return `${this.baseUrl}/s?${params.toString()}`;
  }

  async search(criteria: SearchCriteria, options: ScrapeOptions): Promise<ScrapeResult> {
    logger.info('[Amazon] Starting Apify actor scrape', {
      keywords: criteria.keywords,
      jobId: options.jobId,
    });

    try {
      // Build Apify actor input
      const input: Record<string, any> = {
        searchTerms: criteria.keywords.join(' '),
        maxItems: APIFY_DEFAULTS.MAX_ITEMS,
        country: 'US',
      };

      // Add price filters if provided
      if (criteria.minPrice || criteria.maxPrice) {
        if (criteria.minPrice) input.minPrice = criteria.minPrice;
        if (criteria.maxPrice) input.maxPrice = criteria.maxPrice;
      }

      // Run Apify actor
      const result = await runApifyActor<AmazonApifyItem>({
        actorId: APIFY_ACTORS.AMAZON,
        input,
        timeoutSecs: APIFY_DEFAULTS.TIMEOUT_SECS,
        maxItems: APIFY_DEFAULTS.MAX_ITEMS,
      });

      logger.info('[Amazon] Apify actor completed', {
        itemCount: result.items.length,
        runId: result.runId,
      });

      // Map Apify items to CreateDeal format
      const deals: CreateDeal[] = [];
      for (const item of result.items) {
        try {
          const deal = this.mapToDeal(item, options);
          if (deal) {
            // Save deal to storage
            await this.storageService.saveDeal(deal, options.jobId, options.userId);
            deals.push(deal);
          }
        } catch (error) {
          logger.warn('[Amazon] Failed to map item', ({
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
      logger.error('[Amazon] Scrape failed', ({
        error: error instanceof Error ? error.message : String(error),
      } as any));
      throw error;
    }
  }

  private mapToDeal(item: AmazonApifyItem, options: ScrapeOptions): CreateDeal | null {
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

    // Determine source ID (prefer ASIN, fallback to hash)
    let sourceId = item.asin?.trim();
    if (!sourceId) {
      const url = item.url || '';
      const hash = createHash('sha256').update(url + title).digest('hex');
      sourceId = hash.substring(0, 16);
    }

    // Build source URL
    let sourceUrl = item.url || '';
    if (sourceUrl && !sourceUrl.startsWith('http')) {
      sourceUrl = `https://www.amazon.com${sourceUrl}`;
    }
    if (!sourceUrl) {
      sourceUrl = sourceId.length === 10 ? `https://www.amazon.com/dp/${sourceId}` : this.baseUrl;
    }

    // Images
    const thumbnail = item.thumbnail || item.image || (item.images && item.images[0]) || '';
    const images = item.images || (thumbnail ? [thumbnail] : []);

    // Seller name
    const sellerName = item.seller || 'Amazon';

    // Check availability
    const availability = (item.availability || '').toLowerCase();
    const isOutOfStock = availability.includes('out of stock') || availability.includes('unavailable');
    if (isOutOfStock) return null;

    return {
      source: 'amazon',
      sourceId,
      sourceUrl,
      title: TitleParser.clean(title),
      category: 'general',
      condition: 'new', // Amazon typically sells new items
      listPrice: price,
      currency: currency as any,
      images: images.filter(Boolean),
      thumbnailUrl: thumbnail || undefined,
      status: 'active',
      sellerName,
      monitorId: options.monitorId || '',
      userId: options.userId,
      scrapedAt: new Date(),
      shippingCost: 0,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    };
  }

  // Lightweight DOM parsing for unit tests
  async parseSearchResults(page: any) {
    const html: string = await (page.content ? page.content() : page.evaluate(() => document.documentElement.outerHTML));
    const blockRegex = /<div[^>]*data-component-type=\"s-search-result\"([\s\S]*?)<\/div>/gi;
    let m;
    const listings: any[] = [];

    while ((m = blockRegex.exec(html)) !== null) {
      const block = m[1];
      const titleMatch = block.match(/<span[^>]*class=\"a-size-medium[^\"]*\"[^>]*>([^<]+)<\/span>/) || block.match(/<span[^>]*>([^<]+)<\/span>/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      const priceMatch = block.match(/\$(\d[\d,]*)/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;
      const urlMatch = block.match(/href=\"([^\"]+)\"/);
      const url = urlMatch ? urlMatch[1] : '';

      if (title && price > 0) {
        listings.push({ title, listPrice: price, url, source: 'amazon' });
      }
    }

    return { listings };
  }
}
