import { z } from 'zod';

export const PipelineStepNameSchema = z.enum([
  'NORMALIZE',
  'DEDUP_FINGERPRINT',
  'SIGNALS',
  'SCORE',
  'ALERT_EVAL',
  'ARB_EVAL',
  'PROJECT_UI',
]);

export type PipelineStepName = z.infer<typeof PipelineStepNameSchema>;

export const PipelineStepSchema = z.object({
  name: PipelineStepNameSchema,
  version: z.string(),
  requires: z.array(PipelineStepNameSchema).default([]),
  produces: z.array(z.string()).default([]),
  strict: z.boolean().default(true),
});

export type PipelineStep = z.infer<typeof PipelineStepSchema>;

export const PipelineGraphSchema = z.object({
  pipelineName: z.string(),
  pipelineVersion: z.string(),
  steps: z.array(PipelineStepSchema),
});

export type PipelineGraph = z.infer<typeof PipelineGraphSchema>;
