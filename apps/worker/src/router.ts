import { JobPayload, ScrapeResult } from '@repo/types';
import { BaseScraper } from './scrapers/base.scraper';
import { CraigslistScraper } from './scrapers/craigslist.scraper';
import { EbayScraper } from './scrapers/ebay.scraper';
import { AmazonScraper } from './scrapers/amazon.scraper';
import { StatusService } from './services/status.service';
import { logger } from '@repo/logger';

export class JobRouter {
  private scrapers: Record<string, BaseScraper>;
  private statusService: StatusService;

  constructor() {
    this.statusService = new StatusService();
    this.scrapers = {
      craigslist: new CraigslistScraper(),
      ebay: new EbayScraper(),
      amazon: new AmazonScraper(),
      // facebook: new FacebookScraper(), // To be implemented
      // generic: new GenericScraper(),
    };
  }

  async route(payload: JobPayload) {
    const { jobId, type, source, params, meta } = payload;
    const scraper = this.scrapers[source];

    if (!scraper) {
      throw new Error(`No scraper found for source: ${source}`);
    }

    await this.statusService.updateStatus(jobId, 'running', 10, { startedAt: new Date() });
    
    try {
      let result;

      if (type === 'monitor_search' && params.criteria) {
        result = await scraper.search(params.criteria as any, { 
            jobId, 
            userId: meta.userId 
        });
      } else if (type === 'single_url' && params.urls) {
        // Not implemented in base yet, utilizing search as placeholder or generic
        logger.warn('Single URL scrape not fully implemented in router, skipping');
        result = { dealsFound: 0, dealsNew: 0, deals: [] };
      } else {
        throw new Error(`Unsupported job type: ${type}`);
      }

      await this.statusService.updateStatus(jobId, 'completed', 100, {
        dealsFound: result.dealsFound,
        dealsNew: result.dealsNew
      });
      
      return result;

    } catch (error) {
      logger.error(`Job ${jobId} failed`, error as Error);
      await this.statusService.updateStatus(jobId, 'failed', 0, {
        error: (error as Error).message
      });
      throw error;
    }
  }
}
