import { JobPayload } from '@repo/types';
import { computeDeltaSignal, DeltaSignal } from '../../../packages/telemetry/src/deltaSignal';
import { logger } from '@repo/logger';

type DeltaMeta = {
  lastSeenListingHashes?: unknown;
  currentListingHashes?: unknown;
};

export class DeltaCheckService {
  evaluate(payload: JobPayload): { signal: DeltaSignal; shortCircuit: boolean } {
    const deltaMeta: DeltaMeta = (payload.meta as any)?.deltaSignal || {};
    const signal = computeDeltaSignal({
      currentListingHashes: deltaMeta.currentListingHashes,
      lastSeenListingHashes: deltaMeta.lastSeenListingHashes,
    });

    logger.info('Delta signal computed', {
      jobId: payload.jobId,
      signal,
    });

    const shouldShortCircuit = signal.deltaCount === 0 && signal.currentCount > 0;
    return {
      signal,
      shortCircuit: shouldShortCircuit,
    };
  }
}
