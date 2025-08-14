/**
 * Clean SessionManager implementation for Phase 2
 * Provides both sync (for tests) and async (for production) APIs
 */

export type {
  CurrentStepInfo,
  EnhancedWorkflowSession,
  SessionConfig,
  WorkflowFrame,
  WorkflowStepObject,
} from './session/index.js';

export {
  SessionManager,
  WorkflowFrameImpl,
  WorkflowSessionImpl,
} from './session/index.js';
