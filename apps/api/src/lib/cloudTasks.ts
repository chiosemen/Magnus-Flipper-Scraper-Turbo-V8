import { CloudTasksClient } from '@google-cloud/tasks';
import { logger } from '@repo/logger';
import { JobPayload } from '@repo/types';
import { Buffer } from 'buffer';

const client = new CloudTasksClient();

const project = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_LOCATION || 'us-central1';
const queue = process.env.GCP_QUEUE_NAME || 'scraper-queue';
const workerUrl = process.env.WORKER_SERVICE_URL;

if (!project || !workerUrl) {
  logger.warn('Cloud Tasks configuration missing (GCP_PROJECT_ID or WORKER_SERVICE_URL). Task dispatching will fail.');
}

const parent = client.queuePath(project || 'unknown', location, queue);

export const createScrapeTask = async (payload: JobPayload) => {
  if (process.env.NODE_ENV === 'development' && !process.env.ENABLE_CLOUD_TASKS_DEV) {
    logger.info('Dev Mode: Skipping Cloud Task creation. Mocking dispatch.', { payload });
    return;
  }

  try {
    const [response] = await client.createTask({
      parent,
      task: {
        httpRequest: {
          httpMethod: 'POST',
          url: `${workerUrl}/v1/process`,
          headers: {
            'Content-Type': 'application/json',
          },
          body: Buffer.from(JSON.stringify(payload)).toString('base64'),
          oidcToken: {
            serviceAccountEmail: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
          },
        },
      },
    });

    logger.info(`Created task ${response.name}`);
    return response.name;
  } catch (error) {
    logger.error('Failed to create Cloud Task', error as Error);
    throw error;
  }
};