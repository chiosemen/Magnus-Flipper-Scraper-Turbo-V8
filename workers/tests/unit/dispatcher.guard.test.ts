import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set environment variable BEFORE any modules are imported
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock all dependencies BEFORE any imports
vi.mock('../../src/services/killSwitch.service', () => ({
  __resetKillSwitchCacheForTests: vi.fn(),
}));

vi.mock('../../src/services/observabilityGate.service', () => ({
  __resetObservabilityGateCacheForTests: vi.fn(),
}));

vi.mock('../../src/lib/db', () => ({
  db: {
    query: { subscriptions: { findFirst: vi.fn() }, monitors: { findFirst: vi.fn() } },
    execute: vi.fn().mockResolvedValue([{ count: 0 }]),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
  schema: {
    subscriptions: {},
    monitors: {},
    jobs: {},
  },
}));

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../src/services/status.service', () => ({
  StatusService: vi.fn().mockImplementation(() => ({
    updateStatus: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock all scrapers
vi.mock('../../src/scrapers/amazon', () => ({
  scrapeAmazon: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('../../src/scrapers/ebay.scraper', () => ({
  scrapeEbay: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('../../src/scrapers/facebook.scraper', () => ({
  scrapeFacebook: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('../../src/scrapers/vinted.scraper', () => ({
  scrapeVinted: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('../../src/scrapers/gumtree.scraper', () => ({
  scrapeGumtree: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('../../src/scrapers/craigslist', () => ({
  scrapeCraigslist: vi.fn().mockResolvedValue({ items: [] }),
}));

describe('Dispatcher Kill Switch Guard', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.SCRAPING_ENABLED;
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv === undefined) {
      delete process.env.SCRAPING_ENABLED;
    } else {
      process.env.SCRAPING_ENABLED = originalEnv;
    }
  });

  it('should export SCRAPING_ENABLED from config', async () => {
    process.env.SCRAPING_ENABLED = 'true';
    vi.resetModules();
    const { SCRAPING_ENABLED } = await import('../../src/config/scraping.config');
    expect(SCRAPING_ENABLED).toBe(true);
  });

  it('should default to enabled when SCRAPING_ENABLED is not set', async () => {
    delete process.env.SCRAPING_ENABLED;
    vi.resetModules();
    const { SCRAPING_ENABLED } = await import('../../src/config/scraping.config');
    expect(SCRAPING_ENABLED).toBe(true);
  });

  it('should set SCRAPING_ENABLED to false when env is "false"', async () => {
    process.env.SCRAPING_ENABLED = 'false';
    vi.resetModules();
    const { SCRAPING_ENABLED } = await import('../../src/config/scraping.config');
    expect(SCRAPING_ENABLED).toBe(false);
  });

  it('should set SCRAPING_ENABLED to true for any value other than "false"', async () => {
    process.env.SCRAPING_ENABLED = 'true';
    vi.resetModules();
    const config1 = await import('../../src/config/scraping.config');
    expect(config1.SCRAPING_ENABLED).toBe(true);

    process.env.SCRAPING_ENABLED = '1';
    vi.resetModules();
    const config2 = await import('../../src/config/scraping.config');
    expect(config2.SCRAPING_ENABLED).toBe(true);

    process.env.SCRAPING_ENABLED = 'yes';
    vi.resetModules();
    const config3 = await import('../../src/config/scraping.config');
    expect(config3.SCRAPING_ENABLED).toBe(true);
  });

  it('should have all marketplace configurations', async () => {
    const { SCRAPING_ACTORS } = await import('../../src/config/scraping.config');

    expect(SCRAPING_ACTORS).toHaveProperty('amazon');
    expect(SCRAPING_ACTORS).toHaveProperty('facebook');
    expect(SCRAPING_ACTORS).toHaveProperty('ebay');
    expect(SCRAPING_ACTORS).toHaveProperty('vinted');
    expect(SCRAPING_ACTORS).toHaveProperty('gumtree');
    expect(SCRAPING_ACTORS).toHaveProperty('craigslist');
  });

  it('should have correct actor configuration structure', async () => {
    const { SCRAPING_ACTORS } = await import('../../src/config/scraping.config');

    const facebookConfig = SCRAPING_ACTORS.facebook;
    expect(facebookConfig).toHaveProperty('actorId');
    expect(facebookConfig).toHaveProperty('enabled');
    expect(facebookConfig).toHaveProperty('defaultMaxItems');
    expect(facebookConfig).toHaveProperty('timeoutSecs');
    expect(typeof facebookConfig.actorId).toBe('string');
    expect(typeof facebookConfig.enabled).toBe('boolean');
    expect(typeof facebookConfig.defaultMaxItems).toBe('number');
    expect(typeof facebookConfig.timeoutSecs).toBe('number');
  });

  it('should allow environment override of actor IDs', async () => {
    process.env.APIFY_ACTOR_FACEBOOK = 'custom/facebook-actor';
    vi.resetModules();

    const { SCRAPING_ACTORS } = await import('../../src/config/scraping.config');
    expect(SCRAPING_ACTORS.facebook.actorId).toBe('custom/facebook-actor');

    delete process.env.APIFY_ACTOR_FACEBOOK;
  });

  it('should use default actor IDs when env vars not set', async () => {
    delete process.env.APIFY_ACTOR_FACEBOOK;
    vi.resetModules();

    const { SCRAPING_ACTORS } = await import('../../src/config/scraping.config');
    expect(SCRAPING_ACTORS.facebook.actorId).toBe('apify/facebook-marketplace-scraper');
  });
});
