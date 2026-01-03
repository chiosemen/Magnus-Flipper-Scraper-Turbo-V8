export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  jobId?: string;
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private defaultContext: LogContext = {};

  constructor(context: LogContext = {}) {
    this.defaultContext = context;
  }

  private log(level: LogLevel, message: string, meta: LogContext = {}) {
    const entry = {
      severity: level.toUpperCase(), // Google Cloud Logging uses 'severity'
      message,
      timestamp: new Date().toISOString(),
      ...this.defaultContext,
      ...meta,
    };
    
    console.log(JSON.stringify(entry));
  }

  debug(message: string, meta?: LogContext) {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: LogContext) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: LogContext) {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error, meta?: LogContext) {
    this.log('error', message, {
      ...meta,
      stack: error?.stack,
      errorMessage: error?.message,
    });
  }

  child(context: LogContext) {
    return new Logger({ ...this.defaultContext, ...context });
  }
}

export const logger = new Logger();
