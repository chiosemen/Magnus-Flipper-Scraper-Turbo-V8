# Idempotency + Replay (Contract)

## Why
Prevent duplicates, enable safe replays, guarantee deterministic outputs.

## Key
`idempotencyKey = hash(marketplace, listingId, datasetItemHash, pipelineVersion)`

## Replay policy
- `REJECT_DUPLICATE`: reject rerun.
- `RETURN_PRIOR_RESULT`: return prior receipt.
- `ALLOW_REPLAY_SOFT`: execute again but link `replayOfRunId`.

## Contract output
`IdempotencyReceipt` stores refs only (never heavy blobs).
