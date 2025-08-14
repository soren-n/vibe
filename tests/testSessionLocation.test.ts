/**
 * Test to verify sessions are stored in user's project directory
 */

import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { WorkflowOrchestrator } from '../src/orchestrator.js';
import { VibeConfigImpl } from '../src/config.js';

describe('Session Storage Location', () => {
  let originalCwd: string;
  let testProjectDir: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    testProjectDir = path.join(__dirname, 'test-project-' + Date.now());

    // Create test project directory
    fs.mkdirSync(testProjectDir, { recursive: true });

    // Change to test project directory
    process.chdir(testProjectDir);
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Clean up test directory
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true });
    }
  });

  test('should store sessions in project .vibe directory', async () => {
    // Create orchestrator in the test project directory
    const config = new VibeConfigImpl();
    const orchestrator = new WorkflowOrchestrator(config);

    // Start a session
    const result = orchestrator.startSession('test session storage');
    expect(result.success).toBe(true);
    expect(result.session_id).toBeDefined();

    // Advance session to trigger async save
    const statusResult = orchestrator.getSessionStatus(result.session_id!);
    expect(statusResult.success).toBe(true);

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify session file exists in project .vibe directory
    const sessionFile = path.join(
      testProjectDir,
      '.vibe',
      'sessions',
      `${result.session_id}.json`
    );
    expect(fs.existsSync(sessionFile)).toBe(true);

    // Verify session data
    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    expect(sessionData.sessionId).toBe(result.session_id);
    expect(sessionData.prompt).toBe('test session storage');
  });

  test('should respect custom session directory from config', async () => {
    // Create config with custom session directory
    const customSessionDir = path.join(testProjectDir, 'custom-sessions');

    // Create a config file with custom session directory
    const configContent = `
session:
  sessionDir: ${customSessionDir}
`;
    fs.writeFileSync(path.join(testProjectDir, '.vibe.yaml'), configContent);

    // Load config and create orchestrator
    const config = await VibeConfigImpl.loadFromFile();
    const orchestrator = new WorkflowOrchestrator(config);

    // Start a session
    const result = orchestrator.startSession('test custom session dir');
    expect(result.success).toBe(true);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify session file exists in custom directory
    const sessionFile = path.join(customSessionDir, `${result.session_id}.json`);
    expect(fs.existsSync(sessionFile)).toBe(true);
  });
});
