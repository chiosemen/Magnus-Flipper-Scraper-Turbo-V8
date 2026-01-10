class Logger {
    defaultContext = {};
    constructor(context = {}) {
        this.defaultContext = context;
    }
    log(level, message, meta = {}) {
        const entry = {
            severity: level.toUpperCase(), // Google Cloud Logging uses 'severity'
            message,
            timestamp: new Date().toISOString(),
            ...this.defaultContext,
            ...meta,
        };
        console.log(JSON.stringify(entry));
    }
    debug(message, meta) {
        this.log('debug', message, meta);
    }
    info(message, meta) {
        this.log('info', message, meta);
    }
    warn(message, meta) {
        this.log('warn', message, meta);
    }
    error(message, error, meta) {
        this.log('error', message, {
            ...meta,
            stack: error?.stack,
            errorMessage: error?.message,
        });
    }
    child(context) {
        return new Logger({ ...this.defaultContext, ...context });
    }
}
export const logger = new Logger();
