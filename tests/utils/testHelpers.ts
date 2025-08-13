/**
 * Common test utilities and helpers
 * Provides reusable functions for common test scenarios
 */

import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';

/**
 * Utility for testing file operations with automatic cleanup tracking
 */
export class TestFileManager {
  private createdPaths: string[] = [];

  constructor(private baseDir: string) {}

  createFile(relativePath: string, content: string = ''): string {
    const fullPath = path.join(this.baseDir, relativePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content);
    this.createdPaths.push(fullPath);
    return fullPath;
  }

  createDirectory(relativePath: string): string {
    const fullPath = path.join(this.baseDir, relativePath);
    fs.mkdirSync(fullPath, { recursive: true });
    this.createdPaths.push(fullPath);
    return fullPath;
  }

  cleanup(): void {
    // Cleanup is typically handled by fixtures, but this provides explicit control
    for (const path of this.createdPaths.reverse()) {
      try {
        if (fs.existsSync(path)) {
          const stat = fs.statSync(path);
          if (stat.isDirectory()) {
            fs.rmSync(path, { recursive: true, force: true });
          } else {
            fs.unlinkSync(path);
          }
        }
      } catch (error) {
        console.warn(`Failed to cleanup ${path}:`, error);
      }
    }
    this.createdPaths = [];
  }

  getCreatedPaths(): string[] {
    return [...this.createdPaths];
  }
}

/**
 * Mock process utilities with automatic restoration
 */
export class ProcessMocker {
  private originalCwd: string;
  private originalEnv: NodeJS.ProcessEnv;
  private mockRestoreFunctions: (() => void)[] = [];

  constructor() {
    this.originalCwd = process.cwd();
    this.originalEnv = { ...process.env };
  }

  mockCwd(newCwd: string): void {
    vi.spyOn(process, 'cwd').mockReturnValue(newCwd);
  }

  mockEnv(envVars: Record<string, string>): void {
    for (const [key, value] of Object.entries(envVars)) {
      const originalValue = process.env[key];
      process.env[key] = value;

      this.mockRestoreFunctions.push(() => {
        if (originalValue === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalValue;
        }
      });
    }
  }

  restore(): void {
    // Restore all mocked functions
    vi.restoreAllMocks();

    // Restore environment variables
    this.mockRestoreFunctions.forEach(restore => restore());
    this.mockRestoreFunctions = [];

    // Restore process state
    process.env = this.originalEnv;
  }
}

/**
 * Async utilities for testing
 */
export class AsyncTestUtils {
  /**
   * Wait for condition with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Create a promise that can be resolved externally
   */
  static createControllablePromise<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (error: any) => void;
  } {
    let resolve!: (value: T) => void;
    let reject!: (error: any) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  }
}

/**
 * Test data builders for common scenarios
 */
export class TestDataBuilder {
  static createValidWorkflow(overrides: Record<string, any> = {}) {
    return {
      name: 'test-workflow',
      description: 'A test workflow',
      triggers: ['test'],
      steps: ['Step 1: Initialize', 'Step 2: Process', 'Step 3: Complete'],
      category: 'testing',
      tags: ['test', 'example'],
      ...overrides,
    };
  }

  static createValidConfig(overrides: Record<string, any> = {}) {
    return {
      project_type: 'typescript',
      workflows: {
        'test-workflow': this.createValidWorkflow(),
      },
      ...overrides,
    };
  }

  static createFileStructure() {
    return {
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        devDependencies: {
          typescript: '^4.0.0',
        },
      }),
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'es2020',
          module: 'commonjs',
        },
      }),
      src: {
        'index.ts': 'export default {};',
        utils: {
          'helper.ts': 'export const helper = () => {};',
        },
      },
      tests: {
        'example.test.ts': 'import { test } from "vitest"; test("example", () => {});',
      },
    };
  }
}

/**
 * Error simulation utilities
 */
export class ErrorSimulator {
  /**
   * Create a function that fails on specific call counts
   */
  static createFlakyFunction<T>(
    implementation: () => T,
    failOnCalls: number[] = [],
    errorMessage: string = 'Simulated error'
  ) {
    let callCount = 0;

    return () => {
      callCount++;
      if (failOnCalls.includes(callCount)) {
        throw new Error(errorMessage);
      }
      return implementation();
    };
  }

  /**
   * Mock fs operations to simulate failures
   */
  static mockFsFailure(
    operation: 'writeFileSync' | 'mkdirSync' | 'rmSync',
    errorMessage?: string
  ) {
    const spy = vi.spyOn(fs, operation);
    spy.mockImplementation(() => {
      throw new Error(errorMessage || `Mocked ${operation} failure`);
    });
    return spy;
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(
    fn: () => Promise<T> | T
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    return { result, duration };
  }

  /**
   * Assert that operation completes within time limit
   */
  static async assertWithinTime<T>(
    fn: () => Promise<T> | T,
    maxDuration: number,
    message?: string
  ): Promise<T> {
    const { result, duration } = await this.measureTime(fn);

    if (duration > maxDuration) {
      throw new Error(
        message || `Operation took ${duration}ms, expected < ${maxDuration}ms`
      );
    }

    return result;
  }
}
