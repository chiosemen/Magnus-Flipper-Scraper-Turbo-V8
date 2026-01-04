CREATE TABLE IF NOT EXISTS scraper_kill_switches (
  id varchar(64) PRIMARY KEY,
  scrapers_enabled boolean NOT NULL DEFAULT true,
  facebook_enabled boolean NOT NULL DEFAULT true,
  vinted_enabled boolean NOT NULL DEFAULT true,
  realtime_enabled boolean NOT NULL DEFAULT true,
  scheduled_enabled boolean NOT NULL DEFAULT true,
  manual_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp NOT NULL DEFAULT now()
);

INSERT INTO scraper_kill_switches (
  id,
  scrapers_enabled,
  facebook_enabled,
  vinted_enabled,
  realtime_enabled,
  scheduled_enabled,
  manual_enabled
) VALUES (
  'default',
  true,
  true,
  true,
  true,
  true,
  true
) ON CONFLICT (id) DO NOTHING;
