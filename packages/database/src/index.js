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
import * as scraperKillSwitchesSchema from './schema/scraperKillSwitches';
import * as observabilityGatesSchema from './schema/observabilityGates';
import * as adminAuditLogsSchema from './schema/adminAuditLogs';
import * as canaryRampsSchema from './schema/canaryRamps';
import * as marketplaceRateLimitsSchema from './schema/marketplaceRateLimits';
import * as usageTelemetrySchema from './schema/usageTelemetry';
import * as enforcementEventsSchema from './schema/enforcementEvents';
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
        ...subscriptionsSchema,
        ...scraperKillSwitchesSchema,
        ...observabilityGatesSchema,
        ...adminAuditLogsSchema,
        ...canaryRampsSchema,
        ...marketplaceRateLimitsSchema,
        ...usageTelemetrySchema,
        ...enforcementEventsSchema
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
export * from './schema/scraperKillSwitches';
export * from './schema/observabilityGates';
export * from './schema/adminAuditLogs';
export * from './schema/canaryRamps';
export * from './schema/marketplaceRateLimits';
export * from './schema/usageTelemetry';
export * from './schema/enforcementEvents';
