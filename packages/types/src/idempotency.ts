import { z } from 'zod';

export const IdempotencyKeySchema = z.string().min(16);

export const ReplayModeSchema = z.enum([
  'REJECT_DUPLICATE',
  'RETURN_PRIOR_RESULT',
  'ALLOW_REPLAY_SOFT',
]);

export type ReplayMode = z.infer<typeof ReplayModeSchema>;

export const IdempotencyScopeSchema = z.enum(['LISTING', 'USER', 'GLOBAL']);

export type IdempotencyScope = z.infer<typeof IdempotencyScopeSchema>;

export const IdempotencyReceiptSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  scope: IdempotencyScopeSchema,
  replayMode: ReplayModeSchema,
  firstSeenAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  runId: z.string(),
  replayOfRunId: z.string().optional(),
  resultRef: z.string(),
});

export type IdempotencyReceipt = z.infer<typeof IdempotencyReceiptSchema>;

export const IdempotencyKeyInputsSchema = z.object({
  marketplace: z.string(),
  listingId: z.string(),
  datasetItemHash: z.string(),
  pipelineVersion: z.string(),
});

export type IdempotencyKeyInputs = z.infer<typeof IdempotencyKeyInputsSchema>;

// IDEMPOTENCY_HASH_CONTRACT_V1 (contracts only)
export interface IdempotencyHashes {
  inputHash: string;   // hash(raw + meta + pinned versions)
  outputHash?: string; // hash(final output), optional until FINALIZE exists
  pipelineVersion: string;
}
