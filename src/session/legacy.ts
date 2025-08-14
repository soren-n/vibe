import type { VibeConfigImpl } from '../config.js';
import { generateSessionId } from '../utils/ids.js';
import type { SessionConfig, WorkflowStepObject } from './types.js';
import { WorkflowSessionImpl } from './workflow-session.js';

/**
 * Legacy create method for test compatibility
 */
export function createLegacySession(
  prompt: string,
  workflowData: Array<[string, (string | WorkflowStepObject)[]]>,
  sessionConfig?: SessionConfig
): WorkflowSessionImpl {
  // Use a mock VibeConfig for tests
  const mockConfig = {
    session: { maxSessions: 10, sessionTimeout: 3600000 },
    lint: {},
    workflows: {},
    projectType: 'auto',
    projectTypes: {},
  } as VibeConfigImpl;

  const sessionId = generateSessionId();
  const session = new WorkflowSessionImpl(sessionId, prompt, mockConfig, sessionConfig);

  for (const [workflowName, steps] of workflowData) {
    session.pushWorkflow(workflowName, steps);
  }

  return session;
}

// Add legacy create method to WorkflowSessionImpl class
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(WorkflowSessionImpl as any).create = createLegacySession;
