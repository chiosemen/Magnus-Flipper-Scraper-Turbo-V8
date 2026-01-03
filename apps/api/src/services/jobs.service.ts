import { db, schema } from '../lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { Job, CreateJob, JobPayload, JobTypeEnum } from '@repo/types';
import { AppError, NotFoundError } from '../utils/errors';
import { createScrapeTask } from '../lib/cloudTasks';
import { updateJobStatus } from '../lib/firestore';
import { policyService } from './policy';
import { getTierLimits, TIER_ERROR_CODES } from './tierLimits';

export const jobsService = {
  async listJobs(userId: string) {
    const jobs = await db.query.jobs.findMany({
      where: eq(schema.jobs.userId, userId),
      orderBy: [desc(schema.jobs.createdAt)],
      limit: 50,
    });
    return { items: jobs as unknown as Job[], pagination: { page: 1, limit: 50, total: jobs.length, totalPages: 1, hasNext: false, hasPrev: false } };
  },

  async getJob(jobId: string, userId: string) {
    const job = await db.query.jobs.findFirst({
      where: and(eq(schema.jobs.id, jobId), eq(schema.jobs.userId, userId))
    });
    if (!job) throw new NotFoundError('Job not found');
    return job as unknown as Job;
  },

  async createJob(userId: string, data: CreateJob) {
    const tier = await policyService.getUserTier(userId);
    const limits = getTierLimits(tier);

    const runningJobs = await db.execute(sql`
      SELECT count(*) as count FROM ${schema.jobs}
      WHERE user_id = ${userId} AND status = 'running'
    `);
    const runningCount = Number(runningJobs[0]?.count || 0);
    if (runningCount >= limits.maxConcurrency) {
      throw new AppError(
        'Concurrency limit reached for tier',
        429,
        TIER_ERROR_CODES.CONCURRENCY_LIMIT,
        { tier, limit: limits.maxConcurrency }
      );
    }

    if (data.monitorId) {
      const monitor = await db.query.monitors.findFirst({
        where: and(eq(schema.monitors.id, data.monitorId), eq(schema.monitors.userId, userId))
      });
      if (!monitor) throw new NotFoundError('Monitor not found');

      if (monitor.lastRunAt) {
        const lastRunAtMs = new Date(monitor.lastRunAt).getTime();
        const elapsedSec = (Date.now() - lastRunAtMs) / 1000;
        if (elapsedSec < limits.minIntervalSec) {
          throw new AppError(
            'Refresh interval floor not met for tier',
            429,
            TIER_ERROR_CODES.REFRESH_INTERVAL,
            { tier, minIntervalSec: limits.minIntervalSec, lastRunAt: monitor.lastRunAt }
          );
        }
      }
    }

    // 1. Persist Job Record
    const [job] = await db.insert(schema.jobs).values({
      ...data,
      userId,
      status: 'queued',
      progress: 0,
      scheduledAt: new Date(),
    }).returning();

    // 2. Sync to Firestore (for realtime UI)
    await updateJobStatus(job.id, 'queued', 0, {
        type: job.type,
        userId: userId,
        source: job.source,
        url: data.urls?.[0] || 'monitor'
    });

    // 3. Create Cloud Task payload
    const payload: JobPayload = {
      jobId: job.id,
      type: data.type,
      source: data.source,
      params: {
        monitorId: data.monitorId,
        urls: data.urls,
        searchQuery: data.searchQuery
      },
      meta: {
        userId,
        attempt: 1
      }
    };

    // 4. Dispatch Task
    await createScrapeTask(payload);

    return job as unknown as Job;
  },

  async cancelJob(jobId: string, userId: string) {
    const job = await this.getJob(jobId, userId);
    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error('Cannot cancel completed job');
    }

    await db.update(schema.jobs)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(schema.jobs.id, jobId));
    
    await updateJobStatus(jobId, 'cancelled', job.progress);
  }
};
