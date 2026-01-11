-- Revenue Reconciliation SQL Views
-- Purpose: Provide efficient, materialized views for billing reconciliation
-- Source of Truth: usageTelemetry table
-- Created: 2026-01-10

-- ============================================================================
-- VIEW: v_usage_totals_range
-- Description: Aggregate usage metrics by user across all time
-- Use Case: Quick lookup of total usage for reconciliation
-- ============================================================================

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

COMMENT ON VIEW v_usage_totals_range IS
'Aggregates usage metrics per user across all tracked days. Use with date filters in WHERE clause for specific ranges.';


-- ============================================================================
-- VIEW: v_recon_summary
-- Description: Pre-computed reconciliation summary with user and subscription data
-- Use Case: Dashboard overview, filtered by date range in application layer
-- ============================================================================

CREATE OR REPLACE VIEW v_recon_summary AS
SELECT
  u.id AS user_id,
  u.email,
  u.tier,
  u.stripe_customer_id,
  u.stripe_subscription_status,
  s.subscription_id,
  s.status AS current_subscription_status,
  s.current_period_start,
  s.current_period_end,
  COALESCE(ut.total_full_runs, 0) AS total_full_runs,
  COALESCE(ut.total_partial_runs, 0) AS total_partial_runs,
  COALESCE(ut.total_signal_checks, 0) AS total_signal_checks,
  COALESCE(ut.total_proxy_gb, 0) AS total_proxy_gb,
  COALESCE(ut.total_cost_usd, 0) AS measured_cost_usd,
  ut.days_tracked,
  CASE
    WHEN u.stripe_customer_id IS NULL THEN 'no_stripe_customer'
    WHEN s.subscription_id IS NULL THEN 'no_subscription'
    WHEN s.status NOT IN ('active', 'trialing') THEN 'inactive_subscription'
    WHEN ut.user_id IS NULL THEN 'no_usage_data'
    ELSE 'ok'
  END AS data_status
FROM users u
LEFT JOIN LATERAL (
  SELECT subscription_id, stripe_customer_id, status, current_period_start, current_period_end
  FROM subscriptions
  WHERE subscriptions.stripe_customer_id = u.stripe_customer_id
  ORDER BY created_at DESC
  LIMIT 1
) s ON true
LEFT JOIN (
  SELECT
    user_id,
    SUM(full_runs) AS total_full_runs,
    SUM(partial_runs) AS total_partial_runs,
    SUM(signal_checks) AS total_signal_checks,
    SUM(proxy_gb) AS total_proxy_gb,
    SUM(cost_usd) AS total_cost_usd,
    COUNT(DISTINCT date) AS days_tracked
  FROM "usageTelemetry"
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY user_id
) ut ON u.id = ut.user_id
WHERE u.stripe_customer_id IS NOT NULL;

COMMENT ON VIEW v_recon_summary IS
'Joins users, subscriptions, and last 30 days of usage for reconciliation dashboard. Filter by date in application layer.';


-- ============================================================================
-- VIEW: v_active_billing_customers
-- Description: Customers with active or recently active billing state
-- Use Case: Filter list for reconciliation (exclude free users with no billing)
-- ============================================================================

CREATE OR REPLACE VIEW v_active_billing_customers AS
SELECT
  u.id AS user_id,
  u.email,
  u.tier,
  u.stripe_customer_id,
  u.stripe_subscription_status,
  s.subscription_id,
  s.status AS subscription_status,
  s.current_period_start,
  s.current_period_end,
  u.created_at AS user_created_at,
  s.created_at AS subscription_created_at
FROM users u
INNER JOIN LATERAL (
  SELECT subscription_id, stripe_customer_id, status, current_period_start, current_period_end, created_at
  FROM subscriptions
  WHERE subscriptions.stripe_customer_id = u.stripe_customer_id
  ORDER BY created_at DESC
  LIMIT 1
) s ON true
WHERE
  u.stripe_customer_id IS NOT NULL
  AND (
    s.status IN ('active', 'trialing', 'past_due', 'unpaid')
    OR s.current_period_end >= CURRENT_DATE - INTERVAL '90 days'
  );

COMMENT ON VIEW v_active_billing_customers IS
'Returns customers with active subscriptions or subscriptions that ended in last 90 days.';


-- ============================================================================
-- VIEW: v_usage_by_day_range
-- Description: Daily usage breakdown for detailed reconciliation analysis
-- Use Case: Drilldown view to see daily usage patterns
-- ============================================================================

CREATE OR REPLACE VIEW v_usage_by_day_range AS
SELECT
  ut.user_id,
  u.email,
  u.tier,
  u.stripe_customer_id,
  ut.date,
  ut.full_runs,
  ut.partial_runs,
  ut.signal_checks,
  ut.proxy_gb,
  ut.cost_usd,
  -- Running totals
  SUM(ut.full_runs) OVER (PARTITION BY ut.user_id ORDER BY ut.date) AS cumulative_full_runs,
  SUM(ut.signal_checks) OVER (PARTITION BY ut.user_id ORDER BY ut.date) AS cumulative_signal_checks,
  SUM(ut.proxy_gb) OVER (PARTITION BY ut.user_id ORDER BY ut.date) AS cumulative_proxy_gb,
  SUM(ut.cost_usd) OVER (PARTITION BY ut.user_id ORDER BY ut.date) AS cumulative_cost_usd
FROM "usageTelemetry" ut
INNER JOIN users u ON ut.user_id = u.id
WHERE u.stripe_customer_id IS NOT NULL
ORDER BY ut.user_id, ut.date;

COMMENT ON VIEW v_usage_by_day_range IS
'Daily usage with running totals for trend analysis. Filter by user_id and date range in WHERE clause.';


-- ============================================================================
-- VIEW: v_subscription_periods
-- Description: All subscription periods for historical reconciliation
-- Use Case: Match usage to specific subscription billing periods
-- ============================================================================

CREATE OR REPLACE VIEW v_subscription_periods AS
SELECT
  s.subscription_id,
  s.user_id,
  s.stripe_customer_id,
  u.email,
  u.tier,
  s.status,
  s.current_period_start,
  s.current_period_end,
  EXTRACT(DAY FROM (s.current_period_end - s.current_period_start)) AS period_days,
  s.created_at AS subscription_created_at,
  s.updated_at AS subscription_updated_at,
  -- Count usage days within this period
  (
    SELECT COUNT(DISTINCT date)
    FROM "usageTelemetry" ut
    WHERE ut.user_id = s.user_id
      AND ut.date >= s.current_period_start::date
      AND ut.date <= s.current_period_end::date
  ) AS usage_days_in_period,
  -- Total usage within this period
  (
    SELECT SUM(full_runs)
    FROM "usageTelemetry" ut
    WHERE ut.user_id = s.user_id
      AND ut.date >= s.current_period_start::date
      AND ut.date <= s.current_period_end::date
  ) AS period_full_runs,
  (
    SELECT SUM(signal_checks)
    FROM "usageTelemetry" ut
    WHERE ut.user_id = s.user_id
      AND ut.date >= s.current_period_start::date
      AND ut.date <= s.current_period_end::date
  ) AS period_signal_checks,
  (
    SELECT SUM(proxy_gb)
    FROM "usageTelemetry" ut
    WHERE ut.user_id = s.user_id
      AND ut.date >= s.current_period_start::date
      AND ut.date <= s.current_period_end::date
  ) AS period_proxy_gb,
  (
    SELECT SUM(cost_usd)
    FROM "usageTelemetry" ut
    WHERE ut.user_id = s.user_id
      AND ut.date >= s.current_period_start::date
      AND ut.date <= s.current_period_end::date
  ) AS period_cost_usd
FROM subscriptions s
INNER JOIN users u ON s.user_id = u.id
WHERE s.current_period_start IS NOT NULL
  AND s.current_period_end IS NOT NULL;

COMMENT ON VIEW v_subscription_periods IS
'Maps subscription billing periods to usage totals for precise reconciliation.';


-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Example 1: Get usage totals for a specific user in a date range
SELECT
  user_id,
  SUM(full_runs) AS total_full_runs,
  SUM(signal_checks) AS total_signal_checks,
  SUM(proxy_gb) AS total_proxy_gb,
  SUM(cost_usd) AS total_cost_usd
FROM "usageTelemetry"
WHERE user_id = 'user_abc123'
  AND date >= '2026-01-01'
  AND date <= '2026-01-31'
GROUP BY user_id;


-- Example 2: Get reconciliation summary for all customers in last 7 days
SELECT
  user_id,
  email,
  tier,
  stripe_customer_id,
  total_full_runs,
  total_signal_checks,
  total_proxy_gb,
  measured_cost_usd,
  data_status
FROM v_recon_summary
WHERE EXISTS (
  SELECT 1
  FROM "usageTelemetry" ut
  WHERE ut.user_id = v_recon_summary.user_id
    AND ut.date >= CURRENT_DATE - INTERVAL '7 days'
);


-- Example 3: Get daily usage breakdown for a customer
SELECT
  date,
  full_runs,
  signal_checks,
  proxy_gb,
  cost_usd,
  cumulative_cost_usd
FROM v_usage_by_day_range
WHERE user_id = 'user_abc123'
  AND date >= '2026-01-01'
  AND date <= '2026-01-31'
ORDER BY date;


-- Example 4: Get subscription period usage
SELECT
  subscription_id,
  email,
  tier,
  current_period_start,
  current_period_end,
  period_days,
  usage_days_in_period,
  period_full_runs,
  period_signal_checks,
  period_proxy_gb,
  period_cost_usd
FROM v_subscription_periods
WHERE stripe_customer_id = 'cus_XXXXX'
ORDER BY current_period_start DESC;


-- Example 5: Find customers with usage but no billing data
SELECT
  user_id,
  email,
  tier,
  total_full_runs,
  total_signal_checks,
  data_status
FROM v_recon_summary
WHERE data_status IN ('no_stripe_customer', 'no_subscription')
  AND total_full_runs > 0;
*/


-- ============================================================================
-- INDEXES (Recommended for Performance)
-- ============================================================================

-- Note: These indexes likely already exist, but including for completeness

-- CREATE INDEX IF NOT EXISTS idx_usage_telemetry_user_date
--   ON "usageTelemetry" (user_id, date);

-- CREATE INDEX IF NOT EXISTS idx_usage_telemetry_date
--   ON "usageTelemetry" (date);

-- CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id
--   ON subscriptions (stripe_customer_id);

-- CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
--   ON subscriptions (user_id);

-- CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
--   ON users (stripe_customer_id);


-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- To refresh views if underlying schema changes:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY v_usage_totals_range; -- if materialized
-- Note: These are regular views (not materialized), so they auto-update

-- To drop all views:
-- DROP VIEW IF EXISTS v_subscription_periods CASCADE;
-- DROP VIEW IF EXISTS v_usage_by_day_range CASCADE;
-- DROP VIEW IF EXISTS v_active_billing_customers CASCADE;
-- DROP VIEW IF EXISTS v_recon_summary CASCADE;
-- DROP VIEW IF EXISTS v_usage_totals_range CASCADE;
