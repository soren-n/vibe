import { ProjectDetector } from '../project_types/detector.js';
import type { VibeConfig } from '../models.js';
import type { LintConfig, ProjectTypeConfig } from './types.js';
import {
  createDefaultLintConfig,
  createDefaultProjectTypeConfigs,
} from './defaults.js';
import { addGitignorePatterns, loadFromFile } from './loader.js';

export class VibeConfigImpl implements VibeConfig {
  projectType = 'auto';
  projectTypes: Record<string, ProjectTypeConfig> = {};
  lint: LintConfig;

  constructor() {
    this.lint = createDefaultLintConfig();
    this.loadDefaults();
  }

  static async loadFromFile(configPath?: string): Promise<VibeConfigImpl> {
    const loadedConfig = await loadFromFile(configPath);

    // Create instance with defaults
    const config = new VibeConfigImpl();

    // Merge loaded configuration
    config.projectType = loadedConfig.projectType;

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

  loadDefaults(): void {
    // Load default project type configurations
    if (Object.keys(this.projectTypes).length === 0) {
      this.projectTypes = createDefaultProjectTypeConfigs();
    }
  }
}

export { VibeConfigImpl as VibeConfig };
