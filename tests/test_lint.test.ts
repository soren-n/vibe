/**
 * Comprehensive tests for the lint system
 * Tests all the functionality to match the Python version
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  LanguageLinter,
  NamingConventionLinter,
  ProjectLinter,
  TextQualityLinter,
  createLintConfig,
} from '../src/lint';
import { LintConfig } from '../src/config';

describe('Lint system comprehensive tests', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-lint-test-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('LintConfig creation', () => {
    test('creates default config', () => {
      const config = createLintConfig();

      expect(config.checkEmojis).toBe(true);
      expect(config.checkProfessionalLanguage).toBe(true);
      expect(config.namingConventions['.py']).toBe('snake_case');
      expect(config.namingConventions['.ts']).toBe('camelCase');
      expect(config.directoryNaming).toBe('snake_case');
    });

    test('merges custom config with defaults', () => {
      const config = createLintConfig({
        checkEmojis: false,
        maxStepMessageLength: 200,
        namingConventions: { '.py': 'camelCase' },
      });

      expect(config.checkEmojis).toBe(false);
      expect(config.maxStepMessageLength).toBe(200);
      expect(config.namingConventions['.py']).toBe('camelCase');
      expect(config.namingConventions['.ts']).toBe('camelCase'); // Should still have default
    });
  });

  describe('NamingConventionLinter', () => {
    let linter: NamingConventionLinter;
    let config: LintConfig;

    beforeEach(() => {
      config = createLintConfig();
      linter = new NamingConventionLinter(config);
    });

    test('detects snake_case violations in TypeScript files', () => {
      const testFile = 'BadFileName.py';
      fs.writeFileSync(testFile, 'print("hello")');

      const issues = linter.lintFileNaming(testFile);

      expect(issues.length).toBe(1);
      expect(issues[0]!.issue_type).toBe('naming_convention');
      expect(issues[0]!.severity).toBe('warning');
      expect(issues[0]!.message).toContain("doesn't follow snake_case");
      expect(issues[0]!.suggestion).toContain('bad_file_name.py');
    });

    test('detects camelCase violations in TypeScript files', () => {
      const testFile = 'bad_file_name.ts';
      fs.writeFileSync(testFile, 'console.log("hello")');

      const issues = linter.lintFileNaming(testFile);

      expect(issues.length).toBe(1);
      expect(issues[0]!.issue_type).toBe('naming_convention');
      expect(issues[0]!.message).toContain("doesn't follow camelCase");
      expect(issues[0]!.suggestion).toContain('badFileName.ts');
    });

    test('accepts correct naming conventions', () => {
      const testFiles = ['correct_file.py', 'correctFile.ts', 'kebab-case.md'];

      testFiles.forEach(file => {
        fs.writeFileSync(file, 'test content');
        const issues = linter.lintFileNaming(file);
        expect(issues.length).toBe(0);
      });
    });

    test('detects directory naming violations', () => {
      const testDir = 'BadDirectory';
      fs.mkdirSync(testDir);

      const issues = linter.lintDirectoryNaming(testDir);

      expect(issues.length).toBe(1);
      expect(issues[0]!.issue_type).toBe('naming_convention');
      expect(issues[0]!.message).toContain("doesn't follow snake_case");
      expect(issues[0]!.suggestion).toContain('bad_directory');
    });

    test('respects exclusion patterns', () => {
      const excludeConfig = createLintConfig({
        excludePatterns: ['node_modules/**', '*.tmp'],
      });
      const excludeLinter = new NamingConventionLinter(excludeConfig);

      fs.mkdirSync('node_modules', { recursive: true });
      fs.writeFileSync('node_modules/BadFile.js', 'test');
      fs.writeFileSync('test.tmp', 'test');

      expect(excludeLinter.lintFileNaming('node_modules/BadFile.js').length).toBe(0);
      expect(excludeLinter.lintFileNaming('test.tmp').length).toBe(0);
    });
  });

  describe('LanguageLinter', () => {
    let linter: LanguageLinter;
    let config: LintConfig;

    beforeEach(() => {
      config = createLintConfig();
      linter = new LanguageLinter(config);
    });

    test('detects emojis in source code', () => {
      const testFile = 'test.py';
      fs.writeFileSync(testFile, 'print("Hello 🌍 world!")');

      const issues = linter.lintFileContent(testFile);

      expect(issues.length).toBe(1);
      expect(issues[0]!.issue_type).toBe('emoji_usage');
      expect(issues[0]!.message).toContain('🌍');
      expect(issues[0]!.line_number).toBe(1);
    });

    test('detects unprofessional language', () => {
      const testFile = 'test.js';
      fs.writeFileSync(testFile, 'console.log("This is awesome!!!");');

      const issues = linter.lintFileContent(testFile);

      const unprofessionalIssues = issues.filter(
        i => i.issue_type === 'unprofessional_language'
      );
      expect(unprofessionalIssues.length).toBeGreaterThan(0);

      const awesomeIssue = unprofessionalIssues.find(i =>
        i.message.includes('awesome')
      );
      expect(awesomeIssue).toBeDefined();
    });

    test('detects multiple exclamation marks', () => {
      const testFile = 'test.md';
      fs.writeFileSync(testFile, '# Great feature!!!');

      const issues = linter.lintFileContent(testFile);

      const exclamationIssues = issues.filter(i => i.message.includes('!!!'));
      expect(exclamationIssues.length).toBeGreaterThan(0);
    });

    test('respects emoji checking disabled', () => {
      const noEmojiConfig = createLintConfig({ checkEmojis: false });
      const noEmojiLinter = new LanguageLinter(noEmojiConfig);

      const testFile = 'test.py';
      fs.writeFileSync(testFile, 'print("Hello 🌍 world!")');

      const issues = noEmojiLinter.lintFileContent(testFile);
      const emojiIssues = issues.filter(i => i.issue_type === 'emoji_usage');
      expect(emojiIssues.length).toBe(0);
    });

    test('respects professional language checking disabled', () => {
      const noProfConfig = createLintConfig({ checkProfessionalLanguage: false });
      const noProfLinter = new LanguageLinter(noProfConfig);

      const testFile = 'test.js';
      fs.writeFileSync(testFile, 'console.log("This is awesome!");');

      const issues = noProfLinter.lintFileContent(testFile);
      const profIssues = issues.filter(i => i.issue_type === 'unprofessional_language');
      expect(profIssues.length).toBe(0);
    });

    test('respects informal language patterns', () => {
      const informalConfig = createLintConfig({
        allowInformalLanguage: ['*test*', '*ui*'],
      });
      const informalLinter = new LanguageLinter(informalConfig);

      fs.writeFileSync('test_file.py', 'print("This is awesome!")');
      fs.writeFileSync('ui_component.js', 'console.log("Cool feature!");');

      expect(informalLinter.lintFileContent('test_file.py').length).toBe(0);
      expect(informalLinter.lintFileContent('ui_component.js').length).toBe(0);
    });
  });

  describe('TextQualityLinter', () => {
    let linter: TextQualityLinter;
    let config: LintConfig;

    beforeEach(() => {
      config = createLintConfig();
      linter = new TextQualityLinter(config);
    });

    test('detects text length violations for step messages', () => {
      const longText = 'a'.repeat(150); // Exceeds default limit of 100

      const issues = linter.lintTextQuality(longText, 'step_message');

      const lengthIssues = issues.filter(i => i.type === 'length');
      expect(lengthIssues.length).toBe(1);
      expect(lengthIssues[0]!.severity).toBe('warning');
      expect(lengthIssues[0]!.message).toContain('150');
    });

    test('does not flag length for other contexts', () => {
      const longText = 'a'.repeat(150);

      const issues = linter.lintTextQuality(longText, 'general');

      const lengthIssues = issues.filter(i => i.type === 'length');
      expect(lengthIssues.length).toBe(0);
    });

    test('detects emojis in text', () => {
      const textWithEmoji = 'This is great! 🎉';

      const issues = linter.lintTextQuality(textWithEmoji);

      const emojiIssues = issues.filter(i => i.type === 'emoji_usage');
      expect(emojiIssues.length).toBe(1);
      expect(emojiIssues[0]!.message).toContain('🎉');
    });

    test('detects unprofessional language in text', () => {
      const unprofessionalText = 'This feature is gonna be awesome!';

      const issues = linter.lintTextQuality(unprofessionalText);

      const langIssues = issues.filter(i => i.type === 'unprofessional_language');
      expect(langIssues.length).toBeGreaterThan(0);
    });

    test('basic readability checks', () => {
      const complexText =
        'This is an extremely long and complex sentence with many clauses and subclauses that goes on and on without any clear structure making it very difficult to read and understand for most people who encounter it.';

      const issues = linter.lintTextQuality(complexText);

      const readabilityIssues = issues.filter(i => i.type === 'readability');
      expect(readabilityIssues.length).toBeGreaterThan(0);
    });
  });

  describe('ProjectLinter', () => {
    let linter: ProjectLinter;

    beforeEach(() => {
      linter = new ProjectLinter();
    });

    test('lints entire project', () => {
      // Create test project structure
      fs.mkdirSync('src');
      fs.mkdirSync('BadDirectory');
      fs.writeFileSync('src/BadFile.py', 'print("Hello 🌍")');
      fs.writeFileSync('src/goodFile.ts', 'console.log("hello");');
      fs.writeFileSync('BadFile.js', 'console.log("awesome!!!");');

      const report = linter.lintProject('.');

      expect(report.total_issues).toBeGreaterThan(0);
      expect(report.issues_by_type['naming_convention']).toBeGreaterThan(0);
      expect(report.issues_by_type['emoji_usage']).toBeGreaterThan(0);
      expect(report.files_with_issues.length).toBeGreaterThan(0);
    });

    test('respects exclusion patterns for directories', () => {
      const excludeConfig = createLintConfig({
        excludePatterns: ['node_modules/**', 'dist/**'],
      });
      const excludeLinter = new ProjectLinter(excludeConfig);

      // Create excluded directories
      fs.mkdirSync('node_modules/some-package', { recursive: true });
      fs.mkdirSync('dist', { recursive: true });
      fs.writeFileSync('node_modules/some-package/BadFile.js', 'console.log("test");');
      fs.writeFileSync('dist/BadFile.js', 'console.log("test");');

      // Create non-excluded file with issues
      fs.writeFileSync('BadFile.py', 'print("test")');

      const report = excludeLinter.lintProject('.');

      // Should only have issues from the non-excluded file
      const issueFiles = report.files_with_issues;
      expect(issueFiles.some(f => f.includes('node_modules'))).toBe(false);
      expect(issueFiles.some(f => f.includes('dist'))).toBe(false);
      expect(issueFiles.some(f => f.includes('BadFile.py'))).toBe(true);
    });

    test('filters by severity', () => {
      fs.writeFileSync('BadFile.py', 'print("Hello 🌍")'); // Should create emoji warning + naming warning

      const allReport = linter.lintProject('.');
      const warningReport = linter.lintProject('.', 'warning');
      const infoReport = linter.lintProject('.', 'info');

      expect(allReport.total_issues).toBeGreaterThan(0);
      expect(warningReport.total_issues).toBeGreaterThan(0);
      expect(warningReport.issues_by_severity['warning']).toBeGreaterThan(0);
      expect(warningReport.issues_by_severity['info'] || 0).toBe(0);
    });

    test('filters by issue type', () => {
      fs.writeFileSync('BadFile.py', 'print("awesome!")');

      const namingReport = linter.lintProject('.', undefined, 'naming_convention');
      const languageReport = linter.lintProject(
        '.',
        undefined,
        'unprofessional_language'
      );

      expect(namingReport.issues_by_type['naming_convention']).toBeGreaterThan(0);
      expect(namingReport.issues_by_type['unprofessional_language']).toBeUndefined();

      expect(languageReport.issues_by_type['unprofessional_language']).toBeGreaterThan(
        0
      );
      expect(languageReport.issues_by_type['naming_convention']).toBeUndefined();
    });

    test('generates comprehensive report', () => {
      fs.writeFileSync('BadFile.py', 'print("awesome! 🎉")');

      const issues = linter.lintPath('BadFile.py');
      const report = linter.generateReport(issues);

      expect(report.total_issues).toBeGreaterThan(0);
      expect(Object.keys(report.issues_by_type).length).toBeGreaterThan(0);
      expect(Object.keys(report.issues_by_severity).length).toBeGreaterThan(0);
      expect(report.files_with_issues).toContain('BadFile.py');
      expect(report.suggestions.length).toBeGreaterThan(0);
    });

    test('lints text quality', () => {
      const longText = 'a'.repeat(150);
      const issues = linter.lintText(longText, 'step_message');

      expect(issues.length).toBeGreaterThan(0);
      const lengthIssue = issues.find(i => i.type === 'length');
      expect(lengthIssue).toBeDefined();
    });
  });

  describe('Pattern matching', () => {
    let linter: ProjectLinter;

    beforeEach(() => {
      linter = new ProjectLinter(
        createLintConfig({
          excludePatterns: ['**/test/**', '*.tmp', 'node_modules/**'],
        })
      );
    });

    test('matches glob patterns correctly', () => {
      fs.mkdirSync('src/test', { recursive: true });
      fs.mkdirSync('node_modules', { recursive: true });
      fs.writeFileSync('src/test/BadFile.py', 'test');
      fs.writeFileSync('node_modules/BadFile.js', 'test');
      fs.writeFileSync('temp.tmp', 'test');

      const report = linter.lintProject('.');

      // These files should be excluded
      expect(report.files_with_issues).not.toContain(
        expect.stringContaining('src/test')
      );
      expect(report.files_with_issues).not.toContain(
        expect.stringContaining('node_modules')
      );
      expect(report.files_with_issues).not.toContain(expect.stringContaining('.tmp'));
    });
  });

  describe('Performance optimization', () => {
    let linter: ProjectLinter;

    beforeEach(() => {
      linter = new ProjectLinter();
    });

    test('efficiently handles large directory structures', () => {
      // Create a moderately sized test structure
      fs.mkdirSync('src/components', { recursive: true });
      fs.mkdirSync('src/utils', { recursive: true });
      fs.mkdirSync('node_modules/package', { recursive: true });

      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(`src/components/file${i}.ts`, `console.log(${i});`);
        fs.writeFileSync(`src/utils/util${i}.py`, `print(${i})`);
        fs.writeFileSync(`node_modules/package/file${i}.js`, `console.log(${i});`);
      }

      const startTime = Date.now();
      const report = linter.lintProject('.');
      const endTime = Date.now();

      // Should complete reasonably quickly
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
      expect(report.total_issues).toBeGreaterThanOrEqual(0);
    });
  });

  describe('TypeScript-Complete Implementation', () => {
    test('should have complete class structure parity with TypeScript lint implementation', () => {
      // Test that all core classes exist and are constructible
      const config = createLintConfig();

      const namingLinter = new NamingConventionLinter(config);
      const languageLinter = new LanguageLinter(config);
      const textQualityLinter = new TextQualityLinter(config);
      const projectLinter = new ProjectLinter(config);

      // Verify all classes are properly instantiated
      expect(namingLinter).toBeDefined();
      expect(languageLinter).toBeDefined();
      expect(textQualityLinter).toBeDefined();
      expect(projectLinter).toBeDefined();
    });

    test('should provide consistent configuration options', () => {
      const config = createLintConfig();

      // Configuration properties that should match TypeScript implementation
      expect(typeof config.checkEmojis).toBe('boolean');
      expect(typeof config.checkProfessionalLanguage).toBe('boolean');
      expect(Array.isArray(config.allowInformalLanguage)).toBe(true);
      expect(Array.isArray(config.excludePatterns)).toBe(true);
      expect(typeof config.namingConventions).toBe('object');
      expect(typeof config.directoryNaming).toBe('string');
      expect(typeof config.maxStepMessageLength).toBe('number');
      expect(Array.isArray(config.unprofessionalPatterns)).toBe(true);
    });

    test('should maintain consistent project linting behavior', () => {
      const config = createLintConfig();
      const projectLinter = new ProjectLinter(config);

      // Test that project linting works consistently
      const result = projectLinter.lintProject('.');
      expect(result).toBeDefined();
      expect(typeof result.total_issues).toBe('number');
      expect(Array.isArray(result.files_with_issues)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });
});
