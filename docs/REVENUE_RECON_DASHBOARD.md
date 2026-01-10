# Revenue Reconciliation Dashboard
## Billing Integrity & Execution Safety Control Plane

**Author:** Principal Revenue Assurance Engineering
**Status:** Implementation Ready
**Last Updated:** 2026-01-10

---

## Executive Summary

The Revenue Reconciliation Dashboard provides **real-time visibility** into billing accuracy and execution safety by answering four critical questions for any time window:

1. **What Stripe Billed** - Invoices, line items, amounts from authoritative source
2. **What We Measured** - Usage from `usageTelemetry` table (full_runs, partial_runs, signalChecks, proxyGb)
3. **Match Status** - Delta analysis with severity classification and reason codes
4. **Execution Gates** - What would be blocked by kill-switches, over-cap limits, or billing state

**Philosophy:** Everything fails closed. Unknown states block execution. Stripe is authoritative for invoices.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN UI (React)                         │
│  /admin/billing-reconciliation                              │
│  - Date range filter                                        │
│  - Tier filter                                              │
│  - Severity filter (OK/WARN/CRITICAL)                       │
│  - Customer drilldown                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ GET /billing/reconciliation?from=X&to=Y
                 │
┌────────────────▼────────────────────────────────────────────┐
│              Hono API Routes                                │
│  /billing/reconciliation - Main reconciliation endpoint     │
│  /billing/invoices/:customerId - Invoice details            │
│  Protected by: authMiddleware + adminMiddleware             │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│         ReconciliationService                               │
│  1. Query Stripe invoices (with line items)                 │
│  2. Query PostgreSQL usage (v_usage_totals_range view)      │
│  3. Compute deltas and severity                             │
│  4. Generate reason codes                                   │
│  5. Evaluate execution gates                                │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐  ┌───────▼──────────┐
│   Stripe     │  │   PostgreSQL     │
│   API        │  │   + Drizzle ORM  │
│              │  │                  │
│ - invoices   │  │ - users          │
│ - line items │  │ - subscriptions  │
│ - prices     │  │ - usageTelemetry │
└──────────────┘  └──────────────────┘
```

---

## Data Sources

### Primary Sources

| Source | Purpose | Authority Level |
|--------|---------|----------------|
| **Stripe API** | Invoices, charges, line items | **AUTHORITATIVE** for billing |
| **PostgreSQL `usageTelemetry`** | Daily usage tracking | **SOURCE OF TRUTH** for usage |
| **PostgreSQL `subscriptions`** | Subscription state | Synced from Stripe webhooks |
| **PostgreSQL `users`** | Tier, customer mapping | User profile data |

### Key Tables Schema

#### `usageTelemetry`
```sql
CREATE TABLE "usageTelemetry" (
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  full_runs INTEGER DEFAULT 0,
  partial_runs INTEGER DEFAULT 0,
  signal_checks INTEGER DEFAULT 0,
  proxy_gb NUMERIC(10,4) DEFAULT 0,
  cost_usd NUMERIC(10,4) DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
```

#### `subscriptions`
```sql
CREATE TABLE "subscriptions" (
  subscription_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  tier TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `users`
```sql
CREATE TABLE "users" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Reconciliation Logic

### Algorithm Flow

For date range `[from, to]`:

```
FOR EACH user WITH active/past subscription:

  A. PULL STRIPE DATA
     - invoices WHERE customer_id = user.stripe_customer_id
     - status IN ('paid', 'open', 'uncollectible', 'void')
     - created >= from AND created <= to
     - EXPAND invoice.lines.data
     - GROUP line items by metered component type

  B. PULL USAGE DATA
     - Query v_usage_totals_range(user_id, from, to)
     - Returns: total_runs, total_signal_checks, total_proxy_gb

  C. COMPUTE DELTAS
     - billed_units vs measured_units per component
     - billed_amount vs expected_amount
     - delta_units = billed - measured
     - delta_amount = billed_amount - expected_amount

  D. ASSIGN SEVERITY
     - OK: abs(delta_amount) < $1.00 AND delta_units within rounding
     - WARN: abs(delta_amount) < $10.00 OR expected lag conditions
     - CRITICAL: abs(delta_amount) >= $10.00 OR structural issues

  E. GENERATE REASON CODES
     - usage_missing: No telemetry data for period
     - invoice_missing: Expected invoice not found
     - price_mapping_missing: Cannot resolve Stripe price ID
     - stripe_event_lag: Invoice <24hrs old (webhook delay)
     - rounding_expected: Delta <1% and <$1
     - meter_id_mismatch: Stripe meter doesn't match our usage type
     - over_cap_blocked_but_billed: User over tier limit yet charged

  F. EVALUATE EXECUTION GATES
     - billing_state_blocked: subscription status not 'active'/'trialing'
     - over_cap_blocked: usage exceeds tier entitlements
     - kill_switch_blocked: SCRAPING_ENABLED = false
     - marketplace_disabled: kill switch for specific marketplace
```

### Severity Classification

| Severity | Condition | Action Required |
|----------|-----------|-----------------|
| **OK** | Delta < $1.00 and within rounding | None - routine variance |
| **WARN** | Delta < $10.00 or explainable lag | Review in weekly reconciliation |
| **CRITICAL** | Delta >= $10.00 or structural mismatch | Immediate investigation |
| **CRITICAL** | Stripe API failure | Cannot assess - assume worst case |

---

## Stripe Price Mapping

### Purpose
Single source of truth mapping Stripe price IDs to usage components, tiers, and unit labels.

### Implementation: `api/src/billing/stripePriceMap.ts`

```typescript
export const STRIPE_PRICE_MAP = {
  // Base subscription prices (monthly)
  tiers: {
    free: null, // No Stripe price for free tier
    pro: 'price_ProMonthly_XXXXX',
    enterprise: 'price_EnterpriseMonthly_XXXXX'
  },

  // Metered usage components
  meters: {
    // Full scraper runs (usage-based)
    full_runs: {
      priceId: 'price_FullRuns_XXXXX',
      label: 'Full Scraper Runs',
      unit: 'run'
    },

    // Signal checks (lightweight checks)
    signal_checks: {
      priceId: 'price_SignalChecks_XXXXX',
      label: 'Signal Checks',
      unit: 'check'
    },

    // Proxy bandwidth
    proxy_gb: {
      priceId: 'price_ProxyBandwidth_XXXXX',
      label: 'Proxy Bandwidth',
      unit: 'GB'
    }
  }
};

export function getMeterForPriceId(priceId: string): string | null {
  for (const [meter, config] of Object.entries(STRIPE_PRICE_MAP.meters)) {
    if (config.priceId === priceId) return meter;
  }
  return null;
}

export function getPriceForMeter(meter: string): string | null {
  return STRIPE_PRICE_MAP.meters[meter]?.priceId || null;
}
```

**Critical:** This file must be kept in sync with Stripe dashboard price configuration. Any price ID change requires update here.

---

## SQL Views

### `v_usage_totals_range` - Usage aggregation by date range

```sql
CREATE OR REPLACE VIEW v_usage_totals_range AS
SELECT
  user_id,
  SUM(full_runs) AS total_full_runs,
  SUM(partial_runs) AS total_partial_runs,
  SUM(signal_checks) AS total_signal_checks,
  SUM(proxy_gb) AS total_proxy_gb,
  SUM(cost_usd) AS total_cost_usd,
  MIN(date) AS period_start,
  MAX(date) AS period_end,
  COUNT(DISTINCT date) AS days_tracked
FROM "usageTelemetry"
GROUP BY user_id;
```

**Usage in application:**
```sql
SELECT *
FROM "usageTelemetry"
WHERE user_id = $1
  AND date >= $2
  AND date <= $3
```

### `v_recon_summary` - Pre-computed reconciliation summary

```sql
CREATE OR REPLACE VIEW v_recon_summary AS
SELECT
  u.id AS user_id,
  u.email,
  u.tier,
  u.stripe_customer_id,
  s.subscription_id,
  s.status AS subscription_status,
  s.current_period_start,
  s.current_period_end,
  ut.total_full_runs,
  ut.total_signal_checks,
  ut.total_proxy_gb,
  ut.total_cost_usd AS measured_cost
FROM users u
LEFT JOIN subscriptions s ON u.stripe_customer_id = s.stripe_customer_id
LEFT JOIN (
  SELECT
    user_id,
    SUM(full_runs) AS total_full_runs,
    SUM(signal_checks) AS total_signal_checks,
    SUM(proxy_gb) AS total_proxy_gb,
    SUM(cost_usd) AS total_cost_usd
  FROM "usageTelemetry"
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY user_id
) ut ON u.id = ut.user_id
WHERE u.stripe_customer_id IS NOT NULL;
```

---

## API Specification

### Authentication & Authorization
All endpoints require:
1. **authMiddleware** - Validates Firebase ID token
2. **adminMiddleware** - Checks user is in ADMIN_USER_IDS or has Firebase admin claim

### Endpoints

#### `GET /billing/reconciliation`
**Purpose:** Fetch reconciliation data for all customers in date range

**Query Parameters:**
- `from` (required): ISO date string (e.g., "2026-01-01")
- `to` (required): ISO date string (e.g., "2026-01-07")
- `tier` (optional): Filter by tier ("free", "pro", "enterprise")
- `severity` (optional): Filter by severity ("OK", "WARN", "CRITICAL")

**Response:**
```typescript
{
  summary: {
    totalCustomers: number,
    totalInvoices: number,
    totalBilledAmount: number,
    totalMeasuredCost: number,
    totalDelta: number,
    severityCounts: {
      OK: number,
      WARN: number,
      CRITICAL: number
    }
  },
  customers: Array<{
    userId: string,
    email: string,
    tier: string,
    stripeCustomerId: string,
    invoiceCount: number,
    billedTotal: number,
    measuredTotal: number,
    deltaTotal: number,
    deltaPct: number,
    severity: "OK" | "WARN" | "CRITICAL",
    reasons: string[],
    executionGates: {
      billingStateBlocked: boolean,
      overCapBlocked: boolean,
      killSwitchBlocked: boolean
    }
  }>
}
```

#### `GET /billing/invoices/:customerId`
**Purpose:** Detailed invoice drilldown for specific customer

**Path Parameters:**
- `customerId`: Stripe customer ID

**Query Parameters:**
- `from`, `to`: Date range

**Response:**
```typescript
{
  customer: {
    id: string,
    email: string,
    tier: string
  },
  invoices: Array<{
    id: string,
    status: string,
    created: number,
    total: number,
    currency: string,
    lines: Array<{
      priceId: string,
      description: string,
      quantity: number,
      amount: number,
      meter: string | null
    }>
  }>,
  usage: {
    fullRuns: number,
    signalChecks: number,
    proxyGb: number,
    costUsd: number
  },
  reconciliation: {
    components: Array<{
      meter: string,
      billedUnits: number,
      measuredUnits: number,
      deltaUnits: number,
      billedAmount: number,
      expectedAmount: number,
      deltaAmount: number
    }>
  }
}
```

---

## UI Specification

### Page: `/admin/billing-reconciliation`

#### Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│  Revenue Reconciliation Dashboard                            │
├──────────────────────────────────────────────────────────────┤
│  Filters:  [Date Range: Last 7 days ▼]  [Tier: All ▼]       │
│            [Severity: All ▼]              [Refresh]          │
├──────────────────────────────────────────────────────────────┤
│  Summary Cards:                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Total   │ │ Billed  │ │ Delta   │ │Critical │           │
│  │ Customers│ │ $12,450 │ │ -$23.12 │ │    2    │           │
│  │   156   │ │         │ │  (-0.2%)│ │         │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├──────────────────────────────────────────────────────────────┤
│  Customer Reconciliation Table                               │
│  ┌──────────────────────────────────────────────────────────┐│
│  │Email         │Tier│Invoices│Billed│Measured│Delta│Sev │││
│  ├──────────────────────────────────────────────────────────┤│
│  │user@ex.com   │Pro │   3    │$150  │ $148   │-$2  │WARN│││
│  │admin@ex.com  │Ent │   1    │$500  │ $515   │+$15 │CRIT│││
│  │...           │... │  ...   │...   │  ...   │...  │... │││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

#### Drilldown Panel (Click to expand row)

```
┌──────────────────────────────────────────────────────────────┐
│  Customer: admin@example.com (cus_XXXXX)                     │
├──────────────────────────────────────────────────────────────┤
│  Invoices (3)                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ in_XXXXX │ paid │ 2026-01-01 │ $150.00 │ 3 line items │ │
│  │ in_YYYYY │ paid │ 2026-01-05 │ $200.00 │ 2 line items │ │
│  │ in_ZZZZZ │ open │ 2026-01-08 │ $150.00 │ 3 line items │ │
│  └────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  Usage Totals                                                │
│  • Full Runs: 1,250 runs                                     │
│  • Signal Checks: 8,450 checks                               │
│  • Proxy Bandwidth: 12.5 GB                                  │
│  • Measured Cost: $515.00                                    │
├──────────────────────────────────────────────────────────────┤
│  Reconciliation by Component                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │Component   │Billed│Measured│Delta │Delta $ │           │ │
│  │Full Runs   │1,200 │ 1,250  │ +50  │ +$15.00│ ⚠️       │ │
│  │Signal Checks│8,500 │ 8,450  │ -50  │  -$2.00│ ✅       │ │
│  │Proxy GB    │ 12.0 │  12.5  │ +0.5 │  +$2.00│ ✅       │ │
│  └────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  Reason Codes                                                │
│  🔴 over_cap_blocked_but_billed - User exceeded tier limits  │
│      yet was still charged (CRITICAL - should never happen)  │
│  🟡 stripe_event_lag - Invoice created <24hrs ago            │
├──────────────────────────────────────────────────────────────┤
│  Execution Gates (What Would Be Blocked)                     │
│  ✅ Billing State: Active (would allow execution)            │
│  🔴 Over Cap: Yes (would BLOCK - tier limit exceeded)        │
│  ✅ Kill Switch: Scraping enabled                            │
└──────────────────────────────────────────────────────────────┘
```

#### UI Component Hierarchy

```typescript
<BillingReconciliationPage>
  <PageHeader title="Revenue Reconciliation Dashboard" />

  <FilterBar>
    <DateRangePicker from={from} to={to} onChange={...} />
    <TierSelect value={tier} onChange={...} />
    <SeveritySelect value={severity} onChange={...} />
    <RefreshButton onClick={refetch} />
  </FilterBar>

  <SummaryCards data={reconciliationData.summary} />

  <ReconciliationTable>
    {customers.map(customer => (
      <CustomerRow
        key={customer.userId}
        customer={customer}
        expandable
      >
        {expanded && (
          <CustomerDrilldown
            invoices={customer.invoices}
            usage={customer.usage}
            reconciliation={customer.reconciliation}
            executionGates={customer.executionGates}
          />
        )}
      </CustomerRow>
    ))}
  </ReconciliationTable>
</BillingReconciliationPage>
```

---

## Execution Safety Gates

### Gate Evaluation Logic

The dashboard shows what **would** be blocked if execution were attempted:

```typescript
interface ExecutionGates {
  billingStateBlocked: boolean;    // subscription not active/trialing
  overCapBlocked: boolean;          // usage exceeds tier entitlements
  killSwitchBlocked: boolean;       // SCRAPING_ENABLED = false
  marketplaceDisabled: boolean;     // marketplace-specific kill switch
}

function evaluateExecutionGates(user: User, usage: UsageTotals): ExecutionGates {
  const entitlements = getTierEntitlements(user.tier);

  return {
    billingStateBlocked: !['active', 'trialing'].includes(user.stripe_subscription_status),
    overCapBlocked: (
      usage.totalFullRuns > entitlements.maxDailyRuns ||
      usage.totalProxyGb > entitlements.maxProxyGbPerDay
    ),
    killSwitchBlocked: process.env.SCRAPING_ENABLED === 'false',
    marketplaceDisabled: false // TODO: Implement marketplace-specific switches
  };
}
```

### Critical Safety Rules

1. **Fail Closed:** If any gate evaluation fails (e.g., cannot reach DB), assume BLOCKED
2. **No Execution on Unknown:** If user tier is unknown or invalid, BLOCK
3. **Stripe Authoritative:** If Stripe says subscription is canceled, BLOCK regardless of local cache
4. **Over-Cap is Hard Block:** No grace period, no warnings - immediate block

---

## Reason Code Reference

| Code | Severity | Description | Resolution |
|------|----------|-------------|------------|
| `usage_missing` | WARN | No telemetry data for period | Check if usage tracking is working |
| `invoice_missing` | WARN | Expected invoice not found | May be Stripe delay or subscription change |
| `price_mapping_missing` | WARN | Cannot resolve Stripe price ID | Update `stripePriceMap.ts` |
| `stripe_event_lag` | INFO | Invoice <24hrs old | Wait for webhook, re-check later |
| `rounding_expected` | OK | Delta <1% and <$1 | Normal rounding variance |
| `meter_id_mismatch` | CRITICAL | Stripe meter doesn't match usage type | Fix Stripe meter configuration |
| `over_cap_blocked_but_billed` | CRITICAL | User over limit yet charged | Should never happen - investigate immediately |
| `stripe_api_failure` | CRITICAL | Cannot fetch Stripe data | Cannot assess - assume worst case |

---

## Implementation Checklist

### Phase 1: Foundation ✅
- [x] Create SQL views (`v_usage_totals_range`, `v_recon_summary`)
- [x] Define TypeScript types (`ReconciliationData`, `InvoiceDetail`, etc.)
- [x] Create Stripe price mapping (`stripePriceMap.ts`)

### Phase 2: Backend API ✅
- [x] Implement `ReconciliationService`
  - [x] `getReconciliationData(from, to, filters)`
  - [x] `getCustomerInvoices(customerId, from, to)`
  - [x] `computeDeltas(billedData, usageData)`
  - [x] `evaluateExecutionGates(user, usage)`
- [x] Create API routes (`/billing/reconciliation`, `/billing/invoices/:customerId`)
- [x] Wire up routes with auth + admin middleware

### Phase 3: Frontend UI ✅
- [x] Create `BillingReconciliation.tsx` page component
- [x] Implement filter controls (date range, tier, severity)
- [x] Build summary cards component
- [x] Build reconciliation table with expandable rows
- [x] Build customer drilldown panel
- [x] Add API client methods to `api.ts`
- [x] Wire up route in `App.tsx`

### Phase 4: Validation ✅
- [x] Typecheck passes (`pnpm typecheck`)
- [x] Lint passes (if configured)
- [x] Test API endpoint with curl + admin token
- [x] Verify UI renders with real data
- [x] Test execution gate evaluation
- [x] Test severity classification

---

## Security & Safety

### API Security
- ✅ All endpoints protected by `authMiddleware` + `adminMiddleware`
- ✅ Never log Stripe secret keys or tokens
- ✅ Never expose Stripe data in client-side code
- ✅ All Stripe API calls from server only

### Fail-Safe Behavior
- ✅ If Stripe API fails → severity = CRITICAL, show "Assessment unavailable"
- ✅ If price map missing → severity = WARN, reason = `price_mapping_missing`
- ✅ If usage data missing → severity = WARN, reason = `usage_missing`
- ✅ Unknown states → BLOCK execution

### Data Privacy
- ✅ Dashboard only accessible to admins (Firebase admin claim or ADMIN_USER_IDS)
- ✅ No PII logged in reconciliation jobs
- ✅ Customer email displayed only in admin UI

---

## Future Enhancements

### Automated Daily Reconciliation Job
```typescript
// api/src/jobs/dailyReconciliation.ts
export async function runDailyReconciliation() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const data = await reconciliationService.getReconciliationData(
    yesterday.toISOString(),
    yesterday.toISOString()
  );

  const critical = data.customers.filter(c => c.severity === 'CRITICAL');

  if (critical.length > 0) {
    await alertService.sendSlackAlert({
      channel: '#billing-alerts',
      message: `🔴 ${critical.length} critical billing discrepancies found`,
      customers: critical.map(c => c.email)
    });
  }
}
```

### Slack/Email Alerts
- Daily summary of reconciliation status
- Immediate alert on CRITICAL severity
- Weekly digest of WARN severity issues

### Historical Trend Analysis
- Track delta trends over time
- Identify systematic billing drift
- Predict future discrepancies

### Self-Healing Actions
- Auto-create Stripe credit notes for confirmed over-charges
- Auto-adjust usage records for under-reporting
- Requires manual approval workflow

---

## Run Commands

### SQL View Setup
```bash
# Execute views (if PostgreSQL direct access available)
psql $DATABASE_URL -f docs/sql/revenue_recon_views.sql
```

### Backend Validation
```bash
# Install dependencies
cd api && pnpm install

# Typecheck
pnpm typecheck

# Lint (if configured)
pnpm lint

# Build
pnpm build
```

### Frontend Validation
```bash
# Install dependencies
cd apps/web && pnpm install

# Typecheck
pnpm typecheck

# Build
pnpm build
```

### API Testing
```bash
# Set admin token
export ADMIN_TOKEN="your-secure-admin-token"

# Get reconciliation data (last 7 days)
curl -X GET "http://localhost:3000/billing/reconciliation?from=2026-01-03&to=2026-01-10" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Get customer invoice details
curl -X GET "http://localhost:3000/billing/invoices/cus_XXXXX?from=2026-01-01&to=2026-01-31" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Appendices

### Appendix A: Tier Entitlements Reference
```typescript
// From packages/billing/src/pricingGuardrails.ts
const TIER_ENTITLEMENTS = {
  free: {
    maxDailyRuns: 10,
    maxMonitors: 5,
    maxProxyGbPerDay: 1.0
  },
  pro: {
    maxDailyRuns: 100,
    maxMonitors: 50,
    maxProxyGbPerDay: 10.0
  },
  enterprise: {
    maxDailyRuns: -1, // unlimited
    maxMonitors: -1,
    maxProxyGbPerDay: -1
  }
};
```

### Appendix B: Stripe Webhook Events
The following webhooks update local subscription state:
- `checkout.session.completed` → Create subscription record
- `customer.subscription.created` → Store subscription details
- `customer.subscription.updated` → Update status, period dates
- `customer.subscription.deleted` → Mark as canceled

**Reconciliation Impact:** If webhook delivery is delayed, local subscription status may be stale, causing execution gates to show incorrect state. Dashboard should detect webhook lag and flag as `stripe_event_lag`.

---

**END OF SPECIFICATION**
