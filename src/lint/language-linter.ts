/**
 * Language and content quality linting for text files
 */

import fs from 'fs';
import path from 'path';
import type { LintConfig } from '../config.js';
import type { LintIssue } from './naming-convention.js';

export class LanguageLinter {
  private config: LintConfig;
  private emojiPattern: RegExp;
  private unprofessionalPatterns: RegExp[];

  constructor(config: LintConfig) {
    this.config = config;

    // Comprehensive emoji pattern
    this.emojiPattern = new RegExp(
      '[\u{1F600}-\u{1F64F}]|' + // emoticons
        '[\u{1F300}-\u{1F5FF}]|' + // symbols & pictographs
        '[\u{1F680}-\u{1F6FF}]|' + // transport & map symbols
        '[\u{1F1E0}-\u{1F1FF}]|' + // flags
        '[\u{2600}-\u{27BF}]|' + // miscellaneous symbols
        '[\u{1F900}-\u{1F9FF}]|' + // supplemental symbols
        '[🔍📁📋👀🌐🔒📈📖✨⚡🤖🔧✅🔗🎯📦🔑🏪🔐🚀📝📚🧪⚙️🔤🧹🛠️🔄⚠️]',
      'gu'
    );

    this.unprofessionalPatterns = (
      config.unprofessionalPatterns || [
        '\\b(awesome|cool|super)\\b',
        '\\b(gonna|wanna|gotta)\\b',
        '!!+',
      ]
    ).map(pattern => new RegExp(pattern, 'gi'));
  }

  lintFileContent(filePath: string, skipExclusionCheck = false): LintIssue[] {
    const issues: LintIssue[] = [];

    if (!skipExclusionCheck && this.shouldExclude(filePath)) {
      return issues;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, lineIndex) => {
        if (this.config.checkEmojis) {
          const emojiIssues = this.checkEmojis(line, lineIndex + 1, filePath);
          issues.push(...emojiIssues);
        }

        if (this.config.checkProfessionalLanguage) {
          const langIssues = this.checkProfessionalLanguage(
            line,
            lineIndex + 1,
            filePath
          );
          issues.push(...langIssues);
        }
      });
    } catch (_error) {
      // Skip files that can't be read
    }

    return issues;
  }

  private shouldExclude(filePath: string): boolean {
    return (
      this.matchesExcludePatterns(filePath) || this.matchesInformalPatterns(filePath)
    );
  }

  private matchesExcludePatterns(filePath: string): boolean {
    const patterns = this.config.excludePatterns || [];
    return this.pathMatchesAnyPattern(filePath, patterns);
  }

  private matchesInformalPatterns(filePath: string): boolean {
    const patterns = this.config.allowInformalLanguage || [];
    return this.pathMatchesAnyPattern(filePath, patterns);
  }

  private pathMatchesAnyPattern(filePath: string, patterns: string[]): boolean {
    const relativePathStr = this.getRelativePathString(filePath);

    for (const pattern of patterns) {
      if (this.pathMatchesPattern(filePath, relativePathStr, pattern)) {
        return true;
      }
    }
    return false;
  }

  private getRelativePathString(filePath: string): string {
    try {
      return path.relative(process.cwd(), filePath);
    } catch (_error) {
      return filePath;
    }
  }

  private pathMatchesPattern(
    filePath: string,
    relativePathStr: string,
    pattern: string
  ): boolean {
    // Check full path
    if (this.matchesPattern(relativePathStr, pattern)) {
      return true;
    }

    // Check filename only
    if (this.matchesPattern(path.basename(filePath), pattern)) {
      return true;
    }

    // Check parent directories
    return this.parentMatchesPattern(filePath, pattern);
  }

  private parentMatchesPattern(filePath: string, pattern: string): boolean {
    const dirPath = path.dirname(filePath);
    const parts = dirPath.split(path.sep);

    for (let i = 0; i < parts.length; i++) {
      const parentPath = parts.slice(0, i + 1).join(path.sep);
      const parentName = parts[i];

      if (!parentName) continue; // Skip empty parts

      try {
        const relativePath = path.relative(process.cwd(), parentPath);
        if (
          this.matchesPattern(relativePath, pattern) ||
          this.matchesPattern(parentName, pattern)
        ) {
          return true;
        }
      } catch (_error) {
        if (this.matchesPattern(parentName, pattern)) {
          return true;
        }
      }
    }
    return false;
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath) || regex.test(path.basename(filePath));
  }

  private checkEmojis(line: string, lineNumber: number, filePath: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const matches = line.matchAll(this.emojiPattern);

    for (const match of matches) {
      issues.push({
        file_path: filePath,
        issue_type: 'emoji_usage',
        severity: 'info',
        message: `Emoji found: '${match[0]}'`,
        line_number: lineNumber,
        column: match.index,
        suggestion:
          'Consider using text description instead of emoji for better accessibility',
      });
    }

    return issues;
  }

  private checkProfessionalLanguage(
    line: string,
    lineNumber: number,
    filePath: string
  ): LintIssue[] {
    const issues: LintIssue[] = [];

    this.unprofessionalPatterns.forEach(pattern => {
      const matches = line.matchAll(pattern);

      for (const match of matches) {
        issues.push({
          file_path: filePath,
          issue_type: 'unprofessional_language',
          severity: 'info',
          message: `Potentially unprofessional language: '${match[0]}'`,
          line_number: lineNumber,
          column: match.index,
          suggestion: 'Consider using more professional terminology',
        });
      }
    });

    return issues;
  }
}
