import { z } from 'zod';
export const PaginationSchema = z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
});
export const ApiErrorSchema = z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
});
export const RealtimeEventSchema = z.object({
    type: z.enum(['job_update', 'new_deal', 'monitor_status', 'quota_warning']),
    payload: z.any(),
    timestamp: z.string(),
});
