import { AppError } from './errors';
import { logger } from '@repo/logger';

/**
 * Fail-Closed Guards
 *
 * These utilities ensure critical operations fail with errors instead of
 * proceeding with missing/uncertain data. Designed for production safety.
 */

/**
 * Assert value is not null/undefined - fail closed if missing
 */
export function assertExists<T>(
  value: T | null | undefined,
  errorMessage: string,
  errorCode: string = 'REQUIRED_DATA_MISSING'
): asserts value is T {
  if (value === null || value === undefined) {
    logger.error('Fail-closed assertion failed', undefined, {
      errorMessage,
      errorCode,
      stackTrace: new Error().stack,
    });
    throw new AppError(errorMessage, 500, errorCode);
  }
}

/**
 * Assert entitlements exist - critical for billing operations
 */
export function assertEntitlementsExist<T>(
  entitlements: T | null | undefined,
  userId: string
): asserts entitlements is T {
  if (entitlements === null || entitlements === undefined) {
    logger.error('Entitlements missing for user - failing closed', undefined, {
      userId,
      operation: 'billing_check',
    });
    throw new AppError(
      'User entitlements not available. Cannot proceed with operation.',
      403,
      'ENTITLEMENTS_UNAVAILABLE',
      { userId }
    );
  }
}

/**
 * Assert usage telemetry exists - critical for rate limiting
 */
export function assertUsageTelemetryExists<T>(
  telemetry: T | null | undefined,
  userId: string,
  marketplace: string
): asserts telemetry is T {
  if (telemetry === null || telemetry === undefined) {
    logger.error('Usage telemetry missing - failing closed', undefined, {
      userId,
      marketplace,
      operation: 'rate_limit_check',
    });
    throw new AppError(
      'Usage tracking unavailable. Cannot proceed with operation.',
      429,
      'USAGE_TELEMETRY_UNAVAILABLE',
      { userId, marketplace }
    );
  }
}

/**
 * Assert tier limits exist - critical for quota enforcement
 */
export function assertTierLimitsExist<T>(
  limits: T | null | undefined,
  tier: string,
  userId: string
): asserts limits is T {
  if (limits === null || limits === undefined) {
    logger.error('Tier limits missing - failing closed', undefined, {
      userId,
      tier,
      operation: 'quota_check',
    });
    throw new AppError(
      'Tier limits unavailable. Cannot verify quota.',
      500,
      'TIER_LIMITS_UNAVAILABLE',
      { tier, userId }
    );
  }
}

/**
 * Assert numeric value is valid and non-negative
 */
export function assertValidCount(
  count: number | null | undefined,
  fieldName: string,
  context: Record<string, unknown> = {}
): asserts count is number {
  if (
    count === null ||
    count === undefined ||
    isNaN(count) ||
    count < 0 ||
    !isFinite(count)
  ) {
    logger.error('Invalid count value - failing closed', undefined, {
      fieldName,
      value: count,
      ...context,
    });
    throw new AppError(
      `Invalid ${fieldName} value. Cannot proceed.`,
      500,
      'INVALID_COUNT_VALUE',
      { fieldName, value: count, ...context }
    );
  }
}

/**
 * Assert user exists in database - critical for all user operations
 */
export function assertUserExists<T>(
  user: T | null | undefined,
  userId: string,
  operation: string
): asserts user is T {
  if (user === null || user === undefined) {
    logger.error('User not found in database - failing closed', undefined, {
      userId,
      operation,
    });
    throw new AppError(
      'User record not found. Cannot proceed.',
      404,
      'USER_NOT_FOUND',
      { userId, operation }
    );
  }
}

/**
 * Assert database write succeeded - critical for state changes
 */
export function assertWriteSucceeded<T>(
  result: T[] | null | undefined,
  operation: string,
  context: Record<string, unknown> = {}
): asserts result is T[] {
  if (!result || result.length === 0) {
    logger.error('Database write failed - failing closed', undefined, {
      operation,
      ...context,
    });
    throw new AppError(
      'Database operation failed. Cannot confirm state change.',
      500,
      'DATABASE_WRITE_FAILED',
      { operation, ...context }
    );
  }
}

/**
 * Wrap operation with fail-closed error boundary
 * If operation throws, log and re-throw instead of swallowing
 */
export async function withFailClosed<T>(
  operation: () => Promise<T>,
  operationName: string,
  context: Record<string, unknown> = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Operation failed with fail-closed guard', err, {
      operationName,
      ...context,
    });
    throw error; // Re-throw - never swallow in production
  }
}
