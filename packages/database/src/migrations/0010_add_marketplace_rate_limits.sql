CREATE TABLE IF NOT EXISTS marketplace_rate_limits (
  id varchar(64) PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  max_concurrency integer NOT NULL DEFAULT 5,
  jobs_per_minute integer NOT NULL DEFAULT 30,
  error_threshold integer NOT NULL DEFAULT 20,
  cooldown_seconds integer NOT NULL DEFAULT 300,
  cooldown_until timestamp,
  updated_at timestamp NOT NULL DEFAULT now()
);

INSERT INTO marketplace_rate_limits (id)
VALUES ('default'), ('facebook'), ('vinted'), ('amazon'), ('ebay'), ('craigslist')
ON CONFLICT (id) DO NOTHING;
