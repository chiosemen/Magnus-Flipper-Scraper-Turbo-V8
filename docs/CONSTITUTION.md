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
