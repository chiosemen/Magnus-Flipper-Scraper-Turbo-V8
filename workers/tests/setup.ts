import { beforeEach, vi } from 'vitest';
import { getTestFirestore } from './helpers/firebase';
import { __resetKillSwitchCacheForTests } from '../src/services/killSwitch.service';
import { __resetObservabilityGateCacheForTests } from '../src/services/observabilityGate.service';

process.env.NODE_ENV = 'test';
process.env.WORKER_SHARED_SECRET = process.env.WORKER_SHARED_SECRET || 'test-worker-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.APIFY_TOKEN = process.env.APIFY_TOKEN || 'test_token';

// Mock Playwright to avoid downloading browsers in unit test environments
vi.mock('playwright', () => {
  let _lastContent = '';

  return {
    chromium: {
      launch: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          setContent: vi.fn().mockImplementation((html: string) => { _lastContent = html; return Promise.resolve(); }),
          waitForSelector: vi.fn().mockResolvedValue(true),
          evaluate: vi.fn().mockImplementation((fn: any, ...args: any[]) => Promise.resolve(_lastContent)),
          content: vi.fn().mockImplementation(() => Promise.resolve(_lastContent)),
          $eval: vi.fn().mockImplementation((selector: string, cb: any) => Promise.resolve(null)),
          $$eval: vi.fn().mockImplementation((selector: string, cb: any) => Promise.resolve([])),
          goto: vi.fn(),
          close: vi.fn(),
          waitForTimeout: vi.fn(),
        }),
        close: vi.fn(),
      }),
    },
  };
});

vi.mock('../src/lib/firestore', () => ({
  firestore: getTestFirestore(),
}));

beforeEach(() => {
  __resetKillSwitchCacheForTests();
  __resetObservabilityGateCacheForTests();
});
