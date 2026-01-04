import { z } from 'zod';
import { PipelineStepNameSchema } from './pipelineSteps';
import { PipelineRunIdSchema } from './pipeline';

export const PipelineDecisionSchema = z.enum([
  'SUCCESS',
  'FAILED_STRICT',
  'FAILED_SOFT',
  'SKIPPED',
]);

export const StepStatusSchema = z.enum(['OK', 'SKIPPED', 'FAILED']);

export const PipelineStepReportSchema = z.object({
  step: PipelineStepNameSchema,
  status: StepStatusSchema,
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  producedKeys: z.array(z.string()).default([]),
});

export const PipelineResultEnvelopeSchema = z.object({
  runId: PipelineRunIdSchema,
  decision: PipelineDecisionSchema,
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  idempotencyKey: z.string(),
  replayOfRunId: z.string().optional(),
  steps: z.array(PipelineStepReportSchema),
  publications: z
    .array(
      z.object({
        channel: z.enum(['UI_READ_MODEL', 'ALERT_EVENT', 'ARB_SIGNAL']),
        ref: z.string(),
        version: z.string(),
      })
    )
    .default([]),
});

export type PipelineResultEnvelope = z.infer<typeof PipelineResultEnvelopeSchema>;
