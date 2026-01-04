import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getStripeClient } from '../../../src/lib/stripe';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('stripe isolation (unit)', () => {
  it('fails if live key is present in test environment', () => {
    if (process.env.STRIPE_LIVE_SECRET_KEY) {
      throw new Error('STRIPE_LIVE_SECRET_KEY must not be set in test context');
    }
  });

  it('throws when STRIPE_MODE is missing', () => {
    delete process.env.STRIPE_MODE;
    expect(() => getStripeClient()).toThrow(/STRIPE_MODE/);
  });

  it('blocks live mode outside production', () => {
    process.env.NODE_ENV = 'development';
    process.env.STRIPE_MODE = 'live';
    process.env.STRIPE_LIVE_SECRET_KEY = 'sk_live_test';
    expect(() => getStripeClient()).toThrow(/live mode is blocked/i);
  });

  it('throws when test mode is set without test key', () => {
    process.env.NODE_ENV = 'test';
    process.env.STRIPE_MODE = 'test';
    delete process.env.STRIPE_TEST_SECRET_KEY;
    expect(() => getStripeClient()).toThrow(/STRIPE_TEST_SECRET_KEY/);
  });

  it('creates a test client when configured', () => {
    process.env.NODE_ENV = 'test';
    process.env.STRIPE_MODE = 'test';
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_dummy';
    const client = getStripeClient();
    expect(client).toBeDefined();
  });

  it('throws if live key is present in test context', () => {
    process.env.NODE_ENV = 'test';
    process.env.STRIPE_MODE = 'test';
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_LIVE_SECRET_KEY = 'sk_live_dummy';
    expect(() => getStripeClient()).toThrow(/STRIPE_LIVE_SECRET_KEY/);
  });
});
