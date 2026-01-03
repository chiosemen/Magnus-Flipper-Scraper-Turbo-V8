import { z } from 'zod';
import { TimestampSchema } from './common';

export const UserTierEnum = z.enum(['free', 'pro', 'enterprise']);
export type UserTier = z.infer<typeof UserTierEnum>;

export const UserSettingsSchema = z.object({
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    sms: z.boolean().default(false),
    minDealScore: z.number().min(0).max(100).default(50),
  }),
  display: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    currency: z.string().default('USD'),
    timezone: z.string().default('UTC'),
  }),
  scraping: z.object({
    defaultLocation: z.string().optional(),
  }),
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const QuotaSchema = z.object({
  monitors: z.object({
    limit: z.number(),
    used: z.number(),
  }),
  searchesPerDay: z.object({
    limit: z.number(),
    used: z.number(),
  }),
  alertsPerDay: z.object({
    limit: z.number(),
    used: z.number(),
  }),
  lastResetAt: TimestampSchema,
});
export type Quota = z.infer<typeof QuotaSchema>;

export const TierLimitsSchema = z.object({
  maxMonitors: z.number(),
  maxSearchesPerDay: z.number(),
  minRefreshIntervalMinutes: z.number(),
  maxAlertsPerDay: z.number(),
  supportLevel: z.enum(['community', 'email', 'priority']),
});
export type TierLimits = z.infer<typeof TierLimitsSchema>;

export const UserSchema = z.object({
  id: z.string(), // Firebase UID
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  
  tier: UserTierEnum.default('free'),
  tierExpiresAt: TimestampSchema.optional(),
  stripeCustomerId: z.string().optional(),
  
  settings: UserSettingsSchema,
  
  monitorsUsed: z.number().int().default(0),
  jobsUsedToday: z.number().int().default(0),
  alertsSentToday: z.number().int().default(0),
  quotaResetAt: TimestampSchema,
  
  totalDealsFound: z.number().int().default(0),
  totalProfitTracked: z.number().default(0),
  
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  lastLoginAt: TimestampSchema,
});
export type User = z.infer<typeof UserSchema>;
