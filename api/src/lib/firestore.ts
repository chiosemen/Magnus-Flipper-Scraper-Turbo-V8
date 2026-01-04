import { firestore } from './firebase';
import { logger } from '@repo/logger';

export const updateJobStatus = async (jobId: string, status: string, progress: number, data: any = {}) => {
  try {
    await firestore.collection('jobs').doc(jobId).set({
      status,
      progress,
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    logger.error(`Failed to update job status in Firestore for ${jobId}`, error as Error);
  }
};

export const createRealtimeDoc = async (collection: string, id: string, data: any) => {
  try {
    await firestore.collection(collection).doc(id).set({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to create realtime doc in ${collection}/${id}`, error as Error);
  }
};
