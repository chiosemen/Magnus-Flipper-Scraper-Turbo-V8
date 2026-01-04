ALTER TABLE scraper_kill_switches
  ADD COLUMN IF NOT EXISTS demo_mode_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_mode_expires_at timestamp;
