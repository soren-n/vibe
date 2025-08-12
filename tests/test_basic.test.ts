/**
 * Basic tests for vibe to enable self-testing.
 */

import { VibeConfig } from '../src/config';
import { PromptAnalyzer } from '../src/analyzer';

const packageJson = require('../package.json');

describe('Basic Vibe functionality', () => {
  test('version is defined and follows semantic versioning', () => {
    // Check that version follows semantic versioning pattern
    // Allows for dev versions or regular versions
    const versionPattern = /^\d+\.\d+\.\d+(?:\.dev\d+\+[a-f0-9g.]+)?$/;

    expect(packageJson.version).toBeDefined();
    expect(typeof packageJson.version).toBe('string');
    expect(packageJson.version).toMatch(versionPattern);
  });

  test('config can be loaded', async () => {
    const config = await VibeConfig.loadFromFile();

    // Project type should be auto-detected properly
    const detectedType = await config.detectProjectType();
    console.log('Detected project type:', detectedType);
    expect(['typescript', 'node', 'javascript', 'generic']).toContain(detectedType);

    // We should have some workflows loaded (either config-based or defaults)
    expect(Object.keys(config.workflows).length).toBeGreaterThan(0);

    // Check for either default workflows or loaded ones
    const workflowNames = Object.keys(config.workflows);
    const hasBasicWorkflows = workflowNames.some(name =>
      [
        'analysis',
        'implementation',
        'testing',
        'quality',
        'bootstrap',
        'lint',
      ].includes(name)
    );
    expect(hasBasicWorkflows).toBe(true);
  });

  test('prompt analysis works', async () => {
    const config = await VibeConfig.loadFromFile();
    const analyzer = new PromptAnalyzer(config);

    // Test analysis detection - should return some workflow
    const analysisWorkflows = await analyzer.analyze('analyze the project', false);
    expect(analysisWorkflows.length).toBeGreaterThan(0);

    // Test testing detection - should return some workflow
    const testingWorkflows = await analyzer.analyze('run tests', false);
    expect(testingWorkflows.length).toBeGreaterThan(0);
  });

  test('project type detection works', async () => {
    const config = await VibeConfig.loadFromFile();

    // This will detect the appropriate project type based on files present
    const projectType = await config.detectProjectType();
    console.log('Project type detection result:', projectType);
    expect(['typescript', 'node', 'javascript', 'generic']).toContain(projectType);
  });
});
