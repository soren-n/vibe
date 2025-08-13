/**
 * Centralized test fixtures using Vitest's test.extend() system
 * Provides reusable, properly managed test utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { test as baseTest } from 'vitest';

// Define fixture types
interface TestFixtures {
  tempDir: string;
  tempFile: (filename?: string, content?: string) => string;
  cleanupFiles: string[];
}

/**
 * Extended test with automatic temp directory management
 */
export const test = baseTest.extend<TestFixtures>({
  tempDir: async ({}, use) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-test-'));
    const originalCwd = process.cwd();

    try {
      // Change to temp directory for test isolation
      process.chdir(tempDir);
      await use(tempDir);
    } finally {
      // Restore original working directory
      process.chdir(originalCwd);

      // Clean up temp directory
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
        // Don't throw to avoid masking test failures
      }
    }
  },

  tempFile: async ({ tempDir }, use) => {
    const createdFiles: string[] = [];

    const createTempFile = (filename?: string, content?: string): string => {
      const name =
        filename || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const filePath = path.join(tempDir, name);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Create file with content
      fs.writeFileSync(filePath, content || '');
      createdFiles.push(filePath);

      return filePath;
    };

    try {
      await use(createTempFile);
    } finally {
      // Individual file cleanup is handled by tempDir cleanup
      // This is here for completeness and potential future use
    }
  },

  cleanupFiles: async ({}, use) => {
    const filesToCleanup: string[] = [];

    try {
      await use(filesToCleanup);
    } finally {
      // Clean up any additional files tracked outside tempDir
      for (const file of filesToCleanup) {
        try {
          if (fs.existsSync(file)) {
            const stat = fs.statSync(file);
            if (stat.isDirectory()) {
              fs.rmSync(file, { recursive: true, force: true });
            } else {
              fs.unlinkSync(file);
            }
          }
        } catch (error) {
          console.warn(`Failed to cleanup file ${file}:`, error);
        }
      }
    }
  },
});

/**
 * Test fixture for configuration-based tests
 */
export const configTest = test.extend<{ configFile: (content: string) => string }>({
  configFile: async ({ tempFile }, use) => {
    const createConfigFile = (content: string): string => {
      return tempFile('.vibe.yaml', content);
    };

    await use(createConfigFile);
  },
});

/**
 * Test fixture for session-based tests with isolated session directory
 */
export const sessionTest = test.extend<{ sessionDir: string }>({
  sessionDir: async ({ tempDir }, use) => {
    const sessionDir = path.join(tempDir, 'sessions');
    fs.mkdirSync(sessionDir, { recursive: true });

    await use(sessionDir);
    // Cleanup handled by tempDir fixture
  },
});

/**
 * Utility for creating mock file structures
 */
export function createMockFileStructure(
  baseDir: string,
  structure: Record<string, string | Record<string, any>>
) {
  for (const [key, value] of Object.entries(structure)) {
    const fullPath = path.join(baseDir, key);

    if (typeof value === 'string') {
      // It's a file
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, value);
    } else {
      // It's a directory
      fs.mkdirSync(fullPath, { recursive: true });
      if (Object.keys(value).length > 0) {
        createMockFileStructure(fullPath, value);
      }
    }
  }
}

/**
 * Advanced fixture with fallback for different Node.js versions
 */
export const disposableTest = test.extend<{ disposableDir: string }>({
  disposableDir: async ({}, use) => {
    const prefix = path.join(os.tmpdir(), 'vibe-disposable-test-');

    // Use manual cleanup (disposable pattern available in Node.js 24.4.0+)
    const tempDir = fs.mkdtempSync(prefix);
    const originalCwd = process.cwd();

    try {
      process.chdir(tempDir);
      await use(tempDir);
    } finally {
      process.chdir(originalCwd);
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  },
});
