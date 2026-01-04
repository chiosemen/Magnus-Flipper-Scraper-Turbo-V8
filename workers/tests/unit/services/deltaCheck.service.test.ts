import { describe, expect, it } from 'vitest';
import { DeltaCheckService } from '../../../src/services/deltaCheck.service';
import type { JobPayload } from '@repo/types';

const basePayload: JobPayload = {
  jobId: 'job-1',
  type: 'monitor_search',
  source: 'vinted',
  params: {
    monitorId: null,
    urls: [],
    searchQuery: undefined,
  },
  meta: {
    userId: 'user-1',
    attempt: 1,
  },
};

describe('DeltaCheckService', () => {
  const service = new DeltaCheckService();

  it('short-circuits when delta count is zero and listings exist', () => {
    const payload: JobPayload = {
      ...basePayload,
      meta: {
        ...basePayload.meta,
        deltaSignal: {
          currentListingHashes: ['h1', 'h2'],
          lastSeenListingHashes: ['h1', 'h2'],
        },
      } as any,
    };

    const result = service.evaluate(payload);
    expect(result.signal.deltaCount).toBe(0);
    expect(result.shortCircuit).toBe(true);
  });

  it('does not short-circuit when delta count is positive', () => {
    const payload: JobPayload = {
      ...basePayload,
      meta: {
        ...basePayload.meta,
        deltaSignal: {
          currentListingHashes: ['h1', 'h3'],
          lastSeenListingHashes: ['h1', 'h2'],
        },
      } as any,
    };

    const result = service.evaluate(payload);
    expect(result.signal.deltaCount).toBe(1);
    expect(result.shortCircuit).toBe(false);
  });
});
