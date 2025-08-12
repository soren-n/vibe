/**
 * Configuration management for vibe
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { VibeConfig } from './models';
import { ProjectDetector } from './project_types/detector';

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

export class VibeConfigImpl implements VibeConfig {
  projectType = 'auto';
  workflows: Record<string, WorkflowConfig> = {};
  projectTypes: Record<string, ProjectTypeConfig> = {};
  lint: LintConfig = {
    checkEmojis: true,
    checkProfessionalLanguage: true,
    allowInformalLanguage: ['*cli*', '*ui*', '*frontend*'],
    excludePatterns: [],
    namingConventions: {
      '.js': 'camelCase',
      '.ts': 'camelCase',
      '.yaml': 'kebab-case',
      '.yml': 'kebab-case',
      '.md': 'kebab-case',
    },
    directoryNaming: 'snake_case',
    maxStepMessageLength: 100,
    unprofessionalPatterns: [
      '\\b(awesome|cool|super)\\b',
      '\\b(gonna|wanna|gotta)\\b',
      '!!+',
    ],
  };
  session: SessionConfig = {
    maxSessions: 10,
    sessionTimeout: 3600000, // 1 hour in milliseconds
  };

  static async loadFromFile(configPath?: string): Promise<VibeConfigImpl> {
    const actualConfigPath = configPath ?? this.findConfigFile();
    const projectRoot = actualConfigPath
      ? path.dirname(actualConfigPath)
      : process.cwd();

    // Always start with a properly initialized instance with defaults
    const config = new VibeConfigImpl();
    config.loadDefaults();

    if (actualConfigPath && fs.existsSync(actualConfigPath)) {
      try {
        const data =
          (yaml.load(fs.readFileSync(actualConfigPath, 'utf-8')) as any) ?? {};

        // Carefully merge configuration sections to preserve defaults
        if (data.projectType || data.project_type) {
          config.projectType = data.projectType ?? data.project_type;
        }

        if (data.workflows && typeof data.workflows === 'object') {
          // Merge workflow configs, preserving defaults and adding new ones
          for (const [name, workflowConfig] of Object.entries(data.workflows)) {
            if (typeof workflowConfig === 'object' && workflowConfig !== null) {
              const wfConfig = workflowConfig as any;
              config.workflows[name] = {
                enabled: wfConfig.enabled !== undefined ? wfConfig.enabled : true,
                priority: wfConfig.priority !== undefined ? wfConfig.priority : 1,
                triggers: Array.isArray(wfConfig.triggers)
                  ? wfConfig.triggers
                  : undefined,
                description: wfConfig.description ?? undefined,
                steps: Array.isArray(wfConfig.steps) ? wfConfig.steps : undefined,
                commands: Array.isArray(wfConfig.commands)
                  ? wfConfig.commands
                  : undefined,
                dependencies: Array.isArray(wfConfig.dependencies)
                  ? wfConfig.dependencies
                  : undefined,
              };
            }
          }
        }

        if (data.projectTypes || data.project_types) {
          const projectTypesData = data.projectTypes ?? data.project_types;
          // Merge project type configs, preserving defaults
          for (const [name, typeConfig] of Object.entries(projectTypesData)) {
            if (typeof typeConfig === 'object' && typeConfig !== null) {
              config.projectTypes[name] = {
                workflows: Array.isArray((typeConfig as any).workflows)
                  ? (typeConfig as any).workflows
                  : [],
                tools: Array.isArray((typeConfig as any).tools)
                  ? (typeConfig as any).tools
                  : [],
              };
            }
          }
        }

        if (data.lint && typeof data.lint === 'object') {
          // Merge lint config carefully to preserve defaults
          const lintData = data.lint as any;
          config.lint = {
            checkEmojis:
              lintData.checkEmojis !== undefined
                ? lintData.checkEmojis
                : config.lint.checkEmojis,
            checkProfessionalLanguage:
              lintData.checkProfessionalLanguage !== undefined
                ? lintData.checkProfessionalLanguage
                : config.lint.checkProfessionalLanguage,
            allowInformalLanguage: Array.isArray(lintData.allowInformalLanguage)
              ? lintData.allowInformalLanguage
              : config.lint.allowInformalLanguage,
            excludePatterns: Array.isArray(lintData.excludePatterns)
              ? lintData.excludePatterns
              : config.lint.excludePatterns,
            namingConventions:
              lintData.namingConventions &&
              typeof lintData.namingConventions === 'object'
                ? { ...config.lint.namingConventions, ...lintData.namingConventions }
                : config.lint.namingConventions,
            directoryNaming: lintData.directoryNaming ?? config.lint.directoryNaming,
            maxStepMessageLength:
              lintData.maxStepMessageLength !== undefined
                ? lintData.maxStepMessageLength
                : config.lint.maxStepMessageLength,
            unprofessionalPatterns: Array.isArray(lintData.unprofessionalPatterns)
              ? lintData.unprofessionalPatterns
              : config.lint.unprofessionalPatterns,
          };
        }

        if (data.session && typeof data.session === 'object') {
          // Merge session config
          const sessionData = data.session as any;
          config.session = {
            maxSessions:
              sessionData.maxSessions !== undefined
                ? sessionData.maxSessions
                : config.session.maxSessions,
            sessionTimeout:
              sessionData.sessionTimeout !== undefined
                ? sessionData.sessionTimeout
                : config.session.sessionTimeout,
          };
        }
      } catch (error) {
        console.warn(
          `Warning: Error loading config from ${actualConfigPath}: ${error}`
        );
        console.warn('Using default configuration');
        // config already has defaults loaded
      }
    }

    // Add gitignore patterns to lint exclude patterns
    const gitignorePatterns = this.readGitignorePatterns(projectRoot);
    const essentialPatterns = [
      '.git',
      '.git/**',
      '.github',
      '.github/**',
      '.gitignore',
      '.gitattributes',
      '.vscode',
      '.vscode/**',
      'node_modules',
      'node_modules/**',
      '.DS_Store',
      'Thumbs.db',
    ];

    const allPatterns = [...gitignorePatterns, ...essentialPatterns];
    const existingPatterns = new Set(config.lint.excludePatterns);

    for (const pattern of allPatterns) {
      if (!existingPatterns.has(pattern)) {
        config.lint.excludePatterns.push(pattern);
      }
    }

    return config;
  }

  private static findConfigFile(): string | null {
    const currentDir = process.cwd();
    const configNames = ['.vibe.yaml', 'vibe.yaml', '.vibe.yml', 'vibe.yml'];

    // Check current directory and all parent directories
    let dir = currentDir;
    while (true) {
      for (const configName of configNames) {
        const configPath = path.join(dir, configName);
        if (fs.existsSync(configPath)) {
          return configPath;
        }
      }

      const parentDir = path.dirname(dir);
      if (parentDir === dir) break; // Reached root
      dir = parentDir;
    }

    return null;
  }

  private static readGitignorePatterns(projectRoot: string): string[] {
    const gitignoreFiles = this.findGitignoreFiles(projectRoot);
    const allPatterns: string[] = [];

    for (const [gitignorePath, relativeDir] of gitignoreFiles) {
      const patterns = this.processGitignoreFile(gitignorePath, relativeDir);
      allPatterns.push(...patterns);
    }

    return this.removeDuplicatePatterns(allPatterns);
  }

  private static findGitignoreFiles(projectRoot: string): [string, string][] {
    const gitignoreFiles: [string, string][] = [];

    try {
      // Add root .gitignore
      const rootGitignore = path.join(projectRoot, '.gitignore');
      if (fs.existsSync(rootGitignore)) {
        gitignoreFiles.push([rootGitignore, '']);
      }

      // Find subdirectory .gitignore files
      this.findGitignoreFilesRecursive(projectRoot, projectRoot, gitignoreFiles);
    } catch (error) {
      console.warn(`Warning: Error finding gitignore files: ${error}`);
    }

    return gitignoreFiles;
  }

  private static findGitignoreFilesRecursive(
    currentDir: string,
    projectRoot: string,
    gitignoreFiles: [string, string][]
  ): void {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip cache directories
          if (this.shouldIncludeDirectory(entry.name)) {
            this.findGitignoreFilesRecursive(fullPath, projectRoot, gitignoreFiles);
          }
        } else if (entry.name === '.gitignore') {
          // Skip root gitignore (already added)
          if (fullPath !== path.join(projectRoot, '.gitignore')) {
            const relativeDir = path.relative(projectRoot, currentDir);
            gitignoreFiles.push([fullPath, relativeDir]);
          }
        }
      }
    } catch (_error) {
      // Skip unreadable directories
    }
  }

  private static shouldIncludeDirectory(dirName: string): boolean {
    const skipDirs = new Set([
      'node_modules',
      'dist',
      'build',
      '.vscode',
      '.git',
      '.github',
      '.cache',
      '.next',
      '.nuxt',
      'coverage',
      '.nyc_output',
      '.vite',
      '.turbo',
      '.vercel',
      '.netlify',
      'target',
      'out',
      'tmp',
      'temp',
    ]);

    return !skipDirs.has(dirName);
  }

  private static processGitignoreFile(
    gitignorePath: string,
    relativeDir: string
  ): string[] {
    const patterns: string[] = [];

    try {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (this.shouldSkipLine(trimmedLine)) {
          continue;
        }

        const pattern = this.normalizePattern(trimmedLine, relativeDir);
        patterns.push(...this.expandPattern(pattern));
      }
    } catch (_error) {
      // Skip unreadable gitignore files
    }

    return patterns;
  }

  private static shouldSkipLine(line: string): boolean {
    if (!line || line.startsWith('#')) {
      return true;
    }

    // Skip overly broad patterns that would exclude everything
    return ['*', '**', '*/**'].includes(line);
  }

  private static normalizePattern(line: string, relativeDir: string): string {
    if (relativeDir) {
      // For subdirectory .gitignore, prefix patterns with the directory path
      if (line.startsWith('/')) {
        // Absolute pattern (relative to .gitignore location)
        return `${relativeDir}/${line.slice(1)}`;
      } else {
        // Relative pattern applies within that subdirectory
        return `${relativeDir}/${line}`;
      }
    } else {
      // Root .gitignore patterns
      return line.startsWith('/') ? line.slice(1) : line;
    }
  }

  private static expandPattern(pattern: string): string[] {
    const patterns: string[] = [];

    if (pattern.endsWith('/')) {
      // Directory patterns
      const dirPattern = pattern.slice(0, -1);
      patterns.push(dirPattern, `${dirPattern}/**`);
    } else {
      patterns.push(pattern);
      // For potential directories, also exclude contents
      const pathParts = pattern.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && !lastPart.includes('.') && !lastPart.includes('*')) {
        patterns.push(`${pattern}/**`);
      }
    }

    return patterns;
  }

  private static removeDuplicatePatterns(allPatterns: string[]): string[] {
    const seen = new Set<string>();
    const uniquePatterns: string[] = [];

    for (const pattern of allPatterns) {
      if (!seen.has(pattern)) {
        seen.add(pattern);
        uniquePatterns.push(pattern);
      }
    }

    return uniquePatterns;
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

  private loadDefaults(): void {
    // Load default workflow configurations
    if (Object.keys(this.workflows).length === 0) {
      this.workflows = {
        // Core workflows
        analysis: { enabled: true, priority: 1 },
        implementation: { enabled: true, priority: 2 },
        testing: { enabled: true, priority: 3 },
        'quality-check': { enabled: true, priority: 4 },
        documentation: { enabled: true, priority: 5 },

        // Development workflows
        'dev-setup': { enabled: true, priority: 1 },
        'development-session': { enabled: true, priority: 2 },
        'code-review': { enabled: true, priority: 3 },
        'debug-session': { enabled: true, priority: 4 },

        // TypeScript specific
        'typescript-setup': { enabled: true, priority: 1 },
        'typescript-test': { enabled: true, priority: 2 },
        'typescript-lint': { enabled: true, priority: 3 },
        'typescript-build': { enabled: true, priority: 4 },

        // Frontend specific
        'frontend-setup': { enabled: true, priority: 1 },
        'frontend-build': { enabled: true, priority: 2 },
        'frontend-test': { enabled: true, priority: 3 },
        'frontend-deploy': { enabled: true, priority: 4 },
      };
    }

    // Load default project type configurations - match TypeScript structure exactly
    if (Object.keys(this.projectTypes).length === 0) {
      this.projectTypes = {
        typescript: {
          workflows: [
            'analysis',
            'typescript-setup',
            'typescript-test',
            'typescript-lint',
            'quality-check',
          ],
          tools: ['jest', 'eslint', 'prettier', 'tsc'],
        },
        javascript: {
          workflows: ['analysis', 'dev-setup', 'testing', 'quality-check'],
          tools: ['jest', 'eslint', 'prettier'],
        },
        node: {
          workflows: ['analysis', 'dev-setup', 'testing', 'quality-check'],
          tools: ['jest', 'eslint', 'prettier', 'nodemon'],
        },
        react: {
          workflows: [
            'frontend-setup',
            'frontend-build',
            'frontend-test',
            'quality-check',
          ],
          tools: ['vite', 'jest', 'eslint', 'prettier', 'typescript'],
        },
        nextjs: {
          workflows: [
            'frontend-setup',
            'frontend-build',
            'frontend-test',
            'frontend-deploy',
          ],
          tools: ['next', 'jest', 'eslint', 'prettier', 'typescript'],
        },
        generic: {
          workflows: [
            'analysis',
            'implementation',
            'testing',
            'quality-check',
            'documentation',
          ],
          tools: ['git', 'docker'],
        },
      };
    }
  }
}

export { VibeConfigImpl as VibeConfig };
