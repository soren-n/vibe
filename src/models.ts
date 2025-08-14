/**
 * Core models and types for Vibe
 */

/**
 * Workflow step object format - can be simple string or structured object
 */
interface WorkflowStepObject {
  step_text: string;
  command?: string;
  working_dir?: string;
}

/**
 * Enhanced Workflow interface matching documented structure
 */
export interface Workflow {
  name: string;
  description: string;
  triggers: string[];
  steps: (string | WorkflowStepObject)[];
  dependencies?: string[];
  projectTypes?: string[];
  conditions?: string[];
  category?: string;
}

export interface VibeConfig {
  projectType?: string;
  workflows?: Record<string, unknown>;
  workflowOverrides?: Record<string, unknown>;
  checklistOverrides?: Record<string, unknown>;
  preferences?: {
    maxSessions?: number;
    sessionTimeout?: number;
    enableLogging?: boolean;
  };
  detectProjectType?(): Promise<string>;
}

/**
 * Enhanced Checklist interface matching documented structure
 */
export interface Checklist {
  name: string;
  description: string;
  triggers: string[];
  items: string[];
  dependencies?: string[];
  projectTypes?: string[];
  conditions?: string[];
  category?: string;
}

/**
 * Workflow execution plan result structure
 */
export interface WorkflowPlanResult {
  success: boolean;
  workflows: string[];
  checklists?: string[];
  execution_plan: ExecutionPlanStep[];
  guidance: string;
  errors?: string[];
}

/**
 * Execution plan step structure
 */
export interface ExecutionPlanStep {
  type: 'workflow' | 'checklist';
  name: string;
  title: string;
  description: string;
  steps: string[];
  reasoning: string;
}
