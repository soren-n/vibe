/**
 * Structured logging system for Vibe MCP
 * Provides consistent logging with context and error handling
 */

import { VibeError, formatErrorForLogging } from './errors.js';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogContext {
  operation?: string;
  sessionId?: string;
  workflowName?: string;
  component?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error | VibeError, context?: LogContext): void;
  fatal(message: string, error?: Error | VibeError, context?: LogContext): void;
}

class ConsoleLogger implements Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  setLogLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
      LogLevel.FATAL,
    ];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error | VibeError
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = context;
    }

    if (error) {
      if (error instanceof VibeError) {
        entry.error = formatErrorForLogging(error);
      } else {
        entry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      }
    }

    return entry;
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const output = {
      timestamp: entry.timestamp,
      level: entry.level.toUpperCase(),
      message: entry.message,
      ...entry.context,
      ...(entry.error && { error: entry.error }),
    };

    const logString = JSON.stringify(output);

    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logString);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    const entry = this.formatLogEntry(LogLevel.DEBUG, message, context);
    this.writeLog(entry);
  }

  info(message: string, context?: LogContext): void {
    const entry = this.formatLogEntry(LogLevel.INFO, message, context);
    this.writeLog(entry);
  }

  warn(message: string, context?: LogContext): void {
    const entry = this.formatLogEntry(LogLevel.WARN, message, context);
    this.writeLog(entry);
  }

  error(message: string, error?: Error | VibeError, context?: LogContext): void {
    const entry = this.formatLogEntry(LogLevel.ERROR, message, context, error);
    this.writeLog(entry);
  }

  fatal(message: string, error?: Error | VibeError, context?: LogContext): void {
    const entry = this.formatLogEntry(LogLevel.FATAL, message, context, error);
    this.writeLog(entry);
  }
}

// Global logger instance
let globalLogger: Logger = new ConsoleLogger(LogLevel.INFO);

export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

export function setLogLevel(level: LogLevel): void {
  if (globalLogger instanceof ConsoleLogger) {
    globalLogger.setLogLevel(level);
  } else {
    // If not our logger, replace it with one that has the correct level
    globalLogger = new ConsoleLogger(level);
  }
}

export function getLogger(): Logger {
  return globalLogger;
}

// Convenience functions for common logging patterns
export function logOperation<T>(
  operation: string,
  fn: () => T,
  context?: LogContext
): T {
  const logger = getLogger();
  const startTime = Date.now();

  logger.debug(`Starting ${operation}`, { ...context, operation });

  try {
    const result = fn();
    const duration = Date.now() - startTime;
    logger.debug(`Completed ${operation}`, { ...context, operation, duration });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Failed ${operation}`, error as Error, {
      ...context,
      operation,
      duration,
    });
    throw error;
  }
}

export async function logAsyncOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const logger = getLogger();
  const startTime = Date.now();

  logger.debug(`Starting ${operation}`, { ...context, operation });

  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    logger.debug(`Completed ${operation}`, { ...context, operation, duration });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Failed ${operation}`, error as Error, {
      ...context,
      operation,
      duration,
    });
    throw error;
  }
}

// Retry mechanism with logging
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  shouldRetry?: (error: Error) => boolean;
}

export async function retryWithLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  options: RetryOptions,
  context?: LogContext
): Promise<T> {
  const logger = getLogger();
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      const result = await logAsyncOperation(
        `${operation} (attempt ${attempt})`,
        fn,
        context
      );

      if (attempt > 1) {
        logger.info(`${operation} succeeded after ${attempt} attempts`, {
          ...context,
          operation,
          attempt,
        });
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      if (attempt === options.maxAttempts) {
        logger.error(`${operation} failed after ${attempt} attempts`, lastError, {
          ...context,
          operation,
          attempt,
        });
        break;
      }

      const shouldRetry = options.shouldRetry ? options.shouldRetry(lastError) : true;
      if (!shouldRetry) {
        logger.error(`${operation} failed, not retrying`, lastError, {
          ...context,
          operation,
          attempt,
        });
        break;
      }

      const delay = Math.min(
        options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1),
        options.maxDelay
      );

      logger.error(`${operation} failed, retrying in ${delay}ms`, lastError, {
        ...context,
        operation,
        attempt,
        delay,
        nextAttempt: attempt + 1,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (!lastError) {
    throw new Error(`${operation} failed with unknown error`);
  }

  throw lastError;
}
