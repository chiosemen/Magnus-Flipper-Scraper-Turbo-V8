
export type Marketplace = 'facebook' | 'ebay' | 'craigslist' | 'offerup' | 'gumtree' | 'vinted' | 'amazon' | 'generic';
export type JobStatus = 'pending' | 'provisioning' | 'running' | 'completed' | 'failed' | 'cancelled' | 'throttled' | 'skipped';
export type JobStep = 'queued' | 'booting_worker' | 'browser_launch' | 'stealth_check' | 'navigating' | 'parsing_html' | 'saving_results' | 'idle' | 'holding_lock' | 'awaiting_slot';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  tier: 'free' | 'basic' | 'pro' | 'elite' | 'ent';
  quota: {
    limit: number;
    used: number;
  };
}

export interface TierConfig {
  max_monitors: number;
  default_interval_sec: number;
  max_marketplaces: number;
  max_concurrency_user: number;
}

export interface Monitor {
  id: string;
  user_id: string;
  name: string;
  query: string;
  marketplaces: Marketplace[];
  refresh_interval_sec: number;
  boost_interval_sec?: number | null;
  is_enabled: boolean;
  priority: number;
  next_refresh_at?: number;
  last_refresh_at?: number;
}

export interface ScrapeJob {
  id: string;
  monitorId?: string; // Link to parent monitor
  userId: string;
  url: string;
  site: Marketplace;
  status: JobStatus;
  currentStep: JobStep;
  progress: number; // 0-100
  createdAt: string;
  completedAt?: string;
  resultCount: number;
  logs: LogEntry[];
  workerId?: string;
  retryCount: number;
  nextRetryAt?: string;
  throttleReason?: string;
  costEstUsd?: number;
}

export interface Listing {
  id: string;
  jobId?: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  link: string;
  imageUrl: string;
  rating: number;
  reviews: number;
  marketplace: Marketplace;
  pricingType?: 'auction' | 'fixed';
  condition: 'New' | 'Used - Like New' | 'Used - Good' | 'Refurbished' | 'Unknown' | 'New with tags' | 'New without tags' | 'Very Good' | 'Good' | 'Satisfactory';
  sellerName: string;
  sellerJoinedYear?: number;
  antiBot?: {
    blocked: boolean;
    provider?: 'datadome' | 'captcha' | 'cloudflare' | 'akamai' | 'unknown';
    signal?: string;
  };
  isSpam: boolean;
  spamReason?: string;
  postedTime: string;
  automationStatus: 'idle' | 'queued' | 'sending' | 'sent' | 'failed';
  profitPotential?: number;
  isSaved?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'system';
  message: string;
}

export interface ScrapeStats {
  totalJobs: number;
  totalResults: number;
  successRate: number;
  avgDurationMs: number;
}
