# Stripe Phase 1 — Test-Mode Validation Runbook (Mixtape)

Scope: Stripe Checkout + Webhook + Customer Portal (test mode only). No code changes.

## A) Preconditions

1) **Set required env vars (test keys only)**
```
export STRIPE_SECRET_KEY="sk_test_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."  # set after `stripe listen`
export STRIPE_PRICE_ID_BASIC="price_..."
export STRIPE_PRICE_ID_PRO="price_..."
export STRIPE_PRICE_ID_ELITE="price_..."
export STRIPE_PRICE_ID_ENTERPRISE="price_..."
export STRIPE_SUCCESS_URL="http://localhost:5173/stripe/success"
export STRIPE_CANCEL_URL="http://localhost:5173/stripe/cancel"
export STRIPE_PORTAL_RETURN_URL="http://localhost:5173/settings/billing"
export DATABASE_URL="postgres://..."
export CORS_ORIGIN="http://localhost:5173"
```
EXPECTED RESULT: All env vars set; keys are **test** keys only.

2) **Install Stripe CLI + login (primary path)**
```
stripe --version
stripe login
```
EXPECTED RESULT: Stripe CLI authenticated for test mode.

3) **Start API server with Stripe env vars set**
```
pnpm --filter @repo/api dev
```
EXPECTED RESULT: API running on `http://localhost:8080` (or your configured port).

4) **Start webhook forwarding**
```
stripe listen --forward-to http://localhost:8080/api/stripe/webhook
```
EXPECTED RESULT: CLI prints a webhook signing secret `whsec_...`; set it in `STRIPE_WEBHOOK_SECRET` and restart API if needed.

## B) Checkout Flow Validation

5) **Obtain a Firebase ID token for an existing user**
- Use your existing auth flow to get a valid Firebase ID token.
- Export it for the API call:
```
export FIREBASE_ID_TOKEN="<valid_firebase_id_token>"
```
EXPECTED RESULT: Token is valid and not expired.

6) **Create a checkout session (server-side)**
```
curl -s -X POST "http://localhost:8080/api/stripe/checkout" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier":"pro"}'
```
EXPECTED RESULT: JSON response `{ "success": true, "url": "https://checkout.stripe.com/..." }`.

7) **Complete checkout in browser**
- Open the returned `url` in a browser.
- Use Stripe test card `4242 4242 4242 4242`, any future date, any CVC.
EXPECTED RESULT: Checkout completes successfully and redirects to `STRIPE_SUCCESS_URL`.

## C) Webhook Simulation (CLI)

8) **Trigger key events via Stripe CLI**
```
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```
EXPECTED RESULT: Each trigger is delivered to the webhook endpoint and returns HTTP 200.

Note: The CLI fixtures may use Stripe price IDs that do not match your configured `STRIPE_PRICE_ID_*`. If price IDs do not match, tier mapping will not update the user (expected). For tier-mapping validation, rely on the real checkout flow (Step 7) which uses your configured price IDs.

## D) Database Verification (psql)

9) **Confirm subscription row exists**
```
psql "$DATABASE_URL" -c "SELECT user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, current_period_end FROM subscriptions ORDER BY current_period_end DESC LIMIT 5;"
```
EXPECTED RESULT: At least one row exists for the user who completed checkout.

10) **Confirm status changes on updates/deletes**
```
psql "$DATABASE_URL" -c "SELECT stripe_subscription_id, status FROM subscriptions WHERE stripe_customer_id = '<customer_id_from_stripe>';"
```
EXPECTED RESULT: Status reflects the latest webhook event (`active`, `past_due`, or `canceled`).

11) **Confirm price ID persisted**
```
psql "$DATABASE_URL" -c "SELECT stripe_subscription_id, stripe_price_id FROM subscriptions WHERE stripe_customer_id = '<customer_id_from_stripe>';"
```
EXPECTED RESULT: `stripe_price_id` matches the price ID used in checkout.

12) **Confirm current_period_end populated**
```
psql "$DATABASE_URL" -c "SELECT stripe_subscription_id, current_period_end FROM subscriptions WHERE stripe_customer_id = '<customer_id_from_stripe>';"
```
EXPECTED RESULT: `current_period_end` is non-null for active subscriptions.

## E) Policy Resolution Check (Design-Level)

13) **Verify tier mapping logic**
- `policyService.getTierForStripePriceId(priceId)` resolves:
  - `$STRIPE_PRICE_ID_BASIC` → `basic`
  - `$STRIPE_PRICE_ID_PRO` → `pro`
  - `$STRIPE_PRICE_ID_ELITE` → `elite`
  - `$STRIPE_PRICE_ID_ENTERPRISE` → `enterprise`
- Webhook handler updates `users.tier` when a subscription event includes a mapped price ID.

Sample DB mapping check:
```
psql "$DATABASE_URL" -c "SELECT id, tier FROM users WHERE stripe_customer_id = '<customer_id_from_stripe>';"
```
EXPECTED RESULT: `tier` matches the mapped tier for the stored `stripe_price_id`.

## F) Failure Modes + Diagnosis

1) **Missing webhook secret**
- Symptom: 400 response from `/api/stripe/webhook` with signature error.
- Fix: Ensure `STRIPE_WEBHOOK_SECRET` matches the value shown by `stripe listen`.

2) **Invalid price ID**
- Symptom: subscription row is created but user tier does not update.
- Fix: Ensure `STRIPE_PRICE_ID_*` matches the Stripe test price IDs used for checkout.

3) **Duplicate webhook delivery**
- Symptom: multiple deliveries of the same event.
- Handling: `subscriptions` uses `stripe_subscription_id` as primary key and `onConflictDoUpdate`, so duplicates are safe.

4) **Checkout created but no subscription row**
- Symptom: checkout completes but `subscriptions` table is empty.
- Fix: Verify `stripe listen` is running, API is reachable, and webhook returns 200.

---

Runbook Complete.
