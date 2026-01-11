import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@repo/database';

// In tests, ensure a DATABASE_URL is set so importing this module doesn't throw
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'test') {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export { schema };
