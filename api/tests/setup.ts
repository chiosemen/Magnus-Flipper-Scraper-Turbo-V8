import { beforeEach, vi } from 'vitest';
import { mockCloudTasks } from './mocks/cloudTasks';
import { createAuthStub, getTestFirestore } from './mocks/firebase';
import { __resetKillSwitchCacheForTests } from '../src/services/killSwitch.service';
import { __resetObservabilityGateCacheForTests } from '../src/services/observabilityGate.service';

process.env.NODE_ENV = 'test';
process.env.STRIPE_MODE = 'test';
process.env.STRIPE_TEST_SECRET_KEY = process.env.STRIPE_TEST_SECRET_KEY || 'sk_test_dummy';
process.env.STRIPE_PRICE_ID_BASIC = process.env.STRIPE_PRICE_ID_BASIC || 'price_basic';
process.env.STRIPE_PRICE_ID_PRO = process.env.STRIPE_PRICE_ID_PRO || 'price_pro';
process.env.STRIPE_PRICE_ID_ELITE = process.env.STRIPE_PRICE_ID_ELITE || 'price_elite';
process.env.STRIPE_PRICE_ID_ENTERPRISE = process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise';
process.env.STRIPE_SUCCESS_URL = process.env.STRIPE_SUCCESS_URL || 'http://localhost:5173/success';
process.env.STRIPE_CANCEL_URL = process.env.STRIPE_CANCEL_URL || 'http://localhost:5173/cancel';
process.env.STRIPE_PORTAL_RETURN_URL = process.env.STRIPE_PORTAL_RETURN_URL || 'http://localhost:5173/billing';
process.env.WORKER_SHARED_SECRET = process.env.WORKER_SHARED_SECRET || 'test-worker-secret';
process.env.GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'test-project';
process.env.GCP_LOCATION = process.env.GCP_LOCATION || 'us-central1';
process.env.GCP_QUEUE_NAME = process.env.GCP_QUEUE_NAME || 'scraper-queue';
process.env.WORKER_SERVICE_URL = process.env.WORKER_SERVICE_URL || 'http://localhost:8081';

vi.mock('@google-cloud/tasks', () => ({
  CloudTasksClient: class {
    createTask = mockCloudTasks.createTask.bind(mockCloudTasks);
    deleteTask = mockCloudTasks.deleteTask.bind(mockCloudTasks);
  },
}));

vi.mock('../src/lib/firebase', () => {
  const auth = createAuthStub();
  const firestore = getTestFirestore();
  return {
    auth,
    firestore,
    firebaseApp: {},
  };
});

vi.mock('../src/lib/redis', () => ({
  redis: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ping: vi.fn().mockResolvedValue('PONG'),
    on: vi.fn(),
  },
  checkRedisConnection: vi.fn().mockResolvedValue(true),
}));

beforeEach(() => {
  mockCloudTasks.reset();
  __resetKillSwitchCacheForTests();
  __resetObservabilityGateCacheForTests();
});
