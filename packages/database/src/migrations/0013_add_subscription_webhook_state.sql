ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS current_period_start timestamp,
  ADD COLUMN IF NOT EXISTS entitlements_json jsonb,
  ADD COLUMN IF NOT EXISTS last_event_id varchar(128),
  ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();
