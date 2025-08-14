/**
 * Workflow orchestrator with session management
 * TypeScript translation of vibe/orchestrator.py
 */

import type { VibeConfig, Workflow, WorkflowPlanResult } from './models';
import type { Checklist } from './guidance/models';
import { loadAllChecklists, loadAllWorkflows } from './workflows';
import { SessionManager } from './session';
import type { CurrentStepInfo, WorkflowFrameImpl, WorkflowStepObject } from './session';
import type { VibeConfigImpl } from './config';
import { PromptAnalyzer } from './analyzer';
import { SessionMonitor } from './sessionMonitor';

export interface PlanRequest {
  query: string;
  projectType?: string;
  config?: VibeConfig;
}

export interface SessionInfo {
  sessionId: string;
  prompt: string;
  createdAt: string;
  isComplete: boolean;
}

export interface MonitoringStatusSummary {
  dormant_sessions: number;
  stale_sessions: number;
  forgotten_completions: number;
  [key: string]: unknown;
}

export interface SessionResponse {
  success: boolean;
  error?: string;
  session_id?: string;
  prompt?: string;
  current_step?: CurrentStepInfo | null;
  workflow_stack?: string[];
  is_complete?: boolean;
  created_at?: string;
  last_accessed?: string;
  advanced?: boolean;
  backed?: boolean;
  restarted?: boolean;
  broken?: boolean;
  sessions?: SessionInfo[] | string[];
  monitoring_data?: Record<string, unknown>;
  cleaned_up?: number;
  analysis_results?: Record<string, unknown>;
  total_workflows?: number;
  workflow_steps?: WorkflowStep[];
  has_next?: boolean;
  next_step?: string;
  has_previous?: boolean;
  previous_step?: string;
  broken_out?: boolean;
  message?: string;
  total?: number;
  recommendations?: string[];
  alerts?: SessionAlert[];
  cleaned_sessions?: string[];
  alert_detected?: boolean;
  intervention_message?: string;
  suggested_action?: string;
  alert_type?: string;
  severity?: string;
  suggested_actions?: string[];
}

export interface WorkflowStep {
  type: string;
  actions: (string | unknown)[];
}

export interface WorkflowPlan {
  workflow: Workflow;
  confidence: number;
  reasoning: string;
}

export interface ExecutionPlanStep {
  type: 'workflow' | 'checklist';
  name: string;
  title: string;
  description: string;
  steps: string[];
  reasoning: string;
}

export interface SessionAlert {
  session_id: string;
  alert_type: string;
  message: string;
  severity: string;
  timestamp: string;
  suggested_actions: string[];
}

export class WorkflowOrchestrator {
  private workflows: Record<string, Workflow>;
  private sessionManager: SessionManager;
  private config: VibeConfigImpl;
  private analyzer: PromptAnalyzer;
  private sessionMonitor: SessionMonitor;

  constructor(config: VibeConfigImpl) {
    this.config = config;
    this.workflows = loadAllWorkflows();
    this.sessionManager = new SessionManager(config);
    this.analyzer = new PromptAnalyzer(config);
    this.sessionMonitor = new SessionMonitor(this);

    // Attempt to load existing sessions
    this.loadExistingSessions().catch(() => {
      // Ignore errors during initialization
    });
  }

  /**
   * Load existing sessions from disk
   */
  private async loadExistingSessions(): Promise<void> {
    try {
      await this.sessionManager.loadSessionsAsync();
    } catch (_error) {
      // Ignore errors - sessions may not exist yet
    }
  }

  /**
   * Ensure sessions are loaded before accessing them
   */
  private async ensureSessionsLoaded(): Promise<void> {
    await this.loadExistingSessions();
  }

  /**
   * Get the session manager (for session monitoring)
   */
  get sessionManagerInstance(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Plan workflows and checklists and return execution guidance
   */
  async planWorkflows(
    items: string[],
    prompt: string,
    showDisplay = true // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<WorkflowPlanResult> {
    if (!items || items.length === 0) {
      return {
        success: true,
        workflows: [],
        execution_plan: [],
        guidance: 'No workflows needed.',
      };
    }

    // Separate workflows from checklists
    const workflows = items.filter(item => !item.startsWith('checklist:'));
    const checklists = items
      .filter(item => item.startsWith('checklist:'))
      .map(item => item.replace('checklist:', ''));

    // Plan execution order for workflows only
    const executionOrder = this.planExecutionOrder(workflows);

    // Generate execution plan including both workflows and checklists
    const executionPlan = await this.generateExecutionPlan(
      executionOrder,
      checklists,
      prompt
    );

    return {
      success: true,
      workflows: executionOrder,
      checklists: checklists,
      execution_plan: executionPlan,
      guidance: this.formatGuidanceForAgent(executionPlan),
    };
  }

  /**
   * Generate detailed execution plan for workflows and checklists
   */
  private async generateExecutionPlan(
    workflows: string[],
    checklists: string[],
    prompt: string
  ): Promise<ExecutionPlanStep[]> {
    const plan: ExecutionPlanStep[] = [];

    // Add workflows first
    for (const workflowName of workflows) {
      const workflowStep = await this.planWorkflowStep(workflowName, prompt);
      if (workflowStep) {
        plan.push(workflowStep);
      }
    }

    // Add checklists after workflows
    for (const checklistName of checklists) {
      const checklistStep = await this.planChecklistStep(checklistName, prompt);
      if (checklistStep) {
        plan.push(checklistStep);
      }
    }

    return plan;
  }

  /**
   * Plan a single workflow step
   */
  private async planWorkflowStep(
    workflowName: string,
    prompt: string
  ): Promise<ExecutionPlanStep | null> {
    const workflow = this.workflows[workflowName];
    const steps = this.getWorkflowSteps(workflowName);
    const reasoning = this.getWorkflowReasoning(workflowName, prompt);

    // Create step even for unknown workflows (for testing and flexibility)
    return {
      type: 'workflow',
      name: workflowName,
      title:
        workflow?.description ??
        `${workflowName.charAt(0).toUpperCase() + workflowName.slice(1)} Workflow`,
      description: workflow?.description ?? `Execute ${workflowName} workflow`,
      steps: steps.length > 0 ? steps : [`Execute ${workflowName} workflow steps`],
      reasoning: reasoning,
    };
  }

  /**
   * Plan a single checklist step
   */
  private async planChecklistStep(
    checklistName: string,
    prompt: string
  ): Promise<ExecutionPlanStep | null> {
    // Get checklist from our implemented checklist loading system
    const reasoning = this.getChecklistReasoning(checklistName, prompt);

    return {
      type: 'checklist',
      name: checklistName,
      title: `${checklistName.charAt(0).toUpperCase() + checklistName.slice(1)} Checklist`,
      description: `Execute ${checklistName} checklist`,
      steps: [`Run ${checklistName} checklist items`],
      reasoning: reasoning,
    };
  }

  /**
   * Format guidance as concise plain text for AI agents
   */
  private formatGuidanceForAgent(executionPlan: ExecutionPlanStep[]): string {
    if (executionPlan.length === 0) {
      return 'No specific workflows needed.';
    }

    let guidance = 'Execution plan:\n';

    executionPlan.forEach((step, index) => {
      guidance += `${index + 1}. ${step.title}\n`;
      guidance += `   Reasoning: ${step.reasoning}\n`;
      if (step.steps.length > 0) {
        guidance += `   Key steps: ${step.steps.slice(0, 3).join(', ')}${step.steps.length > 3 ? '...' : ''}\n`;
      }
      guidance += '\n';
    });

    return guidance;
  }

  /**
   * Generate reasoning for why a workflow is needed
   */
  private getWorkflowReasoning(workflowName: string, prompt: string): string {
    const reasoningMap: Record<string, string> = {
      analysis: `To understand the project structure and identify what needs to be done for: '${prompt}'`,
      'Research Guidance for Agents': `No specific workflow found for '${prompt}'. Providing research guidance for online information discovery.`,
      typescript_quality:
        'To ensure code quality with formatting, linting, and style checks',
      typescript_test: 'To validate that all tests pass and code works correctly',
      typescript_build: 'To create distribution packages ready for release',
      git_status: 'To check the current state of the repository',
      git_commit: 'To save the current work state',
      documentation: 'To ensure project documentation is up to date',
      implementation: 'To implement the requested feature or functionality',
      testing: 'To ensure proper test coverage and validation',
      quality: 'To maintain code quality standards',
      mcp: 'To set up or manage Model Context Protocol server functionality',
      session: 'To manage workflow session state and progression',
    };

    return (
      reasoningMap[workflowName] ??
      `Execute ${workflowName} workflow to address the requirements in: '${prompt}'`
    );
  }

  /**
   * Generate reasoning for why a checklist is needed
   */
  private getChecklistReasoning(checklistName: string, prompt: string): string {
    const reasoningMap: Record<string, string> = {
      typescript_setup: 'To ensure TypeScript environment is properly configured',
      project_structure: 'To verify project structure follows best practices',
      code_quality: 'To validate code quality standards are met',
      testing: 'To ensure comprehensive test coverage',
      documentation: 'To verify documentation is complete and accurate',
      security: 'To check for security vulnerabilities and best practices',
      performance: 'To validate performance requirements are met',
      deployment: 'To ensure deployment readiness',
    };

    return (
      reasoningMap[checklistName] ??
      `Run ${checklistName} checklist to validate requirements for: '${prompt}'`
    );
  }

  /**
   * Start a new workflow session for step-by-step execution
   */
  startSession(prompt: string): SessionResponse {
    try {
      // For now, create a simple single-workflow session
      // Use planWorkflow for synchronous workflow identification
      const plan = this.planWorkflow({ query: prompt });

      if (!plan) {
        return {
          success: false,
          error: 'No workflows identified for the given prompt',
        };
      }

      // Generate execution plan with workflow steps
      const workflowSteps: [string, (string | WorkflowStepObject)[]][] = [
        [plan.workflow.name, plan.workflow.steps],
      ];

      if (!workflowSteps.length) {
        return {
          success: false,
          error: 'No valid workflows found with steps',
        };
      }

      // Create session
      const session = this.sessionManager.createSession(prompt, workflowSteps, {
        interactive: true,
        timeout: 3600,
        continueOnError: false,
      });

      // Save session to disk asynchronously (don't wait)
      this.sessionManager.saveSessionAsync(session).catch(() => {
        // Ignore save errors for now
      });

      // Get first step
      const currentStep = session.getCurrentStep();

      return {
        success: true,
        session_id: session.sessionId,
        prompt: prompt,
        current_step: currentStep,
        workflow_stack: session.workflowStack.map(frame => frame.workflowName),
        total_workflows: session.workflowStack.length,
      };
    } catch (error) {
      return { success: false, error: `Failed to start session: ${String(error)}` };
    }
  }

  /**
   * Get session status (sync version for compatibility)
   */
  getSessionStatusSync(sessionId: string): SessionResponse {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return { success: false, error: `Session ${sessionId} not found` };
    }

    const currentStep = session.getCurrentStep();

    return {
      success: true,
      session_id: session.sessionId,
      prompt: session.prompt,
      current_step: currentStep,
      workflow_stack: session.workflowStack.map(frame => frame.workflowName),
      is_complete: session.isComplete,
      created_at: session.createdAt,
      last_accessed: session.lastAccessed,
    };
  }

  /**
   * Get the current status of a workflow session
   */
  getSessionStatus(sessionId: string): SessionResponse {
    return this.getSessionStatusSync(sessionId);
  }

  /**
   * Get the current status of a workflow session (async)
   */
  async getSessionStatusAsync(sessionId: string): Promise<SessionResponse> {
    await this.ensureSessionsLoaded();

    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return { success: false, error: `Session ${sessionId} not found` };
    }

    const currentStep = session.getCurrentStep();

    return {
      success: true,
      session_id: session.sessionId,
      prompt: session.prompt,
      current_step: currentStep,
      workflow_stack: session.workflowStack.map(frame => frame.workflowName),
      is_complete: session.isComplete,
      created_at: session.createdAt,
      last_accessed: session.lastAccessed,
    };
  }

  /**
   * Advance session (sync version for compatibility)
   */
  advanceSessionSync(sessionId: string): SessionResponse {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return { success: false, error: `Session ${sessionId} not found` };
    }

    session.advanceStep();
    this.sessionManager.saveSession(session);

    return {
      success: true,
      session_id: session.sessionId,
      prompt: session.prompt,
      current_step: session.getCurrentStep(),
      workflow_stack: session.workflowStack.map(frame => frame.workflowName),
      is_complete: session.isComplete,
      created_at: session.createdAt,
      last_accessed: session.lastAccessed,
    };
  }

  /**
   * Mark current step as complete and advance to next step
   */
  advanceSession(sessionId: string): SessionResponse {
    return this.advanceSessionSync(sessionId);
  }

  /**
   * Mark current step as complete and advance to next step (async)
   */
  async advanceSessionAsync(sessionId: string): Promise<SessionResponse> {
    await this.ensureSessionsLoaded();

    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return { success: false, error: `Session ${sessionId} not found` };
    }

    // Advance to next step
    const hasNext = session.advanceStep();

    // Save updated session
    if (hasNext) {
      this.sessionManager.saveSession(session);
      // Also save to disk
      this.sessionManager.saveSessionAsync(session).catch(() => {
        // Ignore save errors
      });

      const currentStep = session.getCurrentStep();

      return {
        success: true,
        session_id: session.sessionId,
        current_step: currentStep,
        workflow_stack: session.workflowStack.map(frame => frame.workflowName),
        has_next: true,
      };
    } else {
      // Session is complete, archive it
      this.sessionManager.archiveSession(sessionId);

      return {
        success: true,
        session_id: session.sessionId,
        current_step: null,
        workflow_stack: [],
        has_next: false,
        message: 'All workflows completed successfully',
      };
    }
  }

  /**
   * Go back to the previous step
   */
  backSession(sessionId: string): SessionResponse {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return { success: false, error: `Session ${sessionId} not found` };
    }

    const success = session.backStep();
    if (!success) {
      return { success: false, error: 'Already at the first step' };
    }

    this.sessionManager.saveSession(session);
    const currentStep = session.getCurrentStep();

    return {
      success: true,
      session_id: session.sessionId,
      current_step: currentStep,
      workflow_stack: session.workflowStack.map(frame => frame.workflowName),
    };
  }

  /**
   * Break out of current workflow and return to parent workflow
   */
  breakSession(sessionId: string): SessionResponse {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return { success: false, error: `Session ${sessionId} not found` };
    }

    const success = session.breakWorkflow();
    if (!success) {
      return { success: false, error: 'Cannot break out of root workflow' };
    }

    this.sessionManager.saveSession(session);
    const currentStep = session.getCurrentStep();

    return {
      success: true,
      session_id: session.sessionId,
      current_step: currentStep,
      workflow_stack: session.workflowStack.map(frame => frame.workflowName),
      message: 'Broke out of current workflow',
    };
  }

  /**
   * Restart the session from the beginning
   */
  restartSession(sessionId: string): SessionResponse {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      return { success: false, error: `Session ${sessionId} not found` };
    }

    session.restartSession();
    this.sessionManager.saveSession(session);
    const currentStep = session.getCurrentStep();

    return {
      success: true,
      session_id: session.sessionId,
      current_step: currentStep,
      workflow_stack: session.workflowStack.map(frame => frame.workflowName),
      message: 'Session restarted from the beginning',
    };
  }

  /**
   * List all active workflow sessions
   */
  listWorkflowSessions(): SessionResponse {
    const sessions = this.sessionManager.listSessions();

    return {
      success: true,
      sessions: sessions,
      total: sessions.length,
    };
  }

  /**
   * Plan a workflow based on user query
   */
  planWorkflow(request: PlanRequest): WorkflowPlan | null {
    const query = request.query.toLowerCase().trim();

    let bestMatch: { workflow: Workflow; confidence: number } | null = null;

    // Find best matching workflow using trigger analysis
    for (const workflow of Object.values(this.workflows)) {
      const confidence = this.calculateConfidence(query, workflow, request.projectType);

      if (confidence > 0.3 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { workflow, confidence };
      }
    }

    if (!bestMatch) {
      return null;
    }

    return {
      workflow: bestMatch.workflow,
      confidence: bestMatch.confidence,
      reasoning: this.generateReasoning(
        query,
        bestMatch.workflow,
        bestMatch.confidence
      ),
    };
  }

  /**
   * Calculate confidence score for workflow match
   */
  private calculateConfidence(
    query: string,
    workflow: Workflow,
    projectType?: string
  ): number {
    let confidence = 0;

    // Check exact trigger matches
    for (const trigger of workflow.triggers) {
      if (query.includes(trigger.toLowerCase())) {
        confidence += 0.8;
        break;
      }
    }

    // Check partial matches
    if (confidence === 0) {
      for (const trigger of workflow.triggers) {
        const words = trigger.toLowerCase().split(' ');
        const matchedWords = words.filter(word => query.includes(word));
        if (matchedWords.length > 0) {
          confidence += (matchedWords.length / words.length) * 0.6;
        }
      }
    }

    // Check step matches for additional confidence
    for (const step of workflow.steps) {
      // Handle both string and object step formats
      let stepText: string;
      if (typeof step === 'string') {
        stepText = step;
      } else if (typeof step === 'object' && step.step_text) {
        stepText = step.step_text;
      } else {
        continue; // Skip invalid steps
      }

      const stepWords = stepText.toLowerCase().split(' ');
      const matchedStepWords = stepWords.filter(word => query.includes(word));
      if (matchedStepWords.length > 0) {
        confidence += (matchedStepWords.length / stepWords.length) * 0.3;
      }
    }

    // Project type bonus
    if (projectType && workflow.projectTypes?.includes(projectType)) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate reasoning for workflow selection
   */
  private generateReasoning(
    query: string,
    workflow: Workflow,
    confidence: number
  ): string {
    const matchedTriggers = workflow.triggers.filter(trigger =>
      query.includes(trigger.toLowerCase())
    );

    if (matchedTriggers.length > 0) {
      return `Matched trigger: "${matchedTriggers[0]}" (confidence: ${(confidence * 100).toFixed(1)}%)`;
    }

    return `Partial match based on keywords (confidence: ${(confidence * 100).toFixed(1)}%)`;
  }

  /**
   * Get all available workflows
   */
  getAllWorkflows(): Workflow[] {
    return Object.values(this.workflows);
  }

  /**
   * Get workflow by name
   */
  getWorkflow(name: string): Workflow | null {
    return this.workflows[name] ?? null;
  }

  /**
   * Get workflow steps for a given workflow name
   */
  private getWorkflowSteps(workflowName: string): string[] {
    const workflow = this.workflows[workflowName];
    if (!workflow) return [];

    // Convert steps to strings, handling both string and object formats
    return workflow.steps.map(step =>
      typeof step === 'string' ? step : step.step_text
    );
  }

  /**
   * Plan execution order for multiple workflows
   */
  private planExecutionOrder(workflowNames: string[]): string[] {
    // Define execution priorities (lower number = higher priority)
    const priorityOrder = [
      'mcp', // MCP setup should come first
      'analysis', // Analysis before implementation
      'implementation', // Implementation before testing
      'quality', // Quality checks after implementation
      'testing', // Testing after quality checks
      'documentation', // Documentation after implementation
      'git', // Git operations near the end
      'session', // Session management last
    ];

    // Sort workflows by priority order
    const orderedWorkflows: string[] = [];

    // Add workflows in priority order
    for (const priorityWorkflow of priorityOrder) {
      if (workflowNames.includes(priorityWorkflow)) {
        orderedWorkflows.push(priorityWorkflow);
      }
    }

    // Add any workflows not in priority list
    for (const workflowName of workflowNames) {
      if (!orderedWorkflows.includes(workflowName)) {
        orderedWorkflows.push(workflowName);
      }
    }

    return orderedWorkflows;
  }

  /**
   * Get session health monitoring data including alerts for dormant workflows
   */
  async monitorSessions(): Promise<SessionResponse> {
    const summary = await this.sessionMonitor.getSessionStatusSummary();

    return {
      success: true,
      monitoring_data: {
        total_active_sessions: summary.total_active_sessions,
        dormant_sessions: summary.dormant_sessions,
        stale_sessions: summary.stale_sessions,
        forgotten_completions: summary.forgotten_completions,
        alerts: summary.alerts,
      },
      recommendations: this.generateMonitoringRecommendations({
        total_active_sessions: summary.total_active_sessions,
        dormant_sessions: summary.dormant_sessions,
        stale_sessions: summary.stale_sessions,
        forgotten_completions: summary.forgotten_completions,
      }),
    };
  }

  /**
   * Automatically clean up sessions that have been inactive for too long
   */
  async cleanupStaleSessions(): Promise<SessionResponse> {
    const alerts = await this.sessionMonitor.checkSessionHealth();
    const staleAlerts = alerts.filter(
      alert => alert.alert_type === 'stale_session' || alert.severity === 'high'
    );
    const cleanedSessions: string[] = [];

    // Archive stale sessions
    for (const alert of staleAlerts) {
      try {
        const session = this.sessionManager.loadSession(alert.session_id);
        if (session && !session.isComplete) {
          // Mark session as archived
          await this.sessionManager.saveSession(session);
          cleanedSessions.push(alert.session_id);
        }
      } catch (error) {
        console.warn(`Failed to cleanup session ${alert.session_id}:`, error);
      }
    }

    return {
      success: true,
      cleaned_sessions: cleanedSessions,
      message: `Cleaned up ${cleanedSessions.length} stale sessions`,
    };
  }

  /**
   * Analyze an agent response for patterns indicating forgotten workflow completion
   */
  async analyzeAgentResponse(
    sessionId: string,
    responseText: string
  ): Promise<SessionResponse> {
    const alert = this.sessionMonitor.analyzeAgentResponse(sessionId, responseText);

    if (alert) {
      const interventionMessage =
        await this.sessionMonitor.generateInterventionMessage(alert);

      return {
        success: true,
        alert_detected: true,
        alert_type: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        intervention_message: interventionMessage,
        suggested_actions: alert.suggested_actions,
      };
    }

    return {
      success: true,
      alert_detected: false,
      message: 'No completion patterns detected that require intervention',
    };
  }

  /**
   * Generate recommendations based on monitoring data
   */
  private generateMonitoringRecommendations(
    statusSummary: MonitoringStatusSummary
  ): string[] {
    const recommendations: string[] = [];

    if (statusSummary.dormant_sessions > 0) {
      recommendations.push(
        `You have ${statusSummary.dormant_sessions} dormant sessions. ` +
          "Consider using 'get_workflow_status' to check their current state."
      );
    }

    if (statusSummary.stale_sessions > 0) {
      recommendations.push(
        `You have ${statusSummary.stale_sessions} stale sessions. ` +
          "Consider using 'break_workflow' to clean them up if no longer needed."
      );
    }

    if (statusSummary.forgotten_completions > 0) {
      recommendations.push(
        `Detected ${statusSummary.forgotten_completions} responses with ` +
          'completion patterns but no workflow management. Remember to call ' +
          "'advance_workflow' or 'break_workflow' when tasks are complete."
      );
    }

    if (statusSummary['total_active_sessions'] === 0) {
      recommendations.push('No active workflow sessions detected.');
    }

    return recommendations;
  }

  /**
   * Query workflows by pattern or category
   */
  queryWorkflows(
    pattern?: string,
    category?: string
  ): { success: boolean; workflows?: Workflow[]; error?: string } {
    try {
      let workflows = Object.values(this.workflows);

      // Filter by pattern if provided
      if (pattern) {
        const lowerPattern = pattern.toLowerCase();
        workflows = workflows.filter(
          workflow =>
            workflow.name.toLowerCase().includes(lowerPattern) ||
            workflow.description.toLowerCase().includes(lowerPattern) ||
            workflow.triggers.some(trigger =>
              trigger.toLowerCase().includes(lowerPattern)
            )
        );
      }

      // Filter by category if provided
      if (category) {
        workflows = workflows.filter(
          workflow => workflow.category?.toLowerCase() === category.toLowerCase()
        );
      }

      return {
        success: true,
        workflows: workflows,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to query workflows: ${String(error)}`,
      };
    }
  }

  /**
   * Query checklists by pattern
   */
  queryChecklists(pattern?: string): {
    success: boolean;
    checklists?: Checklist[];
    error?: string;
  } {
    try {
      const allChecklists = loadAllChecklists(true); // quiet mode
      const checklists = Object.values(allChecklists) as Checklist[];

      let filteredChecklists = checklists;

      // Filter by pattern if provided
      if (pattern) {
        const lowerPattern = pattern.toLowerCase();
        filteredChecklists = checklists.filter(
          (checklist: Checklist) =>
            (checklist.name?.toLowerCase().includes(lowerPattern) ?? false) ||
            (checklist.description?.toLowerCase().includes(lowerPattern) ?? false)
        );
      }

      return {
        success: true,
        checklists: filteredChecklists,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to query checklists: ${String(error)}`,
      };
    }
  }

  /**
   * Add a workflow to an existing session
   */
  addWorkflowToSession(
    sessionId: string,
    workflowName: string
  ): {
    success: boolean;
    session_id?: string;
    message?: string;
    workflow_stack?: string[];
    error?: string;
  } {
    try {
      const session = this.sessionManager.loadSession(sessionId);
      if (!session) {
        return { success: false, error: `Session ${sessionId} not found` };
      }

      const workflow = this.workflows[workflowName];
      if (!workflow) {
        return { success: false, error: `Workflow ${workflowName} not found` };
      }

      // Add workflow to session
      session.pushWorkflow(workflowName, workflow.steps);
      this.sessionManager.saveSession(session);

      return {
        success: true,
        session_id: sessionId,
        message: `Added workflow ${workflowName} to session`,
        workflow_stack: session.workflowStack.map(
          (item: WorkflowFrameImpl) => item.workflowName
        ),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add workflow to session: ${String(error)}`,
      };
    }
  }

  /**
   * Add a checklist to an existing session
   */
  addChecklistToSession(
    sessionId: string,
    checklistName: string
  ): {
    success: boolean;
    session_id?: string;
    message?: string;
    workflow_stack?: string[];
    error?: string;
  } {
    try {
      const session = this.sessionManager.loadSession(sessionId);
      if (!session) {
        return { success: false, error: `Session ${sessionId} not found` };
      }

      // Validate that the checklist exists
      const allChecklists = loadAllChecklists(true);
      const checklistExists = Object.values(allChecklists).some(
        checklist => checklist.name === checklistName
      );

      if (!checklistExists) {
        return { success: false, error: `Checklist ${checklistName} not found` };
      }

      // Create a simple checklist workflow steps
      const checklistSteps = [`Execute ${checklistName} checklist items`];

      // Add checklist as a workflow to session
      const checklistWorkflowName = `checklist:${checklistName}`;
      session.pushWorkflow(checklistWorkflowName, checklistSteps);
      this.sessionManager.saveSession(session);

      return {
        success: true,
        session_id: sessionId,
        message: `Added checklist ${checklistName} to session`,
        workflow_stack: session.workflowStack.map(
          (item: WorkflowFrameImpl) => item.workflowName
        ),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add checklist to session: ${String(error)}`,
      };
    }
  }
}
