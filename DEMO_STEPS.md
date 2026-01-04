# Mixtape Demo Steps (Phase D)

Goal: One live end-to-end flow (web → API → worker → scraper → DB → dashboard).

## Prerequisites
- API, worker, and web running (see `DEPLOY_TODAY.md`).
- Cloud Tasks enabled (`ENABLE_CLOUD_TASKS_DEV=1`) and worker reachable at `WORKER_SERVICE_URL`.
- Stripe not required for the scrape demo.

## Demo Flow (Happy Path)

1) **Login**
- Open the web app in a browser.
- Login with Firebase auth.
EXPECTED RESULT: Dashboard loads with stats and action buttons.

2) **Trigger Live Scrape**
- Click **Run Demo Scrape** on the dashboard.
EXPECTED RESULT: API creates a monitor + job; worker receives a job.

3) **Observe API Logs**
EXPECTED RESULT (examples):
- Job created / task dispatched
- No tier enforcement errors

4) **Observe Worker Logs**
EXPECTED RESULT (examples):
- Worker receives job payload
- Scraper starts (Craigslist)
- Job status transitions to completed

5) **Verify Persistence**
EXPECTED RESULT:
- At least one deal saved in DB (Craigslist result).

6) **Render in Dashboard**
- Refresh the dashboard.
EXPECTED RESULT:
- **Latest Deals** list shows at least one Craigslist item with title and price.

## If Demo Fails (Quick Checks)
- Worker auth: `WORKER_SHARED_SECRET` must match API header.
- Cloud Tasks: queue and service account must be valid; `WORKER_SERVICE_URL` reachable.
- Playwright: browser binaries installed; headless mode allowed.
- Tier enforcement: free-tier caps may block jobs if limits exceeded.
