import { firestore } from '../lib/firestore';
import { db, schema } from '../lib/db';
import { JobStatus } from '@repo/types';
import { eq } from 'drizzle-orm';
import { logger } from '@repo/logger';

export class StatusService {
  async updateStatus(jobId: string, status: JobStatus, progress: number, data: any = {}) {
    try {
      // Update Firestore for Realtime UI
      await firestore.collection('jobs').doc(jobId).set({
        status,
        progress,
        ...data,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update Postgres for Persistence
      if (['completed', 'failed', 'cancelled'].includes(status) || progress % 10 === 0) {
         const updates: any = { 
            status, 
            progress,
            updatedAt: new Date()
         };
         
         if (status === 'completed') updates.completedAt = new Date();
         if (status === 'running' && !data.startedAt) updates.startedAt = new Date();
         if (data.dealsFound) updates.dealsFound = data.dealsFound;
         if (data.dealsNew) updates.dealsNew = data.dealsNew;

         await db.update(schema.jobs)
           .set(updates)
           .where(eq(schema.jobs.id, jobId));
      }
    } catch (error) {
      logger.error('Failed to update job status', error as Error);
    }
  }
}
