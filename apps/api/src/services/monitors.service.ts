import { db, schema } from '../lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { Monitor, CreateMonitor, UpdateMonitor } from '@repo/types';
import { NotFoundError, QuotaExceededError } from '../utils/errors';
import { jobsService } from './jobs.service';

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
    // Check Quota
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    // Simplified quota check (expand based on TierPolicy later)
    if (user && user.monitorsUsed >= 10 && user.tier === 'free') {
        throw new QuotaExceededError('Monitor limit reached for Free tier');
    }

    const [monitor] = await db.insert(schema.monitors)
      .values({ 
        ...data, 
        userId,
        nextRunAt: new Date(), // Schedule immediately
      })
      .returning();
    
    // Update usage
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
    const [updated] = await db.update(schema.monitors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.monitors.id, monitorId))
      .returning();
    return updated as unknown as Monitor;
  },

  async deleteMonitor(monitorId: string, userId: string) {
    await this.getMonitor(monitorId, userId);
    
    // Transactional delete would be better
    await db.delete(schema.monitors).where(eq(schema.monitors.id, monitorId));
    
    // Update usage count
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    if (user) {
        await db.update(schema.users)
          .set({ monitorsUsed: Math.max(0, (user.monitorsUsed || 1) - 1) })
          .where(eq(schema.users.id, userId));
    }
  },

  async pauseMonitor(monitorId: string, userId: string) {
    return this.updateMonitor(monitorId, userId, { status: 'paused' });
  },

  async resumeMonitor(monitorId: string, userId: string) {
    return this.updateMonitor(monitorId, userId, { status: 'active', nextRunAt: new Date() });
  }
};
