import Stripe from 'stripe';
import { ValidationError } from '../utils/errors';

let stripeLiveClient: Stripe | null = null;

export const getStripeLiveClient = () => {
  if (stripeLiveClient) return stripeLiveClient;
  const secretKey = process.env.STRIPE_LIVE_SECRET_KEY;
  if (!secretKey) {
    throw new ValidationError('STRIPE_LIVE_SECRET_KEY is not set');
  }
  stripeLiveClient = new Stripe(secretKey, { apiVersion: '2024-04-10' });
  return stripeLiveClient;
};
