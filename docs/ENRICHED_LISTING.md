# ENRICHED_LISTING (Contract Only)

## Core Principle
`ENRICHED_LISTING` is produced only by pipeline stages. Ingestion/UI/alerts never mutate this contract—they merely consume it.

## Structure
- `listingId`, `marketplace`: identity.
- `normalized`: canonical fields like `title`, `priceUSD`, `currency`.
- `signals`: deterministic metrics (`freshness`, `rarity`, optional `demand`).
- `score`: may be null if not computed yet.
- `provenance`: records which pipeline steps touched the data.
- `enrichedAt`: timestamp of completion.

## Allowed Mutators
- Only pipeline stages may add or change fields:
  1. `NORMALIZE` → fills `normalized`.
  2. `SIGNALS` → populates `/signals`.
  3. `SCORE` → sets `score`.
  4. `ALERT_EVAL`, `ARB_EVAL`, `PROJECT_UI` → may append `provenance` entries.

## Publications
- This schema feeds into `publication.ts`, `alertDsl.ts`, and `arbitrage.ts` contracts as immutable facts.
No runtime behavior is defined here.

## Explainability contract
- `explain.model = "RULES_V1"` documents the deterministic rules that produced the numbers.
- `explain.signals` lists each signal (freshness, rarity, demand) with value and a human-friendly label.
- `explain.scoreBreakdown` shows how weights combine into the final 0..100 score.
- `explain.confidence` reports input quality (title, price, images, location).
- `explain.warnings` may note missing fields without triggering alerts.

## Provenance meta
- `provenance.meta.pipelineVersion` pins the running pipeline.
- `stepVersions` tracks versions of each stage.
- `derivedFrom` records `listingHash` + `idempotencyKey` so replays stay deterministic.

## Explainability (Facts Only)
`ENRICHED_LISTING.explain` is a UI-safe receipt:
- signals computed (name/value/label)
- score breakdown (components + contributions)
- no thresholds, no alert logic, no recommendations

See `docs/EXPLAINABILITY.md`.
