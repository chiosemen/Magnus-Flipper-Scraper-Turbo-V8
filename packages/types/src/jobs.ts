import { z } from 'zod';
import { TimestampSchema } from './common';
import { DealSourceEnum } from './deals';

export const JobStatusEnum = z.enum([
  'pending',
  'queued',
  'running',
  'parsing',
  'storing',
  'completed',
  'failed',
  'cancelled',
  'retrying'
]);
export type JobStatus = z.infer<typeof JobStatusEnum>;

export const JobTypeEnum = z.enum([
  'monitor_search',
  'single_url',
  'price_check',
  'bulk_import'
]);
export type JobType = z.infer<typeof JobTypeEnum>;

export const JobSchema = z.object({
  id: z.string().uuid(),
  type: JobTypeEnum,
  source: DealSourceEnum,
  
  monitorId: z.string().uuid().optional(),
  urls: z.array(z.string().url()).optional(),
  searchQuery: z.string().optional(),
  
  status: JobStatusEnum,
  progress: z.number().min(0).max(100).default(0),
  
  dealsFound: z.number().int().default(0),
  dealsNew: z.number().int().default(0),
  dealsUpdated: z.number().int().default(0),
  pagesScraped: z.number().int().default(0),
  
  error: z.record(z.string(), z.any()).optional(),
  retries: z.number().int().default(0),
  maxRetries: z.number().int().default(3),
  
  scheduledAt: TimestampSchema,
  startedAt: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
  
  workerId: z.string().optional(),
  userId: z.string(),
  
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Job = z.infer<typeof JobSchema>;

export const JobPayloadSchema = z.object({
  jobId: z.string().uuid(),
  type: JobTypeEnum,
  source: DealSourceEnum,
  params: z.object({
    monitorId: z.string().uuid().optional(),
    urls: z.array(z.string().url()).optional(),
    searchQuery: z.string().optional(),
    criteria: z.record(z.string(), z.any()).optional(), // SearchCriteria
  }),
  meta: z.object({
    userId: z.string(),
    attempt: z.number().default(1),
    canary: z.boolean().optional(),
    canaryRamp: z.number().optional(),
    demo: z.boolean().optional(),
    demoSessionId: z.string().optional(),
    timeoutSec: z.number().optional(),
    enforcementMode: z.enum(['FULL', 'PARTIAL', 'SIGNAL', 'BLOCK']).optional(),
    enforcementDecision: z.enum(['ALLOW', 'DOWNGRADE', 'DENY']).optional(),
    enforcementReason: z.string().optional(),
    enforcementAudit: z.record(z.string(), z.any()).optional(),
    tuning: z.record(z.string(), z.any()).optional(),
  })
});
export type JobPayload = z.infer<typeof JobPayloadSchema>;

export const CreateJobSchema = z.object({
  type: JobTypeEnum,
  source: DealSourceEnum,
  monitorId: z.string().uuid().optional(),
  urls: z.array(z.string().url()).optional(),
  searchQuery: z.string().optional(),
});
export type CreateJob = z.infer<typeof CreateJobSchema>;
