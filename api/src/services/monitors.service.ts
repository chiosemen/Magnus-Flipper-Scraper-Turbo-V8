import { db, schema } from '../lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { Monitor, CreateMonitor, UpdateMonitor } from '@repo/types';
import { AppError, NotFoundError } from '../utils/errors';
import { jobsService } from './jobs.service';
import { policyService } from './policy';
import { getTierLimits, TIER_ERROR_CODES } from './tierLimits';
import { assertTierLimitsExist, assertValidCount, assertUserExists } from '../utils/failClosed';

export const monitorsService = {
  async listMonitors(userId: string) {
    const monitors = await db.query.monitors.findMany({
      where: eq(schema.monitors.userId, userId),
      orderBy: [desc(schema.monitors.createdAt)],
    });
    return { items: monitors as unknown as Monitor[], pagination: { page: 1, limit: 100, total: monitors.length, totalPages: 1, hasNext: false, hasPrev: false } };
  },

  async getMonitor(monitorId: string, userId: string) {
    const monitor = await db.query.monitors.findFirst({
      where: and(eq(schema.monitors.id, monitorId), eq(schema.monitors.userId, userId))
    });
    if (!monitor) throw new NotFoundError('Monitor not found');
    return monitor as unknown as Monitor;
  },

  async createMonitor(userId: string, data: CreateMonitor) {
    // Check Quota - FAIL CLOSED
    const tier = await policyService.getUserTier(userId);
    const limits = getTierLimits(tier);

    // Fail-closed: Assert tier limits exist before proceeding
    assertTierLimitsExist(limits, tier, userId);

    const monitorCount = await db.execute(sql`
      SELECT count(*) as count FROM ${schema.monitors}
      WHERE user_id = ${userId}
    `);
    const totalMonitors = Number(monitorCount[0]?.count || 0);

    // Fail-closed: Validate count is sane
    assertValidCount(totalMonitors, 'totalMonitors', { userId, tier });

    if (totalMonitors >= limits.maxMonitors) {
      throw new AppError(
        'Monitor limit reached for tier',
        429,
        TIER_ERROR_CODES.MONITOR_LIMIT,
        { tier, limit: limits.maxMonitors }
      );
    }

    const [monitor] = await db.insert(schema.monitors)
      .values({ 
        ...data, 
        userId,
        nextRunAt: new Date(), // Schedule immediately
      })
      .returning();
    
    // Update usage
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    await db.update(schema.users)
      .set({ monitorsUsed: (user?.monitorsUsed || 0) + 1 })
      .where(eq(schema.users.id, userId));

    // Trigger initial run
    await jobsService.createJob(userId, {
      type: 'monitor_search',
      source: data.sources[0], // simplified for now
      monitorId: monitor.id,
      searchQuery: data.criteria.keywords[0],
    });

    return monitor as unknown as Monitor;
  },

  async updateMonitor(monitorId: string, userId: string, data: UpdateMonitor) {
    await this.getMonitor(monitorId, userId); // check exists

    // Normalize date fields for Drizzle ORM
    const normalizeDate = (value: Date | string | number | undefined | null): Date | null | undefined => {
      if (value === null) return null;
      if (value === undefined) return undefined;
      if (value instanceof Date) return value;
      return new Date(value);
    };

    const normalizedData = {
      ...data,
      lastRunAt: data.lastRunAt ? normalizeDate(data.lastRunAt) : undefined,
      lastDealFoundAt: data.lastDealFoundAt ? normalizeDate(data.lastDealFoundAt) : undefined,
      nextRunAt: data.nextRunAt ? normalizeDate(data.nextRunAt) : undefined,
      updatedAt: new Date(),
    };

    const [updated] = await db.update(schema.monitors)
      .set(normalizedData as any)
      .where(eq(schema.monitors.id, monitorId))
      .returning();
    return updated as unknown as Monitor;
  },

  async deleteMonitor(monitorId: string, userId: string) {
    await this.getMonitor(monitorId, userId);

    // Transactional delete would be better
    await db.delete(schema.monitors).where(eq(schema.monitors.id, monitorId));

    // Update usage count - FAIL CLOSED
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });

    // Fail-closed: User must exist to update usage count
    assertUserExists(user, userId, 'deleteMonitor');

    const currentUsage = user.monitorsUsed || 0;
    assertValidCount(currentUsage, 'monitorsUsed', { userId, operation: 'deleteMonitor' });

    await db.update(schema.users)
      .set({ monitorsUsed: Math.max(0, currentUsage - 1), updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
  },

  async pauseMonitor(monitorId: string, userId: string) {
    return this.updateMonitor(monitorId, userId, { status: 'paused' });
  },

  async resumeMonitor(monitorId: string, userId: string) {
    return this.updateMonitor(monitorId, userId, { status: 'active', nextRunAt: new Date() });
  }
};
