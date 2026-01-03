CREATE TABLE IF NOT EXISTS subscriptions (
  user_id varchar(128) NOT NULL REFERENCES users(id),
  stripe_customer_id varchar(128) NOT NULL,
  stripe_subscription_id varchar(128) PRIMARY KEY,
  stripe_price_id varchar(128) NOT NULL,
  status varchar(32) NOT NULL,
  current_period_end timestamp
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx ON subscriptions (stripe_customer_id);
