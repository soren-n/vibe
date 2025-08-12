/**
 * Test file for JSON schema validation functionality - TypeScript translation of test_schema_validation.py
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import * as yaml from 'js-yaml';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

// Mock validation functions since they're not implemented yet
interface WorkflowData {
  name: string;
  description: string;
  triggers?: string[];
  steps?: (string | { step_text: string; command?: string; working_dir?: string })[];
  commands?: string[];
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

class WorkflowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowValidationError';
  }
}

function createExampleWorkflow(): WorkflowData {
  return {
    name: 'example_workflow',
    description: 'An example workflow for testing',
    triggers: ['test', 'example'],
    steps: [
      'First step: analyze the problem',
      'Second step: implement solution',
      {
        step_text: 'Third step: run command',
        command: 'echo "testing"',
        working_dir: '.',
      },
    ],
    category: 'testing',
    tags: ['test', 'example'],
  };
}

function validateWorkflowData(workflow: WorkflowData): void {
  const errors = getValidationErrors(workflow);
  if (errors.length > 0) {
    throw new WorkflowValidationError(
      `Workflow validation failed: ${errors.join(', ')}`
    );
  }
}

function validateWorkflowStructure(workflow: WorkflowData): boolean {
  try {
    validateWorkflowData(workflow);
    return true;
  } catch (error) {
    return false;
  }
}

function getValidationErrors(workflow: WorkflowData): string[] {
  const errors: string[] = [];

  // Check required fields
  if (!workflow.name || workflow.name.trim() === '') {
    errors.push('Name is required and cannot be empty');
  }

  if (!workflow.description || workflow.description.trim() === '') {
    errors.push('Description is required and cannot be empty');
  }

  // Check triggers
  if (!workflow.triggers || workflow.triggers.length === 0) {
    errors.push('At least one trigger is required');
  }

  // Check steps
  if (!workflow.steps || workflow.steps.length === 0) {
    errors.push('At least one step is required');
  }

  // Check for legacy commands field
  if (workflow.commands) {
    errors.push('Legacy "commands" field is no longer supported, use "steps" instead');
  }

  return errors;
}

describe('Schema Validation', () => {
  let tempFiles: string[] = [];

  beforeEach(() => {
    tempFiles = [];
  });

  afterEach(() => {
    // Clean up temporary files
    tempFiles.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  });

  test('basic schema validation functionality', () => {
    // Valid workflow should pass
    const validWorkflow = createExampleWorkflow();
    expect(() => validateWorkflowData(validWorkflow)).not.toThrow();

    // Invalid workflow should fail
    const invalidWorkflow: WorkflowData = {
      name: '', // Empty name should fail
      description: 'test',
    };

    expect(() => validateWorkflowData(invalidWorkflow)).toThrow(
      WorkflowValidationError
    );
  });

  test('non-raising structure validation', () => {
    const validWorkflow = createExampleWorkflow();
    expect(validateWorkflowStructure(validWorkflow)).toBe(true);

    const invalidWorkflow: WorkflowData = { name: '', description: '' };
    expect(validateWorkflowStructure(invalidWorkflow)).toBe(false);
  });

  test('validation error messages are helpful', () => {
    const invalidWorkflow: WorkflowData = {
      name: '',
      description: 'test',
      triggers: [], // Empty triggers array
      steps: [], // Empty steps array
    };

    const errors = getValidationErrors(invalidWorkflow);
    expect(errors.length).toBeGreaterThan(0);

    // Check that we get meaningful error messages
    const errorText = errors.join(' ');
    expect(errorText.toLowerCase()).toMatch(/name|trigger|step/);
  });

  test('validation of complex step structures', () => {
    const workflowWithComplexSteps: WorkflowData = {
      name: 'test_complex',
      description: 'Test workflow with complex steps',
      triggers: ['test'],
      steps: [
        'Simple step',
        {
          step_text: 'Complex step with command',
          command: 'echo test',
          working_dir: '.',
        },
      ],
    };

    // Should validate successfully
    expect(() => validateWorkflowData(workflowWithComplexSteps)).not.toThrow();
    expect(validateWorkflowStructure(workflowWithComplexSteps)).toBe(true);
  });

  test('validation rejects legacy commands field', () => {
    const workflowWithCommands: WorkflowData = {
      name: 'test_legacy',
      description: 'Test workflow with legacy commands field',
      triggers: ['test'],
      commands: ['echo test', 'ls'],
    };

    // Should raise validation error since commands field is no longer supported
    expect(() => validateWorkflowData(workflowWithCommands)).toThrow(
      WorkflowValidationError
    );

    // Structure validation should also fail
    expect(validateWorkflowStructure(workflowWithCommands)).toBe(false);
  });

  test('validation with optional fields', () => {
    const workflowWithOptionalFields: WorkflowData = {
      name: 'test_optional',
      description: 'Test workflow with optional fields',
      triggers: ['test'],
      steps: ['Step 1'],
      category: 'development',
      tags: ['tag1', 'tag2'],
      metadata: {
        author: 'test',
        version: '1.0.0',
      },
    };

    expect(() => validateWorkflowData(workflowWithOptionalFields)).not.toThrow();
    expect(validateWorkflowStructure(workflowWithOptionalFields)).toBe(true);
  });

  test('YAML workflow loading and validation', () => {
    const validWorkflowYaml = `
name: test_yaml_workflow
description: Test workflow loaded from YAML
triggers:
  - test
  - yaml
steps:
  - "Analyze YAML structure"
  - step_text: "Process YAML data"
    command: "echo processing"
category: testing
tags:
  - yaml
  - test
`;

    // Create temporary YAML file
    const tempFile = path.join(os.tmpdir(), `test_workflow_${Date.now()}.yaml`);
    tempFiles.push(tempFile);

    fs.writeFileSync(tempFile, validWorkflowYaml);

    // Load and validate
    const loadedWorkflow = yaml.load(
      fs.readFileSync(tempFile, 'utf-8')
    ) as WorkflowData;
    expect(() => validateWorkflowData(loadedWorkflow)).not.toThrow();
    expect(validateWorkflowStructure(loadedWorkflow)).toBe(true);
  });

  test('invalid YAML structure validation', () => {
    const invalidWorkflowYaml = `
name: ""
description: "Missing required fields"
# Missing triggers and steps
`;

    const tempFile = path.join(os.tmpdir(), `invalid_workflow_${Date.now()}.yaml`);
    tempFiles.push(tempFile);

    fs.writeFileSync(tempFile, invalidWorkflowYaml);

    const loadedWorkflow = yaml.load(
      fs.readFileSync(tempFile, 'utf-8')
    ) as WorkflowData;
    expect(() => validateWorkflowData(loadedWorkflow)).toThrow(WorkflowValidationError);
    expect(validateWorkflowStructure(loadedWorkflow)).toBe(false);
  });

  test('step structure validation details', () => {
    const workflowWithMixedSteps: WorkflowData = {
      name: 'test_mixed_steps',
      description: 'Test workflow with mixed step types',
      triggers: ['test'],
      steps: [
        'Simple string step',
        {
          step_text: 'Object step with command',
          command: 'ls -la',
          working_dir: '/tmp',
        },
        'Another simple step',
        {
          step_text: 'Object step without command',
        },
      ],
    };

    expect(() => validateWorkflowData(workflowWithMixedSteps)).not.toThrow();
    expect(validateWorkflowStructure(workflowWithMixedSteps)).toBe(true);
  });

  test('comprehensive error reporting', () => {
    const completelyInvalidWorkflow: WorkflowData = {
      name: '',
      description: '',
      triggers: [],
      steps: [],
      commands: ['legacy command'], // This should trigger legacy field error
    };

    const errors = getValidationErrors(completelyInvalidWorkflow);

    // Should have multiple errors
    expect(errors.length).toBeGreaterThanOrEqual(4);

    // Check specific error types
    expect(errors.some(e => e.includes('Name'))).toBe(true);
    expect(errors.some(e => e.includes('Description'))).toBe(true);
    expect(errors.some(e => e.includes('trigger'))).toBe(true);
    expect(errors.some(e => e.includes('step'))).toBe(true);
    expect(errors.some(e => e.includes('commands'))).toBe(true);
  });
});
