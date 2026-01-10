import { z } from 'zod';
export const TimestampSchema = z.union([z.date(), z.string(), z.number()]);
export const CurrencyEnum = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']);
export const PaginationParamsSchema = z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
    cursor: z.string().optional(),
});
export const GeoLocationSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
    city: z.string().optional(),
    country: z.string().optional(),
});
