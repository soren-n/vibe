/**
 * Error handling comprehensive tests
 */

import { describe, it, expect } from 'vitest';
import {
  SessionNotFoundError,
  FilesystemError,
  categorizeError,
  ErrorCategory,
  ErrorSeverity,
  isVibeError,
  formatErrorForLogging,
  FileNotFoundError,
  FileAccessError,
} from '../src/errors';
import { VibeMCPServer } from '../src/mcp-server.js';

describe('Error Handling', () => {
  describe('SessionNotFoundError', () => {
    it('should create error with correct message and properties', () => {
      const sessionId = 'test-session-123';
      const error = new SessionNotFoundError(sessionId);

      expect(error.message).toBe(`Session not found: ${sessionId}`);
      expect(error.name).toBe('SessionNotFoundError');
      expect(error.code).toBe('SESSION_NOT_FOUND');
      expect(error.category).toBe(ErrorCategory.SESSION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.context.sessionId).toBe(sessionId);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('FilesystemError', () => {
    it('should create error with correct message and properties', () => {
      const message = 'File operation failed';
      const context = { operation: 'write', resource: '/tmp/test-file.json' };

      const error = new FilesystemError(message, context);

      expect(error.message).toBe(message);
      expect(error.name).toBe('FilesystemError');
      expect(error.code).toBe('FILESYSTEM_ERROR');
      expect(error.category).toBe(ErrorCategory.FILESYSTEM);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.context.operation).toBe('write');
      expect(error.context.resource).toBe('/tmp/test-file.json');
      expect(error.retryable).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    it('should handle undefined context', () => {
      const message = 'File read failed';

      const error = new FilesystemError(message);

      expect(error.message).toBe(message);
      expect(error.context.timestamp).toBeDefined();
      expect(error.retryable).toBe(true);
    });
  });

  describe('FileNotFoundError', () => {
    it('should create specific file not found error', () => {
      const filePath = '/tmp/missing-file.json';
      const error = new FileNotFoundError(filePath);

      expect(error.message).toBe(`File not found: ${filePath}`);
      expect(error.code).toBe('FILE_NOT_FOUND');
      expect(error.context.resource).toBe(filePath);
      expect(error.retryable).toBe(false);
    });
  });

  describe('FileAccessError', () => {
    it('should create file access error with details', () => {
      const operation = 'write';
      const filePath = '/tmp/protected-file.json';
      const cause = new Error('Permission denied');

      const error = new FileAccessError(operation, filePath, cause);

      expect(error.message).toBe(
        `File ${operation} failed for ${filePath}: ${cause.message}`
      );
      expect(error.code).toBe('FILE_ACCESS_ERROR');
      expect(error.context.operation).toBe(operation);
      expect(error.context.resource).toBe(filePath);
      expect(error.context.details?.cause).toBe(cause.message);
    });
  });

  describe('categorizeError', () => {
    it('should return same error if already VibeError', () => {
      const error = new SessionNotFoundError('test-123');
      const result = categorizeError(error);

      expect(result).toBe(error);
    });

    it('should handle ENOENT error', () => {
      const error = new Error(
        "ENOENT: no such file or directory, open '/tmp/missing.json'"
      );
      const result = categorizeError(error);

      expect(result).toBeInstanceOf(FileNotFoundError);
      expect(result.code).toBe('FILE_NOT_FOUND');
      expect(result.context.resource).toBe('/tmp/missing.json');
    });

    it('should handle EACCES error', () => {
      const error = new Error('EACCES: permission denied');
      const result = categorizeError(error);

      expect(result).toBeInstanceOf(FileAccessError);
      expect(result.code).toBe('FILE_ACCESS_ERROR');
    });

    it('should handle EPERM error', () => {
      const error = new Error('EPERM: operation not permitted');
      const result = categorizeError(error);

      expect(result).toBeInstanceOf(FileAccessError);
      expect(result.code).toBe('FILE_ACCESS_ERROR');
    });

    it('should handle unknown errors as SystemError', () => {
      const error = new Error('Unknown error occurred');
      const result = categorizeError(error);

      expect(result.category).toBe(ErrorCategory.SYSTEM);
      expect(result.code).toBe('SYSTEM_ERROR');
      expect(result.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('isVibeError', () => {
    it('should return true for VibeError instances', () => {
      const error = new SessionNotFoundError('test');
      expect(isVibeError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('Regular error');
      expect(isVibeError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isVibeError('string')).toBe(false);
      expect(isVibeError(null)).toBe(false);
      expect(isVibeError(undefined)).toBe(false);
      expect(isVibeError({})).toBe(false);
    });
  });

  describe('formatErrorForLogging', () => {
    it('should format error for logging correctly', () => {
      const error = new SessionNotFoundError('test-123', { operation: 'load' });
      const formatted = formatErrorForLogging(error);

      expect(formatted.error).toBeDefined();
      const errorData = formatted.error as Record<string, any>;
      expect(errorData.name).toBe('SessionNotFoundError');
      expect(errorData.message).toBe('Session not found: test-123');
      expect(errorData.category).toBe(ErrorCategory.SESSION);
      expect(errorData.severity).toBe(ErrorSeverity.HIGH);
      expect(errorData.code).toBe('SESSION_NOT_FOUND');
      expect(errorData.retryable).toBe(false);
      expect(errorData.context).toEqual(
        expect.objectContaining({
          sessionId: 'test-123',
          operation: 'load',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Error toJSON', () => {
    it('should serialize error to JSON correctly', () => {
      const error = new FilesystemError('Test error', { operation: 'read' });
      const json = error.toJSON();

      expect(json.name).toBe('FilesystemError');
      expect(json.message).toBe('Test error');
      expect(json.category).toBe(ErrorCategory.FILESYSTEM);
      expect(json.severity).toBe(ErrorSeverity.MEDIUM);
      expect(json.code).toBe('FILESYSTEM_ERROR');
      expect(json.retryable).toBe(true);
      expect(json.context).toEqual(
        expect.objectContaining({
          operation: 'read',
          timestamp: expect.any(String),
        })
      );
      expect(json.stack).toBeDefined();
    });
  });

  describe('MCP Server Error Handling', () => {
    it('should create MCP server successfully', () => {
      expect(() => {
        new VibeMCPServer();
      }).not.toThrow();
    });

    it('should have improved error handling in run method', () => {
      const server = new VibeMCPServer();

      // Test that run method exists and is properly structured
      expect(typeof server.run).toBe('function');

      // Verify that the run method includes proper error handling
      const runMethod = server.run.toString();
      expect(runMethod).toContain('try');
      expect(runMethod).toContain('catch');
      expect(runMethod).toContain('EADDRINUSE'); // Check for specific error handling
      expect(runMethod).toContain('EACCES');
      expect(runMethod).toContain('ENOENT');
    });

    it('should provide informative error messages', () => {
      // Test that our error handling provides useful information
      const server = new VibeMCPServer();
      expect(server).toBeDefined();

      // Verify the error handling structure exists in the run method
      const runMethod = server.run.toString();
      expect(runMethod).toContain('Permission denied');
      expect(runMethod).toContain('port is already in use');
      expect(runMethod).toContain('dependencies not found');
    });
  });
});
