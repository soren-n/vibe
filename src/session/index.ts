export type {
  CurrentStepInfo,
  EnhancedWorkflowSession,
  SessionConfig,
  WorkflowFrame,
  WorkflowStepObject,
} from './types.js';

export { WorkflowFrameImpl } from './workflow-frame.js';
export { WorkflowSessionImpl } from './workflow-session.js';
export { SessionManager } from './session-manager.js';

// Legacy compatibility
import './legacy.js';
