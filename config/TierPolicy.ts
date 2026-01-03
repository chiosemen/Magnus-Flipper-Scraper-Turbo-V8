
import { TierConfig, Marketplace } from '../types';

interface Policy {
  tiers: Record<string, TierConfig>;
  marketplace_limits: Record<string, { max_concurrency_global: number; min_spacing_ms: number }>;
  boost_settings: {
    interval_sec: number;
    label: string;
  };
}

export const TierPolicy: Policy = {
  boost_settings: {
    interval_sec: 1800, // 30 Minutes
    label: 'High-Priority Monitor (Every 30m)'
  },
  tiers: {
    free: { 
      max_monitors: 3,   
      default_interval_sec: 43200, // 12 Hours
      max_marketplaces: 2, 
      max_concurrency_user: 1 
    },
    basic: { 
      max_monitors: 25,  
      default_interval_sec: 43200, // 12 Hours
      max_marketplaces: 3, 
      max_concurrency_user: 2 
    },
    pro: { 
      max_monitors: 60,  
      default_interval_sec: 21600, // 6 Hours
      max_marketplaces: 4, 
      max_concurrency_user: 3 
    },
    elite: { 
      max_monitors: 100, 
      default_interval_sec: 10800, // 3 Hours
      max_marketplaces: 6, 
      max_concurrency_user: 5 
    },
    ent: { 
      max_monitors: 180, 
      default_interval_sec: 7200,  // 2 Hours
      max_marketplaces: 8, 
      max_concurrency_user: 8 
    }
  },
  marketplace_limits: {
    facebook: { max_concurrency_global: 20, min_spacing_ms: 800 },
    vinted:   { max_concurrency_global: 20, min_spacing_ms: 800 },
    amazon:   { max_concurrency_global: 50, min_spacing_ms: 500 },
    ebay:     { max_concurrency_global: 30, min_spacing_ms: 600 },
    craigslist: { max_concurrency_global: 10, min_spacing_ms: 2000 },
    generic:  { max_concurrency_global: 100, min_spacing_ms: 100 }
  }
};
