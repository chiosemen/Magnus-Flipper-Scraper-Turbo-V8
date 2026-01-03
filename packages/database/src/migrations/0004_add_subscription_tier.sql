ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS tier varchar(32);
