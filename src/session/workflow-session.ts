import type { VibeConfigImpl } from '../config.js';
import type {
  CurrentStepInfo,
  EnhancedWorkflowSession,
  SessionConfig,
  WorkflowStepObject,
} from './types.js';
import { WorkflowFrameImpl } from './workflow-frame.js';

export class WorkflowSessionImpl implements EnhancedWorkflowSession {
  sessionId: string;
  prompt: string;
  workflowStack: WorkflowFrameImpl[];
  createdAt: string;
  lastAccessed: string;
  sessionConfig: SessionConfig | undefined;
  vibeConfig: VibeConfigImpl;

  constructor(
    sessionId: string,
    prompt: string,
    vibeConfig: VibeConfigImpl,
    sessionConfig?: SessionConfig
  ) {
    this.sessionId = sessionId;
    this.prompt = prompt;
    this.workflowStack = [];
    this.createdAt = new Date().toISOString();
    this.lastAccessed = this.createdAt;
    this.sessionConfig = sessionConfig;
    this.vibeConfig = vibeConfig;
  }

  get currentFrame(): WorkflowFrameImpl | null {
    return this.workflowStack.length > 0
      ? (this.workflowStack[this.workflowStack.length - 1] ?? null)
      : null;
  }

  get isComplete(): boolean {
    return (
      this.workflowStack.length === 0 ||
      this.workflowStack.every(frame => frame.isComplete)
    );
  }

  getCurrentStep(): CurrentStepInfo | null {
    const frame = this.currentFrame;
    if (!frame || frame.isComplete) {
      return null;
    }

    const step = frame.steps[frame.currentStep];
    if (!step) return null;

    const isCommand = frame.isCommand(step);

    return {
      workflow: frame.workflowName,
      step_number: frame.currentStep + 1,
      total_steps: frame.steps.length,
      step_text: frame.currentStepText ?? '',
      is_command: isCommand,
      workflow_depth: this.workflowStack.length,
    };
  }

  advanceStep(): boolean {
    this.lastAccessed = new Date().toISOString();
    const frame = this.currentFrame;
    if (!frame) return false;

    const advanced = frame.advance();
    if (frame.isComplete) {
      this.workflowStack.pop();
      // Return false when completing a workflow (test expectation)
      return false;
    }
    return advanced;
  }

  backStep(): boolean {
    this.lastAccessed = new Date().toISOString();
    const frame = this.currentFrame;
    if (!frame || frame.currentStep === 0) return false;

    frame.currentStep--;
    return true;
  }

  restartSession(): void {
    this.lastAccessed = new Date().toISOString();
    for (const frame of this.workflowStack) {
      frame.currentStep = 0;
    }
  }

  breakWorkflow(): boolean {
    this.lastAccessed = new Date().toISOString();
    if (this.workflowStack.length <= 1) return false; // Can't break if only one or no workflows

    this.workflowStack.pop();
    return true;
  }

  pushWorkflow(
    workflowName: string,
    steps: (string | WorkflowStepObject)[],
    context: Record<string, unknown> = {}
  ): void {
    this.lastAccessed = new Date().toISOString();
    this.workflowStack.push(new WorkflowFrameImpl(workflowName, steps, context));
  }

  toDict(): Record<string, unknown> {
    return {
      sessionId: this.sessionId,
      prompt: this.prompt,
      workflowStack: this.workflowStack.map(frame => frame.toDict()),
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed,
      sessionConfig: this.sessionConfig,
    };
  }

  static fromDict(
    data: Record<string, unknown>,
    vibeConfig?: VibeConfigImpl
  ): WorkflowSessionImpl {
    // Use provided config or create mock for tests
    const config =
      vibeConfig ??
      ({
        session: { maxSessions: 10, sessionTimeout: 3600000 },
        lint: {},
        workflows: {},
        projectType: 'auto',
        projectTypes: {},
      } as VibeConfigImpl);

    const session = new WorkflowSessionImpl(
      data['sessionId'] as string,
      data['prompt'] as string,
      config,
      data['sessionConfig'] as SessionConfig | undefined
    );

    session.createdAt = data['createdAt'] as string;
    session.lastAccessed = data['lastAccessed'] as string;
    session.workflowStack =
      (data['workflowStack'] as Record<string, unknown>[])?.map(frameData =>
        WorkflowFrameImpl.fromDict(frameData)
      ) ?? [];

    return session;
  }
}
