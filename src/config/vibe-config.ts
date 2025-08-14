import { ProjectDetector } from '../project_types/detector.js';
import type { VibeConfig } from '../models.js';
import type {
  LintConfig,
  ProjectTypeConfig,
  SessionConfig,
  WorkflowConfig,
} from './types.js';
import {
  createDefaultLintConfig,
  createDefaultProjectTypeConfigs,
  createDefaultSessionConfig,
  createDefaultWorkflowConfigs,
} from './defaults.js';
import { addGitignorePatterns, loadFromFile } from './loader.js';

export class VibeConfigImpl implements VibeConfig {
  projectType = 'auto';
  workflows: Record<string, WorkflowConfig> = {};
  projectTypes: Record<string, ProjectTypeConfig> = {};
  lint: LintConfig;
  session: SessionConfig;

  constructor() {
    this.lint = createDefaultLintConfig();
    this.session = createDefaultSessionConfig();
    this.loadDefaults();
  }

  static async loadFromFile(configPath?: string): Promise<VibeConfigImpl> {
    const loadedConfig = await loadFromFile(configPath);

    // Create instance with defaults
    const config = new VibeConfigImpl();

    // Merge loaded configuration
    config.projectType = loadedConfig.projectType;

    // Merge workflows
    const defaultWorkflows = createDefaultWorkflowConfigs();
    config.workflows = { ...defaultWorkflows, ...loadedConfig.workflows };

    // Merge project types
    const defaultProjectTypes = createDefaultProjectTypeConfigs();
    config.projectTypes = { ...defaultProjectTypes, ...loadedConfig.projectTypes };

    // Merge lint config carefully to preserve defaults
    const defaultLint = createDefaultLintConfig();
    config.lint = {
      checkEmojis: loadedConfig.lint.checkEmojis ?? defaultLint.checkEmojis,
      checkProfessionalLanguage:
        loadedConfig.lint.checkProfessionalLanguage ??
        defaultLint.checkProfessionalLanguage,
      allowInformalLanguage:
        loadedConfig.lint.allowInformalLanguage ?? defaultLint.allowInformalLanguage,
      excludePatterns: loadedConfig.lint.excludePatterns ?? defaultLint.excludePatterns,
      namingConventions: {
        ...defaultLint.namingConventions,
        ...(loadedConfig.lint.namingConventions ?? {}),
      },
      directoryNaming: loadedConfig.lint.directoryNaming ?? defaultLint.directoryNaming,
      maxStepMessageLength:
        loadedConfig.lint.maxStepMessageLength ?? defaultLint.maxStepMessageLength,
      unprofessionalPatterns:
        loadedConfig.lint.unprofessionalPatterns ?? defaultLint.unprofessionalPatterns,
    };

    // Merge session config
    const defaultSession = createDefaultSessionConfig();
    config.session = {
      maxSessions: loadedConfig.session.maxSessions ?? defaultSession.maxSessions,
      sessionTimeout:
        loadedConfig.session.sessionTimeout ?? defaultSession.sessionTimeout,
      ...(loadedConfig.session.sessionDir && {
        sessionDir: loadedConfig.session.sessionDir,
      }),
    };

    // Add gitignore patterns to lint exclude patterns
    config.lint = addGitignorePatterns(config.lint, loadedConfig.projectRoot);

    return config;
  }

  async detectProjectType(projectPath?: string): Promise<string> {
    if (this.projectType !== 'auto') {
      return this.projectType;
    }

    const actualProjectPath = projectPath ?? process.cwd();
    const detector = new ProjectDetector(actualProjectPath);
    return detector.detectProjectType();
  }

  /**
   * Get enabled workflows for a specific project type
   */
  getWorkflowsForProjectType(projectType: string): string[] {
    const config = this.projectTypes[projectType];
    if (!config) {
      return this.projectTypes['generic']?.workflows ?? [];
    }
    return config.workflows ?? [];
  }

  /**
   * Get tools for a specific project type
   */
  getToolsForProjectType(projectType: string): string[] {
    const config = this.projectTypes[projectType];
    if (!config) {
      return this.projectTypes['generic']?.tools ?? [];
    }
    return config.tools ?? [];
  }

  /**
   * Check if a workflow is enabled
   */
  isWorkflowEnabled(workflowName: string): boolean {
    const workflow = this.workflows[workflowName];
    return workflow ? workflow.enabled : false;
  }

  /**
   * Get workflow priority (lower number = higher priority)
   */
  getWorkflowPriority(workflowName: string): number {
    const workflow = this.workflows[workflowName];
    return workflow ? workflow.priority : 999;
  }

  /**
   * Get all enabled workflows sorted by priority
   */
  getEnabledWorkflowsSorted(): string[] {
    return Object.entries(this.workflows)
      .filter(([_, config]) => config.enabled)
      .sort(([_a, configA], [_b, configB]) => configA.priority - configB.priority)
      .map(([name, _]) => name);
  }

  loadDefaults(): void {
    // Load default workflow configurations
    if (Object.keys(this.workflows).length === 0) {
      this.workflows = createDefaultWorkflowConfigs();
    }

    // Load default project type configurations
    if (Object.keys(this.projectTypes).length === 0) {
      this.projectTypes = createDefaultProjectTypeConfigs();
    }
  }
}

export { VibeConfigImpl as VibeConfig };
