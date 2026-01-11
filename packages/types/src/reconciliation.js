import { z } from 'zod';
import { TimestampSchema } from './common';
import { UserTierEnum } from './users';
/**
 * Revenue Reconciliation Types
 * Purpose: Type-safe billing reconciliation between Stripe and internal usage tracking
 * Source of Truth: Stripe for invoices, PostgreSQL for usage
 */
// ============================================================================
// Enums and Constants
// ============================================================================
export const ReconciliationSeverityEnum = z.enum(['OK', 'WARN', 'CRITICAL']);
export const ReasonCodeEnum = z.enum([
    'usage_missing', // No telemetry data for period
    'invoice_missing', // Expected invoice not found
    'price_mapping_missing', // Cannot resolve Stripe price ID
    'stripe_event_lag', // Invoice <24hrs old (webhook delay)
    'rounding_expected', // Delta <1% and <$1 (normal variance)
    'meter_id_mismatch', // Stripe meter doesn't match usage type
    'over_cap_blocked_but_billed', // User over limit yet charged (CRITICAL)
    'stripe_api_failure', // Cannot fetch Stripe data
    'subscription_status_mismatch', // Local subscription status differs from Stripe
    'no_stripe_customer', // User has no Stripe customer ID
    'multiple_subscriptions', // Multiple active subscriptions found
]);
export const SubscriptionStatusEnum = z.enum([
    'active',
    'trialing',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused',
]);
export const InvoiceStatusEnum = z.enum([
    'draft',
    'open',
    'paid',
    'uncollectible',
    'void',
]);
// ============================================================================
// Usage Metrics
// ============================================================================
export const UsageMetricsSchema = z.object({
    fullRuns: z.number().int().default(0),
    partialRuns: z.number().int().default(0),
    signalChecks: z.number().int().default(0),
    proxyGb: z.number().default(0),
    costUsd: z.number().default(0),
});
export const UsageTotalsSchema = UsageMetricsSchema.extend({
    periodStart: z.string(), // ISO date
    periodEnd: z.string(), // ISO date
    daysTracked: z.number().int(),
});
// ============================================================================
// Stripe Data Models
// ============================================================================
export const StripeLineItemSchema = z.object({
    id: z.string(),
    priceId: z.string(),
    description: z.string().nullable(),
    quantity: z.number().nullable(),
    amount: z.number(), // in cents
    currency: z.string(),
    meter: z.string().nullable(), // Mapped meter type (full_runs, signal_checks, proxy_gb)
    periodStart: z.number().nullable(), // Unix timestamp
    periodEnd: z.number().nullable(), // Unix timestamp
});
export const StripeInvoiceSchema = z.object({
    id: z.string(),
    status: InvoiceStatusEnum,
    created: z.number(), // Unix timestamp
    total: z.number(), // in cents
    subtotal: z.number(), // in cents
    currency: z.string(),
    lines: z.array(StripeLineItemSchema),
    periodStart: z.number().nullable(),
    periodEnd: z.number().nullable(),
    hostedInvoiceUrl: z.string().nullable(),
});
// ============================================================================
// Execution Gates
// ============================================================================
export const ExecutionGatesSchema = z.object({
    billingStateBlocked: z.boolean(), // Subscription not active/trialing
    overCapBlocked: z.boolean(), // Usage exceeds tier entitlements
    killSwitchBlocked: z.boolean(), // SCRAPING_ENABLED = false
    marketplaceDisabled: z.boolean(), // Marketplace-specific kill switch
    reasonCodes: z.array(z.string()), // Reason codes for blocks
});
// ============================================================================
// Reconciliation Component Delta
// ============================================================================
export const ComponentDeltaSchema = z.object({
    meter: z.string(), // e.g., "full_runs", "signal_checks", "proxy_gb"
    label: z.string(), // e.g., "Full Scraper Runs"
    unit: z.string(), // e.g., "run", "check", "GB"
    // Units
    billedUnits: z.number(),
    measuredUnits: z.number(),
    deltaUnits: z.number(),
    deltaUnitsPct: z.number(), // Percentage
    // Amounts (in dollars, not cents)
    billedAmount: z.number(),
    expectedAmount: z.number(),
    deltaAmount: z.number(),
    deltaAmountPct: z.number(), // Percentage
    severity: ReconciliationSeverityEnum,
    reasons: z.array(ReasonCodeEnum),
});
// ============================================================================
// Customer Reconciliation Data
// ============================================================================
export const CustomerReconciliationSchema = z.object({
    // Customer identity
    userId: z.string(),
    email: z.string(),
    tier: UserTierEnum,
    stripeCustomerId: z.string(),
    // Subscription info
    subscriptionId: z.string().nullable(),
    subscriptionStatus: SubscriptionStatusEnum.nullable(),
    currentPeriodStart: z.number().nullable(), // Unix timestamp
    currentPeriodEnd: z.number().nullable(), // Unix timestamp
    // Invoice summary
    invoiceCount: z.number().int(),
    billedTotal: z.number(), // Total billed in dollars
    // Usage summary
    measuredTotal: z.number(), // Total measured cost in dollars
    // Delta analysis
    deltaTotal: z.number(), // billedTotal - measuredTotal (in dollars)
    deltaPct: z.number(), // Percentage difference
    // Severity and reasons
    severity: ReconciliationSeverityEnum,
    reasons: z.array(ReasonCodeEnum),
    // Execution gates
    executionGates: ExecutionGatesSchema,
    // Component breakdowns (optional, for drilldown)
    components: z.array(ComponentDeltaSchema).optional(),
    invoices: z.array(StripeInvoiceSchema).optional(),
    usage: UsageTotalsSchema.optional(),
});
// ============================================================================
// Reconciliation Summary
// ============================================================================
export const SeverityCountsSchema = z.object({
    OK: z.number().int().default(0),
    WARN: z.number().int().default(0),
    CRITICAL: z.number().int().default(0),
});
export const ReconciliationSummarySchema = z.object({
    totalCustomers: z.number().int(),
    totalInvoices: z.number().int(),
    totalBilledAmount: z.number(), // in dollars
    totalMeasuredCost: z.number(), // in dollars
    totalDelta: z.number(), // in dollars
    totalDeltaPct: z.number(), // percentage
    severityCounts: SeverityCountsSchema,
});
// ============================================================================
// Full Reconciliation Response
// ============================================================================
export const ReconciliationDataSchema = z.object({
    summary: ReconciliationSummarySchema,
    customers: z.array(CustomerReconciliationSchema),
    generatedAt: TimestampSchema,
    dateRange: z.object({
        from: z.string(), // ISO date
        to: z.string(), // ISO date
    }),
});
// ============================================================================
// Customer Invoice Detail Response
// ============================================================================
export const CustomerInvoiceDetailSchema = z.object({
    customer: z.object({
        id: z.string(),
        userId: z.string(),
        email: z.string(),
        tier: UserTierEnum,
    }),
    invoices: z.array(StripeInvoiceSchema),
    usage: UsageTotalsSchema,
    reconciliation: z.object({
        components: z.array(ComponentDeltaSchema),
        totalDelta: z.number(),
        severity: ReconciliationSeverityEnum,
        reasons: z.array(ReasonCodeEnum),
    }),
    executionGates: ExecutionGatesSchema,
});
// ============================================================================
// Request Schemas
// ============================================================================
export const ReconciliationQuerySchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    tier: UserTierEnum.optional(),
    severity: ReconciliationSeverityEnum.optional(),
});
export const CustomerInvoiceQuerySchema = z.object({
    customerId: z.string(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
// ============================================================================
// Helpers
// ============================================================================
export const SEVERITY_ORDER = {
    OK: 0,
    WARN: 1,
    CRITICAL: 2,
};
export function getHigherSeverity(a, b) {
    return SEVERITY_ORDER[a] > SEVERITY_ORDER[b] ? a : b;
}
export function calculateDeltaPct(billed, measured) {
    if (measured === 0)
        return billed === 0 ? 0 : 100;
    return ((billed - measured) / measured) * 100;
}
export function classifySeverity(deltaAmount, deltaPct) {
    const absDelta = Math.abs(deltaAmount);
    const absPct = Math.abs(deltaPct);
    // CRITICAL: Large absolute delta or large percentage delta
    if (absDelta >= 10.00 || absPct > 10) {
        return 'CRITICAL';
    }
    // WARN: Medium delta
    if (absDelta >= 1.00 || absPct > 1) {
        return 'WARN';
    }
    // OK: Small delta (rounding expected)
    return 'OK';
}
