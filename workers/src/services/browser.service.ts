import { Browser, BrowserContext, chromium } from 'playwright';
import { ProxyService } from './proxy.service';
import { logger } from '@repo/logger';

export class BrowserService {
  private browser: Browser | null = null;
  private proxyService: ProxyService;

  constructor() {
    this.proxyService = new ProxyService();
  }

  async getBrowser(): Promise<Browser> {
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
