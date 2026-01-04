import { logger } from '@repo/logger';
import { ValidationError } from '../utils/errors';
import { getStripeLiveClient } from './stripe.live';
import { getStripeTestClient } from './stripe.test';

export type StripeMode = 'test' | 'live';

const assertNoLiveKeyInTest = () => {
  if (process.env.NODE_ENV === 'test' && process.env.STRIPE_LIVE_SECRET_KEY) {
    throw new ValidationError('STRIPE_LIVE_SECRET_KEY must not be set in test context');
  }
};

const getStripeMode = (): StripeMode => {
  assertNoLiveKeyInTest();
  const mode = process.env.STRIPE_MODE;
  if (mode !== 'test' && mode !== 'live') {
    throw new ValidationError('STRIPE_MODE must be set to "test" or "live"');
  }

  if (mode === 'live' && process.env.NODE_ENV !== 'production') {
    logger.error('Stripe live mode is blocked outside production', { nodeEnv: process.env.NODE_ENV });
    throw new ValidationError('Stripe live mode is blocked outside production');
  }

  return mode;
};

export const getStripeClient = () => {
  const mode = getStripeMode();
  return mode === 'test' ? getStripeTestClient() : getStripeLiveClient();
};
