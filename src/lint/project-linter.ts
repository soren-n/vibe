/**
 * Main project linting orchestrator
 */

import fs from 'fs';
import path from 'path';
import type { LintConfig } from '../config.js';
import { createDefaultLintConfig } from '../config/defaults.js';
import { type LintIssue, NamingConventionLinter } from './naming-convention.js';
import { LanguageLinter } from './language-linter.js';
import { type TextQualityIssue, TextQualityLinter } from './text-quality.js';

export interface LintReport {
  total_issues: number;
  issues_by_type: Record<string, number>;
  issues_by_severity: Record<string, number>;
  files_with_issues: string[];
  suggestions: string[];
}

export class ProjectLinter {
  private config: LintConfig;
  private textQualityLinter: TextQualityLinter;
  private languageLinter: LanguageLinter;
  private namingConventionLinter: NamingConventionLinter;

  constructor(config?: LintConfig) {
    this.config = config ?? createDefaultLintConfig();
    this.textQualityLinter = new TextQualityLinter(this.config);
    this.languageLinter = new LanguageLinter(this.config);
    this.namingConventionLinter = new NamingConventionLinter(this.config);
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
        const namingIssues = this.namingConventionLinter.lintFileNaming(filePath);
        const languageIssues = this.languageLinter.lintFileContent(filePath);
        issues.push(...namingIssues, ...languageIssues);
      } else if (stats.isDirectory()) {
        const namingIssues = this.namingConventionLinter.lintDirectoryNaming(filePath);
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
        const namingIssues = this.namingConventionLinter.lintFileNaming(filePath, true);

        // Check file content for language issues (with file type filter like Python version)
        const ext = path.extname(filePath);
        if (['.py', '.js', '.ts', '.yaml', '.yml', '.md'].includes(ext)) {
          const languageIssues = this.languageLinter.lintFileContent(filePath, true);
          issues.push(...languageIssues);
        }

        issues.push(...namingIssues);
      } else if (stats.isDirectory()) {
        // Skip exclusion check since we already did it upstream
        const namingIssues = this.namingConventionLinter.lintDirectoryNaming(
          filePath,
          true
        );
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
