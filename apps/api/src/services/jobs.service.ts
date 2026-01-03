import { db, schema } from '../lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { Job, CreateJob, JobPayload, JobTypeEnum } from '@repo/types';
import { NotFoundError } from '../utils/errors';
import { createScrapeTask } from '../lib/cloudTasks';
import { updateJobStatus } from '../lib/firestore';

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
