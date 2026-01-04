import Stripe from 'stripe';
import { ValidationError } from '../utils/errors';

let stripeTestClient: Stripe | null = null;

export const getStripeTestClient = () => {
  if (stripeTestClient) return stripeTestClient;
  const secretKey = process.env.STRIPE_TEST_SECRET_KEY;
  if (!secretKey) {
    throw new ValidationError('STRIPE_TEST_SECRET_KEY is not set');
  }
  stripeTestClient = new Stripe(secretKey, { apiVersion: '2024-04-10' });
  return stripeTestClient;
};
