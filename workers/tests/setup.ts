import { beforeEach, vi } from 'vitest';
import { getTestFirestore } from './helpers/firebase';
import { __resetKillSwitchCacheForTests } from '../src/services/killSwitch.service';
import { __resetObservabilityGateCacheForTests } from '../src/services/observabilityGate.service';

process.env.NODE_ENV = 'test';
process.env.WORKER_SHARED_SECRET = process.env.WORKER_SHARED_SECRET || 'test-worker-secret';

vi.mock('../src/lib/firestore', () => ({
  firestore: getTestFirestore(),
}));

beforeEach(() => {
  __resetKillSwitchCacheForTests();
  __resetObservabilityGateCacheForTests();
});
