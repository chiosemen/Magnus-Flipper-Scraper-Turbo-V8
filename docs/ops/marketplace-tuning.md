# Marketplace Tuning

## Why FB ≠ Vinted
- Facebook: higher anti-bot risk → lower concurrency, residential proxies, faster degrade bias.
- Vinted: more tolerant → mixed proxies, higher concurrency ceiling.

## Kill-switch behavior
- Config keys allow global or per-country disable.
- If disabled, job creation returns 429 with reason.

## Adjusting tiers safely
- Use `packages/core/src/marketplaces/marketplaceTuning.ts` as the single source of truth.
- Change per-tier concurrency or RPS in one place; runtime consumes resolved tuning.

## Example resolved tuning
```json
{
  "enabled": true,
  "concurrency": 2,
  "maxRps": 0.8,
  "proxyProfile": "residential",
  "degradeBias": 0.85,
  "retryPolicy": { "maxRetries": 3, "backoffSec": 45, "jitterPct": 0.2 }
}
```
