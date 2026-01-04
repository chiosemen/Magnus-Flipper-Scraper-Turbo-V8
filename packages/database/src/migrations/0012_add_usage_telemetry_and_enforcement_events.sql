CREATE TABLE IF NOT EXISTS usage_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(128) NOT NULL,
  marketplace varchar(32) NOT NULL,
  day_key varchar(10) NOT NULL,
  full_runs integer NOT NULL DEFAULT 0,
  partial_runs integer NOT NULL DEFAULT 0,
  signal_checks integer NOT NULL DEFAULT 0,
  proxy_gb_estimated real NOT NULL DEFAULT 0,
  cost_usd_estimated real NOT NULL DEFAULT 0,
  last_reset_at timestamp NOT NULL DEFAULT now(),
  cooldown_until timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT usage_telemetry_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS usage_telemetry_user_id_idx ON usage_telemetry(user_id);
CREATE INDEX IF NOT EXISTS usage_telemetry_marketplace_idx ON usage_telemetry(marketplace);
CREATE INDEX IF NOT EXISTS usage_telemetry_day_key_idx ON usage_telemetry(day_key);
CREATE UNIQUE INDEX IF NOT EXISTS usage_telemetry_user_market_day_idx ON usage_telemetry(user_id, marketplace, day_key);

CREATE TABLE IF NOT EXISTS enforcement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(128) NOT NULL,
  marketplace varchar(32) NOT NULL,
  tier varchar(32) NOT NULL,
  decision varchar(16) NOT NULL,
  mode varchar(16) NOT NULL,
  reason_code varchar(64) NOT NULL,
  job_id uuid,
  audit jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT enforcement_events_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS enforcement_events_user_id_idx ON enforcement_events(user_id);
CREATE INDEX IF NOT EXISTS enforcement_events_marketplace_idx ON enforcement_events(marketplace);
CREATE INDEX IF NOT EXISTS enforcement_events_created_at_idx ON enforcement_events(created_at);
