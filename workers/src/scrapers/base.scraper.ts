import { CreateDeal } from '@repo/types';

// Minimal types to decouple scrapers from the legacy base.scraper implementation
export interface ScrapeOptions {
  jobId: string;
  userId: string;
  monitorId?: string;
  maxItems?: number;
}

export interface ScrapeResult {
  dealsFound: number;
  dealsNew: number;
  deals: CreateDeal[];
}
