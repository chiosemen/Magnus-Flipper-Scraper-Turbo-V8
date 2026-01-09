import { z } from 'zod';
import { Context, Next } from 'hono';

/**
 * UUID Validation Schema
 */
export const UuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

/**
 * Common validation schemas for reuse
 */
export const CommonSchemas = {
  uuid: UuidSchema,

  // Required string with min/max length
  requiredString: (minLength = 1, maxLength = 255) =>
    z.string().trim().min(minLength, `String must be at least ${minLength} characters`).max(maxLength, `String must be at most ${maxLength} characters`),

  // Optional string with max length
  optionalString: (maxLength = 255) =>
    z.string().trim().max(maxLength, `String must be at most ${maxLength} characters`).optional(),

  // Positive integer
  positiveInt: z.number().int().positive({ message: 'Must be a positive integer' }),

  // Non-negative integer
  nonNegativeInt: z.number().int().min(0, { message: 'Must be a non-negative integer' }),

  // Email
  email: z.string().email({ message: 'Invalid email format' }),

  // URL
  url: z.string().url({ message: 'Invalid URL format' }),

  // Date string
  dateString: z.string().datetime({ message: 'Invalid ISO 8601 date format' }),

  // Boolean
  boolean: z.boolean({ message: 'Must be a boolean' }),

  // Enum with custom values
  enum: <T extends readonly [string, ...string[]]>(values: T) =>
    z.enum(values, { message: `Must be one of: ${values.join(', ')}` }),
};

/**
 * Validate UUID parameter middleware factory
 */
export function validateUuidParam(paramName: string = 'id') {
  return async (c: Context, next: Next) => {
    const paramValue = c.req.param(paramName);

    const result = UuidSchema.safeParse(paramValue);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid ${paramName} parameter`,
            details: result.error.format(),
          },
        },
        400
      );
    }

    return next();
  };
}

/**
 * Reject null/undefined/empty values in request body
 */
export function rejectNullish<T extends Record<string, unknown>>(data: T): void {
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      throw new Error(`Field '${key}' cannot be null or undefined`);
    }

    if (typeof value === 'string' && value.trim() === '') {
      throw new Error(`Field '${key}' cannot be empty`);
    }

    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
      throw new Error(`Field '${key}' cannot be an empty object`);
    }
  }
}

/**
 * Validate query parameters with schema
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return async (c: Context, next: Next) => {
    const query = c.req.query();

    const result = schema.safeParse(query);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: result.error.format(),
          },
        },
        400
      );
    }

    return next();
  };
}
