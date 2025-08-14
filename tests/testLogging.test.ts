/**
 * Logging system comprehensive tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getLogger,
  logAsyncOperation,
  retryWithLogging,
  setLogLevel,
  LogLevel,
} from '../src/logging';

describe('Logging System', () => {
  let consoleSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Set DEBUG level for async operation tests
    setLogLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('getLogger', () => {
    it('should return logger instance', () => {
      const logger = getLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should log info messages', () => {
      const logger = getLogger();
      logger.info('Test info message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"INFO"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test info message"')
      );
    });

    it('should log error messages', () => {
      const logger = getLogger();
      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"ERROR"')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test error message"')
      );
    });

    it('should log with metadata', () => {
      const logger = getLogger();
      logger.info('Test message', { component: 'test', action: 'testing' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"component":"test"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"action":"testing"')
      );
    });
  });

  describe('logAsyncOperation', () => {
    it('should log successful async operation', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      };

      const result = await logAsyncOperation('testOperation', operation, {
        component: 'test',
      });

      expect(result).toBe('success');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Completed testOperation"')
      );
    });

    it('should log failed async operation', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Operation failed');
      };

      await expect(
        logAsyncOperation('testOperation', operation, { component: 'test' })
      ).rejects.toThrow('Operation failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Failed testOperation"')
      );
    });

    it('should include duration in logs', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'success';
      };

      await logAsyncOperation('testOperation', operation);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"duration"'));
    });
  });

  describe('retryWithLogging', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await retryWithLogging(
        'testRetry',
        operation,
        { maxAttempts: 3, baseDelay: 100, maxDelay: 1000, backoffMultiplier: 2 },
        { component: 'test' }
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const result = await retryWithLogging(
        'testRetry',
        operation,
        { maxAttempts: 3, baseDelay: 10, maxDelay: 1000, backoffMultiplier: 2 },
        { component: 'test' }
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(
        retryWithLogging(
          'testRetry',
          operation,
          { maxAttempts: 3, baseDelay: 10, maxDelay: 1000, backoffMultiplier: 2 },
          { component: 'test' }
        )
      ).rejects.toThrow('Persistent failure');

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use custom retry attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));

      await expect(
        retryWithLogging(
          'testRetry',
          operation,
          { maxAttempts: 5, baseDelay: 10, maxDelay: 1000, backoffMultiplier: 2 },
          { component: 'test' }
        )
      ).rejects.toThrow('Failure');

      expect(operation).toHaveBeenCalledTimes(5);
    });

    it('should wait between retries', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      const start = Date.now();
      await retryWithLogging('testRetry', operation, {
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
      });
      const duration = Date.now() - start;

      // Should have waited at least baseDelay (100ms) for the retry
      expect(duration).toBeGreaterThan(90);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect shouldRetry function', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Non-retryable failure'));

      await expect(
        retryWithLogging('testRetry', operation, {
          maxAttempts: 3,
          baseDelay: 10,
          maxDelay: 1000,
          backoffMultiplier: 2,
          shouldRetry: () => false, // Never retry
        })
      ).rejects.toThrow('Non-retryable failure');

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('setLogLevel', () => {
    it('should configure logger with new level', () => {
      setLogLevel(LogLevel.ERROR);

      const logger = getLogger();
      consoleSpy.mockClear();

      // Debug and info messages should not be logged at ERROR level
      logger.debug('Debug message');
      logger.info('Info message');

      // Console should not have been called for debug/info at ERROR level
      expect(consoleSpy).not.toHaveBeenCalled();

      // Error messages should still be logged
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"ERROR"')
      );
    });

    it('should respect log level filtering', () => {
      setLogLevel(LogLevel.WARN);

      const logger = getLogger();
      consoleSpy.mockClear();
      consoleErrorSpy.mockClear();
      consoleWarnSpy.mockClear();

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      // Only warn and error should be logged
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"WARN"')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"ERROR"')
      );
    });
  });

  describe('Logger format options', () => {
    it('should include timestamp in logs', () => {
      const logger = getLogger();
      logger.info('Timestamped message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"timestamp"'));
    });

    it('should handle nested metadata', () => {
      const logger = getLogger();
      logger.info('Complex message', {
        component: 'test',
        nested: {
          level1: {
            level2: 'deep value',
          },
        },
        array: [1, 2, 3],
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"nested":{"level1":{"level2":"deep value"}}')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"array":[1,2,3]')
      );
    });

    it('should handle error logging with stack trace', () => {
      const logger = getLogger();
      const testError = new Error('Test error');

      logger.error('Error occurred', testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('"error"'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test error')
      );
    });
  });
});
