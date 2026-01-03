import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as usersSchema from './schema/users';
import * as dealsSchema from './schema/deals';
import * as monitorsSchema from './schema/monitors';
import * as jobsSchema from './schema/jobs';
import * as pricesSchema from './schema/prices';
import * as alertsSchema from './schema/alerts';
import * as analyticsSchema from './schema/analytics';
import * as subscriptionsSchema from './schema/subscriptions';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/magnus_flipper';

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { 
  schema: { 
    ...usersSchema,
    ...dealsSchema,
    ...monitorsSchema,
    ...jobsSchema,
    ...pricesSchema,
    ...alertsSchema,
    ...analyticsSchema,
    ...subscriptionsSchema
  } 
});

export * from './schema/users';
export * from './schema/deals';
export * from './schema/monitors';
export * from './schema/jobs';
export * from './schema/prices';
export * from './schema/alerts';
export * from './schema/analytics';
export * from './schema/subscriptions';
