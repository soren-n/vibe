import type { LintConfig, ProjectTypeConfig } from './types.js';

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
