import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: varchar('actor_user_id', { length: 128 }).references(() => users.id).notNull(),
  action: varchar('action', { length: 128 }).notNull(),
  target: varchar('target', { length: 128 }).notNull(),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  env: varchar('env', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  actorIdx: index('admin_audit_actor_idx').on(table.actorUserId),
  createdIdx: index('admin_audit_created_idx').on(table.createdAt),
}));
