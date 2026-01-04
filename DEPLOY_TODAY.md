# Mixtape Deploy Today (Phase D)

Scope:
- `apps/web`
- `apps/api`
- `apps/worker`

Root SPA and `apps/landing` are out-of-scope.

## Install (pnpm-only)
```
pnpm install --no-frozen-lockfile
```
EXPECTED RESULT: Dependencies installed; workspace packages resolved.

## Database Migrations
Apply SQL files in order (skip empty files):
- `packages/database/src/migrations/0000_initial.sql` (empty)
- `packages/database/src/migrations/0001_user_scoped_deals_unique.sql`
- `packages/database/src/migrations/0002_add_subscriptions.sql`
- `packages/database/src/migrations/0003_add_stripe_subscription_status.sql`

Example (psql):
```
psql "$DATABASE_URL" -f packages/database/src/migrations/0001_user_scoped_deals_unique.sql
psql "$DATABASE_URL" -f packages/database/src/migrations/0002_add_subscriptions.sql
psql "$DATABASE_URL" -f packages/database/src/migrations/0003_add_stripe_subscription_status.sql
```
EXPECTED RESULT: Tables/constraints created without errors.

## Build (design-level commands)
```
pnpm --filter @repo/web exec vite build
pnpm --filter @repo/api build
pnpm --filter @repo/worker build
```
EXPECTED RESULT: Build artifacts produced for web/api/worker.

## Run (local demo)
```
pnpm --filter @repo/api dev
pnpm --filter @repo/worker dev
pnpm --filter @repo/web dev
```
EXPECTED RESULT: API on `http://localhost:8080`, worker on `http://localhost:8080` (configure ports as needed), web on Vite dev server.

## Required Environment Variables

### apps/web
- `VITE_API_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### apps/api
- `DATABASE_URL`
- `REDIS_URL`
- `FIREBASE_SERVICE_ACCOUNT_BASE64` or `GOOGLE_APPLICATION_CREDENTIALS`
- `CORS_ORIGIN`
- `NODE_ENV`
- `WORKER_SERVICE_URL`
- `WORKER_SHARED_SECRET`
- `GCP_PROJECT_ID`
- `GCP_LOCATION`
- `GCP_QUEUE_NAME`
- `GCP_SERVICE_ACCOUNT_EMAIL`
- `ENABLE_CLOUD_TASKS_DEV` (set to `1` in dev to allow dispatch)

Stripe (test mode only):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_BASIC`
- `STRIPE_PRICE_ID_PRO`
- `STRIPE_PRICE_ID_ELITE`
- `STRIPE_PRICE_ID_ENTERPRISE`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- `STRIPE_PORTAL_RETURN_URL`

### apps/worker
- `DATABASE_URL`
- `FIREBASE_SERVICE_ACCOUNT_BASE64` or `GOOGLE_APPLICATION_CREDENTIALS`
- `WORKER_SHARED_SECRET`
- `PROXY_URL` (optional)
- `PORT` (optional; default 8080)
- `HEADLESS` (optional)

## Notes (Mixtape)
- Cloud Tasks dispatch is required for end-to-end job execution. In dev, set `ENABLE_CLOUD_TASKS_DEV=1` and ensure GCP Task queue + service account are configured.
- Playwright requires browser binaries; install per Playwright docs if not present.
- Stripe is test-mode only.
