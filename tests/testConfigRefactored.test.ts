/**
 * Example refactored test using modern fixtures
 * This demonstrates how to convert existing tests to use the new fixture system
 */

import { describe, expect } from 'vitest';
import { test, configTest, createMockFileStructure } from './utils/fixtures';
import { VibeConfigImpl } from '../src/config';

describe('Refactored Config Tests with Fixtures', () => {
  describe('Config file loading with fixtures', () => {
    test('loads default config when no file exists', async ({ tempDir }) => {
      // Test automatically runs in isolated temp directory
      const config = await VibeConfigImpl.loadFromFile();

      expect(config).toBeDefined();
      expect(config.projectType).toBe('auto');
      expect(Object.keys(config.workflows).length).toBeGreaterThan(0);
      expect(Object.keys(config.projectTypes).length).toBeGreaterThan(0);
    });

    configTest('finds config file in current directory', async ({ configFile }) => {
      // Use configFile fixture for easy config creation
      const configContent = `
project_type: typescript
workflows:
  custom-workflow:
    enabled: true
    priority: 1
    triggers: ["custom"]
    description: "Custom workflow"
`;

      configFile(configContent);
      const config = await VibeConfigImpl.loadFromFile();

      expect(config.projectType).toBe('typescript');
      expect(config.workflows['custom-workflow']).toBeDefined();
      expect(config.workflows['custom-workflow'].priority).toBe(1);
    });

    test('handles complex file structures', async ({ tempDir, tempFile }) => {
      // Create complex directory structure
      createMockFileStructure(tempDir, {
        src: {
          'index.ts': 'export default {};',
          utils: {
            'helper.ts': 'export const helper = () => {};',
          },
        },
        tests: {
          'example.test.ts': 'test("example", () => {});',
        },
        'package.json': '{"name": "test-project"}',
        '.gitignore': 'node_modules/\n*.log',
      });

      // Create additional files using tempFile fixture
      const configPath = tempFile('.vibe.yaml', 'project_type: typescript');
      const readmePath = tempFile('README.md', '# Test Project');

      const config = await VibeConfigImpl.loadFromFile();
      const projectType = await config.detectProjectType();

      expect(projectType).toBe('typescript');
      expect(configPath).toContain('.vibe.yaml');
      expect(readmePath).toContain('README.md');
    });
  });

  describe('Error handling and edge cases', () => {
    test('handles file cleanup gracefully', async ({ tempDir, cleanupFiles }) => {
      // Test demonstrates proper error handling in cleanup
      const testFile = tempDir + '/test-file.txt';

      try {
        // Simulate file operations that might fail
        await new Promise(resolve => setTimeout(resolve, 10));

        // Add file to cleanup list for demonstration
        cleanupFiles.push(testFile);

        expect(tempDir).toBeDefined();
      } catch (error) {
        // Fixture cleanup will handle temp directory even if test fails
        throw error;
      }
    });
  });
});
