# Stripe Design Artifacts (DESIGN-ONLY)

Status: Implementation deferred. This file is a design reference only.

## Stripe Products + Prices
Pricing values are placeholders for Mixtape planning and must be confirmed before provisioning.
Tier keys align to `config/TierPolicy.ts` (`basic`, `pro`, `elite`, `ent`).

| Tier | Stripe Product Name | Price (USD/month) | Billing Interval | Price ID Placeholder | Required Metadata |
| --- | --- | --- | --- | --- | --- |
| Basic | Magnus Flipper Basic | 39 | monthly | price_basic_monthly | tier_key=basic, refresh_interval_sec=43200, max_concurrency=2, max_monitors=25 |
| Pro | Magnus Flipper Pro | 79 | monthly | price_pro_monthly | tier_key=pro, refresh_interval_sec=21600, max_concurrency=3, max_monitors=60 |
| Elite | Magnus Flipper Elite | 149 | monthly | price_elite_monthly | tier_key=elite, refresh_interval_sec=10800, max_concurrency=5, max_monitors=100 |
| Enterprise | Magnus Flipper Enterprise | 249 | monthly | price_enterprise_monthly | tier_key=ent, refresh_interval_sec=7200, max_concurrency=8, max_monitors=180 |

## Minimal Subscription Storage
Existing fields already present:
- users.stripe_customer_id
- users.tier
- users.tier_expires_at

Minimal new table (if not already implemented):
- subscriptions
  - id (pk)
  - user_id (fk users.id)
  - stripe_subscription_id (unique)
  - stripe_price_id
  - status (active, trialing, past_due, canceled)
  - current_period_end (timestamp)
  - cancel_at_period_end (boolean)
  - created_at (timestamp)
  - updated_at (timestamp)

## Webhook Events + Handler Outline (Pseudo-code Only)
Required events:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed

Pseudo-code outline:
- verify webhook signature with STRIPE_WEBHOOK_SECRET
- switch (event.type)
  - checkout.session.completed:
    - link stripe_customer_id to user
    - upsert subscription row from session
    - set users.tier from price metadata tier_key
  - customer.subscription.created/updated:
    - upsert subscription status/price/current_period_end
    - set users.tier from price metadata tier_key
  - customer.subscription.deleted:
    - mark subscription canceled
    - set users.tier to free
  - invoice.payment_failed:
    - mark subscription past_due
  - invoice.payment_succeeded:
    - ensure subscription active

Implementation deferred; no code changes authorized.
