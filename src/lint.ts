/**
 * Project linting system for Vibe - TypeScript implementation
 */

import fs from 'fs';
import path from 'path';
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

export interface LintReport {
  total_issues: number;
  issues_by_type: Record<string, number>;
  issues_by_severity: Record<string, number>;
  files_with_issues: string[];
  suggestions: string[];
}

export interface LintIssue {
  file_path: string;
  issue_type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  line_number?: number;
  column?: number;
  suggestion?: string;
}

export interface TextQualityIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
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

export class TextQualityLinter {
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

  lintTextQuality(text: string, context = 'general'): TextQualityIssue[] {
    const issues: TextQualityIssue[] = [];

    // Run all quality checks
    issues.push(...this.checkTextLength(text, context));
    issues.push(...this.checkProfessionalLanguage(text));
    issues.push(...this.checkEmojiUsage(text));
    issues.push(...this.checkTextReadability(text));

    return issues;
  }

  private checkTextLength(text: string, context: string): TextQualityIssue[] {
    const issues: TextQualityIssue[] = [];

    if (context === 'step_message' && text.length > this.config.maxStepMessageLength) {
      issues.push({
        type: 'length',
        severity: 'warning',
        message: `Text length (${text.length}) exceeds recommended maximum (${this.config.maxStepMessageLength})`,
        suggestion: 'Consider breaking into shorter, more focused statements',
      });
    }

    return issues;
  }

  private checkProfessionalLanguage(text: string): TextQualityIssue[] {
    const issues: TextQualityIssue[] = [];

    if (!this.config.checkProfessionalLanguage) {
      return issues;
    }

    for (const pattern of this.unprofessionalPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        issues.push({
          type: 'unprofessional_language',
          severity: 'info',
          message: `Potentially unprofessional language: '${match[0]}'`,
          suggestion: 'Consider using more formal language',
        });
      }
    }

    return issues;
  }

  private checkEmojiUsage(text: string): TextQualityIssue[] {
    const issues: TextQualityIssue[] = [];

    if (!this.config.checkEmojis) {
      return issues;
    }

    const emojiMatches = text.matchAll(this.emojiPattern);
    for (const match of emojiMatches) {
      issues.push({
        type: 'emoji_usage',
        severity: 'warning',
        message: `Emoji '${match[0]}' found in text`,
        suggestion:
          'Consider using descriptive text instead of emojis for professional communication',
      });
    }

    return issues;
  }

  private checkTextReadability(text: string): TextQualityIssue[] {
    const issues: TextQualityIssue[] = [];

    // Basic readability checks without external dependencies
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);

    if (sentences.length > 0 && words.length > 0) {
      const avgWordsPerSentence = words.length / sentences.length;

      // Flag very long sentences
      if (avgWordsPerSentence > 25) {
        issues.push({
          type: 'readability',
          severity: 'info',
          message: `Average sentence length (${avgWordsPerSentence.toFixed(1)} words) could be improved`,
          suggestion:
            'Consider simplifying sentence structure and breaking long sentences',
        });
      }
    }

    return issues;
  }
}

export class ProjectLinter {
  private namingLinter: NamingConventionLinter;
  private languageLinter: LanguageLinter;
  private textQualityLinter: TextQualityLinter;
  private config: LintConfig;

  constructor(config?: LintConfig) {
    this.config = config ?? createLintConfig();
    this.namingLinter = new NamingConventionLinter(this.config);
    this.languageLinter = new LanguageLinter(this.config);
    this.textQualityLinter = new TextQualityLinter(this.config);
  }

  lintText(text: string, context = 'general', severity?: string): TextQualityIssue[] {
    const issues = this.textQualityLinter.lintTextQuality(text, context);

    // Filter by severity if specified
    if (severity) {
      return issues.filter(issue => issue.severity === severity);
    }

    return issues;
  }

  lintPath(filePath: string, severity?: string, issueType?: string): LintIssue[] {
    const issues: LintIssue[] = [];

    try {
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        const namingIssues = this.namingLinter.lintFileNaming(filePath);
        const languageIssues = this.languageLinter.lintFileContent(filePath);
        issues.push(...namingIssues, ...languageIssues);
      } else if (stats.isDirectory()) {
        const namingIssues = this.namingLinter.lintDirectoryNaming(filePath);
        issues.push(...namingIssues);
      }
    } catch (_error) {
      // Skip inaccessible files
    }

    // Filter by criteria
    let filteredIssues = issues;

    if (severity) {
      filteredIssues = filteredIssues.filter(issue => issue.severity === severity);
    }

    if (issueType) {
      filteredIssues = filteredIssues.filter(issue => issue.issue_type === issueType);
    }

    return filteredIssues;
  }

  lintProject(projectPath = '.', severity?: string, issueType?: string): LintReport {
    const issues: LintIssue[] = [];
    const filesWithIssues = new Set<string>();

    try {
      // Build a set of excluded directories for fast lookup (optimization from Python version)
      const excludedDirs = this.buildExcludedDirs(projectPath);

      this.walkDirectoryOptimized(projectPath, excludedDirs, filePath => {
        const fileIssues = this.lintPathOptimized(
          filePath,
          severity,
          issueType,
          excludedDirs
        );
        if (fileIssues.length > 0) {
          issues.push(...fileIssues);
          filesWithIssues.add(filePath);
        }
      });
    } catch (_error) {
      // Handle directory traversal errors
    }

    const issuesByType: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {};

    issues.forEach(issue => {
      issuesByType[issue.issue_type] = (issuesByType[issue.issue_type] ?? 0) + 1;
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] ?? 0) + 1;
    });

    return {
      total_issues: issues.length,
      issues_by_type: issuesByType,
      issues_by_severity: issuesBySeverity,
      files_with_issues: Array.from(filesWithIssues),
      suggestions: this.generateSuggestions(issues),
    };
  }

  private buildExcludedDirs(projectPath: string): Set<string> {
    const excludedDirs = new Set<string>();

    // Common patterns that represent entire directories to skip
    const dirPatterns = [
      '.venv',
      'node_modules',
      '__pycache__',
      '.git',
      'dist',
      'build',
      '.tox',
      '.coverage',
      '.pytest_cache',
      '.next',
      '.nuxt',
      'target',
      'out',
      'tmp',
    ];

    // Add patterns from config that look like directory patterns
    for (const pattern of this.config.excludePatterns || []) {
      if (pattern.endsWith('/**') || dirPatterns.includes(pattern)) {
        dirPatterns.push(pattern.replace('/**', ''));
      }
    }

    // Find all directories matching these patterns
    this.walkDirectory(projectPath, itemPath => {
      try {
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
          const dirName = path.basename(itemPath);
          const relativePath = path.relative(projectPath, itemPath);

          for (const pattern of dirPatterns) {
            if (
              this.matchesPattern(dirName, pattern) ||
              this.matchesPattern(relativePath, pattern)
            ) {
              excludedDirs.add(itemPath);
              break;
            }
          }
        }
      } catch (_error) {
        // Skip inaccessible items
      }
    });

    return excludedDirs;
  }

  private walkDirectoryOptimized(
    dirPath: string,
    excludedDirs: Set<string>,
    callback: (filePath: string) => void
  ): void {
    // Fast check: skip if this directory is excluded
    if (excludedDirs.has(dirPath)) {
      return;
    }

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // Fast check: skip if any parent is in excluded_dirs
        let shouldSkip = false;
        for (const excludedDir of excludedDirs) {
          if (fullPath.startsWith(excludedDir + path.sep) || fullPath === excludedDir) {
            shouldSkip = true;
            break;
          }
        }

        if (shouldSkip) continue;

        if (entry.isDirectory()) {
          callback(fullPath);
          this.walkDirectoryOptimized(fullPath, excludedDirs, callback);
        } else if (entry.isFile()) {
          callback(fullPath);
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }
  }

  private lintPathOptimized(
    filePath: string,
    severity?: string,
    issueType?: string,
    _excludedDirs?: Set<string>
  ): LintIssue[] {
    const issues: LintIssue[] = [];

    // Skip if file is in excluded directory (already checked in walkDirectoryOptimized)
    try {
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        // Skip exclusion check since we already did it upstream
        const namingIssues = this.namingLinter.lintFileNaming(filePath, true);

        // Check file content for language issues (with file type filter like Python version)
        const ext = path.extname(filePath);
        if (['.py', '.js', '.ts', '.yaml', '.yml', '.md'].includes(ext)) {
          const languageIssues = this.languageLinter.lintFileContent(filePath, true);
          issues.push(...languageIssues);
        }

        issues.push(...namingIssues);
      } else if (stats.isDirectory()) {
        // Skip exclusion check since we already did it upstream
        const namingIssues = this.namingLinter.lintDirectoryNaming(filePath, true);
        issues.push(...namingIssues);
      }
    } catch (_error) {
      // Skip inaccessible files
    }

    // Filter by criteria
    let filteredIssues = issues;

    if (severity) {
      filteredIssues = filteredIssues.filter(issue => issue.severity === severity);
    }

    if (issueType) {
      filteredIssues = filteredIssues.filter(issue => issue.issue_type === issueType);
    }

    return filteredIssues;
  }

  private walkDirectory(dirPath: string, callback: (filePath: string) => void): void {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          callback(fullPath);
          this.walkDirectory(fullPath, callback);
        } else if (entry.isFile()) {
          callback(fullPath);
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }
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

  generateReport(issues: LintIssue[]): LintReport {
    const report: LintReport = {
      total_issues: issues.length,
      issues_by_type: {},
      issues_by_severity: {},
      files_with_issues: [],
      suggestions: [],
    };

    const filesWithIssues = new Set<string>();

    for (const issue of issues) {
      // Count by type
      const issueType = issue.issue_type;
      report.issues_by_type[issueType] ??= 0;
      report.issues_by_type[issueType] += 1;

      // Count by severity
      const severity = issue.severity;
      report.issues_by_severity[severity] ??= 0;
      report.issues_by_severity[severity] += 1;

      // Track files with issues
      filesWithIssues.add(issue.file_path);

      // Collect suggestions
      if (issue.suggestion) {
        report.suggestions.push(issue.suggestion);
      }
    }

    // Convert set to list
    report.files_with_issues = Array.from(filesWithIssues);

    return report;
  }

  private generateSuggestions(issues: LintIssue[]): string[] {
    const suggestions = new Set<string>();

    issues.forEach(issue => {
      if (issue.suggestion) {
        suggestions.add(issue.suggestion);
      }
    });

    return Array.from(suggestions);
  }
}
