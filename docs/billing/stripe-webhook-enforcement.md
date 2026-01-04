# Stripe Webhook Enforcement

## Events handled
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- checkout.session.completed (customer mapping only)

## Idempotency
- `subscriptions.last_event_id` stores the most recent Stripe event ID.
- If a webhook arrives with the same `event.id`, it is ignored.

## Tier mapping
- Stripe price ID → tier via `packages/billing/src/stripePlanMap.ts`
- If price ID is unknown or status is not active, tier falls back to `free`.

## Abuse prevention
- Downgrades apply immediately and set a cooldown window (6h) via `usage_telemetry.cooldown_until`.
- Upgrades apply immediately and reset usage telemetry for the current day.

## Resets
- Telemetry counters are reset on upgrade (current day only).
- No reset occurs on duplicate webhook events.
