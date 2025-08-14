/**
 * Configuration type definitions for Vibe
 */

export interface LintConfig {
  checkEmojis: boolean;
  checkProfessionalLanguage: boolean;
  allowInformalLanguage: string[];
  excludePatterns: string[];
  namingConventions: Record<string, string>;
  directoryNaming: string;
  maxStepMessageLength: number;
  unprofessionalPatterns: string[];
}

export interface SessionConfig {
  maxSessions: number;
  sessionTimeout: number;
  sessionDir?: string; // Directory for session storage (default: .vibe/sessions)
}

export interface WorkflowConfig {
  enabled: boolean;
  priority: number;
  triggers?: string[];
  description?: string;
  steps?: string[];
  commands?: string[]; // Legacy format
  dependencies?: string[];
}

export interface ProjectTypeConfig {
  workflows: string[];
  tools: string[];
}
