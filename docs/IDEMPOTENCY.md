# Idempotency + Replay (Contract)

## Why
Prevent duplicates, enable safe replays, guarantee deterministic outputs.

## Key
`idempotencyKey = hash(marketplace, listingId, datasetItemHash, pipelineVersion)`

## Replay policy
- `REJECT_DUPLICATE`: reject rerun.
- `RETURN_PRIOR_RESULT`: return prior receipt.
- `ALLOW_REPLAY_SOFT`: execute again but link `replayOfRunId`.

-## Contract output
`IdempotencyReceipt` stores refs only (never heavy blobs).

## Idempotency hashes
- `IdempotencyHashes` capture stable fingerprints of the input and the output along with the pipeline version.
- Replay flows ensure `inputHash` stays constant and `outputHash` is compared to detect drift before committing.

## Replay / Re-score Modes (Contracts)
- `REPLAY_SAME`: audit replay; same input + same version must produce identical output.
- `RESCORE_ONLY`: recompute score with updated scoring contract/version, while leaving normalized + signals unchanged unless explicitly re-versioned.

The lineage is carried via `replayOfRunId` and pinned `pipelineVersion`.
