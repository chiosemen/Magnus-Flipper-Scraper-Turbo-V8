import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { logger } from '@repo/logger';
import { AppError } from '../utils/errors';
import { ContentfulStatusCode } from 'hono/utils/http-status';

export const errorHandler = (err: Error, c: Context) => {
  const requestId = c.get('requestId');

  // Handle known App Errors
  if (err instanceof AppError) {
    return c.json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      }
    }, err.statusCode);
  }

  // Handle Hono HTTP Exceptions
  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: {
        code: 'HTTP_ERROR',
        message: err.message,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      }
    }, (err as HTTPException).status as ContentfulStatusCode);
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: (err as ZodError).issues,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      }
    }, 400);
  }

  // Handle unexpected errors
  logger.error('Unexpected Server Error', err, { requestId });

  const isDev = process.env.NODE_ENV === 'development';

  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: isDev ? err.message : undefined,
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    }
  }, 500);
};