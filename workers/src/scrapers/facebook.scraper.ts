import { BaseScraper, ScrapeResult, ScrapeOptions } from './base.scraper';
import { SearchCriteria, CreateDeal, DealSource } from '@repo/types';
import { Page } from 'playwright';
import { PriceParser } from '../parsers/price.parser';
import { TitleParser } from '../parsers/title.parser';
import { logger } from '@repo/logger';

const RESULTS_SELECTORS = [
  '[data-pagelet="MarketplaceSearchResults"]',
  '[data-testid="marketplace_search_results"]',
  '[role="feed"]'
];
const LISTING_SELECTORS = [
  '[data-testid="marketplace_listing"]',
  'a[href*="/marketplace/item/"]',
  '[role="article"] a[href*="/marketplace/item/"]'
];

export type FacebookScrapeStatus = 'ok' | 'login' | 'blocked' | 'empty';

export const detectFacebookLoginWall = (html: string) => {
  const content = html.toLowerCase();
  return (
    content.includes('log in to facebook') ||
    content.includes('log in to continue') ||
    (content.includes('password') && content.includes('email'))
  );
};

export const detectFacebookBlocked = (html: string) => {
  const content = html.toLowerCase();
  if (content.includes('captcha') || content.includes('verify you are human')) {
    return { blocked: true, reason: 'captcha' as const };
  }
  if (content.includes('temporarily blocked') || content.includes('suspicious activity')) {
    return { blocked: true, reason: 'blocked' as const };
  }
  if (content.includes('cookies') && content.includes('consent')) {
    return { blocked: true, reason: 'consent' as const };
  }
  return { blocked: false as const };
};

export const classifyFacebookHtml = (html: string, listingCount: number): FacebookScrapeStatus => {
  if (detectFacebookBlocked(html).blocked) return 'blocked';
  if (detectFacebookLoginWall(html)) return 'login';
  if (listingCount === 0) return 'empty';
  return 'ok';
};

class FacebookScraperError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export class FacebookScraper extends BaseScraper {
  readonly source: DealSource = 'facebook';
  readonly baseUrl = 'https://www.facebook.com/marketplace';

  buildSearchUrl(criteria: SearchCriteria): string {
    const params = new URLSearchParams();
    params.append('query', criteria.keywords.join(' '));
    if (criteria.minPrice) params.append('minPrice', criteria.minPrice.toString());
    if (criteria.maxPrice) params.append('maxPrice', criteria.maxPrice.toString());
    return `${this.baseUrl}/search/?${params.toString()}`;
  }

  async search(criteria: SearchCriteria, options: ScrapeOptions): Promise<ScrapeResult> {
    const url = this.buildSearchUrl(criteria);
    const context = await this.browserService.createContext();
    const page = await context.newPage();
    await this.antibotService.applyStealthMeasures(page);

    const dealsFound: CreateDeal[] = [];

    try {
      await this.navigateWithRetry(page, url);

      let html = await page.content();
      const blocked = detectFacebookBlocked(html);
      if (blocked.blocked) {
        throw new FacebookScraperError('FB_BLOCKED', `Facebook blocked page (${blocked.reason})`);
      }
      if (detectFacebookLoginWall(html)) {
        throw new FacebookScraperError('FB_LOGIN', 'Facebook login wall detected');
      }

      try {
        await page.waitForSelector(RESULTS_SELECTORS.join(','), { timeout: 15000 });
      } catch (error) {
        html = await page.content();
        if (detectFacebookLoginWall(html)) {
          throw new FacebookScraperError('FB_LOGIN', 'Facebook login wall detected');
        }
        if (detectFacebookBlocked(html).blocked) {
          throw new FacebookScraperError('FB_BLOCKED', 'Facebook blocked page detected');
        }
        throw new FacebookScraperError('FB_EMPTY', 'Facebook results container not found');
      }

      const { listings } = await this.parseSearchResults(page);
      const status = classifyFacebookHtml(await page.content(), listings.length);

      if (status === 'empty') {
        throw new FacebookScraperError('FB_EMPTY', 'Facebook search returned empty results');
      }

      for (const deal of listings) {
        deal.source = this.source;
        deal.scrapedAt = new Date();
        deal.lastSeenAt = new Date();
        deal.userId = options.userId;
        if (options.monitorId) {
          deal.monitorId = options.monitorId;
        }

        await this.storageService.saveDeal(deal, options.jobId, options.userId);
        dealsFound.push(deal);
      }
    } catch (error) {
      logger.error('Facebook scraper failed', error as Error);
      throw error;
    } finally {
      await context.close();
    }

    return {
      dealsFound: dealsFound.length,
      dealsNew: dealsFound.length,
      deals: dealsFound,
    };
  }

  async parseSearchResults(page: Page): Promise<{ listings: CreateDeal[]; nextPageUrl: string | null }> {
    const listings: CreateDeal[] = [];
    const cards = await page.$$(LISTING_SELECTORS.join(','));

    for (const card of cards) {
      try {
        const linkEl = await card.$('a[href*="/marketplace/item/"], a');
        const href = (await linkEl?.getAttribute('href')) || '';
        const url = href.startsWith('http') ? href : `https://www.facebook.com${href}`;

        const idMatch = url.match(/marketplace\/item\/(\d+)/) || url.match(/item\/(\d+)/);
        const sourceId = idMatch?.[1] || (await card.getAttribute('data-id')) || '';
        if (!sourceId) continue;

        const titleEl = await card.$('[data-testid="listing_title"]');
        const priceEl = await card.$('[data-testid="listing_price"]');
        const locationEl = await card.$('[data-testid="listing_location"]');

        const titleFromData = (await titleEl?.innerText())?.trim() || '';
        const priceFromData = (await priceEl?.innerText()) || '';
        const locationFromData = (await locationEl?.innerText()) || '';

        const lines = (await card.innerText())
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);

        const priceLine = priceFromData || lines.find((line) => /[$£€]/.test(line)) || '';
        const locationLine = locationFromData || lines.find((line) => /,\\s*[A-Z]{2}|\\b(?:miles|km)\\b/i.test(line)) || '';
        const titleLine = titleFromData || lines.find((line) => line !== priceLine && line !== locationLine) || '';

        if (!titleLine) continue;
        const { value: price, currency } = PriceParser.parse(priceLine);
        if (price === null) continue;

        const imageEl = await card.$('img[data-testid="listing_image"], img');
        const imageUrl = (await imageEl?.getAttribute('src')) || '';

        listings.push({
          source: 'facebook',
          sourceId,
          sourceUrl: url,
          title: TitleParser.clean(titleLine),
          category: 'general',
          condition: TitleParser.extractCondition(titleLine),
          listPrice: price,
          currency: currency as any,
          images: imageUrl ? [imageUrl] : [],
          thumbnailUrl: imageUrl || undefined,
          status: 'active',
          sellerName: 'Facebook Seller',
          location: locationLine || undefined,
          monitorId: '',
          userId: '',
          dealScore: 50,
          scrapedAt: new Date(),
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        logger.warn('Failed to parse Facebook listing', { error: (error as Error).message });
      }
    }

    return { listings, nextPageUrl: null };
  }
}
