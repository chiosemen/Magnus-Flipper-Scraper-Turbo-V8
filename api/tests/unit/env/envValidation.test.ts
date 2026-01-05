import { describe, expect, it } from 'vitest';
import { validateApiEnv } from '../../../src/lib/env';

describe('API env validation', () => {
  it('fails closed when production env vars are missing', () => {
    const env = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      CORS_ORIGIN: '*',
    } as NodeJS.ProcessEnv;

    expect(() => validateApiEnv(env)).toThrow(/CORS_ORIGIN|STRIPE_MODE/);
  });

  it('accepts minimal test env', () => {
    const env = {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    } as NodeJS.ProcessEnv;

    expect(() => validateApiEnv(env)).not.toThrow();
  });
});
