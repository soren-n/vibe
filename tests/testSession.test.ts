/**
 * Session management functionality tests
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  SessionConfig,
  SessionManager,
  WorkflowFrameImpl,
  WorkflowSessionImpl,
  WorkflowStepObject,
} from '../src/session';
import { VibeConfigImpl } from '../src/config';

// Add create method type to WorkflowSessionImpl for tests
interface WorkflowSessionImplWithCreate {
  create(
    prompt: string,
    workflowData: Array<[string, (string | WorkflowStepObject)[]]>,
    sessionConfig?: SessionConfig
  ): WorkflowSessionImpl;
}

const WorkflowSessionImplConstructor =
  WorkflowSessionImpl as typeof WorkflowSessionImpl & WorkflowSessionImplWithCreate;

// Test utilities
const createTestConfig = (): VibeConfigImpl => {
  const config = new VibeConfigImpl();
  // The actual config will use default paths, which is fine for testing
  return config;
};

const createTestSession = (
  sessionId?: string,
  isComplete?: boolean
): WorkflowSessionImpl => {
  const steps = isComplete ? [] : ['Step 1', 'Step 2', 'Step 3'];
  const currentStep = isComplete ? 3 : 0;

  const session = WorkflowSessionImplConstructor.create(
    'Test prompt for workflow execution',
    [['test_workflow', steps]],
    { interactive: false, maxSteps: 5 }
  );

  if (sessionId) {
    session.sessionId = sessionId;
  }

  if (isComplete && session.workflowStack.length > 0) {
    session.workflowStack[0]!.currentStep = currentStep;
  }

  return session;
};

describe('WorkflowFrame', () => {
  test('should create frame with string steps', () => {
    const frame = new WorkflowFrameImpl('test_workflow', ['Step 1', 'Step 2'], {});

    expect(frame.workflowName).toBe('test_workflow');
    expect(frame.steps).toEqual(['Step 1', 'Step 2']);
    expect(frame.currentStep).toBe(0);
    expect(frame.isComplete).toBe(false);
    expect(frame.currentStepText).toBe('Step 1');
  });

  test('should create frame with WorkflowStepObject steps', () => {
    const stepObjects: WorkflowStepObject[] = [
      { step_text: 'Run command', command: 'npm test' },
      { step_text: 'Check output', working_dir: '/tmp' },
    ];

    const frame = new WorkflowFrameImpl('complex_workflow', stepObjects, {});

    expect(frame.currentStepText).toBe('Run command');
    expect(frame.advance()).toBe(true);
    expect(frame.currentStepText).toBe('Check output');
  });

  test('should handle step advancement correctly', () => {
    const frame = new WorkflowFrameImpl('test', ['Step 1', 'Step 2'], {});

    // Advance through steps
    expect(frame.advance()).toBe(true);
    expect(frame.currentStep).toBe(1);
    expect(frame.currentStepText).toBe('Step 2');

    // Advance to completion
    expect(frame.advance()).toBe(true);
    expect(frame.currentStep).toBe(2);
    expect(frame.isComplete).toBe(true);
    expect(frame.currentStepText).toBe(null);

    // Cannot advance past completion
    expect(frame.advance()).toBe(false);
  });

  test('should handle empty workflow correctly', () => {
    const frame = new WorkflowFrameImpl('empty', [], {});

    expect(frame.isComplete).toBe(true);
    expect(frame.currentStepText).toBe(null);
    expect(frame.advance()).toBe(false);
  });
});

describe('WorkflowSession', () => {
  test('should create session with multiple workflows', () => {
    const session = WorkflowSessionImplConstructor.create(
      'Test session for multiple workflows',
      [
        ['workflow1', ['Step 1', 'Step 2']],
        ['workflow2', ['Step A', 'Step B', 'Step C']],
      ],
      { interactive: true }
    );

    expect(session.prompt).toBe('Test session for multiple workflows');
    expect(session.workflowStack).toHaveLength(2);
    expect(session.sessionConfig?.interactive).toBe(true);
    expect(session.isComplete).toBe(false);
  });

  test('should handle current frame correctly', () => {
    const session = createTestSession();

    const currentFrame = session.currentFrame;
    expect(currentFrame).not.toBeNull();
    expect(currentFrame?.workflowName).toBe('test_workflow');
    expect(currentFrame?.currentStep).toBe(0);
  });

  test('should advance through workflow steps', () => {
    const session = createTestSession();

    // Get initial step
    let currentStep = session.getCurrentStep();
    expect(currentStep?.step_number).toBe(1);
    expect(currentStep?.total_steps).toBe(3);
    expect(currentStep?.workflow).toBe('test_workflow');

    // Advance through steps
    expect(session.advanceStep()).toBe(true);
    currentStep = session.getCurrentStep();
    expect(currentStep?.step_number).toBe(2);

    expect(session.advanceStep()).toBe(true);
    currentStep = session.getCurrentStep();
    expect(currentStep?.step_number).toBe(3);

    // Complete workflow - should pop the workflow from stack
    expect(session.advanceStep()).toBe(false);
    expect(session.isComplete).toBe(true);
    expect(session.getCurrentStep()).toBeNull();
  });

  test('should handle going back steps', () => {
    const session = createTestSession();

    // Advance to step 2
    session.advanceStep();
    expect(session.getCurrentStep()?.step_number).toBe(2);

    // Go back to step 1
    expect(session.backStep()).toBe(true);
    expect(session.getCurrentStep()?.step_number).toBe(1);

    // Cannot go back further
    expect(session.backStep()).toBe(false);
    expect(session.getCurrentStep()?.step_number).toBe(1);
  });

  test('should restart session correctly', () => {
    const session = createTestSession();

    // Advance to middle of workflow
    session.advanceStep();
    session.advanceStep();
    expect(session.getCurrentStep()?.step_number).toBe(3);

    // Restart
    session.restartSession();
    expect(session.getCurrentStep()?.step_number).toBe(1);
    expect(session.isComplete).toBe(false);
  });

  test('should handle workflow stacking with pushWorkflow', () => {
    const session = createTestSession();

    // Push nested workflow
    session.pushWorkflow('nested_workflow', ['Nested Step 1', 'Nested Step 2'], {
      key: 'value',
    });

    expect(session.workflowStack).toHaveLength(2);
    expect(session.currentFrame?.workflowName).toBe('nested_workflow');
    expect(session.getCurrentStep()?.workflow).toBe('nested_workflow');
    expect(session.getCurrentStep()?.workflow_depth).toBe(2);
  });

  test('should break out of nested workflows', () => {
    const session = createTestSession();

    // Push nested workflow
    session.pushWorkflow('nested_workflow', ['Nested Step 1']);
    expect(session.workflowStack).toHaveLength(2);

    // Break back to parent
    expect(session.breakWorkflow()).toBe(true);
    expect(session.workflowStack).toHaveLength(1);
    expect(session.currentFrame?.workflowName).toBe('test_workflow');

    // Cannot break if only one workflow
    expect(session.breakWorkflow()).toBe(false);
  });

  test('should serialize and deserialize correctly', () => {
    const originalSession = createTestSession();
    originalSession.advanceStep(); // Move to step 2

    // Serialize
    const sessionDict = originalSession.toDict();
    expect(sessionDict.sessionId).toBe(originalSession.sessionId);
    expect(sessionDict.prompt).toBe(originalSession.prompt);
    expect(sessionDict.workflowStack).toHaveLength(1);

    // Deserialize (without vibeConfig for test)
    const restoredSession = WorkflowSessionImpl.fromDict(sessionDict);
    expect(restoredSession.sessionId).toBe(originalSession.sessionId);
    expect(restoredSession.prompt).toBe(originalSession.prompt);
    expect(restoredSession.getCurrentStep()?.step_number).toBe(2);
  });

  test('should handle step formatting correctly', () => {
    const commandStep = 'run npm test';
    const guidanceStep = 'Review the results';

    const session = WorkflowSessionImplConstructor.create('Test formatting', [
      ['test', [commandStep, guidanceStep]],
    ]);

    const step1 = session.getCurrentStep();
    expect(step1?.step_text).toContain('Execute without interaction');
    expect(step1?.is_command).toBe(true);

    session.advanceStep();
    const step2 = session.getCurrentStep();
    expect(step2?.step_text).toContain('Verify and report status briefly');
    expect(step2?.is_command).toBe(false);
  });
});

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(__dirname, 'test-sessions-' + Date.now());

    // Create config with isolated test directory
    const config = createTestConfig();
    sessionManager = new SessionManager(config);

    // Override the session directory for isolation
    (sessionManager as any).sessionDir = testDir;

    // Clean up test directory and clear in-memory sessions
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    (sessionManager as any).sessions.clear();

    // Ensure test directory is created
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should create and save session', () => {
    const session = sessionManager.createSession(
      'Test prompt',
      [['workflow1', ['Step 1', 'Step 2']]],
      { interactive: false }
    );

    expect(session.sessionId).toBeDefined();
    expect(session.prompt).toBe('Test prompt');

    // Should be able to load the session
    const loadedSession = sessionManager.loadSession(session.sessionId);
    expect(loadedSession).not.toBeNull();
    expect(loadedSession?.prompt).toBe('Test prompt');
  });

  test('should list active sessions', () => {
    const session1 = sessionManager.createSession('Prompt 1', [
      ['workflow1', ['Step 1']],
    ]);
    const session2 = sessionManager.createSession('Prompt 2', [
      ['workflow2', ['Step A']],
    ]);

    const sessions = sessionManager.listSessions();
    expect(sessions).toHaveLength(2);

    const sessionIds = sessions.map(s => s.sessionId);
    expect(sessionIds).toContain(session1.sessionId);
    expect(sessionIds).toContain(session2.sessionId);
  });

  test('should archive completed sessions', () => {
    const session = sessionManager.createSession('Test', [['workflow', ['Step 1']]]);
    expect(sessionManager.loadSession(session.sessionId)).not.toBeNull();

    const archived = sessionManager.archiveSession(session.sessionId);
    expect(archived).toBe(true);
    expect(sessionManager.loadSession(session.sessionId)).toBeNull();
  });

  test('should get session health summary', () => {
    const session1 = sessionManager.createSession('Active 1', [
      ['workflow', ['Step 1']],
    ]);
    const session2 = createTestSession('completed', true);
    sessionManager.saveSession(session2);

    const summary = sessionManager.getSessionHealthSummary();
    expect(summary.totalSessions).toBe(2);
    expect(summary.activeSessions).toBe(1);
    expect(summary.completedSessions).toBe(1);
  });

  test('should clean up old sessions', () => {
    // Create old session by manipulating lastAccessed date
    const oldSession = createTestSession('old');
    oldSession.lastAccessed = new Date(
      Date.now() - 8 * 24 * 60 * 60 * 1000
    ).toISOString(); // 8 days ago
    sessionManager.saveSession(oldSession);

    const recentSession = createTestSession('recent');
    sessionManager.saveSession(recentSession);

    const cleanedCount = sessionManager.cleanupOldSessions(7); // Clean sessions older than 7 days
    expect(cleanedCount).toBe(1);

    expect(sessionManager.loadSession(oldSession.sessionId)).toBeNull();
    expect(sessionManager.loadSession(recentSession.sessionId)).not.toBeNull();
  });
});

describe('Session Integration Tests', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    const config = createTestConfig();
    sessionManager = new SessionManager(config);

    // Clear in-memory sessions for isolation
    (sessionManager as any).sessions.clear();
  });

  test('should handle complete workflow lifecycle', () => {
    // Create session
    const session = sessionManager.createSession('Complete test workflow', [
      ['test_workflow', ['Initialize', 'Process', 'Finalize']],
    ]);

    // Execute workflow steps
    expect(session.getCurrentStep()?.step_text).toContain('Initialize');

    session.advanceStep();
    expect(session.getCurrentStep()?.step_text).toContain('Process');

    session.advanceStep();
    expect(session.getCurrentStep()?.step_text).toContain('Finalize');

    // Complete workflow
    session.advanceStep();
    expect(session.isComplete).toBe(true);

    // Archive completed session
    sessionManager.archiveSession(session.sessionId);
    expect(sessionManager.loadSession(session.sessionId)).toBeNull();
  });

  test('should handle nested workflow execution', () => {
    const session = sessionManager.createSession('Nested workflow test', [
      ['main_workflow', ['Main Step 1', 'Main Step 2']],
    ]);

    // Start main workflow
    expect(session.getCurrentStep()?.workflow).toBe('main_workflow');

    // Push nested workflow
    session.pushWorkflow('sub_workflow', ['Sub Step 1', 'Sub Step 2']);
    expect(session.getCurrentStep()?.workflow).toBe('sub_workflow');
    expect(session.getCurrentStep()?.workflow_depth).toBe(2);

    // Complete sub workflow - this should pop it and return to main
    session.advanceStep(); // Sub Step 2
    session.advanceStep(); // Complete sub workflow (pop it)

    // Should return to main workflow at step 1 (where we left off)
    expect(session.getCurrentStep()?.workflow).toBe('main_workflow');
    expect(session.getCurrentStep()?.step_number).toBe(1);
  });

  test('should persist session across manager restarts', async () => {
    const originalSession = sessionManager.createSession('Persistence test', [
      ['workflow', ['Step 1', 'Step 2']],
    ]);

    originalSession.advanceStep(); // Move to step 2
    await sessionManager.saveSessionAsync(originalSession);

    // Create new session manager with same session directory (simulating restart)
    const config = createTestConfig();
    const sessionDir = (sessionManager as any).sessionDir;
    const newSessionManager = new SessionManager(sessionDir, config);

    // Load sessions from disk
    await newSessionManager.loadSessionsAsync();

    // Should be able to load the session
    const loadedSession = newSessionManager.loadSession(originalSession.sessionId);
    expect(loadedSession).not.toBeNull();
    expect(loadedSession?.getCurrentStep()?.step_number).toBe(2);
  });
});
