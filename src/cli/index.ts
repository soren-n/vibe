/**
 * CLI Command Handlers - Centralized exports
 */

// Core Commands
export {
  handleInit,
  handleRun,
  handleCheck,
  handleConfigInfo,
  handleValidate,
} from './core-commands';

// Workflow Commands
export {
  handleWorkflowList,
  handleWorkflowShow,
  handleWorkflowValidate,
} from './workflow-commands';

// Plan Commands
export {
  handlePlanAdd,
  handlePlanClear,
  handlePlanComplete,
  handlePlanExpand,
  handlePlanStatus,
} from './plan-commands';

// Lint Commands
export { handleLintRun } from './lint-commands';

// Generic Commands
export { handleGuide, handleConfigShow } from './generic-commands';

// Utilities
export { withErrorHandling, getVersion } from './utils';
