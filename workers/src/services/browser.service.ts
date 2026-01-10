import { Browser, BrowserContext, chromium } from 'playwright';
import { ProxyService } from './proxy.service';
import { logger } from '@repo/logger';

/**
 * BrowserService - DEPRECATED for production marketplace scraping
 *
 * Apify-first migration: Browsers may not run in Cloud Run for marketplace scraping.
 * All production marketplace scraping should use Apify actors instead.
 *
 * This service is blocked in production environments (NODE_ENV === 'production').
 * Use Apify actors via workers/src/lib/apify.ts for all marketplace scraping.
 */
export class BrowserService {
  private browser: Browser | null = null;
  private proxyService: ProxyService;

  constructor() {
    // Block usage in production
    if (process.env.NODE_ENV === 'production') {
      const error = new Error(
        '[BrowserService] BLOCKED: Browser automation is disabled in production. ' +
        'Apify-first migration: Use Apify actors for marketplace scraping. ' +
        'See workers/src/lib/apify.ts for the Apify client wrapper.'
      );
      logger.error('[BrowserService] Attempted to instantiate in production', { error });
      throw error;
    }

    this.proxyService = new ProxyService();
    logger.warn('[BrowserService] DEPRECATED: This service is only for non-production use. Use Apify actors in production.');
  }

  async getBrowser(): Promise<Browser> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[BrowserService] BLOCKED: getBrowser() called in production. Use Apify actors instead.'
      );
    }

    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: process.env.HEADLESS !== 'false',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });
    }
    return this.browser;
  }

  async createContext(): Promise<BrowserContext> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[BrowserService] BLOCKED: createContext() called in production. Use Apify actors instead.'
      );
    }

    const browser = await this.getBrowser();
    const proxy = this.proxyService.getProxy();

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      proxy: proxy ? {
        server: proxy.server,
        username: proxy.username,
        password: proxy.password
      } : undefined,
    });

    return context;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
