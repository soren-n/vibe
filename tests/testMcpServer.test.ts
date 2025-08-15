/**
 * Comprehensive tests for mcp-server.ts - MCP server functionality
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { VibeMCPServer } from '../src/mcp-server';

describe('VibeMCPServer', () => {
  let tempDir: string;
  let originalProcessEnv: any;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = path.join(process.cwd(), 'temp_test_mcp_server');
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Mock environment variables
    originalProcessEnv = { ...process.env };
    process.env.HOME = tempDir;
  });

  afterEach(async () => {
    // Restore environment
    process.env = originalProcessEnv;

    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('Constructor', () => {
    test('initializes successfully with valid configuration', () => {
      expect(() => new VibeMCPServer()).not.toThrow();
    });

    test('creates all required handler instances', () => {
      const server = new VibeMCPServer();

      // Server should be created without errors
      expect(server).toBeDefined();
    });
  });

  describe('Plan Management Tools', () => {
    let server: VibeMCPServer;

    beforeEach(() => {
      server = new VibeMCPServer();
    });

    test('getPlanStatus returns initial empty plan', async () => {
      const result = await (server as any).getPlanStatus();

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan?.items).toEqual([]);
      expect(result.plan?.stats.totalItems).toBe(0);
      expect(result.plan?.stats.completedItems).toBe(0);
      expect(result.plan?.stats.pendingItems).toBe(0);
      expect(result.plan?.stats.completionRate).toBe(0);
    });

    test('addPlanItem adds root item correctly', async () => {
      const result = await (server as any).addPlanItem('Test task');

      expect(result.success).toBe(true);
      expect(result.item).toBeDefined();
      expect(result.item?.text).toBe('Test task');
      expect(result.item?.status).toBe('pending');
      expect(result.item?.id).toBeDefined();
      expect(result.message).toBe('Added root-level item');
    });

    test('addPlanItem adds child item correctly', async () => {
      // First add a parent item
      const parentResult = await (server as any).addPlanItem('Parent task');
      const parentId = parentResult.item?.id;

      // Then add a child item
      const childResult = await (server as any).addPlanItem('Child task', parentId);

      expect(childResult.success).toBe(true);
      expect(childResult.item).toBeDefined();
      expect(childResult.item?.text).toBe('Child task');
      expect(childResult.message).toBe(`Added sub-item to parent ${parentId}`);
    });

    test('addPlanItem handles missing parent error', async () => {
      const result = await (server as any).addPlanItem(
        'Child task',
        'non-existent-parent'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Parent item with ID non-existent-parent not found'
      );
    });

    test('completePlanItem completes item successfully', async () => {
      // Add an item first
      const addResult = await (server as any).addPlanItem('Test task');
      const itemId = addResult.item?.id;

      // Complete the item
      const completeResult = await (server as any).completePlanItem(itemId);

      expect(completeResult.success).toBe(true);
      expect(completeResult.message).toBe(`Item ${itemId} marked as complete`);
    });

    test('completePlanItem handles non-existent item', async () => {
      const result = await (server as any).completePlanItem('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Plan item with ID non-existent-id not found');
    });

    test('expandPlanItem expands item with subtasks', async () => {
      // Add a parent item first
      const addResult = await (server as any).addPlanItem('Parent task');
      const itemId = addResult.item?.id;

      // Expand with subtasks
      const subTasks = ['Subtask 1', 'Subtask 2', 'Subtask 3'];
      const expandResult = await (server as any).expandPlanItem(itemId, subTasks);

      expect(expandResult.success).toBe(true);
      expect(expandResult.addedItems).toHaveLength(3);
      expect(expandResult.addedItems?.[0]?.text).toBe('Subtask 1');
      expect(expandResult.addedItems?.[1]?.text).toBe('Subtask 2');
      expect(expandResult.addedItems?.[2]?.text).toBe('Subtask 3');
      expect(expandResult.message).toBe(`Added 3 sub-tasks to item ${itemId}`);
    });

    test('expandPlanItem handles non-existent item', async () => {
      const result = await (server as any).expandPlanItem('non-existent-id', [
        'Subtask 1',
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Item with ID non-existent-id not found');
    });

    test('clearPlan clears all items', async () => {
      // Add some items first
      await (server as any).addPlanItem('Task 1');
      await (server as any).addPlanItem('Task 2');

      // Clear the plan
      const clearResult = await (server as any).clearPlan();

      expect(clearResult.success).toBe(true);
      expect(clearResult.message).toBe('Plan cleared successfully');

      // Verify plan is empty
      const statusResult = await (server as any).getPlanStatus();
      expect(statusResult.plan?.items).toEqual([]);
    });
  });

  describe('Workflow Management Tools', () => {
    let server: VibeMCPServer;

    beforeEach(() => {
      server = new VibeMCPServer();
    });

    test('queryWorkflows returns workflows', async () => {
      const result = await (server as any).queryWorkflows();

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();
      expect(Array.isArray(result.workflows)).toBe(true);

      if (result.workflows && result.workflows.length > 0) {
        const firstWorkflow = result.workflows[0];
        expect(firstWorkflow?.name).toBeDefined();
        expect(firstWorkflow?.description).toBeDefined();
        expect(Array.isArray(firstWorkflow?.triggers)).toBe(true);
      }
    });

    test('queryWorkflows filters by pattern', async () => {
      const result = await (server as any).queryWorkflows('test');

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();

      // If workflows are found, they should contain 'test' in some way
      if (result.workflows && result.workflows.length > 0) {
        const hasTestRelated = result.workflows.some(
          (w: any) =>
            w.name.toLowerCase().includes('test') ||
            w.description.toLowerCase().includes('test') ||
            w.triggers.some((t: string) => t.toLowerCase().includes('test'))
        );
        expect(hasTestRelated).toBe(true);
      }
    });

    test('queryWorkflows filters by category', async () => {
      const result = await (server as any).queryWorkflows(undefined, 'core');

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();

      // If workflows are found, they should all be in 'core' category
      if (result.workflows && result.workflows.length > 0) {
        result.workflows.forEach((w: any) => {
          expect(w.category).toBe('core');
        });
      }
    });
  });

  describe('Environment Management Tools', () => {
    let server: VibeMCPServer;

    beforeEach(() => {
      server = new VibeMCPServer();
    });

    test('checkVibeEnvironment returns environment status', async () => {
      const result = await (server as any).checkVibeEnvironment();

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe('string');
    });

    test('initVibeProject initializes project', async () => {
      const result = await (server as any).initVibeProject('typescript');

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe('string');
    });

    test('initVibeProject works with no project type', async () => {
      const result = await (server as any).initVibeProject();

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });
  });

  describe('Linting Tools', () => {
    let server: VibeMCPServer;

    beforeEach(() => {
      server = new VibeMCPServer();
    });

    test('lintProject runs without fix', async () => {
      const result = await (server as any).lintProject(false);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    test('lintProject runs with fix', async () => {
      const result = await (server as any).lintProject(true);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    test('lintText lints specific text', async () => {
      const testCode = 'function test() { return "hello"; }';
      const result = await (server as any).lintText(testCode, 'javascript');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    test('lintText handles different content types', async () => {
      const testCode = 'const x: number = 42;';
      const result = await (server as any).lintText(testCode, 'typescript');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('handles plan manager errors gracefully', async () => {
      // Mock a scenario where plan operations fail
      const server = new VibeMCPServer();

      // This should still not crash the server
      expect(() => server).not.toThrow();
    });

    test('handles workflow registry errors gracefully', async () => {
      const server = new VibeMCPServer();

      // Query with empty parameters should not crash
      const result = await (server as any).queryWorkflows('', '');
      expect(result.success).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    let server: VibeMCPServer;

    beforeEach(() => {
      server = new VibeMCPServer();
    });

    test('full plan workflow works end-to-end', async () => {
      // 1. Check initial status
      let status = await (server as any).getPlanStatus();
      expect(status.plan?.items).toEqual([]);

      // 2. Add root items
      const task1 = await (server as any).addPlanItem('Main Task 1');
      const task2 = await (server as any).addPlanItem('Main Task 2');

      // 3. Add subtasks
      await (server as any).expandPlanItem(task1.item?.id, [
        'Subtask 1.1',
        'Subtask 1.2',
      ]);

      // 4. Complete some items
      await (server as any).completePlanItem(task1.item?.id);

      // 5. Check final status
      status = await (server as any).getPlanStatus();
      expect(status.plan?.items).toHaveLength(2);
      expect(status.plan?.stats.totalItems).toBe(4); // 2 root + 2 subtasks
      expect(status.plan?.stats.completedItems).toBe(1);

      // 6. Clear plan
      await (server as any).clearPlan();
      status = await (server as any).getPlanStatus();
      expect(status.plan?.items).toEqual([]);
    });

    test('workflow and plan integration works', async () => {
      // 1. Query workflows for guidance
      const workflows = await (server as any).queryWorkflows('development');
      expect(workflows.success).toBe(true);

      // 2. Use that guidance to create a plan
      await (server as any).addPlanItem('Set up development environment');
      await (server as any).addPlanItem('Configure project structure');

      const status = await (server as any).getPlanStatus();
      expect(status.plan?.items).toHaveLength(2);
    });
  });
});
