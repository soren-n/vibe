import type { WorkflowFrame, WorkflowStepObject } from './types.js';

export class WorkflowFrameImpl implements WorkflowFrame {
  workflowName: string;
  steps: (string | WorkflowStepObject)[];
  currentStep: number;
  context: Record<string, unknown>;

  constructor(
    workflowName: string,
    steps: (string | WorkflowStepObject)[],
    context: Record<string, unknown> = {}
  ) {
    this.workflowName = workflowName;
    this.steps = steps;
    this.currentStep = 0;
    this.context = context;
  }

  get isComplete(): boolean {
    return this.currentStep >= this.steps.length;
  }

  get currentStepText(): string | null {
    if (this.isComplete) {
      return null;
    }

    const step = this.steps[this.currentStep];
    if (!step) return null;

    if (typeof step === 'string') {
      if (this.isCommandString(step)) {
        return `Execute without interaction: ${step}`;
      } else {
        // Add descriptive formatting for guidance steps that look like review/verification
        if (
          step.toLowerCase().includes('review') ||
          step.toLowerCase().includes('result')
        ) {
          return `Verify and report status briefly: ${step}`;
        }
        return step;
      }
    } else {
      return step.step_text;
    }
  }

  private isCommandString(step: string): boolean {
    // Detect if a string looks like a command
    const commandPrefixes = [
      'run ',
      'npm ',
      'node ',
      'python ',
      'pip ',
      'git ',
      'docker ',
      'yarn ',
      'pnpm ',
    ];
    return commandPrefixes.some(prefix => step.toLowerCase().startsWith(prefix));
  }

  isCommand(step: string | WorkflowStepObject): boolean {
    return typeof step === 'string'
      ? this.isCommandString(step)
      : Boolean(step?.command);
  }

  advance(): boolean {
    if (this.isComplete) {
      return false;
    }
    this.currentStep++;
    return true;
  }

  toDict(): Record<string, unknown> {
    return {
      workflowName: this.workflowName,
      steps: this.steps,
      currentStep: this.currentStep,
      context: this.context,
    };
  }

  static fromDict(data: Record<string, unknown>): WorkflowFrameImpl {
    const frame = new WorkflowFrameImpl(
      data['workflowName'] as string,
      data['steps'] as (string | WorkflowStepObject)[],
      (data['context'] as Record<string, unknown>) ?? {}
    );

    // Restore the current step position
    frame.currentStep = (data['currentStep'] as number) ?? 0;

    return frame;
  }
}
