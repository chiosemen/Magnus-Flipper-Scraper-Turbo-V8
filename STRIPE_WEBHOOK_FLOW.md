# Stripe Webhook Flow (Phase E — Revenue Integrity)

## Event Flow → DB Mutation → Enforcement Effect

### customer.subscription.created
- Handler: `/api/stripe/webhook`
- Action: upsert into `subscriptions`
  - user_id, stripe_customer_id, stripe_subscription_id
  - stripe_price_id, tier (derived), status, current_period_end
- Enforcement effect:
  - If status = `active`, API + worker resolve paid tier from `subscriptions`.

### customer.subscription.updated
- Handler: `/api/stripe/webhook`
- Action: upsert subscription row with latest status + current_period_end
- Enforcement effect:
  - If status changes to `past_due` or `canceled`, tier resolution falls back to `free` immediately.

### customer.subscription.deleted
- Handler: `/api/stripe/webhook`
- Action: upsert subscription row with status `canceled`
- Enforcement effect:
  - Enforcement immediately treats user as `free` tier.

## Stripe Source of Truth
- Enforcement uses the persisted subscription row.
- No live Stripe fetches during enforcement.
- Webhook state wins by design.

## Manual Test Checklist (No Scripts)

1) **Upgrade to paid**
- Complete a Stripe test checkout (Pro).
- Confirm webhook inserts/updates `subscriptions` with `status=active` and `tier=pro`.
- Confirm API/worker enforcement allows Pro limits.

2) **Downgrade / past_due**
- Use Stripe dashboard to mark the subscription as past_due.
- Confirm webhook updates `subscriptions.status=past_due`.
- Confirm API/worker enforcement falls back to `free` tier.

3) **Cancel**
- Cancel the subscription in Stripe.
- Confirm webhook updates `subscriptions.status=canceled`.
- Confirm API/worker enforcement falls back to `free` tier immediately.

## Expected Enforcement Behavior
- Paid tier: limits from `tierLimits` for the mapped tier.
- Past_due/canceled: default to `free` limits.
