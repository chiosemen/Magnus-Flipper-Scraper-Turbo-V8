import { describe, expect, it } from 'vitest';
import { validateWorkerEnv } from '../../../src/lib/env';

describe('Worker env validation', () => {
  it('fails closed when production env vars are missing', () => {
    const env = {
      NODE_ENV: 'production',
    } as NodeJS.ProcessEnv;

    expect(() => validateWorkerEnv(env)).toThrow(/WORKER_SHARED_SECRET|DATABASE_URL/);
  });

  it('accepts minimal test env', () => {
    const env = {
      NODE_ENV: 'test',
    } as NodeJS.ProcessEnv;

    expect(() => validateWorkerEnv(env)).not.toThrow();
  });
});
