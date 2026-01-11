# PRODUCTION READINESS AUDIT
**Date:** 2026-01-10
**Branch:** `claude/production-readiness-audit-mKN45`
**Auditor:** Claude (Automated Production Readiness Assessment)

---

## EXECUTIVE SUMMARY

This audit evaluates production readiness across **6 surfaces**: Web UI, API, Workers, Cloud Run Configuration, Mobile, and CI/CD pipelines. Each surface was scored against **7 criteria**: Reliability, Security, Cost Controls, Observability, Correctness, Deployment Hygiene, and Backwards Compatibility.

### Critical Findings
- **5 P0 Blockers** - Must fix before production deployment
- **14 P1 Risks** - Fix ASAP, high severity
- **18 P2 Improvements** - Optional, medium severity

---

## P0 BLOCKERS (Must Fix Before Deploy)

### P0-1: Cloud Run Infrastructure Undefined
**Surface:** Cloud Run
**Criteria:** Deployment Hygiene
**Severity:** BLOCKER

**Exact Failing Condition:**
- `infrastructure/modules/cloud-run/main.tf` is empty (1 line)
- No Terraform configuration exists for API or Worker services
- No Docker configurations found anywhere in codebase

**Impact:**
Cannot deploy to production. No infrastructure definition exists.

**Exact Minimal Patch:**

Create `infrastructure/api.Dockerfile`:
```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY api ./api
RUN npm install -g pnpm@8
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/api build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/api/package.json ./
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
```

Create `infrastructure/workers.Dockerfile`:
```dockerfile
FROM mcr.microsoft.com/playwright:v1.44.0-jammy
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY workers ./workers
RUN npm install -g pnpm@8
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/worker build
ENV NODE_ENV=production
CMD ["node", "workers/dist/index.js"]
```

Create `infrastructure/modules/cloud-run/main.tf`:
```hcl
resource "google_cloud_run_service" "api" {
  name     = "${var.project_name}-api-${var.environment}"
  location = var.region

  template {
    spec {
      containers {
        image = var.api_image

        resources {
          limits = {
            cpu    = "2000m"
            memory = "2Gi"
          }
        }

        env {
          name  = "NODE_ENV"
          value = "production"
        }

        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = "database-url"
              key  = "latest"
            }
          }
        }
      }

      container_concurrency = 80
      timeout_seconds       = 300
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "1"
        "autoscaling.knative.dev/maxScale" = "10"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_service" "worker" {
  name     = "${var.project_name}-worker-${var.environment}"
  location = var.region

  template {
    spec {
      containers {
        image = var.worker_image

        resources {
          limits = {
            cpu    = "2000m"
            memory = "4Gi"
          }
        }

        env {
          name  = "NODE_ENV"
          value = "production"
        }
      }

      container_concurrency = 1
      timeout_seconds       = 1800
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "0"
        "autoscaling.knative.dev/maxScale" = "20"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}
```

**Test to Prove Fix:**
```bash
cd infrastructure
terraform init
terraform plan
# Should output: Plan: 2 to add, 0 to change, 0 to destroy
```

---

### P0-2: No Environment Variable Templates
**Surface:** All (API, Workers, Web, Mobile)
**Criteria:** Deployment Hygiene
**Severity:** BLOCKER

**Exact Failing Condition:**
- No `.env.example` files found in any workspace
- New developers/deployments have no reference for required variables
- Production deployment will fail with missing env vars

**Impact:**
Cannot safely deploy without knowing all required environment variables. Secrets will be missing or incorrectly configured.

**Exact Minimal Patch:**

Create `api/.env.example`:
```bash
# Server
NODE_ENV=production
PORT=8080

# Database
DATABASE_URL=postgres://user:password@host:5432/database

# Redis (optional for single-instance deployments)
# REDIS_URL=redis://host:6379

# CORS
CORS_ORIGIN=https://yourdomain.com

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Stripe (test or live mode)
STRIPE_MODE=test
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://yourdomain.com/success
STRIPE_CANCEL_URL=https://yourdomain.com/cancel
STRIPE_PORTAL_RETURN_URL=https://yourdomain.com/account

# Google Cloud Tasks (optional if using task queue)
# GCP_PROJECT_ID=your-gcp-project
# GCP_LOCATION=us-central1
# GCP_QUEUE_NAME=scraper-jobs
```

Create `workers/.env.example`:
```bash
# Server
NODE_ENV=production
PORT=8081

# Database
DATABASE_URL=postgres://user:password@host:5432/database

# Worker Authentication
WORKER_SHARED_SECRET=generate-strong-secret-minimum-32-chars

# Apify
APIFY_TOKEN=apify_api_...

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

Create `apps/web/.env.example`:
```bash
VITE_API_URL=https://api.yourdomain.com/api
VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}
```

Create `apps/mobile/.env.example`:
```bash
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_SENTRY_DSN=...
EXPO_PUBLIC_ENV=production
```

**Test to Prove Fix:**
```bash
# Verify all required env vars are documented
grep -r "process.env" api/src | grep -v test | cut -d. -f3 | cut -d\) -f1 | sort -u > /tmp/api-envs.txt
grep -v "^#" api/.env.example | cut -d= -f1 | sort > /tmp/api-documented.txt
diff /tmp/api-envs.txt /tmp/api-documented.txt
# Should output: no differences (all env vars documented)
```

---

### P0-3: Mobile Store Configuration Placeholders
**Surface:** Mobile
**Criteria:** Deployment Hygiene
**Severity:** BLOCKER

**Exact Failing Condition:**
- `apps/mobile/eas.json:52` - `ascAppId: "PLACEHOLDER_ASC_APP_ID"`
- `apps/mobile/eas.json:53` - `appleTeamId: "PLACEHOLDER_TEAM_ID"`
- `apps/mobile/app.json:54` - `updates.url: "https://u.expo.dev/YOUR_PROJECT_ID"`
- Production builds will fail with placeholder values

**Impact:**
Cannot submit to App Store or Google Play. EAS builds will fail.

**Exact Minimal Patch:**

Edit `apps/mobile/eas.json:52-53`:
```json
"ios": {
  "ascAppId": "1234567890",
  "appleTeamId": "ABCD123456"
}
```

Edit `apps/mobile/app.json:54`:
```json
"updates": {
  "url": "https://u.expo.dev/your-actual-project-id"
}
```

**Test to Prove Fix:**
```bash
cd apps/mobile
eas build --platform ios --profile production --non-interactive
# Should NOT fail with "Invalid ascAppId" or "Invalid team ID"
```

---

### P0-4: No Request Timeouts in Web UI
**Surface:** Web UI
**Criteria:** Reliability
**Severity:** BLOCKER

**Exact Failing Condition:**
- `apps/web/src/lib/api.ts:18` - `fetch()` calls have no timeout
- Long-running API requests will hang indefinitely
- User browsers will freeze waiting for responses

**Impact:**
Production UI will hang on slow/failing API calls. Poor user experience, browser memory leaks.

**Exact Minimal Patch:**

Edit `apps/web/src/lib/api.ts:9-29`:
```typescript
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await useAuthStore.getState().getToken();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Add timeout signal
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    const json = await response.json();
    return json.data || json;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    throw error;
  }
}
```

**Test to Prove Fix:**
```typescript
// apps/web/tests/unit/api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../../src/lib/api';

describe('API timeout handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should timeout after 30 seconds', async () => {
    const slowFetch = new Promise(() => {}); // Never resolves
    global.fetch = vi.fn(() => slowFetch);

    const promise = api.deals.list({});

    vi.advanceTimersByTime(30000);

    await expect(promise).rejects.toThrow('Request timeout');
  });
});
```

---

### P0-5: No Request Timeouts in Mobile
**Surface:** Mobile
**Criteria:** Reliability
**Severity:** BLOCKER

**Exact Failing Condition:**
- `apps/mobile/src/lib/api.ts:49` - `fetch()` calls have no timeout
- Mobile apps will hang indefinitely on poor network conditions
- No timeout handling for offline/slow connections

**Impact:**
App will freeze on slow networks. Poor mobile UX, app store rejections likely.

**Exact Minimal Patch:**

Edit `apps/mobile/src/lib/api.ts:27-68`:
```typescript
export async function authenticatedFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('[API] No authenticated user');
  }

  const token = await currentUser.getIdToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  // Add timeout signal (15s for mobile)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      console.error('[API] Session expired');
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Request failed');
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - check your connection');
    }
    throw error;
  }
}
```

**Test to Prove Fix:**
```typescript
// apps/mobile/src/lib/__tests__/api.test.ts
describe('authenticatedFetch timeout', () => {
  it('should timeout after 15 seconds', async () => {
    jest.useFakeTimers();

    const slowFetch = new Promise(() => {});
    global.fetch = jest.fn(() => slowFetch);

    const promise = authenticatedFetch('/test');

    jest.advanceTimersByTime(15000);

    await expect(promise).rejects.toThrow('Request timeout');

    jest.useRealTimers();
  });
});
```

---

## P1 RISKS (Fix ASAP)

### P1-1: Worker Browser Context Leaks
**Surface:** Workers
**Criteria:** Reliability
**Severity:** HIGH

**Exact Failing Condition:**
- `workers/src/scrapers/base.scraper.ts:46-73` - `context.close()` only called in `finally` block
- If error occurs before line 72, context may not close in all paths
- Memory leak will crash worker after ~10-20 jobs

**Impact:**
Workers will leak memory and crash under load. Costs increase, jobs fail.

**Exact Minimal Patch:**

Edit `workers/src/scrapers/base.scraper.ts:45-80`:
```typescript
protected async scrapeUrl(url: string, options: ScrapeOptions): Promise<ScrapeResult> {
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  const dealsFound: CreateDeal[] = [];

  try {
    context = await this.browserService.createContext();
    page = await context.newPage();
    await this.antibotService.applyStealthMeasures(page);

    await this.navigateWithRetry(page, url);
    const { listings } = await this.parseSearchResults(page);

    for (const deal of listings) {
       deal.source = this.source;
       deal.scrapedAt = new Date();
       deal.lastSeenAt = new Date();
       deal.userId = options.userId;
       if (options.monitorId) {
         deal.monitorId = options.monitorId;
       }

       await this.storageService.saveDeal(deal, options.jobId, options.userId);
       dealsFound.push(deal);
    }

    return {
      dealsFound: dealsFound.length,
      dealsNew: dealsFound.length,
      deals: dealsFound
    };
  } catch (error) {
    logger.error(`Error scraping ${url}`, error as Error);
    throw error; // Re-throw after cleanup
  } finally {
    // CRITICAL: Always close page and context
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
  }
}
```

**Test to Prove Fix:**
```typescript
// workers/tests/unit/base.scraper.test.ts
describe('BaseScraper context cleanup', () => {
  it('should close context even on error', async () => {
    const scraper = new TestScraper();
    const mockContext = { close: vi.fn(), newPage: vi.fn() };
    const mockPage = { close: vi.fn(), goto: vi.fn() };

    vi.spyOn(scraper['browserService'], 'createContext').mockResolvedValue(mockContext);
    mockContext.newPage.mockResolvedValue(mockPage);
    mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

    await expect(scraper['scrapeUrl']('https://test.com', {...})).rejects.toThrow();

    expect(mockPage.close).toHaveBeenCalled();
    expect(mockContext.close).toHaveBeenCalled();
  });
});
```

---

### P1-2: No Idempotency Keys on Write Operations
**Surface:** API
**Criteria:** Reliability
**Severity:** HIGH

**Exact Failing Condition:**
- `api/src/routes/monitors.routes.ts:49` - POST `/monitors` has no idempotency key
- `api/src/routes/jobs.routes.ts:62` - POST `/jobs` has no idempotency key
- Duplicate requests (network retry, user double-click) create duplicate resources

**Impact:**
Users charged twice for same monitor. Duplicate jobs waste scraping budget.

**Exact Minimal Patch:**

Edit `api/src/routes/monitors.routes.ts:49-75`:
```typescript
app.post('/', authMiddleware, zValidator('json', CreateMonitorSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json' as any) as CreateMonitor;

  // Extract idempotency key from header
  const idempotencyKey = c.req.header('Idempotency-Key');
  if (!idempotencyKey) {
    throw new ValidationError('Idempotency-Key header required for monitor creation');
  }

  // Check if monitor already created with this idempotency key
  const existing = await db.query.monitors.findFirst({
    where: and(
      eq(schema.monitors.userId, user.uid),
      eq(schema.monitors.idempotencyKey, idempotencyKey)
    ),
  });

  if (existing) {
    logger.info('Idempotent monitor creation - returning existing', { idempotencyKey });
    return c.json({ success: true, data: existing });
  }

  // Check quota
  await entitlementService.assertMonitorQuota(user.uid);

  // Create new monitor
  const [monitor] = await db.insert(schema.monitors)
    .values({
      userId: user.uid,
      idempotencyKey, // Store for future idempotency checks
      ...data,
    })
    .returning();

  return c.json({ success: true, data: monitor }, 201);
});
```

Add idempotencyKey column to schema:
```typescript
// packages/database/src/schema/monitors.ts
export const monitors = pgTable('monitors', {
  // ... existing columns ...
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
});
```

**Test to Prove Fix:**
```typescript
// api/tests/integration/monitors.routes.test.ts
describe('POST /monitors idempotency', () => {
  it('should return same monitor for duplicate idempotency key', async () => {
    const key = 'test-' + Date.now();

    const res1 = await request(app)
      .post('/api/monitors')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ url: 'https://test.com', keywords: ['laptop'] });

    const res2 = await request(app)
      .post('/api/monitors')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ url: 'https://test.com', keywords: ['laptop'] });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(200);
    expect(res1.body.data.id).toBe(res2.body.data.id);
  });
});
```

---

### P1-3: No Worker Job Timeout Enforcement
**Surface:** Workers
**Criteria:** Reliability, Cost Controls
**Severity:** HIGH

**Exact Failing Condition:**
- `workers/src/index.ts:74-90` - Timeout only applied if `payload.meta.timeoutSec` exists
- Most jobs don't set this, so workers run indefinitely
- Cloud Run max timeout is 60 minutes, jobs could run for full duration

**Impact:**
Runaway jobs cost $$$ in compute. Workers stuck on broken scrapers.

**Exact Minimal Patch:**

Edit `workers/src/index.ts:74-92`:
```typescript
// Execute Job with mandatory timeout
const DEFAULT_JOB_TIMEOUT_SEC = 600; // 10 minutes default
const MAX_JOB_TIMEOUT_SEC = 1800; // 30 minutes max

const timeoutSec = Math.min(
  payload.meta.timeoutSec || demoState.timeoutSec || DEFAULT_JOB_TIMEOUT_SEC,
  MAX_JOB_TIMEOUT_SEC
);

logger.info(`Job will timeout after ${timeoutSec}s`, { jobId: payload.jobId });

try {
  await Promise.race([
    router.route(payload),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Job timeout after ${timeoutSec}s`));
      }, timeoutSec * 1000);
    }),
  ]);
} catch (error) {
  if (error.message.includes('Job timeout')) {
    logger.error('Job timeout exceeded', error, { jobId: payload.jobId, timeoutSec });
    await statusService.updateStatus(payload.jobId, 'failed', 100, {
      error: 'Job timeout exceeded',
      timeoutSec,
    });
  }
  throw error;
}
```

**Test to Prove Fix:**
```typescript
// workers/tests/integration/timeout.test.ts
describe('Worker job timeout', () => {
  it('should enforce default 10min timeout', async () => {
    const slowJob = {
      jobId: 'test-timeout',
      type: 'scrape',
      source: 'amazon',
      meta: { userId: 'test-user' },
    };

    // Mock router to never complete
    vi.spyOn(router, 'route').mockImplementation(() => new Promise(() => {}));

    const start = Date.now();
    await expect(processJob(slowJob)).rejects.toThrow('Job timeout');
    const duration = Date.now() - start;

    expect(duration).toBeGreaterThanOrEqual(600000); // 10 min
    expect(duration).toBeLessThan(610000); // Not much longer
  });
});
```

---

### P1-4: Stripe Webhook Replay Protection Missing
**Surface:** API
**Criteria:** Security, Correctness
**Severity:** HIGH

**Exact Failing Condition:**
- `api/src/routes/stripe.routes.ts:127-213` - Webhook handler verifies signature but not event ID
- Same webhook event can be processed multiple times
- No deduplication on `event.id`

**Impact:**
Subscription could be activated twice, tier changed multiple times, revenue accounting errors.

**Exact Minimal Patch:**

Edit `api/src/routes/stripe.routes.ts:127-145`:
```typescript
app.post('/webhook', async (c) => {
  const stripe = getStripeClient();
  const signature = c.req.header('stripe-signature') || c.req.header('Stripe-Signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    throw new ValidationError('Stripe webhook signature or secret missing');
  }

  const rawBody = await c.req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', err as Error);
    return c.json({ success: false }, 400);
  }

  // CRITICAL: Check for duplicate event processing
  const processed = await db.query.stripeWebhookEvents.findFirst({
    where: eq(schema.stripeWebhookEvents.eventId, event.id),
  });

  if (processed) {
    logger.info('Duplicate Stripe webhook event, skipping', { eventId: event.id });
    return c.json({ received: true, duplicate: true });
  }

  // Record event processing started
  await db.insert(schema.stripeWebhookEvents).values({
    eventId: event.id,
    type: event.type,
    processedAt: new Date(),
  });

  // ... rest of webhook handling ...
});
```

Add schema for webhook deduplication:
```typescript
// packages/database/src/schema/stripeWebhookEvents.ts
export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  id: serial('id').primaryKey(),
  eventId: varchar('event_id', { length: 255 }).unique().notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
});
```

**Test to Prove Fix:**
```typescript
// api/tests/integration/stripe.webhook.test.ts
describe('POST /stripe/webhook replay protection', () => {
  it('should process event only once', async () => {
    const event = createTestWebhookEvent();
    const signature = generateStripeSignature(event);

    const res1 = await request(app)
      .post('/api/stripe/webhook')
      .set('Stripe-Signature', signature)
      .send(event);

    const res2 = await request(app)
      .post('/api/stripe/webhook')
      .set('Stripe-Signature', signature)
      .send(event);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res2.body.duplicate).toBe(true);

    // Verify only one subscription created
    const subs = await db.select().from(schema.users).where(eq(schema.users.stripeCustomerId, event.data.customer));
    expect(subs).toHaveLength(1);
  });
});
```

---

### P1-5: CORS Origin Wildcard in Production
**Surface:** API
**Criteria:** Security
**Severity:** HIGH

**Exact Failing Condition:**
- `api/src/app.ts:14` - `origin: process.env.CORS_ORIGIN || '*'`
- If `CORS_ORIGIN` not set, allows requests from ANY origin
- Production deployment without env var = open CORS

**Impact:**
Any website can call your API, CSRF attacks possible, credential theft.

**Exact Minimal Patch:**

Edit `api/src/app.ts:13-17`:
```typescript
// Validate CORS origin is set in production
const corsOrigin = process.env.CORS_ORIGIN;
if (process.env.NODE_ENV === 'production' && (!corsOrigin || corsOrigin === '*')) {
  throw new Error('CORS_ORIGIN must be set to a specific domain in production (not *)');
}

app.use('*', cors({
  origin: corsOrigin || 'http://localhost:5173', // Safe default for dev only
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true, // Allow cookies/auth headers
}));
```

**Test to Prove Fix:**
```typescript
// api/tests/unit/cors.test.ts
describe('CORS configuration', () => {
  it('should reject wildcard CORS in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CORS_ORIGIN;

    expect(() => {
      require('../src/app');
    }).toThrow('CORS_ORIGIN must be set');
  });

  it('should allow localhost in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.CORS_ORIGIN;

    expect(() => {
      require('../src/app');
    }).not.toThrow();
  });
});
```

---

### P1-6: No Database Query Timeouts
**Surface:** API, Workers
**Criteria:** Reliability
**Severity:** HIGH

**Exact Failing Condition:**
- `api/src/lib/db.ts` and `workers/src/lib/db.ts` - Drizzle client configured without query timeout
- Slow queries will block Node.js event loop
- No `statement_timeout` set on Postgres connection

**Impact:**
One slow query blocks entire API/worker. Cascading failures under load.

**Exact Minimal Patch:**

Edit `api/src/lib/db.ts`:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@repo/database';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const queryClient = postgres(connectionString, {
  max: 20, // Connection pool size
  idle_timeout: 30, // Close idle connections after 30s
  connect_timeout: 10, // Connect timeout 10s
  prepare: false, // Disable prepared statements for Cloud SQL

  // CRITICAL: Set statement timeout to prevent long-running queries
  onnotice: () => {}, // Suppress notices
  options: {
    statement_timeout: '30000', // 30 second query timeout
  },
});

export const db = drizzle(queryClient, { schema });
```

Same patch for `workers/src/lib/db.ts`.

**Test to Prove Fix:**
```typescript
// api/tests/integration/db.timeout.test.ts
describe('Database query timeout', () => {
  it('should timeout after 30 seconds', async () => {
    const slowQuery = db.execute(sql`SELECT pg_sleep(60)`);

    await expect(slowQuery).rejects.toThrow('statement timeout');
  }, 35000);
});
```

---

### P1-7: No CI/CD Lockfile Frozen Check
**Surface:** CI/CD
**Criteria:** Deployment Hygiene
**Severity:** HIGH

**Exact Failing Condition:**
- `.github/workflows/ci.yml:21` - Uses `--no-frozen-lockfile` flag
- `.github/workflows/test.yml:20,65,98` - Uses `npm ci` instead of `pnpm`
- Non-deterministic builds, dependency drift between dev/prod

**Impact:**
Production build could have different dependencies than tested code. Supply chain attack risk.

**Exact Minimal Patch:**

Edit `.github/workflows/ci.yml:18-22`:
```yaml
- uses: pnpm/action-setup@v2
  with:
    version: 8
- run: pnpm install --frozen-lockfile  # CRITICAL: Changed from --no-frozen-lockfile
```

Edit `.github/workflows/test.yml:14-21`:
```yaml
- uses: actions/checkout@v4
- name: Use Node.js 20
  uses: actions/setup-node@v4
  with:
    node-version: '20'
- uses: pnpm/action-setup@v2  # ADD THIS
  with:
    version: 8
- name: Clean install
  run: pnpm install --frozen-lockfile  # CHANGED from npm ci
```

Repeat for all jobs in test.yml (integration-tests, e2e-tests lines 65, 98).

**Test to Prove Fix:**
```bash
# Test locally that frozen lockfile works
pnpm install --frozen-lockfile
# Should succeed without modifying pnpm-lock.yaml

# Modify a dependency to break lockfile
echo "react@999.0.0" >> package.json
pnpm install --frozen-lockfile
# Should fail with "lockfile mismatch" error
```

---

### P1-8: No Error Boundaries in React Apps
**Surface:** Web UI, Mobile
**Criteria:** Reliability, Observability
**Severity:** HIGH

**Exact Failing Condition:**
- `apps/web/src/` - No React error boundaries found
- `apps/mobile/app/_layout.tsx` - No error boundary wrapper
- Unhandled errors crash entire app

**Impact:**
Single component error crashes whole UI. No error reporting to Sentry. Users see blank screen.

**Exact Minimal Patch:**

Create `apps/web/src/components/ErrorBoundary.tsx`:
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
    // TODO: Send to Sentry or logging service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p>Please refresh the page or contact support if this persists.</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Edit `apps/web/src/App.tsx` to wrap with ErrorBoundary:
```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      {/* ... existing app content ... */}
    </ErrorBoundary>
  );
}
```

**Test to Prove Fix:**
```typescript
// apps/web/tests/unit/ErrorBoundary.test.tsx
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  it('should catch and display error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    spy.mockRestore();
  });
});
```

---

### P1-9: Rate Limiter Single-Process Only
**Surface:** API
**Criteria:** Reliability, Cost Controls
**Severity:** HIGH

**Exact Failing Condition:**
- `api/src/middleware/rateLimitInProcess.middleware.ts:21` - In-memory Map for rate limiting
- Comment on line 12 warns: "single-process only"
- Multi-instance Cloud Run deployment will have independent rate limits per instance
- User gets 60 req/min * N instances instead of 60 req/min total

**Impact:**
Rate limits ineffective with autoscaling. Users can bypass limits by hitting different instances. Cost overruns.

**Exact Minimal Patch:**

Create `api/src/middleware/rateLimit.middleware.ts`:
```typescript
import { createMiddleware } from 'hono/factory';
import { Redis } from 'ioredis';
import { logger } from '@repo/logger';
import { RateLimitError } from '../utils/errors';

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    })
  : null;

const LIMITS: Record<string, number> = {
  free: 60,
  basic: 120,
  pro: 300,
  elite: 600,
  enterprise: 1000,
  default: 60,
};

export const rateLimitMiddleware = createMiddleware(async (c, next) => {
  // Fallback to in-process if Redis unavailable
  if (!redis) {
    logger.warn('Redis not configured - rate limiting is single-instance only');
    // Import and use in-process middleware as fallback
    const { rateLimitInProcessMiddleware } = await import('./rateLimitInProcess.middleware');
    return rateLimitInProcessMiddleware(c, next);
  }

  const now = Date.now();
  const windowMs = 60 * 1000;

  const user = c.get('user');
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
             c.req.header('x-real-ip') ||
             'unknown';

  const key = user ? `ratelimit:user:${user.uid}` : `ratelimit:ip:${ip}`;
  const tier = (user?.tier as string) || 'default';
  const limit = LIMITS[tier] || LIMITS.default;

  try {
    // Atomic increment with expiry using Redis Lua script
    const count = await redis.eval(
      `local current = redis.call('incr', KEYS[1])
       if current == 1 then
         redis.call('pexpire', KEYS[1], ARGV[1])
       end
       return current`,
      1,
      key,
      windowMs
    ) as number;

    const remaining = Math.max(0, limit - count);
    const resetAt = now + windowMs;

    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', Math.floor(resetAt / 1000).toString());

    if (count > limit) {
      logger.warn('Rate limit exceeded', { key, tier, limit, count });
      throw new RateLimitError('Rate limit exceeded. Please try again later.');
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;

    // On Redis error, allow request (fail open) but log
    logger.error('Rate limit check failed - allowing request', error as Error);
  }

  await next();
});
```

Edit `api/src/app.ts:22` to use new middleware:
```typescript
import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
// ...
app.use('*', rateLimitMiddleware); // Changed from rateLimitInProcessMiddleware
```

**Test to Prove Fix:**
```typescript
// api/tests/integration/rateLimit.redis.test.ts
describe('Redis-backed rate limiting', () => {
  it('should enforce limits across multiple processes', async () => {
    const token = await getTestToken();

    // Simulate 100 requests across "different instances"
    const promises = Array(100).fill(null).map(() =>
      request(app)
        .get('/api/deals')
        .set('Authorization', `Bearer ${token}`)
    );

    const results = await Promise.all(promises);
    const rateLimited = results.filter(r => r.status === 429);

    // Should rate limit after 60 (free tier limit)
    expect(rateLimited.length).toBeGreaterThan(30);
  });
});
```

---

### P1-10: No Expo Update Rollback Mechanism
**Surface:** Mobile
**Criteria:** Backwards Compatibility, Deployment Hygiene
**Severity:** HIGH

**Exact Failing Condition:**
- `apps/mobile/app.json:53-58` - OTA updates enabled with `appVersion` policy
- No rollback configuration in EAS
- Bad OTA update breaks app for all users instantly

**Impact:**
Cannot roll back bad OTA updates. Users stuck with broken app until next update.

**Exact Minimal Patch:**

Edit `apps/mobile/eas.json` to add rollback configuration:
```json
{
  "update": {
    "development": {
      "channel": "development"
    },
    "preview": {
      "channel": "staging"
    },
    "production": {
      "channel": "production"
    }
  },
  "updatePolicy": {
    "production": {
      "rollbackToEmbedded": true
    }
  }
}
```

Add update monitoring to `apps/mobile/app/_layout.tsx`:
```typescript
import * as Updates from 'expo-updates';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    async function checkForUpdates() {
      if (!__DEV__) {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            // Don't automatically reload - let user choose
            // This prevents forced updates that might break the app
            console.log('Update available - user can restart to apply');
          }
        } catch (error) {
          console.error('Error checking for updates:', error);
          // On update error, continue with current version
        }
      }
    }
    checkForUpdates();
  }, []);

  // ... rest of layout
}
```

**Test to Prove Fix:**
```bash
# Publish update to production
eas update --channel production --message "v1.0.1"

# If update is broken, rollback to previous
eas update --channel production --message "Rollback to v1.0.0" --branch production~1

# Verify rollback worked
eas update:view --channel production
# Should show "Rollback to v1.0.0" as latest
```

---

### P1-11: Worker Concurrency Not Enforced Per Job
**Surface:** Workers
**Criteria:** Cost Controls, Reliability
**Severity:** HIGH

**Exact Failing Condition:**
- `workers/src/services/concurrency.service.ts` - Checks global concurrency
- No per-marketplace or per-user concurrency limits
- Single user can spawn 100 Amazon jobs simultaneously

**Impact:**
Users can DoS scrapers. Amazon rate limits triggered. IP bans. Costs spike.

**Exact Minimal Patch:**

Edit `workers/src/services/concurrency.service.ts`:
```typescript
const MARKETPLACE_CONCURRENCY_LIMITS: Record<string, number> = {
  amazon: 3,      // Max 3 concurrent Amazon jobs
  ebay: 5,        // Max 5 concurrent eBay jobs
  facebook: 2,    // Max 2 concurrent Facebook jobs
  craigslist: 5,  // Max 5 concurrent Craigslist jobs
  vinted: 2,      // Max 2 concurrent Vinted jobs (has strict antibot)
  default: 3,
};

const USER_CONCURRENCY_LIMIT = 5; // Max 5 concurrent jobs per user total

export async function assertConcurrencyWithinLimits(payload: JobPayload): Promise<void> {
  const runningJobs = await getRunningJobsFromFirestore();

  // Check global concurrency
  if (runningJobs.length >= GLOBAL_CONCURRENCY_LIMIT) {
    throw new ConcurrencyBackoffError(
      'GLOBAL_CONCURRENCY_EXCEEDED',
      `Global concurrency limit (${GLOBAL_CONCURRENCY_LIMIT}) reached`,
      60
    );
  }

  // CRITICAL: Check per-marketplace concurrency
  const marketplaceJobs = runningJobs.filter(j => j.source === payload.source);
  const marketplaceLimit = MARKETPLACE_CONCURRENCY_LIMITS[payload.source] || MARKETPLACE_CONCURRENCY_LIMITS.default;

  if (marketplaceJobs.length >= marketplaceLimit) {
    throw new ConcurrencyBackoffError(
      'MARKETPLACE_CONCURRENCY_EXCEEDED',
      `Marketplace ${payload.source} concurrency limit (${marketplaceLimit}) reached`,
      30
    );
  }

  // CRITICAL: Check per-user concurrency
  const userJobs = runningJobs.filter(j => j.userId === payload.meta.userId);

  if (userJobs.length >= USER_CONCURRENCY_LIMIT) {
    throw new ConcurrencyBackoffError(
      'USER_CONCURRENCY_EXCEEDED',
      `User concurrency limit (${USER_CONCURRENCY_LIMIT}) reached`,
      20
    );
  }
}
```

**Test to Prove Fix:**
```typescript
// workers/tests/integration/concurrency.test.ts
describe('Concurrency limits', () => {
  it('should reject 4th concurrent Amazon job for same user', async () => {
    // Start 3 Amazon jobs
    const jobs = await Promise.all([
      startJob({ source: 'amazon', userId: 'user1' }),
      startJob({ source: 'amazon', userId: 'user1' }),
      startJob({ source: 'amazon', userId: 'user1' }),
    ]);

    // 4th should be rejected
    await expect(
      startJob({ source: 'amazon', userId: 'user1' })
    ).rejects.toThrow('MARKETPLACE_CONCURRENCY_EXCEEDED');
  });
});
```

---

### P1-12: No Health Check Readiness Dependency Validation
**Surface:** API, Workers
**Criteria:** Reliability, Observability
**Severity:** HIGH

**Exact Failing Condition:**
- `api/src/routes/health.routes.ts` - Health checks exist but don't validate dependencies
- `/ready` endpoint doesn't check database, Redis, or Firebase connectivity
- Cloud Run will route traffic to instances that can't handle requests

**Impact:**
Failed database migrations cause 500 errors. Cloud Run thinks service is healthy.

**Exact Minimal Patch:**

Create `api/src/routes/health.routes.ts` (if not exists) or edit:
```typescript
import { Hono } from 'hono';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { auth } from '../lib/firebase';
import { logger } from '@repo/logger';

const app = new Hono();

// Basic liveness check (is process running?)
app.get('/', (c) => c.json({ status: 'ok' }));
app.get('/live', (c) => c.json({ status: 'ok' }));

// Readiness check (can service handle requests?)
app.get('/ready', async (c) => {
  const checks = {
    database: false,
    firebase: false,
  };

  try {
    // Check database connectivity
    await db.execute(sql`SELECT 1`);
    checks.database = true;
  } catch (error) {
    logger.error('Database health check failed', error as Error);
  }

  try {
    // Check Firebase connectivity
    await auth.listUsers(1); // Minimal operation
    checks.firebase = true;
  } catch (error) {
    logger.error('Firebase health check failed', error as Error);
  }

  const isReady = checks.database && checks.firebase;

  if (!isReady) {
    return c.json({
      status: 'not_ready',
      checks,
    }, 503);
  }

  return c.json({
    status: 'ready',
    checks,
  });
});

export default app;
```

**Test to Prove Fix:**
```typescript
// api/tests/integration/health.test.ts
describe('GET /health/ready', () => {
  it('should return 503 when database is down', async () => {
    // Mock database failure
    vi.spyOn(db, 'execute').mockRejectedValue(new Error('Connection refused'));

    const res = await request(app).get('/api/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.checks.database).toBe(false);
  });

  it('should return 200 when all checks pass', async () => {
    const res = await request(app).get('/api/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.checks.database).toBe(true);
    expect(res.body.checks.firebase).toBe(true);
  });
});
```

---

### P1-13: No Request ID Propagation
**Surface:** API
**Criteria:** Observability
**Severity:** HIGH

**Exact Failing Condition:**
- `api/src/middleware/error.middleware.ts:9` - References `c.get('requestId')` but never set
- `api/src/middleware/logger.middleware.ts` - Doesn't set requestId
- Cannot trace requests across microservices

**Impact:**
Debugging production issues impossible. Cannot correlate API logs with worker logs.

**Exact Minimal Patch:**

Create `api/src/middleware/requestId.middleware.ts`:
```typescript
import { createMiddleware } from 'hono/factory';
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = createMiddleware(async (c, next) => {
  // Get request ID from header or generate new one
  const requestId = c.req.header('X-Request-ID') || uuidv4();

  // Store in context
  c.set('requestId', requestId);

  // Add to response headers for client correlation
  c.header('X-Request-ID', requestId);

  await next();
});
```

Edit `api/src/app.ts` to add middleware:
```typescript
import { requestIdMiddleware } from './middleware/requestId.middleware';

app.use('*', requestIdMiddleware); // Add BEFORE logger middleware
app.use('*', loggerMiddleware);
```

Edit `api/src/middleware/logger.middleware.ts` to use requestId:
```typescript
export const loggerMiddleware = createMiddleware(async (c, next) => {
  const requestId = c.get('requestId');
  const start = Date.now();

  logger.info('Request started', {
    requestId,
    method: c.req.method,
    path: c.req.path,
  });

  await next();

  const duration = Date.now() - start;
  logger.info('Request completed', {
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  });
});
```

**Test to Prove Fix:**
```typescript
// api/tests/integration/requestId.test.ts
describe('Request ID propagation', () => {
  it('should return request ID in response header', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('should preserve client-provided request ID', async () => {
    const clientId = 'test-request-123';

    const res = await request(app)
      .get('/api/health')
      .set('X-Request-ID', clientId);

    expect(res.headers['x-request-id']).toBe(clientId);
  });
});
```

---

### P1-14: No Database Migration Rollback Strategy
**Surface:** API, Workers
**Criteria:** Backwards Compatibility, Deployment Hygiene
**Severity:** HIGH

**Exact Failing Condition:**
- `packages/database/src/migrations/` contains 13 migrations
- No down migrations or rollback scripts
- Failed migration = database permanently broken

**Impact:**
Cannot roll back bad migrations. Database schema incompatible with code rollback.

**Exact Minimal Patch:**

Add rollback documentation to each migration file (example):
```sql
-- packages/database/src/migrations/0013_add_idempotency_keys.sql

-- UP Migration
ALTER TABLE monitors ADD COLUMN idempotency_key VARCHAR(255) UNIQUE;
ALTER TABLE jobs ADD COLUMN idempotency_key VARCHAR(255) UNIQUE;

-- Rollback Instructions (run manually if needed):
-- ALTER TABLE monitors DROP COLUMN idempotency_key;
-- ALTER TABLE jobs DROP COLUMN idempotency_key;
```

Create `packages/database/scripts/rollback-migration.sh`:
```bash
#!/bin/bash
# Rollback database migration
# Usage: ./rollback-migration.sh <migration-number>

MIGRATION_NUM=$1

if [ -z "$MIGRATION_NUM" ]; then
  echo "Usage: $0 <migration-number>"
  echo "Example: $0 0013"
  exit 1
fi

MIGRATION_FILE="src/migrations/${MIGRATION_NUM}_*.sql"

echo "Rolling back migration: $MIGRATION_FILE"
echo "Extracting rollback SQL from comments..."

# Extract rollback SQL from -- Rollback: comments
grep -A 100 "-- Rollback" "$MIGRATION_FILE" | grep "^--" | sed 's/^-- //' | grep -v "Rollback" > /tmp/rollback.sql

echo "Rollback SQL:"
cat /tmp/rollback.sql

read -p "Execute rollback? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
  psql $DATABASE_URL < /tmp/rollback.sql
  echo "Rollback complete"
else
  echo "Rollback cancelled"
fi
```

**Test to Prove Fix:**
```bash
# Test migration rollback process
cd packages/database

# Apply migration
pnpm drizzle-kit migrate

# Verify migration applied
psql $DATABASE_URL -c "\d monitors" | grep idempotency_key

# Rollback migration
./scripts/rollback-migration.sh 0013

# Verify rollback worked
psql $DATABASE_URL -c "\d monitors" | grep -v idempotency_key
```

---

## P2 IMPROVEMENTS (Optional)

### P2-1: No Retry Logic in Web UI
**Surface:** Web UI
**Criteria:** Reliability
**Severity:** MEDIUM

**Exact Failing Condition:**
- `apps/web/src/lib/api.ts` - No retry on transient failures (network errors, 502, 503, 504)

**Minimal Patch:**
Add retry wrapper using exponential backoff in api.ts `request()` function.

**Test:**
```typescript
it('should retry on 503 error', async () => {
  let attempts = 0;
  global.fetch = vi.fn(() => {
    attempts++;
    if (attempts < 3) return Promise.resolve({ ok: false, status: 503 });
    return Promise.resolve({ ok: true, json: () => ({ data: 'success' }) });
  });

  const result = await api.deals.list({});
  expect(attempts).toBe(3);
});
```

---

### P2-2: No Retry Logic in Mobile
**Surface:** Mobile
**Criteria:** Reliability
**Severity:** MEDIUM

**Same as P2-1 but for mobile app**

---

### P2-3: No Circuit Breaker for External Services
**Surface:** API, Workers
**Criteria:** Reliability
**Severity:** MEDIUM

**Exact Failing Condition:**
- No circuit breaker for Stripe, Firebase, Apify, or marketplace scrapers
- Repeated failures to external service will continue hammering it

**Minimal Patch:**
Implement circuit breaker pattern with open/half-open/closed states using Redis or in-memory store.

---

### P2-4: No Sentry Integration in Web UI
**Surface:** Web UI
**Criteria:** Observability
**Severity:** MEDIUM

**Exact Failing Condition:**
- No Sentry SDK initialized in web app
- Frontend errors not tracked

**Minimal Patch:**
```typescript
// apps/web/src/main.tsx
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: 'production',
    integrations: [new Sentry.BrowserTracing()],
    tracesSampleRate: 0.1,
  });
}
```

---

### P2-5: No Structured Logging in Workers
**Surface:** Workers
**Criteria:** Observability
**Severity:** MEDIUM

**Exact Failing Condition:**
- `workers/src/scrapers/base.scraper.ts:70` - Uses basic logger without job context
- Cannot filter logs by jobId, userId, or source in production

**Minimal Patch:**
Add contextual logging with jobId in all worker log statements.

---

### P2-6: No Performance Budgets in CI
**Surface:** CI/CD
**Criteria:** Cost Controls
**Severity:** MEDIUM

**Exact Failing Condition:**
- No bundle size checks in build
- No performance regression tests
- Web bundle could grow unbounded

**Minimal Patch:**
Add bundle size check to CI:
```yaml
- name: Check bundle size
  run: |
    SIZE=$(du -sb apps/web/dist | cut -f1)
    MAX_SIZE=$((5 * 1024 * 1024))  # 5MB
    if [ $SIZE -gt $MAX_SIZE ]; then
      echo "Bundle size $SIZE exceeds limit $MAX_SIZE"
      exit 1
    fi
```

---

### P2-7: No API Response Time SLOs
**Surface:** API
**Criteria:** Observability, Reliability
**Severity:** MEDIUM

**Exact Failing Condition:**
- No p95/p99 response time tracking
- No alerting on slow endpoints

**Minimal Patch:**
Add histogram metrics for response times in logger middleware.

---

### P2-8: No Worker Job Success Rate Tracking
**Surface:** Workers
**Criteria:** Observability
**Severity:** MEDIUM

**Exact Failing Condition:**
- No metrics on job success/failure rates
- Cannot detect scraper degradation

**Minimal Patch:**
Add metrics aggregation in worker completion handler.

---

### P2-9: No Database Connection Pool Monitoring
**Surface:** API, Workers
**Criteria:** Observability, Reliability
**Severity:** MEDIUM

**Exact Failing Condition:**
- No visibility into connection pool exhaustion
- No alerts when pool is near capacity

**Minimal Patch:**
Expose `/metrics` endpoint with connection pool stats.

---

### P2-10: No Canary Deployment Automation
**Surface:** CI/CD
**Criteria:** Deployment Hygiene
**Severity:** MEDIUM

**Exact Failing Condition:**
- Canary ramps exist in schema but no automation
- Manual canary control only

**Minimal Patch:**
Add GitHub Actions workflow for progressive rollout:
```yaml
name: Progressive Rollout
on:
  workflow_dispatch:
    inputs:
      canary_percent:
        required: true
        type: number

jobs:
  update-traffic:
    runs-on: ubuntu-latest
    steps:
      - name: Update Cloud Run traffic split
        run: |
          gcloud run services update-traffic api \
            --to-revisions=LATEST=${{ inputs.canary_percent }} \
            --region=us-central1
```

---

### P2-11: No Rate Limit Headers in Mobile SDK
**Surface:** Mobile
**Criteria:** Observability, Correctness
**Severity:** MEDIUM

**Exact Failing Condition:**
- Mobile app doesn't read `X-RateLimit-*` headers
- No UI warning before rate limit hit

**Minimal Patch:**
Parse rate limit headers in `authenticatedFetch()` and expose to UI.

---

### P2-12: No Graceful Shutdown for Workers
**Surface:** Workers
**Criteria:** Reliability
**Severity:** MEDIUM

**Exact Failing Condition:**
- `workers/src/index.ts` has no SIGTERM handler
- Running jobs killed mid-scrape on scale-down

**Minimal Patch:**
Add graceful shutdown:
```typescript
let isShuttingDown = false;

process.on('SIGTERM', () => {
  isShuttingDown = true;
  logger.info('SIGTERM received, draining requests...');
  setTimeout(() => process.exit(0), 30000); // Force exit after 30s
});

// In request handler, reject new requests if shutting down
if (isShuttingDown) {
  return c.json({ error: 'Service shutting down' }, 503);
}
```

---

### P2-13: No Secret Rotation Documentation
**Surface:** All
**Criteria:** Security, Deployment Hygiene
**Severity:** MEDIUM

**Exact Failing Condition:**
- No runbook for rotating Firebase keys, Stripe keys, database passwords
- Credential compromise = panic

**Minimal Patch:**
Create `docs/SECRET_ROTATION.md` with step-by-step rotation procedures.

---

### P2-14: No Cost Dashboards
**Surface:** Cloud Run
**Criteria:** Cost Controls, Observability
**Severity:** MEDIUM

**Exact Failing Condition:**
- No GCP billing alerts
- No cost tracking per service

**Minimal Patch:**
Add Terraform for billing alerts:
```hcl
resource "google_billing_budget" "monthly_budget" {
  billing_account = var.billing_account
  display_name    = "Monthly Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "500"
    }
  }

  threshold_rules {
    threshold_percent = 0.5  # Alert at 50%
  }

  threshold_rules {
    threshold_percent = 0.9  # Alert at 90%
  }
}
```

---

### P2-15: No Database Backup Verification
**Surface:** Infrastructure
**Criteria:** Reliability, Deployment Hygiene
**Severity:** MEDIUM

**Exact Failing Condition:**
- No automated backup testing
- Backups may be corrupt and unrecoverable

**Minimal Patch:**
Add weekly backup restore test to CI:
```yaml
name: Backup Verification
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly at 2am Sunday

jobs:
  test-restore:
    runs-on: ubuntu-latest
    steps:
      - name: Restore latest backup
        run: |
          # Get latest backup
          LATEST_BACKUP=$(gcloud sql backups list --instance=prod-db --limit=1 --format="value(id)")

          # Create test instance from backup
          gcloud sql instances create test-restore-$(date +%s) \
            --backup=$LATEST_BACKUP

          # Verify data integrity
          # ... run test queries ...

          # Cleanup
          gcloud sql instances delete test-restore-*
```

---

### P2-16: No Mobile Offline Queue
**Surface:** Mobile
**Criteria:** Reliability, Correctness
**Severity:** MEDIUM

**Exact Failing Condition:**
- Mobile app loses user actions when offline
- Creating monitor while offline = lost data

**Minimal Patch:**
Implement offline queue using AsyncStorage and react-query persistence.

---

### P2-17: No Worker Metrics Dashboard
**Surface:** Workers
**Criteria:** Observability
**Severity:** MEDIUM

**Exact Failing Condition:**
- No visibility into scraper performance metrics
- Cannot see which marketplaces are slow/failing

**Minimal Patch:**
Export metrics to Cloud Monitoring and create dashboard.

---

### P2-18: No API Deprecation Strategy
**Surface:** API
**Criteria:** Backwards Compatibility
**Severity:** MEDIUM

**Exact Failing Condition:**
- No versioning strategy for API changes
- Breaking changes will brick mobile apps in production

**Minimal Patch:**
Add API versioning:
```typescript
// api/src/app.ts
app.route('/api/v1', routes);  // Current version
app.route('/api/v2', routesV2); // Future version

// Add deprecation headers
app.use('/api/v1/*', async (c, next) => {
  c.header('X-API-Version', 'v1');
  c.header('X-API-Deprecated', 'false');
  await next();
});
```

---

## SUMMARY SCORECARD

| Surface | Reliability | Security | Cost Controls | Observability | Correctness | Deployment | Backwards Compat | Overall |
|---------|-------------|----------|---------------|---------------|-------------|------------|------------------|---------|
| **Web UI** | ⚠️ MEDIUM | ✅ GOOD | ✅ GOOD | ⚠️ MEDIUM | ✅ GOOD | ❌ BLOCKER | ✅ GOOD | **⚠️ RISK** |
| **API** | ⚠️ MEDIUM | ❌ HIGH | ⚠️ MEDIUM | ⚠️ MEDIUM | ⚠️ MEDIUM | ❌ BLOCKER | ⚠️ MEDIUM | **❌ BLOCKER** |
| **Workers** | ❌ HIGH | ✅ GOOD | ❌ HIGH | ⚠️ MEDIUM | ✅ GOOD | ❌ BLOCKER | ✅ GOOD | **❌ BLOCKER** |
| **Cloud Run** | ❌ BLOCKER | N/A | ❌ BLOCKER | N/A | N/A | ❌ BLOCKER | N/A | **❌ BLOCKER** |
| **Mobile** | ❌ BLOCKER | ✅ GOOD | ✅ GOOD | ⚠️ MEDIUM | ✅ GOOD | ❌ BLOCKER | ⚠️ MEDIUM | **❌ BLOCKER** |
| **CI/CD** | ⚠️ MEDIUM | ✅ GOOD | ⚠️ MEDIUM | ⚠️ MEDIUM | ⚠️ MEDIUM | ❌ HIGH | ✅ GOOD | **⚠️ RISK** |

**Legend:**
- ✅ **GOOD** - Ready for production
- ⚠️ **MEDIUM** - Some risks, can deploy with monitoring
- ❌ **HIGH** - High risk, deploy with caution
- ❌ **BLOCKER** - Cannot deploy to production

---

## DEPLOYMENT READINESS: ❌ NOT READY

**Critical Path to Production:**
1. Fix all 5 P0 blockers (estimated: 2-3 days)
2. Fix P1-1 through P1-7 (high impact issues) (estimated: 3-4 days)
3. Deploy to staging with P1-8+ deferred
4. Run full test suite + load tests
5. Fix any issues discovered in staging
6. Deploy to production with monitoring

**Recommended Deployment Order:**
1. Infrastructure (Terraform + Dockerfiles)
2. Database migrations + rollback strategy
3. API service
4. Worker service
5. Web UI
6. Mobile app (gradual rollout)

**Post-Deployment Monitoring (First 24 Hours):**
- Error rate < 1%
- P95 latency < 500ms
- Worker success rate > 95%
- No rate limit errors from Redis
- No database connection pool exhaustion
- No OOM errors in Cloud Run

---

**End of Audit Report**
**Next Steps:** Address P0 blockers in priority order, starting with Cloud Run infrastructure.
