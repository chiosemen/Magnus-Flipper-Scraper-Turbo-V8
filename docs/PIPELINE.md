# Pipeline Executor Design (Contracts)

## Purpose
Define the execution contract for transforming RAW_LISTING → ENRICHED_LISTING without implementing logic.

## Rules
- Types/contracts only.
- No scoring/enrichment code in API layers.
- Workers implement pipeline later.

## Pipeline shape
- Graph of steps with dependencies.
- Strict mode = fail closed when required inputs missing.
- Results emit publication references (refs only) to avoid coupling.

## Output
`PipelineResultEnvelope` includes:
- `runId`, `idempotencyKey`, `replayOfRunId`.
- Step reports.
- Publication refs (UI / alerts / arb).
