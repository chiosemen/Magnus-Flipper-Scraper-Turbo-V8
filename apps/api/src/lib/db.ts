import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@repo/database';
import { logger } from '@repo/logger';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

// Connection for query purposes
const client = postgres(connectionString);

export const db = drizzle(client, { schema });

// Helper to check connection
export const checkDbConnection = async () => {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed', error as Error);
    return false;
  }
};

export { schema };
