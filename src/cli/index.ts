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

// MCP Commands
export {
  handleMCPStart,
  handleMCPStatus,
  handleMCPNext,
  handleMCPBack,
  handleMCPBreak,
  handleMCPRestart,
  handleMCPList,
} from './mcp-commands';

// Workflow Commands
export {
  handleWorkflowList,
  handleWorkflowShow,
  handleWorkflowValidate,
} from './workflow-commands';

// Checklist Commands
export {
  handleChecklistList,
  handleChecklistShow,
  handleChecklistRun,
} from './checklist-commands';

// Lint Commands
export { handleLintRun } from './lint-commands';

// Generic Commands
export { handleGuide, handleConfigShow } from './generic-commands';

// Utilities
export { withErrorHandling, getVersion } from './utils';
