CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id varchar(128) NOT NULL REFERENCES users(id),
  action varchar(128) NOT NULL,
  target varchar(128) NOT NULL,
  before_state jsonb,
  after_state jsonb,
  env varchar(64) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_actor_idx ON admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_logs(created_at);
