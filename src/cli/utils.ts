/**
 * CLI utilities for common patterns and error handling
 */

export interface CLIResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

interface CLISuccessResult extends CLIResult {
  success: true;
}

interface CLIErrorResult extends CLIResult {
  success: false;
  error: string;
}

/**
 * Creates a standardized success response for CLI commands
 */
export function createSuccessResponse(
  data: Record<string, unknown> | unknown = {}
): CLISuccessResult {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return {
      success: true,
      ...(data as Record<string, unknown>),
    };
  }
  return {
    success: true,
    data,
  };
}

/**
 * Creates a standardized error response for CLI commands
 */
export function createErrorResponse(error: string | Error): CLIErrorResult {
  const errorMessage = error instanceof Error ? error.message : error;
  return {
    success: false,
    error: errorMessage,
  };
}

/**
 * Wraps a CLI action with standardized error handling and JSON output
 */
export function withErrorHandling<T extends unknown[]>(
  action: (...args: T) => Promise<CLIResult> | CLIResult
) {
  return async (...args: T): Promise<void> => {
    try {
      const result = await action(...args);
      console.log(JSON.stringify(result, null, 2));

      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      const errorResult = createErrorResponse(
        error instanceof Error ? error : String(error)
      );
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  };
}

/**
 * Suppresses console.log output during execution (useful for JSON commands)
 */
export function withSuppressedOutput<T>(action: () => T): T {
  const originalLog = console.log;
  console.log = (): void => {};

  try {
    const result = action();
    console.log = originalLog;
    return result;
  } catch (error) {
    console.log = originalLog;
    throw error;
  }
}

/**
 * Gets the version from package.json with fallback
 */
export function getVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const packageJson = require('../../package.json');
    return packageJson.version;
  } catch (_error) {
    return '1.0.0'; // fallback version
  }
}

/**
 * Validates that a required argument is provided
 */
function _validateRequired<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === null || value === '') {
    throw new Error(`Required argument '${name}' is missing`);
  }
  return value;
}

/**
 * Safely handles file system operations with better error messages
 */
export async function safeFileOperation<T>(
  operation: () => Promise<T> | T,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${context}: ${error.message}`);
    }
    throw new Error(`${context}: Unknown error occurred`);
  }
}
