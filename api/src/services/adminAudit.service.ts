import { db, schema } from '../lib/db';

export type AdminAuditPayload = {
  actorUserId: string;
  action: string;
  target: string;
  beforeState?: any;
  afterState?: any;
  env: string;
};

export const recordAdminAudit = async (payload: AdminAuditPayload) => {
  await db.insert(schema.adminAuditLogs).values({
    actorUserId: payload.actorUserId,
    action: payload.action,
    target: payload.target,
    beforeState: payload.beforeState || null,
    afterState: payload.afterState || null,
    env: payload.env,
  });
};
