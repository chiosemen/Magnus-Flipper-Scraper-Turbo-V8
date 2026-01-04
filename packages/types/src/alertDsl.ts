import { z } from 'zod';

export const ComparatorSchema = z.enum(['GT', 'GTE', 'LT', 'LTE', 'EQ', 'NEQ', 'IN']);

export const AlertPredicateSchema = z.object({
  field: z.string(),
  op: ComparatorSchema,
  value: z.union([z.number(), z.string(), z.array(z.string()), z.array(z.number())]),
});

export const AlertRuleSchema = z.object({
  ruleId: z.string(),
  name: z.string(),
  enabled: z.boolean().default(true),
  marketplaces: z.array(z.string()).default([]),
  all: z.array(AlertPredicateSchema).default([]),
  any: z.array(AlertPredicateSchema).default([]),
  actions: z.array(z.enum(['PUSH', 'EMAIL', 'WEBHOOK'])).default(['PUSH']),
});

export type AlertRule = z.infer<typeof AlertRuleSchema>;
