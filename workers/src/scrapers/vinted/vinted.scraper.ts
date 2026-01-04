import { Page } from 'playwright';
import { BaseScraper, ScrapeResult, ScrapeOptions } from '../base.scraper';
import { SearchCriteria, CreateDeal, DealSource } from '@repo/types';
import { logger } from '@repo/logger';
import { classifyVintedHtml } from './antibot';
import { parseVintedListings } from './parser';

const LISTING_SELECTOR = 'article[data-testid="listing-card"], .vintage-listing-card';
const NEXT_PAGE_SELECTOR = 'a[data-testid="search-pagination-next"], .next-page';

const detectNextPage = async (page: Page): Promise<string | null> => {
  const next = await page.$(NEXT_PAGE_SELECTOR);
  return next ? (await next.getAttribute('href')) : null;
};

class VintedScraperError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export class VintedScraper extends BaseScraper {
  readonly source: DealSource = 'vinted';
  readonly baseUrl = 'https://www.vinted.com/catalog';

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
    const url = this.buildSearchUrl(criteria);
    return this.scrapeUrl(url, options);
  }

  async parseSearchResults(page: Page): Promise<{ listings: CreateDeal[]; nextPageUrl: string | null }> {
    const html = await page.content();
    const classification = classifyVintedHtml(html);
    if (classification.state !== 'OK') {
      throw new VintedScraperError(`VINTED_${classification.state}`, classification.reason || 'Blocked by Vinted');
    }

    const listings = parseVintedListings(html, classification);
    if (!listings.length) {
      throw new VintedScraperError('VINTED_NO_LISTINGS', 'Vinted returned no parsable listings');
    }

    const nextPageUrl = await detectNextPage(page);
    return { listings, nextPageUrl };
  }

  protected async scrapeUrl(url: string, options: ScrapeOptions): Promise<ScrapeResult> {
    const context = await this.browserService.createContext();
    const page = await context.newPage();
    await this.antibotService.applyStealthMeasures(page);
    try {
      await this.navigateWithRetry(page, url);
      await page.waitForSelector(LISTING_SELECTOR, { timeout: 15000 });
      const { listings, nextPageUrl } = await this.parseSearchResults(page);

      const deals: CreateDeal[] = [];
      for (const deal of listings) {
        deal.userId = options.userId;
        if (options.monitorId) deal.monitorId = options.monitorId;
        await this.storageService.saveDeal(deal, options.jobId, options.userId);
        deals.push(deal);
      }

      return {
        dealsFound: deals.length,
        dealsNew: deals.length,
        deals,
      };
    } catch (error) {
      logger.error('Vinted scraper failed', error as Error);
      throw error;
    } finally {
      await context.close();
    }
  }
}
