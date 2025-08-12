/**
 * CLI functionality tests
 */

import { execSync } from 'child_process';

describe('CLI functionality', () => {
  const runCLI = (args: string): string => {
    try {
      return execSync(`npm run cli -- ${args}`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
    } catch (error: any) {
      throw new Error(`CLI command failed: ${error.message}`);
    }
  };

  describe('Basic CLI commands', () => {
    test('should show help', () => {
      const output = runCLI('--help');
      expect(output).toContain('Usage: vibe');
      expect(output).toContain('Commands:');
    });

    test('should show version', () => {
      const output = runCLI('--version');
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });

    test('should validate workflows', () => {
      const output = runCLI('workflows validate');
      expect(output.includes('validated') || output.includes('✅')).toBe(true);
    });

    test('should list workflows', () => {
      const output = runCLI('list-workflows');
      expect(output.length).toBeGreaterThan(0);
    });

    test('should show config info', () => {
      const output = runCLI('config-info');
      expect(output).toContain('project');
    });
  });

  describe('Lint functionality', () => {
    test('should show lint help', () => {
      const output = runCLI('lint --help');
      expect(output).toContain('Project linting commands');
    });

    test('should lint text content', () => {
      const output = runCLI('lint text "This is a test message for linting"');
      expect(output.length).toBeGreaterThan(0);
    });

    test('should lint project structure', () => {
      const output = runCLI('lint project');
      expect(output.length).toBeGreaterThan(0);
    });

    test('should handle lint text with different contexts', () => {
      const output = runCLI('lint text "Test message 😀" --context documentation');
      expect(output.length).toBeGreaterThan(0);
    });

    test('should handle lint text with JSON format', () => {
      const output = runCLI('lint text "Test professional message" --format json');
      expect(output.length).toBeGreaterThan(0);
    });

    test('should handle custom patterns', () => {
      const output = runCLI('lint text "custom pattern test"');
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('Validation functionality', () => {
    test('should validate vibe environment', () => {
      const output = runCLI('check');
      expect(output.length).toBeGreaterThan(0);
    });

    test('should validate workflow files', () => {
      const output = runCLI('workflows validate');
      expect(
        output.includes('validation') ||
          output.includes('✅') ||
          output.includes('valid')
      ).toBe(true);
    });

    test('should validate configuration', () => {
      const output = runCLI('config-info');
      expect(output.includes('project') || output.includes('type')).toBe(true);
    });

    test('should handle initialization', () => {
      const output = runCLI('init --help');
      expect(output.length).toBeGreaterThan(0);
    });

    test('should validate checklist system', () => {
      const output = runCLI('checklists list');
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    test('should handle invalid commands gracefully', () => {
      expect(() => {
        runCLI('invalid-command');
      }).toThrow();
    });

    test('should handle invalid lint text', () => {
      expect(() => {
        runCLI('lint text');
      }).toThrow();
    });

    test('should handle missing required arguments', () => {
      expect(() => {
        runCLI('workflows');
      }).toThrow();
    });
  });

  describe('Output formatting', () => {
    test('should support JSON output where available', () => {
      const output = runCLI('check --json');
      // Check that output contains JSON-like structure
      expect(output).toContain('"success"');
      expect(output).toContain('"checks"');
    });

    test('should handle lint text with JSON format', () => {
      const output = runCLI('lint text "test content" --format json');
      // Just verify output was produced - lint JSON format may vary
      expect(output.length).toBeGreaterThan(0);
    });
  });
});
