# Magnus Flipper Constitution

## Core Invariant
**Apify scrapes. Magnus Flipper thinks.**

## RAW vs ENRICHED
- `RAW_LISTING` stays inert, containing only scraper-provided fields.
- `ENRICHED_LISTING` is the thinking artifact produced by pipeline stages only.
- API/ingest code may never instantiate or import `ENRICHED_LISTING`.

## Forbidden Dependencies
- `@repo/intelligence/*` → forbidden everywhere upstream of the pipeline.
- `@repo/scoring/*` → forbidden in ingestion/dispatch paths.
- `@repo/enrichment/*` → forbidden across API/worker boundaries.
- `@repo/enrichedListing` or `@repo/types/enrichedListing` → forbidden for RAW ingestion.

## Enforcement Rules
- ESLint `no-restricted-imports` rejects any forbidden pattern.
- CI lint job gates every change and must pass before merge.
- Auditors may manually inspect for new import patterns.

## Defection Policy
Violations fail CI and require immediate rollback; no runtime logic may be added under the intake boundary.

---

## POST-DEMO ONLY (Scope Freeze)

The following features are **EXPLICITLY FORBIDDEN** until post-demo phase:

### Forbidden Features:
- ❌ **New pipeline steps** - No additional pipeline stages or processors
- ❌ **Scoring tweaks** - No modifications to scoring logic, thresholds, or algorithms
- ❌ **Alert execution** - No client-side or server-side alert evaluation/triggering
- ❌ **Arbitrage logic** - No profit calculation, spread analysis, or trade execution
- ❌ **New workers/consumers** - No additional background job processors
- ❌ **Performance optimization** - No batching, caching strategies, or performance tuning
- ❌ **WebSocket expansion** - No new channels, filters, or business logic in transport layer

### Rationale:
- **Investor safety** - Demo must showcase existing capabilities only
- **System clarity** - Avoid scope creep during presentation phase
- **Constitutional integrity** - Prevent accidental violation of separation boundaries

### Enforcement:
- Any code implementing above features must be removed or downgraded to contracts (types/schemas only)
- CI must block imports of forbidden modules into UI layer
- All demo pages use frozen data or read-only displays

### Current Demo-Safe Features:
- ✅ Landing page (UI presentation only)
- ✅ Listings page (frozen demo data + client-side sorting of pre-scored items)
- ✅ Alert DSL UI (authoring only, no evaluation)
- ✅ Auth flow (existing implementation)
- ✅ Demo mode (frozen data, no live evaluation)
