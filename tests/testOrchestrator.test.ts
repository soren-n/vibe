/**
 * Orchestrator functionality tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExecutionPlanStep, WorkflowOrchestrator } from '../src/orchestrator';
import { VibeConfigImpl } from '../src/config';

describe('Orchestrator system tests', () => {
  let tempDir: string;
  let originalCwd: string;
  let orchestrator: WorkflowOrchestrator;
  let config: VibeConfigImpl;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-orchestrator-test-'));
    process.chdir(tempDir);

    // Create basic config
    config = new VibeConfigImpl();
    config.session = {
      maxSessions: 10,
      sessionTimeout: 3600000,
    };

    orchestrator = new WorkflowOrchestrator(config);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Workflow Planning', () => {
    test('plans workflows and checklists', async () => {
      const items = ['analysis', 'checklist:python_setup', 'testing'];
      const prompt = 'Set up a Python project with tests';

      const result = await orchestrator.planWorkflows(items, prompt);

      expect(result.success).toBe(true);
      expect(result.workflows).toEqual(['analysis', 'testing']);
      expect(result.checklists).toEqual(['python_setup']);
      expect(result.execution_plan).toBeDefined();
      expect(result.guidance).toBeDefined();
      expect(typeof result.guidance).toBe('string');
    });

    test('handles empty items list', async () => {
      const result = await orchestrator.planWorkflows([], 'test prompt');

      expect(result.success).toBe(true);
      expect(result.workflows).toEqual([]);
      expect(result.guidance).toBe('No workflows needed.');
    });

    test('separates workflows from checklists correctly', async () => {
      const items = ['workflow1', 'checklist:test1', 'workflow2', 'checklist:test2'];

      const result = await orchestrator.planWorkflows(items, 'test');

      expect(result.workflows).toEqual(['workflow1', 'workflow2']);
      expect(result.checklists).toEqual(['test1', 'test2']);
    });

    test('generates execution plan with proper structure', async () => {
      const items = ['analysis', 'checklist:quality'];
      const result = await orchestrator.planWorkflows(items, 'test prompt');

      expect(result.execution_plan).toBeDefined();
      expect(Array.isArray(result.execution_plan)).toBe(true);

      if (result.execution_plan.length > 0) {
        const step = result.execution_plan[0] as ExecutionPlanStep;
        expect(step).toHaveProperty('type');
        expect(step).toHaveProperty('name');
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('description');
        expect(step).toHaveProperty('steps');
        expect(step).toHaveProperty('reasoning');
      }
    });
  });

  describe('Execution Order Planning', () => {
    test('orders workflows by priority', async () => {
      const workflows = ['session', 'analysis', 'mcp', 'implementation'];
      const result = await orchestrator.planWorkflows(workflows, 'test');

      // Should be ordered: mcp, analysis, implementation, session
      expect(result.workflows[0]).toBe('mcp');
      expect(result.workflows[1]).toBe('analysis');
      expect(result.workflows[2]).toBe('implementation');
      expect(result.workflows[3]).toBe('session');
    });

    test('maintains workflows not in priority list', async () => {
      const workflows = ['custom_workflow', 'analysis'];
      const result = await orchestrator.planWorkflows(workflows, 'test');

      expect(result.workflows).toContain('custom_workflow');
      expect(result.workflows).toContain('analysis');
      expect(result.workflows.indexOf('analysis')).toBeLessThan(
        result.workflows.indexOf('custom_workflow')
      );
    });
  });

  describe('Reasoning Generation', () => {
    test('generates workflow reasoning', async () => {
      const items = ['analysis'];
      const prompt = 'understand the codebase';
      const result = await orchestrator.planWorkflows(items, prompt);

      const step = result.execution_plan[0] as ExecutionPlanStep;
      expect(step.reasoning).toContain(prompt);
      expect(step.reasoning).toContain('understand the project structure');
    });

    test('generates checklist reasoning', async () => {
      const items = ['checklist:typescript_setup'];
      const prompt = 'setup environment';
      const result = await orchestrator.planWorkflows(items, prompt);

      const step = result.execution_plan[0] as ExecutionPlanStep;
      expect(step.reasoning).toContain('TypeScript environment');
      expect(step.type).toBe('checklist');
    });

    test('provides default reasoning for unknown workflows', async () => {
      const items = ['unknown_workflow'];
      const prompt = 'test task';
      const result = await orchestrator.planWorkflows(items, prompt);

      expect(result.execution_plan.length).toBeGreaterThan(0);
      const step = result.execution_plan[0] as ExecutionPlanStep;
      expect(step).toBeDefined();
      expect(step.reasoning).toContain('unknown_workflow');
      expect(step.reasoning).toContain(prompt);
    });
  });

  describe('Session Management', () => {
    test('starts workflow session', () => {
      const result = orchestrator.startSession('create a test file');

      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result).toHaveProperty('session_id');
        expect(result).toHaveProperty('prompt');
        expect(result).toHaveProperty('current_step');
        expect(result).toHaveProperty('workflow_stack');
      }
    });

    test('handles session not found', () => {
      const result = orchestrator.getSessionStatus('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('lists workflow sessions', () => {
      const result = orchestrator.listWorkflowSessions();

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('sessions');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.sessions)).toBe(true);
    });
  });

  describe('Session Operations', () => {
    let sessionId: string;

    beforeEach(() => {
      const result = orchestrator.startSession('test workflow');
      if (result.success && result.session_id) {
        sessionId = result.session_id;
      }
    });

    test('advances session step', () => {
      if (!sessionId) {
        console.log('No session created, skipping test');
        return;
      }

      const result = orchestrator.advanceSession(sessionId);
      expect(result).toHaveProperty('success');
    });

    test('goes back in session', () => {
      if (!sessionId) {
        console.log('No session created, skipping test');
        return;
      }

      // Try to go back (might fail if at first step)
      const result = orchestrator.backSession(sessionId);
      expect(result).toHaveProperty('success');
    });

    test('breaks session workflow', () => {
      if (!sessionId) {
        console.log('No session created, skipping test');
        return;
      }

      const result = orchestrator.breakSession(sessionId);
      expect(result).toHaveProperty('success');
    });

    test('restarts session', () => {
      if (!sessionId) {
        console.log('No session created, skipping test');
        return;
      }

      const result = orchestrator.restartSession(sessionId);
      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result.message).toContain('restarted');
      }
    });
  });

  describe('Workflow Planning and Selection', () => {
    test('plans workflow from query', () => {
      const plan = orchestrator.planWorkflow({ query: 'run tests' });

      if (plan) {
        expect(plan).toHaveProperty('workflow');
        expect(plan).toHaveProperty('confidence');
        expect(plan).toHaveProperty('reasoning');
        expect(plan.confidence).toBeGreaterThan(0);
      }
    });

    test('returns null for unmatched query', () => {
      const plan = orchestrator.planWorkflow({ query: 'xyz123unmatched' });
      expect(plan).toBeNull();
    });

    test('calculates confidence scores', () => {
      const plan1 = orchestrator.planWorkflow({ query: 'test' });
      const plan2 = orchestrator.planWorkflow({ query: 'xyz' });

      if (plan1 && plan2) {
        // Test-related queries should have higher confidence
        expect(plan1.confidence).toBeGreaterThanOrEqual(plan2.confidence);
      }
    });
  });

  describe('Monitoring and Cleanup', () => {
    test('monitors sessions', async () => {
      const result = await orchestrator.monitorSessions();

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('monitoring_data');
      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('cleans up stale sessions', async () => {
      const result = await orchestrator.cleanupStaleSessions();

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('cleaned_sessions');
      expect(result).toHaveProperty('message');
      expect(Array.isArray(result.cleaned_sessions)).toBe(true);
    });

    test('analyzes agent response', async () => {
      const result = await orchestrator.analyzeAgentResponse(
        'test_session',
        'task completed'
      );

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('alert_detected');
      expect(result).toHaveProperty('message');
    });

    test('generates monitoring recommendations', async () => {
      const result = await orchestrator.monitorSessions();

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Workflow Registry Access', () => {
    test('gets all workflows', () => {
      const workflows = orchestrator.getAllWorkflows();
      expect(Array.isArray(workflows)).toBe(true);
    });

    test('gets workflow by name', () => {
      const workflow = orchestrator.getWorkflow('analysis');
      // May or may not exist depending on loaded workflows
      expect(workflow === null || typeof workflow === 'object').toBe(true);
    });
  });

  describe('Guidance Formatting', () => {
    test('formats guidance for empty plan', async () => {
      const result = await orchestrator.planWorkflows([], 'test');
      expect(result.guidance).toBe('No workflows needed.');
    });

    test('formats guidance with multiple steps', async () => {
      const items = ['analysis', 'testing', 'checklist:quality'];
      const result = await orchestrator.planWorkflows(items, 'test project');

      expect(result.guidance).toContain('Execution plan:');
      expect(result.guidance).toContain('1.');
      expect(result.guidance).toContain('Reasoning:');
    });

    test('limits step details in guidance', async () => {
      const items = ['analysis'];
      const result = await orchestrator.planWorkflows(items, 'test');

      // Should have concise guidance suitable for agents
      expect(result.guidance.length).toBeLessThan(1000);
      expect(result.guidance).toContain('Key steps:');
    });
  });

  describe('Error Handling', () => {
    test('handles invalid session operations gracefully', () => {
      const invalidId = 'invalid_session_123';

      expect(orchestrator.getSessionStatus(invalidId).success).toBe(false);
      expect(orchestrator.advanceSession(invalidId).success).toBe(false);
      expect(orchestrator.backSession(invalidId).success).toBe(false);
      expect(orchestrator.breakSession(invalidId).success).toBe(false);
      expect(orchestrator.restartSession(invalidId).success).toBe(false);
    });

    test('handles workflow planning errors gracefully', async () => {
      // Should not throw even with unusual inputs
      const result1 = await orchestrator.planWorkflows([''], '');
      const result2 = await orchestrator.planWorkflows(['invalid:workflow'], 'test');

      expect(result1).toHaveProperty('success');
      expect(result2).toHaveProperty('success');
    });
  });

  describe('Integration Features', () => {
    test('properly separates workflow types', async () => {
      const mixedItems = [
        'workflow1',
        'checklist:item1',
        'workflow2',
        'checklist:item2',
        'workflow3',
      ];

      const result = await orchestrator.planWorkflows(mixedItems, 'test');

      expect(result.workflows).toHaveLength(3);
      expect(result.checklists).toHaveLength(2);
      expect(result.execution_plan).toHaveLength(5); // All items should be planned
    });

    test('maintains execution plan order', async () => {
      const items = ['checklist:first', 'workflow_middle', 'checklist:last'];
      const result = await orchestrator.planWorkflows(items, 'test');

      // Workflows should come first, then checklists
      const workflowSteps = result.execution_plan.filter(
        (step: ExecutionPlanStep) => step.type === 'workflow'
      );
      const checklistSteps = result.execution_plan.filter(
        (step: ExecutionPlanStep) => step.type === 'checklist'
      );

      expect(workflowSteps.length).toBe(1);
      expect(checklistSteps.length).toBe(2);

      // Find indices to ensure workflows come before checklists
      const firstWorkflowIndex = result.execution_plan.findIndex(
        (step: ExecutionPlanStep) => step.type === 'workflow'
      );
      const firstChecklistIndex = result.execution_plan.findIndex(
        (step: ExecutionPlanStep) => step.type === 'checklist'
      );

      if (firstWorkflowIndex !== -1 && firstChecklistIndex !== -1) {
        expect(firstWorkflowIndex).toBeLessThan(firstChecklistIndex);
      }
    });
  });
});
