# Replit Deployment

This project can run inside Replit by starting the API and worker side-by-side and exposing the API port (3000). The root workspace now includes dedicated launch scripts and a Replit runtime definition to keep everything deterministic.

## Scripts
- `pnpm start:api` → builds `@repo/api`, then launches it with `PORT=3000`.
- `pnpm start:workers` → builds `@repo/worker` and starts it on `PORT=8081`.
- `pnpm start:production` → runs the API & worker scripts concurrently (`start:api & start:workers & wait`), which is what Replit executes.

The `.replit` file runs `pnpm install` and then `pnpm start:production`, so the portal always spins up both services. The `replit.nix` manifest pins Node.js 18+ and brings in `pnpm`.

## Replit configuration
1. Make sure the base command is `bash -lc 'pnpm install && PORT=3000 pnpm start:production'`.
2. The API listens on port `3000` (used by Replit’s proxy). The worker runs on `8081`, and the API forwards Cloud Tasks traffic to the `WORKER_SERVICE_URL` you configure.
3. Use Replit’s Secrets panel to seed the environment variables listed below. Do **not** embed any secret values in the repository or `.replit`.

## Required environment variables (secrets)
Set the values that match your production infrastructure. At a minimum Replit needs:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Connection string for your Postgres instance (used by API + worker). |
| `REDIS_URL` | Redis connection for rate limiting, kill switches, and telemetry. |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` or `GOOGLE_APPLICATION_CREDENTIALS` | Service account credentials for Firebase Admin SDK (used by auth, logging, Cloud Tasks). |
| `STRIPE_MODE` | `test` or `live` to select the correct Stripe API key set. |
| `STRIPE_TEST_SECRET_KEY` / `STRIPE_LIVE_SECRET_KEY` | Secret key matching `STRIPE_MODE`. |
| `STRIPE_PRICE_ID_BASIC`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_ELITE`, `STRIPE_PRICE_ID_ENTERPRISE` | Price IDs used by the billing/tier mapping logic. |
| `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `STRIPE_PORTAL_RETURN_URL`, `STRIPE_WEBHOOK_SECRET` | Redirects & webhook secret needed by the Stripe routes. |
| `WORKER_SHARED_SECRET` | Token that the API uses when dispatching jobs to the worker. |
| `WORKER_SERVICE_URL` | URL that `createScrapeTask` uses to POST jobs (`http://localhost:8081` inside Replit). |
| `GCP_PROJECT_ID`, `GCP_LOCATION`, `GCP_QUEUE_NAME`, `GCP_SERVICE_ACCOUNT_EMAIL` | Required for Cloud Tasks dispatch. If you run demo mode set `DEMO_GCP_QUEUE_NAME`. |

You may also need:

- `ENABLE_CLOUD_TASKS_DEV=1` when you do not have a real Cloud Task queue.
- `VITE_FIREBASE_*` values if you start the web app from the same project.

All environment variables should be defined via Replit's Secrets UI.

## Manual verification
1. Open `<your-replit>.repl.co/api/health`. You should see `{ status: 'ok', version: '1.0.0' }` (or `ready/live` variants on `/ready` & `/live`).
2. Confirm the Replit console shows `Worker listening on port 8081`. That log proves the worker process booted and is sharing `WORKER_SHARED_SECRET` with the API.
3. Optionally, validate `/api/ready` reports Redis + DB health. If either check fails, the endpoint returns `status: not_ready`.

Once both steps pass you have a functioning production-like deployment with API + worker running together under Node 18.
