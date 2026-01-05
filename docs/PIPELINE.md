# Pipeline Executor Design (Contracts)

## Purpose
Define the execution contract for transforming `RAW_LISTING` → `ENRICHED_LISTING`.

## Rules
- Types/contracts only; no runtime logic is introduced here.
- Workers implement the actual pipeline based on these contracts.
- No alerts/arb/UI logic may trigger inside the executor.

## Pipeline shape
- Graph of steps with explicit dependencies.
- Strict mode fails closed when required inputs are missing.
- Results emit publication references (refs only) to avoid coupling.

## Output
`PipelineResultEnvelope` includes:
- `runId`, `idempotencyKey`, `replayOfRunId`.
- Step reports (timestamps + statuses).
- Publication refs (UI / alerts / arb).

## Replay / Rescore (contracts only)
- `PipelineExecutionPlan` pins `pipelineVersion` and optionally `replayMode` (`REPLAY_SAME`, `RESCORE_ONLY`) plus `replayOfRunId`.
- `PipelineHashRefs` / `IdempotencyHashes` compare deterministic fingerprints before executing any stage.
- Replay flows link new runs to prior runs without mutating `inputHash`.

## Golden snapshots
- `workers/tests/pipeline/golden` freezes deterministic behavior: NORMALIZE → SIGNAL_EXTRACT → SCORE.
- Fixtures inject fixed `now`/`receivedAt` timestamps so freshness math is predictable.
- The serializer sorts keys and rounds floats, ensuring stable comparisons.

## Stage notes
- `NORMALIZE` cleans raw text and price only.
- `SIGNAL_EXTRACT` derives deterministic signals (freshness, rarity, demand).
- `SCORE` weights those signals into a scalar (no randomness).
- `FINALIZE` publishes `ENRICHED_LISTING` + explainability envelopes.
