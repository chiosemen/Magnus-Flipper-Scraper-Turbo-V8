# Publication Contracts

## Goal
Publish `ENRICHED_LISTING` outputs to:
- UI projections
- Alert events
- Arbitrage signals

Without coupling pipeline execution to consumers.

## Rule
Pipeline emits refs + envelopes.
Consumers subscribe and hydrate.

## Backpressure tiers
- `CRITICAL`: must deliver fast
- `HIGH`: preferred lane
- `NORMAL`: default
- `BULK`: backfill / replay
