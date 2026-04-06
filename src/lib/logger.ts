/**
 * Logger utility to ensure no secrets are logged and format is consistent.
 * Rule 147: Never log secrets.
 * Rule 219: Log errors with context.
 */

const isProduction = process.env.NODE_ENV === 'production';
const levelOrder: Record<string, number> = { error: 0, warn: 1, info: 2, debug: 3 };
function currentLevel(): number {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return levelOrder[raw] ?? 2;
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    if (currentLevel() < 2) return;
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ level: 'info', message, ...context, timestamp: new Date().toISOString() }));
  },
  debug: (message: string, context?: Record<string, unknown>) => {
    if (currentLevel() < 3) return;
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ level: 'debug', message, ...context, timestamp: new Date().toISOString() }));
  },
  
  warn: (message: string, context?: Record<string, unknown>) => {
    // eslint-disable-next-line no-console
    console.warn(JSON.stringify({ level: 'warn', message, ...context, timestamp: new Date().toISOString() }));
  },

  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: isProduction ? undefined : error.stack, // Rule 201: No stack traces to client (applied to logs too for safety, though logs are server-side)
    } : { error };

    // eslint-disable-next-line no-console
    console.error(JSON.stringify({
      level: 'error',
      message,
      ...context,
      ...errorDetails,
      timestamp: new Date().toISOString()
    }));
  },
  
  // Helper to sanitize sensitive keys before logging
  sanitize: (data: Record<string, unknown>) => {
    const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cookie'];
    const sanitized = { ...data };
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
};
