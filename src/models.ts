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
  preferences?: {
    enableLogging?: boolean;
  };
  detectProjectType?(): Promise<string>;
}
