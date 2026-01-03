ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_subscription_status varchar(32);
