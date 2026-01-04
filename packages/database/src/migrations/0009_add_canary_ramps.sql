CREATE TABLE IF NOT EXISTS canary_ramps (
  id varchar(64) PRIMARY KEY,
  ramp_percent integer NOT NULL DEFAULT 0,
  previous_percent integer NOT NULL DEFAULT 0,
  updated_at timestamp NOT NULL DEFAULT now()
);

INSERT INTO canary_ramps (id, ramp_percent, previous_percent)
VALUES ('default', 0, 0)
ON CONFLICT (id) DO NOTHING;
