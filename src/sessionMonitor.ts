/**
 * Session Monitor - Detects and intervenes when agents forget workflow completion.
 *
 * This module implements multiple strategies to catch agents when they:
 * 1. Start workflows but forget to advance/break them
 * 2. Summarize and stop without checking workflow status
 * 3. Leave sessions in dormant states
 *
 * Based on research from LangGraph (checkpointing, state persistence) and
 * Dapr Agents (workflow monitoring, completion tracking).
 */

import type { WorkflowOrchestrator } from './orchestrator';
import type { EnhancedWorkflowSession, SessionManager } from './session';

/**
 * Represents an alert about a session that needs attention
 */
export interface SessionAlert {
  session_id: string;
  alert_type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  suggested_actions: string[];
}

/**
 * Session status summary for monitoring dashboard
 */
export interface SessionStatusSummary {
  total_active_sessions: number;
  dormant_sessions: number;
  stale_sessions: number;
  forgotten_completions: number;
  alerts: {
    session_id: string;
    type: string;
    severity: string;
    message: string;
    timestamp: string;
    suggested_actions: string[];
  }[];
  session_details: {
    session_id: string;
    created_at: string;
    last_accessed: string;
    current_workflow: string | null;
    current_step: number | null;
    total_steps: number;
    is_complete: boolean;
  }[];
}

/**
 * Monitors workflow sessions and intervenes when agents forget to complete them.
 *
 * Features:
 * - Detects dormant sessions based on inactivity
 * - Analyzes response patterns for completion indicators
 * - Provides automated reminders and suggestions
 * - Tracks session health metrics
 */
export class SessionMonitor {
  private orchestrator: WorkflowOrchestrator;
  private sessionManager: SessionManager;

  // Configuration
  private dormantThresholdMinutes = 10; // Sessions inactive for 10+ minutes
  private staleThresholdMinutes = 30; // Sessions inactive for 30+ minutes
  private maxSessionAgeHours = 6; // Auto-archive after 6 hours

  // Pattern detection for completion indicators
  private completionPatterns = [
    /\b(summary|conclusion|concludes|final|complete|done|finished|ready)\b/,
    /\b(that|this) (should|completes|completed)\b/,
    /\b(we have|i have) (completed|finished|done)\b/,
    /\b(in summary|to summarize|to conclude)\b/,
  ];

  // Pattern detection for workflow continuation indicators
  private continuationPatterns = [
    /\b(next|continue|proceed|advance|step)\b/,
    /\b(next steps?|follow.?up|moving forward)\b/,
    /\b(workflow|checklist|session)\b/,
    /\b(let me|i will|shall we)\b/,
  ];

  // Track recent agent responses for pattern analysis
  private responseHistory = new Map<string, { response: string; timestamp: Date }[]>();

  constructor(orchestrator: WorkflowOrchestrator) {
    this.orchestrator = orchestrator;
    this.sessionManager = orchestrator.sessionManagerInstance;
  }

  /**
   * Check all active sessions for health issues and return alerts
   */
  async checkSessionHealth(): Promise<SessionAlert[]> {
    const alerts: SessionAlert[] = [];
    const activeSessions = await this.getActiveSessions();

    for (const session of activeSessions) {
      // Check for dormant sessions
      if (this.isSessionDormant(session)) {
        alerts.push(this.createDormantAlert(session));
      }

      // Check for stale sessions
      if (this.isSessionStale(session)) {
        alerts.push(this.createStaleAlert(session));
      }

      // Check for sessions that should be auto-archived
      if (this.shouldAutoArchive(session)) {
        alerts.push(this.createArchiveAlert(session));
      }
    }

    return alerts;
  }

  /**
   * Analyze an agent response for patterns indicating forgotten workflow completion
   */
  analyzeAgentResponse(sessionId: string, response: string): SessionAlert | null {
    // First check if session exists and is still active
    const session = this.sessionManager.loadSession(sessionId);
    if (!session || session.isComplete) {
      return null;
    }

    // Store response in history
    if (!this.responseHistory.has(sessionId)) {
      this.responseHistory.set(sessionId, []);
    }

    const history = this.responseHistory.get(sessionId)!;
    history.push({ response, timestamp: new Date() });

    // Keep only recent responses (last 5)
    if (history.length > 5) {
      history.splice(0, history.length - 5);
    }

    // Check for completion patterns without workflow management
    if (
      this._hasCompletionPattern(response) &&
      !this._hasWorkflowManagement(response)
    ) {
      return this._createForgottenCompletionAlert(sessionId, response);
    }

    return null;
  }

  /**
   * Generate an intervention message to remind the agent about workflow management
   */
  async generateInterventionMessage(alert: SessionAlert): Promise<string> {
    const session = await this.sessionManager.loadSession(alert.session_id);
    if (!session) {
      return '';
    }

    const currentStep = session.getCurrentStep();

    switch (alert.alert_type) {
      case 'forgotten_completion':
        return this._formatCompletionReminder(session, currentStep);
      case 'dormant_session':
        return this._formatDormantReminder(session, currentStep);
      case 'stale_session':
        return this._formatStaleReminder(session, currentStep);
      default:
        return '';
    }
  }

  /**
   * Get a summary of all session statuses for monitoring dashboard
   */
  async getSessionStatusSummary(): Promise<SessionStatusSummary> {
    const activeSessions = await this.getActiveSessions();
    const alerts = await this.checkSessionHealth();

    return {
      total_active_sessions: activeSessions.length,
      dormant_sessions: alerts.filter(a => a.alert_type === 'dormant_session').length,
      stale_sessions: alerts.filter(a => a.alert_type === 'stale_session').length,
      forgotten_completions: alerts.filter(a => a.alert_type === 'forgotten_completion')
        .length,
      alerts: alerts.map(a => ({
        session_id: a.session_id,
        type: a.alert_type,
        severity: a.severity,
        message: a.message,
        timestamp: a.timestamp.toISOString(),
        suggested_actions: a.suggested_actions,
      })),
      session_details: activeSessions.map((s: any) => {
        const currentFrame = s.currentFrame;
        return {
          session_id: s.sessionId,
          created_at: s.createdAt,
          last_accessed: s.lastAccessed,
          current_workflow: currentFrame?.workflowName ?? null,
          current_step: currentFrame?.currentStep ?? null,
          total_steps: currentFrame?.steps.length ?? 0,
          is_complete: s.isComplete,
        };
      }),
    };
  }

  /**
   * Automatically clean up sessions that have been stale for too long
   */
  async cleanupStaleSessions(): Promise<string[]> {
    const cleanedSessions: string[] = [];
    const activeSessions = await this.getActiveSessions();

    for (const session of activeSessions) {
      if (this.shouldAutoArchive(session)) {
        console.log(`Auto-archiving stale session ${session.sessionId}`);
        await this.sessionManager.archiveSession(session.sessionId);
        cleanedSessions.push(session.sessionId);
      }
    }

    return cleanedSessions;
  }

  // Private helper methods

  /**
   * Get all currently active workflow sessions
   */
  private async getActiveSessions(): Promise<EnhancedWorkflowSession[]> {
    const sessions: EnhancedWorkflowSession[] = [];
    const sessionIds = await this.sessionManager.listActiveSessions();

    for (const sessionId of sessionIds) {
      const session = await this.sessionManager.loadSession(sessionId);
      if (session && !session.isComplete) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Check if a session is dormant (inactive for dormant_threshold_minutes)
   */
  private isSessionDormant(session: EnhancedWorkflowSession): boolean {
    const threshold = new Date(Date.now() - this.dormantThresholdMinutes * 60 * 1000);
    const lastAccessed = new Date(session.lastAccessed);
    return lastAccessed < threshold;
  }

  /**
   * Check if a session is stale (inactive for stale_threshold_minutes)
   */
  private isSessionStale(session: EnhancedWorkflowSession): boolean {
    const threshold = new Date(Date.now() - this.staleThresholdMinutes * 60 * 1000);
    const lastAccessed = new Date(session.lastAccessed);
    return lastAccessed < threshold;
  }

  /**
   * Check if a session should be automatically archived
   */
  private shouldAutoArchive(session: EnhancedWorkflowSession): boolean {
    const threshold = new Date(Date.now() - this.maxSessionAgeHours * 60 * 60 * 1000);
    const createdAt = new Date(session.createdAt);
    return createdAt < threshold;
  }

  /**
   * Check if text contains patterns indicating completion
   */
  private _hasCompletionPattern(text: string): boolean {
    const textLower = text.toLowerCase();
    return this.completionPatterns.some(pattern => pattern.test(textLower));
  }

  /**
   * Check if text contains workflow management keywords
   */
  private _hasWorkflowManagement(text: string): boolean {
    const workflowKeywords = [
      'advance_workflow',
      'break_workflow',
      'get_workflow_status',
      'list_workflow_sessions',
      'workflow status',
      'next step',
      'continue workflow',
      'complete workflow',
    ];
    const textLower = text.toLowerCase();
    return workflowKeywords.some(keyword => textLower.includes(keyword));
  }

  /**
   * Create an alert for a dormant session
   */
  private createDormantAlert(session: EnhancedWorkflowSession): SessionAlert {
    const minutesInactive =
      (Date.now() - new Date(session.lastAccessed).getTime()) / (1000 * 60);

    return {
      session_id: session.sessionId,
      alert_type: 'dormant_session',
      message: `Session has been inactive for ${minutesInactive.toFixed(1)} minutes`,
      severity: 'medium',
      timestamp: new Date(),
      suggested_actions: [
        'Check if workflow should be advanced',
        'Consider breaking out of workflow if complete',
        'Verify if session is still needed',
      ],
    };
  }

  /**
   * Create an alert for a stale session
   */
  private createStaleAlert(session: EnhancedWorkflowSession): SessionAlert {
    const minutesInactive =
      (Date.now() - new Date(session.lastAccessed).getTime()) / (1000 * 60);

    return {
      session_id: session.sessionId,
      alert_type: 'stale_session',
      message: `Session has been inactive for ${minutesInactive.toFixed(1)} minutes and may be abandoned`,
      severity: 'high',
      timestamp: new Date(),
      suggested_actions: [
        'Archive session if no longer needed',
        'Break out of workflow to clean up',
        'Check if session was forgotten',
      ],
    };
  }

  /**
   * Create an alert for a session that should be archived
   */
  private createArchiveAlert(session: EnhancedWorkflowSession): SessionAlert {
    const hoursOld =
      (Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60);

    return {
      session_id: session.sessionId,
      alert_type: 'auto_archive',
      message: `Session is ${hoursOld.toFixed(1)} hours old and will be auto-archived`,
      severity: 'low',
      timestamp: new Date(),
      suggested_actions: [
        'Session will be automatically archived',
        'No action required unless session is still active',
      ],
    };
  }

  /**
   * Create an alert for forgotten workflow completion
   */
  private _createForgottenCompletionAlert(
    sessionId: string,
    _response: string
  ): SessionAlert {
    return {
      session_id: sessionId,
      alert_type: 'forgotten_completion',
      message: 'Agent provided completion-like response without managing workflow',
      severity: 'high',
      timestamp: new Date(),
      suggested_actions: [
        'Remind agent to call advance_workflow',
        'Check if workflow should be completed with break_workflow',
        'Verify workflow status with get_workflow_status',
      ],
    };
  }

  /**
   * Format a reminder message for forgotten completion
   */
  private _formatCompletionReminder(
    session: EnhancedWorkflowSession,
    currentStep: any
  ): string {
    let stepInfo = '';
    if (currentStep && session.currentFrame) {
      stepInfo =
        `You are currently on step ${currentStep.step_number ?? 'N/A'} of ` +
        `${session.currentFrame.steps.length} in the ` +
        `'${currentStep.workflow ?? session.currentFrame.workflowName}' workflow.`;
    }

    return `
**Workflow Management Reminder**

I notice you may have completed a task, but there's an active workflow
session that needs attention.

${stepInfo}

**Please choose one of the following actions:**
- \`advance_workflow\` - Mark current step complete and move to next step
- \`break_workflow\` - Exit the current workflow (if task is complete)
- \`get_workflow_status\` - Check current workflow status

**Session ID:** \`${session.sessionId}\`

This ensures proper workflow completion and prevents orphaned sessions.
`.trim();
  }

  /**
   * Format a reminder message for dormant sessions
   */
  private _formatDormantReminder(
    session: EnhancedWorkflowSession,
    currentStep: any
  ): string {
    let stepInfo = '';
    if (currentStep) {
      stepInfo = `Current step: ${currentStep.step_text ?? currentStep.message ?? 'N/A'}`;
    }

    return `
🔄 **Active Workflow Session Detected**

You have a workflow session that's been inactive.

**Session:** \`${session.sessionId}\`
**Workflow:** \`${session.currentFrame?.workflowName ?? 'Unknown'}\`
${stepInfo}

**Consider:**
- \`get_workflow_status\` - Check what step you're on
- \`advance_workflow\` - Continue to next step if current is complete
- \`break_workflow\` - Exit if workflow is no longer needed
`.trim();
  }

  /**
   * Format a reminder message for stale sessions
   */
  private _formatStaleReminder(
    session: EnhancedWorkflowSession,
    _currentStep: any
  ): string {
    return `
**Stale Workflow Session**

Session \`${session.sessionId}\` has been inactive for a significant time.

**Recommended action:**
- \`break_workflow\` - Clean up if workflow is complete/abandoned
- \`list_workflow_sessions\` - Review all active sessions

**Note:** Sessions inactive for ${this.maxSessionAgeHours} hours will be
auto-archived.
`.trim();
  }
}
