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

export interface ProjectTypeConfig {
  workflows: string[];
  tools: string[];
}
