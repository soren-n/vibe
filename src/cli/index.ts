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
} from './core-commands.js';

// Workflow Commands
export {
  handleWorkflowList,
  handleWorkflowShow,
  handleWorkflowValidate,
} from './workflow-commands.js';

// Plan Commands
export {
  handlePlanAdd,
  handlePlanClear,
  handlePlanComplete,
  handlePlanExpand,
  handlePlanStatus,
} from './plan-commands.js';

// Lint Commands
export { handleLintRun } from './lint-commands.js';

// Generic Commands
export { handleGuide, handleConfigShow } from './generic-commands.js';

// Utilities
export { withErrorHandling, getVersion } from './utils.js';
