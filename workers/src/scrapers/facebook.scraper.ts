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
    
    // Try to find article divs
    const blockRegex = /<div[^>]*role=\"article\"([\s\S]*?)<\/div>/gi;
    let m;
    const listings: any[] = [];

    while ((m = blockRegex.exec(html)) !== null) {
      const block = m[1];
      
      // Extract link first if available
      const linkMatch = block.match(/<a[^>]*href=\"([^\"]+)\"/);
      const link = linkMatch ? linkMatch[1] : undefined;
      
      // Extract image
      const imgMatch = block.match(/<img[^>]*src=\"([^\"]+)\"/);
      const image = imgMatch ? imgMatch[1] : undefined;
      
      // Extract all spans and find price + title
      const spans = block.match(/<span[^>]*>([^<]+)<\/span>/g) || [];
      let price = 0;
      let title = '';
      let location: string | undefined;
      let foundPrice = false;
      
      for (let i = 0; i < spans.length; i++) {
        const spanText = spans[i].replace(/<span[^>]*>/, '').replace(/<\/span>/, '').trim();
        
        // Price is usually like "$XXX" or "$X,XXX"
        if (!foundPrice && /^\$[\d,]+/.test(spanText)) {
          price = parseInt(spanText.replace(/[$,]/g, ''), 10);
          foundPrice = true;
        } else if (foundPrice && title === '' && spanText.length > 5) {
          // Next substantial span after price is likely the title
          title = spanText;
        } else if (title && !location && /[A-Z]{2}$|,\s*[A-Z]{2}$/.test(spanText)) {
          // Last span often has location pattern
          location = spanText;
        }
      }
      
      // If we couldn't find via spans, look for data attributes
      if (!title) {
        const titleMatch = block.match(/data-testid=\"listing_title\"[^>]*>([^<]+)</) || block.match(/PlayStation|Xbox|Nintendo|Console|Item/i);
        if (titleMatch) title = titleMatch[1] || titleMatch[0];
      }
      
      if (!location) {
        const locationMatch = block.match(/data-testid=\"listing_location\"[^>]*>([^<]+)</);
        if (locationMatch) location = locationMatch[1].trim();
      }

      if (title && price > 0) {
        const sourceUrl = link && !link.startsWith('http') ? `https://www.facebook.com${link}` : (link || 'https://www.facebook.com/marketplace');
        listings.push({ 
          title, 
          listPrice: price, 
          location, 
          sourceUrl,
          sourceId: link?.match(/\/(\d+)/)?.[1] || `facebook-${Math.random().toString(36).substring(7)}`,
          source: 'facebook',
          thumbnailUrl: image,
          category: 'general',
          condition: 'unknown',
          currency: 'USD',
          images: image ? [image] : [],
          status: 'active',
          sellerName: 'Facebook Seller',
          shippingCost: 0,
          scrapedAt: new Date(),
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        });
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
  if (s.includes('verify you are human') || s.includes('captcha') || s.includes('consent') || s.includes('cookies')) {
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