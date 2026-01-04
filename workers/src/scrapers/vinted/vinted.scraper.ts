import { JSDOM } from 'jsdom';
import { Page } from 'playwright';
import { BaseScraper, ScrapeResult, ScrapeOptions } from '../base.scraper';
import { SearchCriteria, CreateDeal, DealSource } from '@repo/types';
import { PriceParser } from '../parsers/price.parser';
import { TitleParser } from '../parsers/title.parser';
import { logger } from '@repo/logger';

const LISTING_SELECTOR = 'article[data-testid="listing-card"], .vintage-listing-card';
const NEXT_PAGE_SELECTOR = 'a[data-testid="search-pagination-next"], .next-page';

export type VintedClassification = {
  state: 'ok' | 'empty' | 'blocked' | 'login' | 'consent' | 'rate_limited';
  reason?: string;
};

const moneyToNumber = (value: string): number | null => {
  if (!value) return null;
  const cleaned = value.replace(/[^\d.]/g, '');
  return cleaned ? Number(cleaned) : null;
};

export const classifyVintedHtml = (html: string): VintedClassification => {
  const lowered = html.toLowerCase();
  if (lowered.includes('please login') || lowered.includes('sign-in')) {
    return { state: 'login', reason: 'login_required' };
  }
  if (lowered.includes('blocked') || lowered.includes('forbidden') || lowered.includes('access denied')) {
    return { state: 'blocked', reason: 'bot_block' };
  }
  if (lowered.includes('confirm you are human') || lowered.includes('prove you are not a robot')) {
    return { state: 'consent', reason: 'consent_overlay' };
  }
  if (lowered.includes('too many requests') || lowered.includes('rate limit exceeded')) {
    return { state: 'rate_limited', reason: 'rate_limit' };
  }
  if (lowered.includes('we found nothing') || lowered.includes('no listings match')) {
    return { state: 'empty', reason: 'no_results' };
  }
  return { state: 'ok' };
};

const extractListingFromNode = (node: Element): CreateDeal | null => {
  const idAttr = node.getAttribute('data-item-id') || node.getAttribute('data-listing-id');
  const linkEl = node.querySelector<HTMLAnchorElement>('a[href*="vinted.com/item/"], a[href*="/item/"]');
  const link = linkEl?.href;
  const title = (node.querySelector('[data-testid="listing-card-title"], h3, .title')?.textContent || '').trim();
  const priceText = (node.querySelector('[data-testid="listing-card-price"], .price')?.textContent || '').trim();
  const priceValue = PriceParser.parse(priceText);
  const image = (node.querySelector('img') as HTMLImageElement | null)?.src;
  const location = node.querySelector('[data-testid="listing-card-location"], .location')?.textContent?.trim();
  const createdAt = node.querySelector('time')?.getAttribute('datetime');

  if (!idAttr || !link || !title || priceValue.value === null) return null;

  return {
    source: 'vinted',
    sourceId: idAttr,
    sourceUrl: link,
    title: TitleParser.clean(title),
    category: 'fashion',
    condition: TitleParser.extractCondition(title),
    listPrice: priceValue.value,
    currency: priceValue.currency as any,
    images: image ? [image] : [],
    thumbnailUrl: image || undefined,
    status: 'active',
    sellerName: 'Vinted Seller',
    location,
    monitorId: '',
    userId: '',
    dealScore: 70,
    scrapedAt: new Date(),
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    createdAt: createdAt ? new Date(createdAt) : new Date(),
    updatedAt: new Date(),
  };
};

export const parseVintedListings = (html: string): CreateDeal[] => {
  const dom = new JSDOM(html);
  const nodes = Array.from(dom.window.document.querySelectorAll(LISTING_SELECTOR));
  const listings: CreateDeal[] = [];
  for (const node of nodes) {
    const deal = extractListingFromNode(node);
    if (deal) listings.push(deal);
  }
  return listings;
};

const detectNextPage = async (page: Page): Promise<string | null> => {
  const next = await page.$(NEXT_PAGE_SELECTOR);
  return next ? (await next.getAttribute('href')) : null;
};

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
    if (classification.state !== 'ok') {
      throw new Error(`Vinted classification ${classification.state}: ${classification.reason}`);
    }

    const listings = parseVintedListings(html);
    if (!listings.length) {
      throw new Error('Vinted returned no parsable listings');
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
