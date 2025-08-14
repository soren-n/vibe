/**
 * Session-related type definitions and interfaces
 */

/**
 * Session configuration interface matching Python SessionConfig
 */
export interface SessionConfig {
  interactive?: boolean;
  timeout?: number;
  continueOnError?: boolean;
  maxSteps?: number;
  autoAdvance?: boolean;
}

/**
 * Workflow step object structure
 */
export interface WorkflowStepObject {
  step_text: string;
  command?: string;
  working_dir?: string;
}

/**
 * Current step information returned by getCurrentStep()
 */
export interface CurrentStepInfo {
  workflow: string;
  step_number: number;
  total_steps: number;
  step_text: string;
  is_command: boolean;
  workflow_depth: number;
}

/**
 * Represents a single workflow in the execution stack
 */
export interface WorkflowFrame {
  workflowName: string;
  steps: (string | WorkflowStepObject)[];
  currentStep: number;
  context: Record<string, unknown>;

  get isComplete(): boolean;
  get currentStepText(): string | null;
  advance(): boolean;
}

/**
 * Enhanced session interface matching Python implementation
 */
export interface EnhancedWorkflowSession {
  sessionId: string;
  prompt: string;
  workflowStack: WorkflowFrame[];
  createdAt: string;
  lastAccessed: string;
  sessionConfig: SessionConfig | undefined;

  get currentFrame(): WorkflowFrame | null;
  get isComplete(): boolean;
  getCurrentStep(): CurrentStepInfo | null;
  advanceStep(): boolean;
  backStep(): boolean;
  restartSession(): void;
  breakWorkflow(): boolean;
  pushWorkflow(
    workflowName: string,
    steps: (string | WorkflowStepObject)[],
    context?: Record<string, unknown>
  ): void;
  toDict(): Record<string, unknown>;
}
