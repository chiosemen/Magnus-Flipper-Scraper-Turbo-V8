# Refresh / Usage Sanity Summary (DESIGN-ONLY)

Assumptions:
- "Power" maps to Elite (tier_key=elite): 100 monitors, 3h refresh, max_concurrency_user=5.
- "Desk" maps to Enterprise (tier_key=ent): 180 monitors, 2h refresh, max_concurrency_user=8.
- Per-user runs/hour = max_monitors / refresh_interval_hours.

Per-user worst-case:
- Power (Elite): 100 / 3h = 33.3 runs/hour per user.
- Desk (Enterprise): 180 / 2h = 90 runs/hour per user.

Example scale (100 users each):
- Total runs/hour: (100 * 33.3) + (100 * 90) = 12,330 runs/hour.
- Theoretical peak concurrent runs (user caps only): (100 * 5) + (100 * 8) = 1,300.

Scaling note (all Desk users at cap):
- 500 Desk users: 500 * 90 = 45,000 runs/hour.
- 800 Desk users: 800 * 90 = 72,000 runs/hour.

Mixtape alignment:
- Refresh intervals (3h Elite, 2h Enterprise) match TierPolicy defaults.
- User-level concurrency caps and marketplace-level global caps bound runaway execution.
