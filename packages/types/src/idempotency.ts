import { z } from 'zod';

export const IdempotencyKeySchema = z.string().min(16);

export const ReplayModeSchema = z.enum([
  'REJECT_DUPLICATE',
  'RETURN_PRIOR_RESULT',
  'ALLOW_REPLAY_SOFT',
]);

export const IdempotencyScopeSchema = z.enum(['LISTING', 'USER', 'GLOBAL']);

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
