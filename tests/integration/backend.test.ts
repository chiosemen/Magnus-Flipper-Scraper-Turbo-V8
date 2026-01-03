import { describe, it, expect, beforeEach } from 'vitest';
import { mockFirebaseAdmin } from '../mocks/firebase';
import { mockCloudTasks } from '../mocks/cloudTasks';
import { Buffer } from 'buffer';

// Simulate a backend service function using the mocks
async function createScrapeJob(userId: string, url: string, db: any) {
  // 1. Verify User (Mock)
  const user = await mockFirebaseAdmin.auth().getUser(userId);
  if (!user) throw new Error('User not found');

  // 2. Create Job in Firestore
  const jobRef = db.collection('jobs').doc();
  const jobData = {
    id: jobRef.id,
    userId,
    url,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  await jobRef.set(jobData);

  // 3. Dispatch to Cloud Tasks
  await mockCloudTasks.createTask({
    parent: 'projects/my-project/locations/us-central1/queues/scraper-queue',
    task: {
      httpRequest: {
        httpMethod: 'POST',
        url: 'https://worker-service/scrape',
        body: Buffer.from(JSON.stringify({ jobId: jobRef.id })).toString('base64'),
      }
    }
  });

  return jobRef.id;
}

describe('Backend Integration: Job Creation Workflow', () => {
  let db: any;

  beforeEach(() => {
    db = mockFirebaseAdmin.firestore();
  });

  it('should successfully create a job, persist to DB, and queue a task', async () => {
    const userId = 'user_123';
    const targetUrl = 'https://amazon.com/product/123';

    // Execute the workflow
    const jobId = await createScrapeJob(userId, targetUrl, db);

    // Verify Firestore persistence
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    expect(jobDoc.exists).toBe(true);
    expect(jobDoc.data().url).toBe(targetUrl);
    expect(jobDoc.data().status).toBe('pending');

    // Verify Cloud Task dispatch
    const pendingTasks = mockCloudTasks.getPendingTasks();
    expect(pendingTasks.length).toBeGreaterThan(0);
    const lastTask = pendingTasks[pendingTasks.length - 1];
    
    // Decode task body to verify payload
    const body = JSON.parse(Buffer.from(lastTask.httpRequest.body, 'base64').toString());
    expect(body.jobId).toBe(jobId);
  });

  it('should handle database transaction correctness', async () => {
    const userId = 'user_123';
    const userRef = db.collection('users').doc(userId);
    await userRef.set({ quota: 10 });

    // Simulate quota deduction transaction
    await db.runTransaction(async (t: any) => {
        const doc = await t.get(userRef);
        const newQuota = doc.data().quota - 1;
        t.update(userRef, { quota: newQuota });
    });

    const updatedUser = await userRef.get();
    expect(updatedUser.data().quota).toBe(9);
  });
});