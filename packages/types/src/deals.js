import { z } from 'zod';
import { TimestampSchema, CurrencyEnum, GeoLocationSchema, PaginationParamsSchema } from './common';
export const DealSourceEnum = z.enum([
    'craigslist',
    'ebay',
    'amazon',
    'facebook',
    'vinted',
    'gumtree',
    'offerup',
    'mercari',
    'other'
]);
export const DealStatusEnum = z.enum([
    'active',
    'sold',
    'expired',
    'flagged',
    'purchased'
]);
export const DealConditionEnum = z.enum([
    'new',
    'like_new',
    'good',
    'fair',
    'poor',
    'for_parts',
    'unknown'
]);
export const DealSchema = z.object({
    id: z.string().uuid(),
    source: DealSourceEnum,
    sourceUrl: z.string().url(),
    sourceId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    category: z.string(),
    condition: DealConditionEnum,
    listPrice: z.number(),
    currency: CurrencyEnum,
    shippingCost: z.number().default(0),
    marketPrice: z.number().optional(),
    profitMargin: z.number().optional(),
    profitAmount: z.number().optional(),
    dealScore: z.number().min(0).max(100).default(0),
    location: z.string().optional(),
    coordinates: GeoLocationSchema.optional(),
    distance: z.number().optional(), // Distance from user in km
    sellerName: z.string(),
    sellerRating: z.number().min(0).max(5).optional(),
    sellerReviews: z.number().int().optional(),
    images: z.array(z.string().url()),
    thumbnailUrl: z.string().url().optional(),
    status: DealStatusEnum,
    firstSeenAt: TimestampSchema,
    lastSeenAt: TimestampSchema,
    scrapedAt: TimestampSchema,
    monitorId: z.string().uuid(),
    userId: z.string(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
});
export const CreateDealSchema = DealSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    profitMargin: true,
    profitAmount: true,
    dealScore: true
}).extend({
    sourceUrl: z.string().url(),
});
export const UpdateDealSchema = DealSchema.partial().omit({
    id: true,
    userId: true, // Can't update userId
    createdAt: true, // Can't update createdAt
});
export const DealFiltersSchema = PaginationParamsSchema.extend({
    query: z.string().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    minProfit: z.number().optional(),
    minScore: z.number().min(0).max(100).optional(),
    sources: z.array(DealSourceEnum).optional(),
    categories: z.array(z.string()).optional(),
    conditions: z.array(DealConditionEnum).optional(),
    sortBy: z.enum(['date', 'price', 'profit', 'score']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
