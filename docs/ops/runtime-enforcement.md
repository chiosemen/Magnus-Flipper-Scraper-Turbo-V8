# Runtime Enforcement (Live)

## Where enforcement is called
Enforcement is executed inside:
- `api/src/services/jobs.service.ts` (job creation path)

Flow:
1. Resolve user tier
2. Load usage telemetry for user + marketplace + day
3. Evaluate enforcement decision
4. If BLOCK → return 429
5. If ALLOW/DOWNGRADE → enqueue job with enforced mode + audit
6. Persist telemetry counters + audit event

## What gets counted
Counters stored in `usage_telemetry`:
- full_runs
- partial_runs
- signal_checks
- proxy_gb_estimated
- last_reset_at
- cooldown_until

## Degradation behavior
If guardrails are hit:
- FULL → PARTIAL → SIGNAL
- BLOCK only when even SIGNAL would breach limits or cooldown is active

## Audit payload (example)
```json
{
  "userId": "uid_123",
  "marketplace": "facebook",
  "decision": "ALLOW",
  "mode": "PARTIAL",
  "reason_code": "budget_downgrade",
  "tier": "pro",
  "audit": {
    "guardrails_hit": ["full_scrape_cap"],
    "degrade_path": ["FULL", "PARTIAL"]
  }
}
```

## Failure modes (safe behavior)
- DB down → job creation fails; no silent overrun
- Redis down → enforcement still uses DB telemetry
- Queue down → job creation fails; audit persisted
