import { z } from 'zod';
import { PipelineGraphSchema, PipelineStepNameSchema } from './pipelineSteps';

export const PipelineRunIdSchema = z.string().min(10);

export const PipelineTriggerSchema = z.enum([
  'RAW_LISTING_INGEST',
  'MANUAL_REPLAY',
  'SCHEDULED_REFRESH',
  'BACKFILL',
]);

export type PipelineTrigger = z.infer<typeof PipelineTriggerSchema>;

export const PipelineExecutionPlanSchema = z.object({
  runId: PipelineRunIdSchema,
  trigger: PipelineTriggerSchema,
  graph: PipelineGraphSchema,
  startAtStep: PipelineStepNameSchema.optional(),
  stopAfterStep: PipelineStepNameSchema.optional(),
  strict: z.boolean().default(true),
});

export type PipelineExecutionPlan = z.infer<typeof PipelineExecutionPlanSchema>;

export type PipelineExecutor = {
  execute: (plan: PipelineExecutionPlan) => Promise<unknown>;
};
