import { z } from 'zod';
import { TimestampSchema, GeoLocationSchema } from './common';
import { DealSourceEnum, DealConditionEnum } from './deals';
export const MonitorStatusEnum = z.enum(['active', 'paused', 'error', 'disabled']);
export const MonitorFrequencyEnum = z.enum(['realtime', 'frequent', 'hourly', 'daily']);
export const SearchCriteriaSchema = z.object({
    keywords: z.array(z.string()).min(1),
    excludeKeywords: z.array(z.string()).optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    minProfitPercent: z.number().optional(),
    minProfitAmount: z.number().optional(),
    minDealScore: z.number().min(0).max(100).optional(),
    conditions: z.array(DealConditionEnum).optional(),
    location: z.string().optional(),
    coordinates: GeoLocationSchema.optional(),
    maxDistance: z.number().optional(), // km
    categories: z.array(z.string()).optional(),
});
export const MonitorSchema = z.object({
    id: z.string().uuid(),
    userId: z.string(),
    name: z.string().min(1),
    description: z.string().optional(),
    sources: z.array(DealSourceEnum),
    criteria: SearchCriteriaSchema,
    frequency: MonitorFrequencyEnum,
    status: MonitorStatusEnum,
    notifyEmail: z.boolean().default(false),
    notifyPush: z.boolean().default(true),
    notifyInApp: z.boolean().default(true),
    totalDealsFound: z.number().int().default(0),
    lastRunAt: TimestampSchema.optional(),
    lastDealFoundAt: TimestampSchema.optional(),
    nextRunAt: TimestampSchema.optional(),
    consecutiveErrors: z.number().int().default(0),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
});
export const CreateMonitorSchema = MonitorSchema.omit({
    id: true,
    userId: true, // Usually injected from auth context
    totalDealsFound: true,
    lastRunAt: true,
    lastDealFoundAt: true,
    nextRunAt: true,
    consecutiveErrors: true,
    createdAt: true,
    updatedAt: true,
});
export const UpdateMonitorSchema = MonitorSchema.partial().omit({
    id: true,
    userId: true, // Can't update userId
    createdAt: true, // Can't update createdAt
});
