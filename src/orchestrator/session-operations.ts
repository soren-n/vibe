/**
 * Session operations module for the orchestrator
 * Extracted from orchestrator.ts for better modularity
 */

import type { CurrentStepInfo, SessionManager } from '../session.js';

/**
 * Response interface for session operations
 */
export interface SessionResponse {
  success: boolean;
  session_id?: string;
  prompt?: string;
  current_step?: CurrentStepInfo | null;
  workflow_stack?: string[];
  is_complete?: boolean;
  error?: string;
  sessions?: SessionInfo[];
  advanced?: boolean;
  backed?: boolean;
  broken?: boolean;
  restarted?: boolean;
  // Extended properties for orchestrator compatibility
  created_at?: string;
  last_accessed?: string;
  monitoring_data?: Record<string, unknown>;
  cleaned_sessions?: string[];
  alert_detected?: boolean;
  alert_type?: string;
  severity?: string;
  message?: string;
  intervention_message?: string;
  suggested_actions?: string[];
  total?: number;
  total_workflows?: number;
  recommendations?: string[];
}

/**
 * Session information for listings
 */
export interface SessionInfo {
  sessionId: string;
  prompt: string;
  createdAt: string;
  isComplete: boolean;
}

/**
 * Handles getting session status
 */
export function handleSessionStatus(
  sessionManager: SessionManager,
  sessionId: string
): SessionResponse {
  const session = sessionManager.loadSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session ${sessionId} not found`,
    };
  }

  const currentStep = session.getCurrentStep();
  return {
    success: true,
    session_id: sessionId,
    current_step: currentStep,
    workflow_stack: session.workflowStack.map(
      (w: { workflowName: string }) => w.workflowName
    ),
    is_complete: session.isComplete,
  };
}

/**
 * Handles session advancement
 */
export function handleSessionAdvance(
  sessionManager: SessionManager,
  sessionId: string
): SessionResponse {
  const session = sessionManager.loadSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session ${sessionId} not found`,
    };
  }

  const hasNext = session.advanceStep();

  if (hasNext) {
    sessionManager.saveSession(session);
    const currentStep = session.getCurrentStep();
    return {
      success: true,
      session_id: sessionId,
      current_step: currentStep,
      workflow_stack: session.workflowStack.map(
        (w: { workflowName: string }) => w.workflowName
      ),
      is_complete: session.isComplete,
      advanced: true,
    };
  } else {
    // Session is complete
    sessionManager.saveSession(session);
    return {
      success: true,
      session_id: sessionId,
      current_step: null,
      workflow_stack: session.workflowStack.map(
        (w: { workflowName: string }) => w.workflowName
      ),
      is_complete: true,
      advanced: true,
    };
  }
}

/**
 * Handles going back a step in the session
 */
export function handleSessionBack(
  sessionManager: SessionManager,
  sessionId: string
): SessionResponse {
  const session = sessionManager.loadSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session ${sessionId} not found`,
    };
  }

  const success = session.backStep();

  if (success) {
    sessionManager.saveSession(session);
    const currentStep = session.getCurrentStep();
    return {
      success: true,
      session_id: sessionId,
      current_step: currentStep,
      workflow_stack: session.workflowStack.map(
        (w: { workflowName: string }) => w.workflowName
      ),
      is_complete: session.isComplete,
      backed: true,
    };
  } else {
    return {
      success: false,
      session_id: sessionId,
      error: 'Cannot go back further',
    };
  }
}

/**
 * Handles breaking out of the current workflow
 */
export function handleSessionBreak(
  sessionManager: SessionManager,
  sessionId: string
): SessionResponse {
  const session = sessionManager.loadSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session ${sessionId} not found`,
    };
  }

  const success = session.breakWorkflow();

  if (success) {
    sessionManager.saveSession(session);
    const currentStep = session.getCurrentStep();
    return {
      success: true,
      session_id: sessionId,
      current_step: currentStep,
      workflow_stack: session.workflowStack.map(
        (w: { workflowName: string }) => w.workflowName
      ),
      is_complete: session.isComplete,
      broken: true,
    };
  } else {
    return {
      success: false,
      session_id: sessionId,
      error: 'Cannot break from last workflow',
    };
  }
}

/**
 * Handles restarting a session
 */
export function handleSessionRestart(
  sessionManager: SessionManager,
  sessionId: string
): SessionResponse {
  const session = sessionManager.loadSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session ${sessionId} not found`,
    };
  }

  session.restartSession();
  sessionManager.saveSession(session);

  const currentStep = session.getCurrentStep();
  return {
    success: true,
    session_id: sessionId,
    current_step: currentStep,
    workflow_stack: session.workflowStack.map(
      (w: { workflowName: string }) => w.workflowName
    ),
    is_complete: session.isComplete,
    restarted: true,
    message: 'Session restarted from the beginning',
  };
}

/**
 * Handles session listing
 */
export function handleSessionList(sessionManager: SessionManager): SessionResponse {
  try {
    const sessions = sessionManager.listSessions();
    const sessionInfos: SessionInfo[] = sessions.map(session => ({
      sessionId: session.sessionId,
      prompt: session.prompt,
      createdAt: session.createdAt,
      isComplete: session.isComplete,
    }));

    return {
      success: true,
      sessions: sessionInfos,
      total: sessionInfos.length,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
