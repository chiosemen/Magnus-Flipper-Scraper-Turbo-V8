import { ScrapeResult, ScrapeOptions } from './base.scraper';
import { SearchCriteria, CreateDeal, DealSource } from '@repo/types';
import { PriceParser } from '../parsers/price.parser';
import { TitleParser } from '../parsers/title.parser';
import { runApifyActor, APIFY_ACTORS, APIFY_DEFAULTS } from '../lib/apify';
import { StorageService } from '../services/storage.service';
import { logger } from '@repo/logger';
import { createHash } from 'crypto';

interface FacebookApifyItem {
  id?: string;
  listingId?: string;
  title?: string;
  price?: number | string;
  currency?: string;
  url?: string;
  image?: string;
  images?: string[];
  location?: string;
  sellerName?: string;
  description?: string;
}

export class FacebookScraper {
  readonly source: DealSource = 'facebook';
  readonly baseUrl = 'https://www.facebook.com/marketplace';
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  buildSearchUrl(criteria: SearchCriteria): string {
    return `${this.baseUrl}/search?query=${encodeURIComponent(criteria.keywords.join(' '))}`;
  }

  async search(criteria: SearchCriteria, options: ScrapeOptions): Promise<ScrapeResult> {
    logger.info('[Facebook] Starting Apify actor scrape', {
      keywords: criteria.keywords,
      jobId: options.jobId,
    });

    try {
      // Build Apify actor input
      const input: Record<string, any> = {
        query: criteria.keywords.join(' '),
        maxItems: APIFY_DEFAULTS.MAX_ITEMS,
      };

      // Add price filters if provided
      if (criteria.minPrice) input.minPrice = criteria.minPrice;
      if (criteria.maxPrice) input.maxPrice = criteria.maxPrice;

      // TODO: Verify actor ID for Facebook Marketplace - may need configuration
      // apify/facebook-marketplace-scraper is a placeholder; check Apify store for the correct actor
      const result = await runApifyActor<FacebookApifyItem>({
        actorId: APIFY_ACTORS.FACEBOOK,
        input,
        timeoutSecs: APIFY_DEFAULTS.TIMEOUT_SECS,
        maxItems: APIFY_DEFAULTS.MAX_ITEMS,
      });

      logger.info('[Facebook] Apify actor completed', {
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
          logger.warn('[Facebook] Failed to map item', ({
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
      logger.error('[Facebook] Scrape failed', ({
        error: error instanceof Error ? error.message : String(error),
      } as any));
      throw error;
    }
  }

  private mapToDeal(item: FacebookApifyItem, options: ScrapeOptions): CreateDeal | null {
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

    // Determine source ID (prefer id/listingId, fallback to URL extraction or hash)
    let sourceId = item.id?.trim() || item.listingId?.trim();
    if (!sourceId && item.url) {
      const idMatch = item.url.match(/marketplace\/item\/(\d+)/) || item.url.match(/item\/(\d+)/);
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
      sourceUrl = `https://www.facebook.com/marketplace/item/${sourceId}`;
    }
    if (!sourceUrl) {
      sourceUrl = this.baseUrl;
    }

    // Images
    const thumbnail = item.image || (item.images && item.images[0]) || '';
    const images = item.images || (thumbnail ? [thumbnail] : []);

    // Seller name
    const sellerName = item.sellerName || 'Facebook Seller';

    return {
      source: 'facebook',
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
      sellerName,
      location: item.location,
      description: item.description,
      monitorId: options.monitorId || '',
      userId: options.userId,
      scrapedAt: new Date(),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      shippingCost: 0,
    };
  }

  // Lightweight DOM parsing for unit tests
  async parseSearchResults(page: any) {
    const html: string = await (page.content ? page.content() : page.evaluate(() => document.documentElement.outerHTML));
    const blockRegex = /<div[^>]*role=\"article\"([\s\S]*?)<\/div>/gi;
    let m;
    const listings: any[] = [];

    while ((m = blockRegex.exec(html)) !== null) {
      const block = m[1];
      const idMatch = block.match(/data-id=\"(\d+)\"/) || block.match(/\/marketplace\/item\/(\d+)\//);
      const id = idMatch ? idMatch[1] : undefined;
      const titleMatch = block.match(/data-testid=\"listing_title\"[^>]*>([^<]+)</) || block.match(/<span[^>]*>([^<]+)<\/span>/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      const priceMatch = block.match(/\$(\d[\d,]*)/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;
      const locationMatch = block.match(/data-testid=\"listing_location\"[^>]*>([^<]+)</);
      const location = locationMatch ? locationMatch[1].trim() : undefined;
      const imgMatch = block.match(/<img[^>]*src=\"([^\"]+)\"/);
      const image = imgMatch ? imgMatch[1] : undefined;

      if (title && price > 0) {
        listings.push({ id, title, listPrice: price, location, image });
      }
    }

    return { listings };
  }
}

export function detectFacebookLoginWall(html: string) {
  const s = (html || '').toLowerCase();
  return /log in to facebook|please log in|login to continue/.test(s);
}

export function detectFacebookBlocked(html: string) {
  const s = (html || '').toLowerCase();
  if (s.includes('verify you are human') || s.includes('captcha')) {
    return { blocked: true, provider: 'captcha' };
  }
  return { blocked: false };
}

export function classifyFacebookHtml(html: string, count: number) {
  if (detectFacebookLoginWall(html)) return 'login';
  const b = detectFacebookBlocked(html);
  if (b.blocked) return 'blocked';
  if (count === 0 || /marketplacesearchresults/.test((html || '').toLowerCase()) === false) return 'empty';
  return 'results';
}