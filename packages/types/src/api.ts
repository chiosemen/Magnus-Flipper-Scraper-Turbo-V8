import { z } from 'zod';

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: Pagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export const RealtimeEventSchema = z.object({
  type: z.enum(['job_update', 'new_deal', 'monitor_status', 'quota_warning']),
  payload: z.any(),
  timestamp: z.string(),
});
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
