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
