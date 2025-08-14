import type {
  LintConfig,
  ProjectTypeConfig,
  SessionConfig,
  WorkflowConfig,
} from './types.js';

/**
 * Default configuration values for Vibe
 */
export function createDefaultLintConfig(): LintConfig {
  return {
    checkEmojis: true,
    checkProfessionalLanguage: true,
    allowInformalLanguage: ['*cli*', '*ui*', '*frontend*'],
    excludePatterns: [],
    namingConventions: {
      '.py': 'snake_case',
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
}

export function createDefaultSessionConfig(): SessionConfig {
  return {
    maxSessions: 10,
    sessionTimeout: 3600000, // 1 hour in milliseconds
    // sessionDir is optional and will default to process.cwd() + '/.vibe/sessions'
  };
}

export function createDefaultWorkflowConfigs(): Record<string, WorkflowConfig> {
  return {
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

export function createDefaultProjectTypeConfigs(): Record<string, ProjectTypeConfig> {
  return {
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
      workflows: ['frontend-setup', 'frontend-build', 'frontend-test', 'quality-check'],
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
