/**
 * PRODUCTION SAFETY MODE
 *
 * Central switch for production-safe behavior.
 * When true, unfinished/experimental flows are disabled.
 */
export const PRODUCTION_SAFE_MODE = process.env.NODE_ENV === 'production';

/**
 * Environment flags for operational visibility
 */
export const ENVIRONMENT = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: PRODUCTION_SAFE_MODE,
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
} as const;
