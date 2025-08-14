/**
 * Naming convention linting for files and directories
 */

import path from 'path';
import type { LintConfig } from '../config.js';

export interface LintIssue {
  file_path: string;
  issue_type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  line_number?: number;
  column?: number;
  suggestion?: string;
}

export class NamingConventionLinter {
  private config: LintConfig;

  constructor(config: LintConfig) {
    this.config = config;
  }

  lintFileNaming(filePath: string, skipExclusionCheck = false): LintIssue[] {
    const issues: LintIssue[] = [];

    if (!skipExclusionCheck && this.shouldExclude(filePath)) {
      return issues;
    }

    const extension = path.extname(filePath).toLowerCase();
    const expectedConvention = this.config.namingConventions[extension];

    if (!expectedConvention) {
      return issues;
    }

    const fileStem = path.basename(filePath, extension);

    if (!this.followsConvention(fileStem, expectedConvention)) {
      const suggestion = this.convertToConvention(fileStem, expectedConvention);
      issues.push({
        file_path: filePath,
        issue_type: 'naming_convention',
        severity: 'warning',
        message: `File name '${fileStem}' doesn't follow ${expectedConvention} convention for ${extension} files`,
        suggestion: `Consider renaming to: ${suggestion}${extension}`,
      });
    }

    return issues;
  }

  lintDirectoryNaming(dirPath: string, skipExclusionCheck = false): LintIssue[] {
    const issues: LintIssue[] = [];

    if (!skipExclusionCheck && this.shouldExclude(dirPath)) {
      return issues;
    }

    const dirName = path.basename(dirPath);
    const convention = this.config.directoryNaming;

    if (!this.followsConvention(dirName, convention)) {
      const suggestion = this.convertToConvention(dirName, convention);
      issues.push({
        file_path: dirPath,
        issue_type: 'naming_convention',
        severity: 'warning',
        message: `Directory name '${dirName}' doesn't follow ${convention} convention`,
        suggestion: `Consider renaming to: ${suggestion}`,
      });
    }

    return issues;
  }

  private shouldExclude(filePath: string): boolean {
    const patterns = this.config.excludePatterns || [];

    for (const pattern of patterns) {
      if (this.matchesPattern(filePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple glob-like pattern matching
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath) || regex.test(path.basename(filePath));
  }

  private followsConvention(name: string, convention: string): boolean {
    switch (convention) {
      case 'snake_case':
        return /^[a-z][a-z0-9_]*$/.test(name);
      case 'camelCase':
        return /^[a-z][a-zA-Z0-9]*$/.test(name);
      case 'kebab-case':
        return /^[a-z][a-z0-9-]*$/.test(name);
      default:
        return true;
    }
  }

  private convertToConvention(name: string, convention: string): string {
    const words = name.match(/[A-Z]*[a-z]+|[A-Z]+(?=[A-Z][a-z]|\b)|[0-9]+/g) ?? [];
    const lowerWords = words.map(w => w.toLowerCase()).filter(w => w);

    switch (convention) {
      case 'snake_case':
        return lowerWords.join('_');
      case 'camelCase':
        if (lowerWords.length === 0) return name;
        return (
          lowerWords[0] +
          lowerWords
            .slice(1)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join('')
        );
      case 'kebab-case':
        return lowerWords.join('-');
      default:
        return name;
    }
  }
}
