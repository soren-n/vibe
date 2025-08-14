/**
 * Project linting system for Vibe - TypeScript implementation
 */

import type { LintConfig } from './config';

// Factory function to create LintConfig instances
export function createLintConfig(overrides?: Partial<LintConfig>): LintConfig {
  const defaults: LintConfig = {
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

  if (!overrides) {
    return defaults;
  }

  // Deep merge naming conventions
  const mergedNamingConventions = {
    ...defaults.namingConventions,
    ...(overrides.namingConventions ?? {}),
  };

  return {
    ...defaults,
    ...overrides,
    namingConventions: mergedNamingConventions,
  };
}

// Re-export all classes and interfaces from the modules
export { type LintIssue, NamingConventionLinter } from './lint/naming-convention.js';
export { LanguageLinter } from './lint/language-linter.js';
export { type TextQualityIssue, TextQualityLinter } from './lint/text-quality.js';
export { type LintReport, ProjectLinter } from './lint/project-linter.js';
