import { Page, BrowserContext } from 'playwright';
import { CreateDeal, SearchCriteria, DealSource, JobType } from '@repo/types';
import { BrowserService } from '../services/browser.service';
import { AntibotService } from '../services/antibot.service';
import { StorageService } from '../services/storage.service';
import { StatusService } from '../services/status.service';
import { logger } from '@repo/logger';

export interface ScrapeResult {
  dealsFound: number;
  dealsNew: number;
  deals: CreateDeal[];
}

export interface ScrapeOptions {
  maxPages?: number;
  timeout?: number;
  jobId: string;
  userId: string;
}

export abstract class BaseScraper {
  protected browserService: BrowserService;
  protected antibotService: AntibotService;
  protected storageService: StorageService;
  protected statusService: StatusService;

  abstract readonly source: DealSource;
  abstract readonly baseUrl: string;

  constructor() {
    this.browserService = new BrowserService();
    this.antibotService = new AntibotService();
    this.storageService = new StorageService();
    this.statusService = new StatusService();
  }

  // Abstract methods to be implemented by specific scrapers
  abstract search(criteria: SearchCriteria, options: ScrapeOptions): Promise<ScrapeResult>;
  abstract parseSearchResults(page: Page): Promise<{ listings: CreateDeal[]; nextPageUrl: string | null }>;
  abstract buildSearchUrl(criteria: SearchCriteria): string;

  // Common Scrape Method
  protected async scrapeUrl(url: string, options: ScrapeOptions): Promise<ScrapeResult> {
    const context = await this.browserService.createContext();
    const page = await context.newPage();
    await this.antibotService.applyStealthMeasures(page);

    const dealsFound: CreateDeal[] = [];
    
    try {
      await this.navigateWithRetry(page, url);
      const { listings } = await this.parseSearchResults(page);
      
      for (const deal of listings) {
         // Enrich common fields
         deal.source = this.source;
         deal.scrapedAt = new Date();
         deal.lastSeenAt = new Date();
         deal.userId = options.userId;
         
         await this.storageService.saveDeal(deal, options.jobId, options.userId);
         dealsFound.push(deal);
      }
    } catch (error) {
       logger.error(`Error scraping ${url}`, error as Error);
    } finally {
      await context.close();
    }

    return {
      dealsFound: dealsFound.length,
      dealsNew: dealsFound.length, // Simplified for now, storage service handles actual dedupe logic logic returns
      deals: dealsFound
    };
  }

  protected async navigateWithRetry(page: Page, url: string, retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.antibotService.simulateHumanBehavior(page);
        return;
      } catch (e) {
        if (i === retries - 1) throw e;
        await page.waitForTimeout(2000 * (i + 1));
      }
    }
  }

  protected delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
