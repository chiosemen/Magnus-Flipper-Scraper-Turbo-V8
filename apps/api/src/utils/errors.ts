import { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends Error {
  public statusCode: ContentfulStatusCode;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: ContentfulStatusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: any) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: any) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: any) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation Error', details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = 'Quota Exceeded', details?: any) {
    super(message, 429, 'QUOTA_EXCEEDED', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate Limit Exceeded', details?: any) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = 'External Service Error', details?: any) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}
