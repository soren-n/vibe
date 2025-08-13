/**
 * Session management for workflow orchestration
 * TypeScript translation of vibe/session.py and vibe/session_monitor.py
 */

import * as fs from 'fs';
import * as path from 'path';
import type { VibeConfigImpl } from './config';
import { generateSessionId } from './utils/ids';

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
 * Represents a single workflow in the execution stack
 */
export interface WorkflowFrame {
  workflowName: string;
  steps: (string | WorkflowStepObject)[];
  currentStep: number;
  context: Record<string, any>;

  get isComplete(): boolean;
  get currentStepText(): string | null;
  advance(): boolean;
}

/**
 * Workflow step object format
 */
export interface WorkflowStepObject {
  step_text: string;
  command?: string;
  working_dir?: string;
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
  getCurrentStep(): any | null;
  advanceStep(): boolean;
  backStep(): boolean;
  restartSession(): void;
  breakWorkflow(): boolean;
  pushWorkflow(
    workflowName: string,
    steps: (string | WorkflowStepObject)[],
    context?: Record<string, any>
  ): void;
  toDict(): Record<string, any>;
}

/**
 * WorkflowFrame implementation
 */
export class WorkflowFrameImpl implements WorkflowFrame {
  workflowName: string;
  steps: (string | WorkflowStepObject)[];
  currentStep: number;
  context: Record<string, any>;

  constructor(
    workflowName: string,
    steps: (string | WorkflowStepObject)[],
    currentStep = 0,
    context: Record<string, any> = {}
  ) {
    this.workflowName = workflowName;
    this.steps = steps;
    this.currentStep = currentStep;
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
    if (!step) {
      return null;
    }

    // Handle both string and object step formats
    if (typeof step === 'string') {
      return step;
    } else {
      return step.step_text;
    }
  }

  advance(): boolean {
    if (this.isComplete) {
      return false;
    }

    this.currentStep++;
    return true;
  }
}

/**
 * WorkflowSession implementation
 */
export class WorkflowSessionImpl implements EnhancedWorkflowSession {
  sessionId: string;
  prompt: string;
  workflowStack: WorkflowFrame[];
  createdAt: string;
  lastAccessed: string;
  sessionConfig: SessionConfig | undefined;

  constructor(
    sessionId: string,
    prompt: string,
    workflowStack: WorkflowFrame[],
    sessionConfig?: SessionConfig | undefined
  ) {
    this.sessionId = sessionId;
    this.prompt = prompt;
    this.workflowStack = workflowStack;
    this.createdAt = new Date().toISOString();
    this.lastAccessed = new Date().toISOString();
    this.sessionConfig = sessionConfig ?? undefined;
  }

  static create(
    prompt: string,
    initialWorkflows: [string, (string | WorkflowStepObject)[]][],
    sessionConfig?: SessionConfig
  ): WorkflowSessionImpl {
    const sessionId = generateSessionId();

    const workflowStack: WorkflowFrame[] = initialWorkflows.map(
      ([workflowName, steps]) => new WorkflowFrameImpl(workflowName, steps, 0, {})
    );

    return new WorkflowSessionImpl(sessionId, prompt, workflowStack, sessionConfig);
  }

  get currentFrame(): WorkflowFrame | null {
    if (!this.workflowStack.length) {
      return null;
    }
    return this.workflowStack[this.workflowStack.length - 1] ?? null;
  }

  get isComplete(): boolean {
    return (
      !this.workflowStack.length || this.workflowStack.every(frame => frame.isComplete)
    );
  }

  getCurrentStep(): any | null {
    const currentFrame = this.currentFrame;
    if (!currentFrame || currentFrame.isComplete) {
      return null;
    }

    const stepText = currentFrame.currentStepText ?? '';
    const isCommand = this.isCommandStep(stepText);

    return {
      workflow: currentFrame.workflowName,
      step_number: currentFrame.currentStep + 1, // 1-based for display
      total_steps: currentFrame.steps.length,
      step_text: this.formatStepForAgent(stepText, isCommand),
      is_command: isCommand,
      workflow_depth: this.workflowStack.length,
    };
  }

  advanceStep(): boolean {
    const currentFrame = this.currentFrame;
    if (!currentFrame) {
      return false;
    }

    this.lastAccessed = new Date().toISOString();

    // Try to advance current workflow
    if (currentFrame.advance()) {
      // Check if the frame became complete after advancing
      if (currentFrame.isComplete) {
        // Frame completed, pop it from stack
        this.workflowStack.pop();
        // Return true if there are more workflows, false if none left
        return this.workflowStack.length > 0;
      }
      return true;
    }

    // Current workflow was already complete, pop it from stack
    this.workflowStack.pop();

    // If there are more workflows in the stack, we've returned to parent
    return this.workflowStack.length > 0;
  }

  backStep(): boolean {
    const currentFrame = this.currentFrame;
    if (!currentFrame || currentFrame.currentStep <= 0) {
      return false;
    }

    currentFrame.currentStep--;
    this.lastAccessed = new Date().toISOString();
    return true;
  }

  restartSession(): void {
    for (const frame of this.workflowStack) {
      frame.currentStep = 0;
    }
    this.lastAccessed = new Date().toISOString();
  }

  breakWorkflow(): boolean {
    if (this.workflowStack.length <= 1) {
      return false;
    }

    // Remove current workflow from stack
    this.workflowStack.pop();
    this.lastAccessed = new Date().toISOString();
    return true;
  }

  pushWorkflow(
    workflowName: string,
    steps: (string | WorkflowStepObject)[],
    context: Record<string, any> = {}
  ): void {
    const frame = new WorkflowFrameImpl(workflowName, steps, 0, context);
    this.workflowStack.push(frame);
    this.lastAccessed = new Date().toISOString();
  }

  toDict(): Record<string, any> {
    return {
      sessionId: this.sessionId,
      prompt: this.prompt,
      workflowStack: this.workflowStack.map(frame => ({
        workflowName: frame.workflowName,
        steps: frame.steps,
        currentStep: frame.currentStep,
        context: frame.context,
      })),
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed,
      sessionConfig: this.sessionConfig ?? null,
    };
  }

  static fromDict(data: Record<string, any>): WorkflowSessionImpl {
    const workflowStack = data['workflowStack'].map(
      (frameData: any) =>
        new WorkflowFrameImpl(
          frameData.workflowName,
          frameData.steps,
          frameData.currentStep,
          frameData.context
        )
    );

    const session = new WorkflowSessionImpl(
      data['sessionId'],
      data['prompt'],
      workflowStack,
      data['sessionConfig'] ?? undefined
    );

    session.createdAt = data['createdAt'];
    session.lastAccessed = data['lastAccessed'];

    return session;
  }

  private isCommandStep(stepText: string): boolean {
    // Simple heuristic - can be improved
    const commandIndicators = [
      'run ',
      'execute ',
      'install ',
      'npm ',
      'node ',
      'tsc ',
      'jest ',
    ];
    return commandIndicators.some(indicator =>
      stepText.toLowerCase().includes(indicator)
    );
  }

  private formatStepForAgent(stepText: string, isCommand: boolean): string {
    if (isCommand) {
      return `COMMAND: ${stepText}`;
    }
    return `GUIDANCE: ${stepText}`;
  }
}

/**
 * Enhanced Session Manager matching Python implementation
 */
export class SessionManager {
  private sessions = new Map<string, EnhancedWorkflowSession>();
  private config: VibeConfigImpl;
  private sessionDir: string;

  constructor(config: VibeConfigImpl) {
    this.config = config;
    this.sessionDir = path.join(process.cwd(), '.vibe', 'sessions');
    this.ensureSessionDirectory();
    this.loadSessions();
  }

  /**
   * Create a new workflow session with multiple workflows
   */
  createSession(
    prompt: string,
    workflowSteps: [string, (string | WorkflowStepObject)[]][],
    sessionConfig?: SessionConfig
  ): EnhancedWorkflowSession {
    const session = WorkflowSessionImpl.create(prompt, workflowSteps, sessionConfig);

    this.sessions.set(session.sessionId, session);
    this.saveSession(session);

    return session;
  }

  /**
   * Load a session by ID
   */
  loadSession(sessionId: string): EnhancedWorkflowSession | null {
    let session = this.sessions.get(sessionId);

    if (!session) {
      // Try loading from disk
      const loadedSession = this.loadSessionFromDisk(sessionId);
      if (loadedSession) {
        this.sessions.set(sessionId, loadedSession);
        session = loadedSession;
      }
    }

    return session ?? null;
  }

  /**
   * Save session to memory and disk
   */
  saveSession(session: EnhancedWorkflowSession): void {
    this.sessions.set(session.sessionId, session);
    this.saveSessionToDisk(session);
  }

  /**
   * Archive a completed session
   */
  archiveSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);

    // Move session file to archive directory
    const sessionFile = path.join(this.sessionDir, `${sessionId}.json`);
    const archiveDir = path.join(this.sessionDir, 'archive');
    this.ensureDirectory(archiveDir);
    const archiveFile = path.join(archiveDir, `${sessionId}.json`);

    try {
      if (fs.existsSync(sessionFile)) {
        fs.renameSync(sessionFile, archiveFile);
      }
      return true;
    } catch (error) {
      console.error(`Failed to archive session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * List all active sessions
   */
  listSessions(): {
    sessionId: string;
    prompt: string;
    createdAt: string;
    isComplete: boolean;
  }[] {
    return Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      prompt: session.prompt,
      createdAt: session.createdAt,
      isComplete: session.isComplete,
    }));
  }

  /**
   * List active session IDs
   */
  listActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Clean up old sessions based on age
   */
  cleanupOldSessions(maxAgeDays = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    let cleanedCount = 0;
    const toDelete: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      const createdAt = new Date(session.createdAt);
      if (createdAt < cutoffDate) {
        toDelete.push(sessionId);
      }
    }

    for (const sessionId of toDelete) {
      if (this.archiveSession(sessionId)) {
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get session health summary
   */
  getSessionHealthSummary(): Record<string, any> {
    const sessions = Array.from(this.sessions.values());
    const now = new Date();

    const summary = {
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.isComplete).length,
      activeSessions: sessions.filter(s => !s.isComplete).length,
      dormantSessions: 0,
      staleSessions: 0,
      oldestSession: null as string | null,
      newestSession: null as string | null,
    };

    let oldestDate = now;
    let newestDate = new Date(0);

    for (const session of sessions) {
      const createdAt = new Date(session.createdAt);
      const lastAccessed = new Date(session.lastAccessed);

      if (createdAt < oldestDate) {
        oldestDate = createdAt;
        summary.oldestSession = session.sessionId;
      }

      if (createdAt > newestDate) {
        newestDate = createdAt;
        summary.newestSession = session.sessionId;
      }

      // Check if dormant (inactive for 10+ minutes)
      const minutesSinceAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60);
      if (minutesSinceAccess > 10) {
        summary.dormantSessions++;
      }

      // Check if stale (inactive for 30+ minutes)
      if (minutesSinceAccess > 30) {
        summary.staleSessions++;
      }
    }

    return summary;
  }

  private ensureSessionDirectory(): void {
    this.ensureDirectory(this.sessionDir);
  }

  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadSessions(): void {
    if (!fs.existsSync(this.sessionDir)) {
      return;
    }

    const files = fs.readdirSync(this.sessionDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionId = file.replace('.json', '');
        const session = this.loadSessionFromDisk(sessionId);
        if (session) {
          this.sessions.set(sessionId, session);
        }
      }
    }
  }

  private loadSessionFromDisk(sessionId: string): EnhancedWorkflowSession | null {
    try {
      const sessionFile = path.join(this.sessionDir, `${sessionId}.json`);
      if (!fs.existsSync(sessionFile)) {
        return null;
      }

      const data = fs.readFileSync(sessionFile, 'utf-8');
      const sessionData = JSON.parse(data);

      // Use the fromDict method for proper reconstruction
      return WorkflowSessionImpl.fromDict(sessionData);
    } catch (error) {
      console.error(`Failed to load session ${sessionId}:`, error);
      return null;
    }
  }

  private saveSessionToDisk(session: EnhancedWorkflowSession): void {
    try {
      // Ensure directory exists before saving
      this.ensureSessionDirectory();

      const sessionFile = path.join(this.sessionDir, `${session.sessionId}.json`);
      const serializable = session.toDict();
      fs.writeFileSync(sessionFile, JSON.stringify(serializable, null, 2));
    } catch (error) {
      console.error(`Failed to save session ${session.sessionId}:`, error);
    }
  }
}
