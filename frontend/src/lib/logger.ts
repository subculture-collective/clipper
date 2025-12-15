/**
 * Structured Logger for Frontend
 * Provides JSON structured logging with PII redaction
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  user_id?: string;
  session_id?: string;
  trace_id?: string;
  url?: string;
  user_agent?: string;
  error?: string;
  stack?: string;
  fields?: Record<string, unknown>;
}

class StructuredLogger {
  private minLevel: LogLevel;
  private service: string = 'clipper-frontend';

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    };
    return levels[level] >= levels[this.minLevel];
  }

  private getContext(): Partial<LogEntry> {
    const context: Partial<LogEntry> = {
      url: window.location.href,
      user_agent: navigator.userAgent,
    };

    // Get session ID from localStorage if available
    try {
      const sessionId = sessionStorage.getItem('session_id');
      if (sessionId) {
        context.session_id = sessionId;
      }
    } catch (e) {
      // Ignore errors accessing session storage
    }

    // Get user ID from auth context if available (should be hashed)
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.id) {
          context.user_id = this.hashForLogging(user.id.toString());
        }
      }
    } catch (e) {
      // Ignore errors accessing local storage
    }

    // Generate trace ID for this log entry
    context.trace_id = this.generateTraceId();

    return context;
  }

  private hashForLogging(value: string): string {
    // Simple hash for logging (not cryptographic)
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private redactPII(text: string): string {
    if (typeof text !== 'string') return text;

    // Redact emails
    text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]');
    // Redact phone numbers
    text = text.replace(/\b(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');
    // Redact credit cards
    text = text.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[REDACTED_CARD]');
    // Redact passwords and tokens
    text = text.replace(/(password|passwd|pwd|secret|token|apikey|api_key|access_token|auth_token)["']?\s*[:=]\s*["']?([^"'\s,}&]+)/gi, '$1="[REDACTED]"');
    // Redact Bearer tokens
    text = text.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]');

    return text;
  }

  private redactPIIFromFields(fields?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!fields) return undefined;

    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      const lowerKey = key.toLowerCase();

      // Redact sensitive field names
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('authorization') ||
        lowerKey === 'auth'
      ) {
        redacted[key] = '[REDACTED]';
        continue;
      }

      // Redact PII from string values
      if (typeof value === 'string') {
        redacted[key] = this.redactPII(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Redact PII
    entry.message = this.redactPII(entry.message);
    if (entry.error) {
      entry.error = this.redactPII(entry.error);
    }
    if (entry.fields) {
      entry.fields = this.redactPIIFromFields(entry.fields);
    }

    // In production, send to log aggregation service
    if (import.meta.env.PROD) {
      // Log to console for now, can be extended to send to backend
      console.log(JSON.stringify(entry));
      
      // TODO: Send to backend log collection endpoint
      // this.sendToBackend(entry);
    } else {
      // In development, use console methods with colors
      const consoleMethod = entry.level === LogLevel.ERROR ? 'error' :
                           entry.level === LogLevel.WARN ? 'warn' :
                           entry.level === LogLevel.DEBUG ? 'debug' : 'log';
      console[consoleMethod](`[${entry.level.toUpperCase()}] ${entry.message}`, entry);
    }
  }

  debug(message: string, fields?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      service: this.service,
      ...this.getContext(),
      fields,
    };
    this.log(entry);
  }

  info(message: string, fields?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      service: this.service,
      ...this.getContext(),
      fields,
    };
    this.log(entry);
  }

  warn(message: string, fields?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      service: this.service,
      ...this.getContext(),
      fields,
    };
    this.log(entry);
  }

  error(message: string, error?: Error, fields?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      service: this.service,
      ...this.getContext(),
      error: error?.message,
      stack: error?.stack,
      fields,
    };
    this.log(entry);
  }
}

// Global logger instance
let logger: StructuredLogger;

export function initLogger(minLevel: LogLevel = LogLevel.INFO): void {
  logger = new StructuredLogger(minLevel);
}

export function getLogger(): StructuredLogger {
  if (!logger) {
    logger = new StructuredLogger(import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO);
  }
  return logger;
}

// Convenience functions
export const debug = (message: string, fields?: Record<string, unknown>) => getLogger().debug(message, fields);
export const info = (message: string, fields?: Record<string, unknown>) => getLogger().info(message, fields);
export const warn = (message: string, fields?: Record<string, unknown>) => getLogger().warn(message, fields);
export const error = (message: string, err?: Error, fields?: Record<string, unknown>) => getLogger().error(message, err, fields);
