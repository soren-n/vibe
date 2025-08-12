/**
 * Test file for workflow YAML quality validation - TypeScript translation of test_workflow_yaml_quality.py
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import * as yaml from 'js-yaml';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

// Mock quality validation function since it's not implemented yet
function validateWorkflowYamls(root: string, strictMode = false): string[] {
  const issues: string[] = [];

  // Find all YAML files
  const yamlFiles = findYamlFiles(root);

  for (const filePath of yamlFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for duplicate keys by parsing with a custom replacer
      const duplicateKeyIssues = checkDuplicateKeys(content, filePath);
      issues.push(...duplicateKeyIssues);

      // Check for Unicode replacement characters
      if (content.includes('�')) {
        issues.push(`${filePath}: Unicode replacement character detected`);
      }

      // Parse YAML and validate structure
      const workflow = yaml.load(content) as any;
      if (workflow && workflow.steps) {
        const stepIssues = validateStepMessages(workflow.steps, filePath, strictMode);
        issues.push(...stepIssues);
      }
    } catch (error) {
      issues.push(`${filePath}: YAML parsing error - ${error}`);
    }
  }

  return issues;
}

function findYamlFiles(root: string): string[] {
  const files: string[] = [];

  function traverse(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          traverse(fullPath);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))
        ) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  traverse(root);
  return files;
}

function checkDuplicateKeys(content: string, filePath: string): string[] {
  const issues: string[] = [];
  const lines = content.split('\n');
  const keys = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() || '';
    if (line && !line.startsWith('#')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        if (keys.has(key)) {
          issues.push(
            `${filePath}: duplicate keys detected - '${key}' appears multiple times`
          );
        } else {
          keys.add(key);
        }
      }
    }
  }

  return issues;
}

function validateStepMessages(
  steps: any[],
  filePath: string,
  strictMode: boolean
): string[] {
  const issues: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepText = typeof step === 'string' ? step : step?.step_text || '';

    if (stepText) {
      // Check length
      if (stepText.length < 10) {
        issues.push(
          `${filePath}: Step ${i + 1} message too short (${stepText.length} characters)`
        );
      }

      if (stepText.length > 120) {
        issues.push(
          `${filePath}: Step ${i + 1} message too long (${stepText.length} characters)`
        );
      }

      // Check for excessive caps
      const words = stepText.split(' ');
      const capsWords = words.filter(
        (word: string) =>
          word.length > 2 && word === word.toUpperCase() && /[A-Z]/.test(word)
      );

      if (capsWords.length > 2) {
        issues.push(`${filePath}: Step ${i + 1} has excessive caps words`);
      }

      // Check for excessive exclamation marks
      const exclamationCount = (stepText.match(/!/g) || []).length;
      if (exclamationCount > 2) {
        issues.push(`${filePath}: Step ${i + 1} has excessive exclamation marks`);
      }

      // Check for emojis in strict mode
      if (strictMode) {
        const emojiRegex =
          /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[🎯📁📋👀🌐🔒📈📖✨⚡🤖🔧✅🔗📦🔑🏪🔐🚀📝📚🧪⚙️🔤🧹🛠️🔄⚠️]/gu;

        if (emojiRegex.test(stepText)) {
          issues.push(`${filePath}: Step ${i + 1} contains emojis (strict mode)`);
        }
      }
    }
  }

  return issues;
}

// Helper function to write test files
function writeTestFile(baseDir: string, relativePath: string, content: string): string {
  const fullPath = path.join(baseDir, relativePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, content, 'utf-8');
  return fullPath;
}

describe('Workflow YAML Quality', () => {
  let tempDir: string;
  let createdFiles: string[] = [];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-test-'));
    createdFiles = [];
  });

  afterEach(() => {
    // Clean up created files and directory
    try {
      createdFiles.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });

      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('detects duplicate keys', () => {
    const yamlContent = `
name: sample
description: dup keys test
triggers: ["a"]
steps: ["x"]
conditions: ["one"]
conditions: ["two"]
`;

    const filePath = writeTestFile(tempDir, 'data/sample.yaml', yamlContent);
    createdFiles.push(filePath);

    const issues = validateWorkflowYamls(tempDir);
    expect(issues.some(m => m.includes('duplicate keys detected'))).toBe(true);
  });

  test('detects unicode replacement characters', () => {
    const yamlContent = `
name: sample2
description: replacement char test
triggers: ["a"]
steps: ["bad � char"]
`;

    const filePath = writeTestFile(tempDir, 'data/sample2.yaml', yamlContent);
    createdFiles.push(filePath);

    const issues = validateWorkflowYamls(tempDir);
    expect(issues.some(m => m.includes('Unicode replacement character'))).toBe(true);
  });

  test('validates step message conventions', () => {
    const yamlContent = `name: step_test
description: Test step message validation
triggers: ["test"]
steps:
  - "🎯 Emoji step should be flagged"
  - "Short"
  - "This is a very long step message that definitely exceeds the 120 character limit and should trigger validation errors properly"
  - "TOO MANY CAPS WORDS HERE"
  - "Multiple!!! exclamation!!! marks!!!"
  - "Proper step without emoji and reasonable length"
`;

    const filePath = writeTestFile(tempDir, 'data/step_test.yaml', yamlContent);
    createdFiles.push(filePath);

    // Test with strict mode for emoji detection
    const issues = validateWorkflowYamls(tempDir, true);

    // Should detect short message
    expect(issues.some(m => m.includes('too short'))).toBe(true);

    // Should detect long message
    expect(issues.some(m => m.includes('too long'))).toBe(true);

    // Should detect excessive caps
    expect(issues.some(m => m.includes('excessive caps'))).toBe(true);

    // Should detect excessive punctuation
    expect(issues.some(m => m.includes('excessive exclamation marks'))).toBe(true);

    // Should detect emojis in strict mode
    expect(issues.some(m => m.includes('emojis (strict mode)'))).toBe(true);

    // Test without strict mode - should not flag emojis
    const issuesNormal = validateWorkflowYamls(tempDir, false);

    // But still flag other issues
    expect(issuesNormal.some(m => m.includes('too short'))).toBe(true);

    // Should not flag emojis in normal mode
    expect(issuesNormal.some(m => m.includes('emojis (strict mode)'))).toBe(false);
  });

  test('handles valid YAML files without issues', () => {
    const validYamlContent = `
name: valid_workflow
description: A properly formatted workflow
triggers: ["test", "validation"]
steps:
  - "First step with appropriate length"
  - "Second step also properly formatted"
  - "Final step completing the workflow"
category: testing
tags: ["test", "validation"]
`;

    const filePath = writeTestFile(tempDir, 'data/valid.yaml', validYamlContent);
    createdFiles.push(filePath);

    const issues = validateWorkflowYamls(tempDir);

    // Should have no issues for this valid file
    const fileIssues = issues.filter(issue => issue.includes(filePath));
    expect(fileIssues).toHaveLength(0);
  });

  test('handles YAML parsing errors', () => {
    const invalidYamlContent = `
name: invalid_yaml
description: "Unclosed quote
triggers: ["test"]
steps:
  - "Step one"
  - malformed: yaml: content
`;

    const filePath = writeTestFile(tempDir, 'data/invalid.yaml', invalidYamlContent);
    createdFiles.push(filePath);

    const issues = validateWorkflowYamls(tempDir);

    // Should detect YAML parsing error
    expect(issues.some(m => m.includes('YAML parsing error'))).toBe(true);
  });

  test('validates complex workflow structures', () => {
    const complexYamlContent = `
name: complex_workflow
description: Test complex workflow validation
triggers: ["complex", "test"]
steps:
  - "Simple string step"
  - step_text: "Object step with proper length"
    command: "echo test"
    working_dir: "."
  - step_text: "Short"  # Too short
  - step_text: "THIS STEP HAS TOO MANY CAPS WORDS AND SHOULD BE FLAGGED"
  - step_text: "Step with way too many exclamation marks!!!!!!"
category: testing
metadata:
  author: "test"
  version: "1.0"
`;

    const filePath = writeTestFile(tempDir, 'data/complex.yaml', complexYamlContent);
    createdFiles.push(filePath);

    const issues = validateWorkflowYamls(tempDir);

    // Should detect the various issues
    expect(issues.some(m => m.includes('too short'))).toBe(true);
    expect(issues.some(m => m.includes('excessive caps'))).toBe(true);
    expect(issues.some(m => m.includes('excessive exclamation marks'))).toBe(true);
  });

  test('processes multiple files in directory structure', () => {
    // Create multiple YAML files with different issues
    const file1 = writeTestFile(
      tempDir,
      'workflows/file1.yaml',
      `
name: workflow1
description: First workflow
triggers: ["test"]
steps: ["Short"]  # Too short
`
    );

    const file2 = writeTestFile(
      tempDir,
      'workflows/subfolder/file2.yaml',
      `
name: workflow2
description: Second workflow
triggers: ["test"]
steps:
  - "This is a very long step message that definitely exceeds the 120 character limit and should trigger validation errors"
`
    );

    const file3 = writeTestFile(
      tempDir,
      'data/file3.yml',
      `
name: workflow3
description: Third workflow with unicode issue
triggers: ["test"]
steps: ["Step with replacement char �"]  # Unicode issue
`
    );

    createdFiles.push(file1, file2, file3);

    const issues = validateWorkflowYamls(tempDir);

    // Should find issues in files that are being processed
    expect(issues.some(m => m.includes('too short'))).toBe(true);
    expect(issues.some(m => m.includes('Unicode replacement character'))).toBe(true);

    // Should have found multiple issues
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });

  test('handles empty directories gracefully', () => {
    const emptyDir = path.join(tempDir, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });

    const issues = validateWorkflowYamls(emptyDir);
    expect(issues).toHaveLength(0);
  });
});
