import type { WorkflowOrchestrator } from '../orchestrator.js';

interface WorkflowResult {
  success: boolean;
  result?: unknown;
}

interface WorkflowStatusResult {
  success: boolean;
  status: unknown;
}

interface StartWorkflowResult {
  success: boolean;
  session_id: string;
  workflow: unknown;
  current_step: unknown;
}

interface ListSessionsResult {
  success: boolean;
  sessions: unknown;
}

export class WorkflowHandlers {
  constructor(private orchestrator: WorkflowOrchestrator) {}

  async startWorkflow(
    prompt: string,
    _interactive: boolean = false
  ): Promise<StartWorkflowResult> {
    const result = this.orchestrator.startSession(prompt);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to start session');
    }
    return {
      success: true,
      session_id: result.session_id ?? '',
      workflow: result.workflow_stack,
      current_step: result.current_step,
    };
  }

  async getWorkflowStatus(sessionId: string): Promise<WorkflowStatusResult> {
    const status = this.orchestrator.getSessionStatus(sessionId);
    return {
      success: true,
      status,
    };
  }

  async advanceWorkflow(sessionId: string): Promise<WorkflowResult> {
    const result = this.orchestrator.advanceSession(sessionId);
    return {
      success: true,
      result,
    };
  }

  async backWorkflow(sessionId: string): Promise<WorkflowResult> {
    const result = this.orchestrator.backSession(sessionId);
    return {
      success: true,
      result,
    };
  }

  async breakWorkflow(sessionId: string): Promise<WorkflowResult> {
    const result = this.orchestrator.breakSession(sessionId);
    return {
      success: true,
      result,
    };
  }

  async restartWorkflow(sessionId: string): Promise<WorkflowResult> {
    const result = this.orchestrator.restartSession(sessionId);
    return {
      success: true,
      result,
    };
  }

  async listWorkflowSessions(): Promise<ListSessionsResult> {
    const sessions = this.orchestrator.sessionManagerInstance.listSessions();
    return {
      success: true,
      sessions,
    };
  }
}
