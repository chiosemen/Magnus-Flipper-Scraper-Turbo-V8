CREATE TABLE IF NOT EXISTS observability_gates (
  id varchar(64) PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  window_minutes integer NOT NULL DEFAULT 15,
  max_error_rate_percent integer NOT NULL DEFAULT 20,
  max_median_ms integer NOT NULL DEFAULT 15000,
  max_p95_ms integer NOT NULL DEFAULT 30000,
  max_queue_depth integer NOT NULL DEFAULT 200,
  max_worker_crashes integer NOT NULL DEFAULT 5,
  max_jobs_per_minute integer NOT NULL DEFAULT 120,
  updated_at timestamp NOT NULL DEFAULT now()
);

INSERT INTO observability_gates (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
