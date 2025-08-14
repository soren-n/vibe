/**
 * Structured error handling for Vibe MCP
 * Provides categorized error types with proper context and recovery strategies
 */

export enum ErrorCategory {
  VALIDATION = 'validation',
  WORKFLOW = 'workflow',
  SESSION = 'session',
  FILESYSTEM = 'filesystem',
  NETWORK = 'network',
  CONFIGURATION = 'configuration',
  SYSTEM = 'system',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  operation?: string;
  resource?: string;
  sessionId?: string;
  workflowName?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export abstract class VibeError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public code: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    code: string,
    context: ErrorContext = {},
    retryable = false
  ) {
    super(message);
    this.name = this.constructor.name;
    this.category = category;
    this.severity = severity;
    this.code = code;
    this.context = {
      ...context,
      timestamp: context.timestamp ?? new Date().toISOString(),
    };
    this.retryable = retryable;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      code: this.code,
      retryable: this.retryable,
      context: this.context,
      stack: this.stack,
    };
  }
}

// Validation Errors
export class ValidationError extends VibeError {
  constructor(message: string, context: ErrorContext = {}) {
    super(
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      'VALIDATION_FAILED',
      context
    );
  }
}

export class SchemaValidationError extends ValidationError {
  constructor(message: string, context: ErrorContext = {}) {
    super(`Schema validation failed: ${message}`, context);
    this.code = 'SCHEMA_INVALID';
  }
}

// Workflow Errors
export class WorkflowError extends VibeError {
  constructor(message: string, context: ErrorContext = {}, retryable = false) {
    super(
      message,
      ErrorCategory.WORKFLOW,
      ErrorSeverity.HIGH,
      'WORKFLOW_ERROR',
      context,
      retryable
    );
  }
}

export class WorkflowNotFoundError extends WorkflowError {
  constructor(workflowName: string, context: ErrorContext = {}) {
    super(`Workflow not found: ${workflowName}`, { ...context, workflowName });
    this.code = 'WORKFLOW_NOT_FOUND';
  }
}

export class WorkflowLoadError extends WorkflowError {
  constructor(filePath: string, cause: Error, context: ErrorContext = {}) {
    super(`Failed to load workflow from ${filePath}: ${cause.message}`, {
      ...context,
      resource: filePath,
      details: { cause: cause.message },
    });
    this.code = 'WORKFLOW_LOAD_FAILED';
  }
}

export class WorkflowExecutionError extends WorkflowError {
  constructor(message: string, context: ErrorContext = {}) {
    super(`Workflow execution failed: ${message}`, context, true);
    this.code = 'WORKFLOW_EXECUTION_FAILED';
  }
}

// Session Errors
export class SessionError extends VibeError {
  constructor(message: string, context: ErrorContext = {}, retryable = false) {
    super(
      message,
      ErrorCategory.SESSION,
      ErrorSeverity.HIGH,
      'SESSION_ERROR',
      context,
      retryable
    );
  }
}

export class SessionNotFoundError extends SessionError {
  constructor(sessionId: string, context: ErrorContext = {}) {
    super(`Session not found: ${sessionId}`, { ...context, sessionId });
    this.code = 'SESSION_NOT_FOUND';
  }
}

export class SessionStateError extends SessionError {
  constructor(message: string, context: ErrorContext = {}) {
    super(`Session state error: ${message}`, context);
    this.code = 'SESSION_STATE_INVALID';
  }
}

export class SessionPersistenceError extends SessionError {
  constructor(
    operation: string,
    sessionId: string,
    cause: Error,
    context: ErrorContext = {}
  ) {
    super(
      `Session ${operation} failed for ${sessionId}: ${cause.message}`,
      {
        ...context,
        sessionId,
        operation,
        details: { cause: cause.message },
      },
      true
    );
    this.code = 'SESSION_PERSISTENCE_FAILED';
  }
}

// Filesystem Errors
export class FilesystemError extends VibeError {
  constructor(message: string, context: ErrorContext = {}, retryable = true) {
    super(
      message,
      ErrorCategory.FILESYSTEM,
      ErrorSeverity.MEDIUM,
      'FILESYSTEM_ERROR',
      context,
      retryable
    );
  }
}

export class FileNotFoundError extends FilesystemError {
  constructor(filePath: string, context: ErrorContext = {}) {
    super(`File not found: ${filePath}`, { ...context, resource: filePath }, false);
    this.code = 'FILE_NOT_FOUND';
  }
}

export class FileAccessError extends FilesystemError {
  constructor(
    operation: string,
    filePath: string,
    cause: Error,
    context: ErrorContext = {}
  ) {
    super(`File ${operation} failed for ${filePath}: ${cause.message}`, {
      ...context,
      operation,
      resource: filePath,
      details: { cause: cause.message },
    });
    this.code = 'FILE_ACCESS_ERROR';
  }
}

// Configuration Errors
export class ConfigurationError extends VibeError {
  constructor(message: string, context: ErrorContext = {}) {
    super(
      message,
      ErrorCategory.CONFIGURATION,
      ErrorSeverity.HIGH,
      'CONFIGURATION_ERROR',
      context
    );
  }
}

export class ConfigurationLoadError extends ConfigurationError {
  constructor(configPath: string, cause: Error, context: ErrorContext = {}) {
    super(`Failed to load configuration from ${configPath}: ${cause.message}`, {
      ...context,
      resource: configPath,
      details: { cause: cause.message },
    });
    this.code = 'CONFIGURATION_LOAD_FAILED';
  }
}

// System Errors
export class SystemError extends VibeError {
  constructor(message: string, context: ErrorContext = {}, retryable = false) {
    super(
      message,
      ErrorCategory.SYSTEM,
      ErrorSeverity.CRITICAL,
      'SYSTEM_ERROR',
      context,
      retryable
    );
  }
}

export class ResourceExhaustionError extends SystemError {
  constructor(resource: string, context: ErrorContext = {}) {
    super(`Resource exhaustion: ${resource}`, { ...context, resource });
    this.code = 'RESOURCE_EXHAUSTED';
  }
}

// Error utilities
export function isVibeError(error: unknown): error is VibeError {
  return error instanceof VibeError;
}

export function categorizeError(error: Error): VibeError {
  if (isVibeError(error)) {
    return error;
  }

  // Convert common Node.js errors to Vibe errors
  if (error.message.includes('ENOENT')) {
    const match = error.message.match(/open '([^']+)'/);
    const filePath = match?.[1] ?? 'unknown';
    return new FileNotFoundError(filePath, {
      details: { originalError: error.message },
    });
  }

  if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
    return new FileAccessError('access', 'unknown', error);
  }

  if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
    return new ResourceExhaustionError('file descriptors', {
      details: { originalError: error.message },
    });
  }

  // Default: wrap as system error
  return new SystemError(error.message, { details: { originalError: error.message } });
}

export function formatErrorForLogging(error: VibeError): Record<string, unknown> {
  return {
    error: {
      name: error.name,
      message: error.message,
      category: error.category,
      severity: error.severity,
      code: error.code,
      retryable: error.retryable,
      context: error.context,
    },
  };
}
