import type { WorkflowOrchestrator } from '../orchestrator.js';

export interface QueryWorkflowsResult {
  success: boolean;
  workflows?: {
    name: string;
    description: string;
    category: string | undefined;
    triggers: string[];
  }[];
  error?: string;
}

export interface QueryChecklistsResult {
  success: boolean;
  checklists?: {
    name: string;
    description: string | undefined;
    triggers: string[];
  }[];
  error?: string;
}

export interface AddToSessionResult {
  success: boolean;
  session_id?: string;
  message?: string;
  current_step?: unknown;
  workflow_stack?: string[];
  error?: string;
}

export class QueryHandlers {
  constructor(private orchestrator: WorkflowOrchestrator) {}

  async queryWorkflows(
    _pattern?: string,
    _category?: string
  ): Promise<QueryWorkflowsResult> {
    // TODO: Implement queryWorkflows in orchestrator
    return {
      success: false,
      error: 'queryWorkflows not yet implemented'
    };
  }

  async queryChecklists(_pattern?: string): Promise<QueryChecklistsResult> {
    // TODO: Implement queryChecklists in orchestrator
    return {
      success: false,
      error: 'queryChecklists not yet implemented'
    };
  }

  async addWorkflowToSession(
    _sessionId: string,
    _workflowName: string
  ): Promise<AddToSessionResult> {
    // TODO: Implement addWorkflowToSession in orchestrator
    return {
      success: false,
      error: 'addWorkflowToSession not yet implemented'
    };
  }

  async addChecklistToSession(
    _sessionId: string,
    _checklistName: string
  ): Promise<AddToSessionResult> {
    // TODO: Implement addChecklistToSession in orchestrator
    return {
      success: false,
      error: 'addChecklistToSession not yet implemented'
    };
  }
}
