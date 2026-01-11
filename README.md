<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15yEs1C09qgHemGGTipLUkRoI2gGF_bN3

## Mixtape Scope

Production targets for the Mixtape release:
- `apps/web` (dashboard)
- `api` (API + orchestration)
- `workers` (job execution)

The root SPA (repo root `App.tsx`, `pages/`, `components/`, `services/`) is legacy and out-of-scope for Mixtape shipping. Root SPA build/runtime errors are non-blocking for Mixtape deploys.

## Stripe Mode Isolation

Stripe is hard-isolated by mode:
- `STRIPE_MODE` must be `test` or `live`
- `STRIPE_TEST_SECRET_KEY` is required for test mode
- `STRIPE_LIVE_SECRET_KEY` is required for live mode
- Live mode is blocked unless `NODE_ENV=production`

## Architecture

**Magnus Flipper Scraper** is an **Apify-first, zero-browser marketplace scraping platform** built as a strict TypeScript monorepo.

### Key Features

- ✅ **Apify-First** - All scraping delegated to Apify actors (no browser processes in Cloud Run)
- ✅ **Functional Architecture** - Pure function scrapers (no classes, no state)
- ✅ **Type Safety** - Strict TypeScript with explicit schema reconciliation
- ✅ **Monorepo** - pnpm workspaces for code sharing and atomic deployments

### Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| `apps/web` | React 19 + Vite | Dashboard frontend |
| `api` | Hono | REST API gateway |
| `workers` | Hono + Apify | Scraper orchestration (Apify-first) |
| `packages/*` | Shared libs | Types, database, logger, telemetry |

### Architecture Changes (V2.0)

**Removed (Browser Era):**
- ❌ Playwright (headless browsers)
- ❌ Browser Service, Proxy Service, Antibot Service
- ❌ Class-based scrapers (BaseScraper hierarchy)

**Added (Apify-First):**
- ✅ Apify client integration (`apify-client`)
- ✅ Functional scrapers (SearchCriteria → Apify input)
- ✅ Marketplace-specific normalizers (Apify output → CreateDeal)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design documentation.

## Run Locally

**Prerequisites:** Node.js 20+, pnpm 9+

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set environment variables in `.env`:
   ```bash
   # Required
   APIFY_TOKEN=<your-apify-token>
   DATABASE_URL=<postgres-connection-string>
   FIREBASE_PROJECT_ID=<project-id>
   REDIS_URL=<redis-url>

   # Optional
   STRIPE_MODE=test
   STRIPE_TEST_SECRET_KEY=<stripe-test-key>
   ```

3. Build workspace packages:
   ```bash
   pnpm --filter @repo/types build
   pnpm --filter @repo/logger build
   pnpm --filter @repo/database build
   pnpm --filter @repo/telemetry build
   ```

4. Run development servers:
   ```bash
   # API
   pnpm --filter @repo/api dev

   # Workers
   pnpm --filter @repo/worker dev

   # Frontend
   pnpm --filter @repo/web dev
   ```

## TypeScript

Run typecheck across all workspaces:
```bash
pnpm --filter @repo/api typecheck
pnpm --filter @repo/worker typecheck
```

All checks must pass before deployment.

## Testing

```bash
# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# All tests
pnpm test:all
```
