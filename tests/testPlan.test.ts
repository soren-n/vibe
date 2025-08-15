/**
 * Comprehensive tests for plan.ts - Core plan management system
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PlanManager, PlanImpl, PlanItemImpl } from '../src/plan';

describe('Plan System', () => {
  let tempDir: string;
  let tempPlanFile: string;

  beforeEach(async () => {
    // Create temporary directory for test plan files
    tempDir = path.join(process.cwd(), 'temp_test_plans');
    tempPlanFile = path.join(tempDir, 'test-plan.json');

    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('PlanItemImpl', () => {
    test('creates new plan item with default values', () => {
      const item = new PlanItemImpl('Test task');

      expect(item.text).toBe('Test task');
      expect(item.status).toBe('pending');
      expect(item.children).toEqual([]);
      expect(item.id).toBeDefined();
      expect(item.createdAt).toBeDefined();
      expect(item.completedAt).toBeUndefined();

      // ID should be a valid UUID format
      expect(item.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );

      // createdAt should be a valid ISO date
      expect(() => new Date(item.createdAt)).not.toThrow();
    });

    test('creates plan item with custom ID', () => {
      const customId = 'custom-test-id';
      const item = new PlanItemImpl('Test task', customId);

      expect(item.id).toBe(customId);
      expect(item.text).toBe('Test task');
    });

    test('completes plan item correctly', () => {
      const item = new PlanItemImpl('Test task');
      const beforeComplete = Date.now();

      item.complete();

      const afterComplete = Date.now();

      expect(item.status).toBe('complete');
      expect(item.completedAt).toBeDefined();

      if (item.completedAt) {
        const completedTime = new Date(item.completedAt).getTime();
        expect(completedTime).toBeGreaterThanOrEqual(beforeComplete);
        expect(completedTime).toBeLessThanOrEqual(afterComplete);
      }
    });

    test('uncompletes plan item correctly', () => {
      const item = new PlanItemImpl('Test task');

      item.complete();
      expect(item.status).toBe('complete');
      expect(item.completedAt).toBeDefined();

      item.uncomplete();
      expect(item.status).toBe('pending');
      expect(item.completedAt).toBeUndefined();
    });

    test('adds child item correctly', () => {
      const parent = new PlanItemImpl('Parent task');
      const child = parent.addChild('Child task');

      expect(parent.children).toHaveLength(1);
      expect(parent.children[0]).toBe(child);
      expect(child.text).toBe('Child task');
      expect(child.status).toBe('pending');
      expect(child.id).toBeDefined();
    });

    test('adds child item with custom ID', () => {
      const parent = new PlanItemImpl('Parent task');
      const customId = 'custom-child-id';
      const child = parent.addChild('Child task', customId);

      expect(child.id).toBe(customId);
      expect(parent.children[0]).toBe(child);
    });

    test('removes child item correctly', () => {
      const parent = new PlanItemImpl('Parent task');
      const child1 = parent.addChild('Child 1');
      const child2 = parent.addChild('Child 2');

      expect(parent.children).toHaveLength(2);

      const removed = parent.removeChild(child1.id);
      expect(removed).toBe(true);
      expect(parent.children).toHaveLength(1);
      expect(parent.children[0]).toBe(child2);
    });

    test('returns false when removing non-existent child', () => {
      const parent = new PlanItemImpl('Parent task');

      const removed = parent.removeChild('non-existent-id');
      expect(removed).toBe(false);
      expect(parent.children).toHaveLength(0);
    });

    test('finds direct child correctly', () => {
      const parent = new PlanItemImpl('Parent task');
      const child1 = parent.addChild('Child 1');
      const child2 = parent.addChild('Child 2');

      const found = parent.findChild(child1.id);
      expect(found).toBe(child1);

      const found2 = parent.findChild(child2.id);
      expect(found2).toBe(child2);
    });

    test('finds nested child correctly', () => {
      const parent = new PlanItemImpl('Parent task');
      const child = parent.addChild('Child task');
      const grandchild = (child as PlanItemImpl).addChild('Grandchild task');

      const found = parent.findChild(grandchild.id);
      expect(found).toBe(grandchild);
    });

    test('returns null when child not found', () => {
      const parent = new PlanItemImpl('Parent task');
      parent.addChild('Child task');

      const found = parent.findChild('non-existent-id');
      expect(found).toBe(null);
    });

    test('gets all descendants correctly', () => {
      const parent = new PlanItemImpl('Parent task');
      const child1 = parent.addChild('Child 1');
      const child2 = parent.addChild('Child 2');
      const grandchild = (child1 as PlanItemImpl).addChild('Grandchild');

      const descendants = parent.getAllDescendants();

      expect(descendants).toHaveLength(3);
      expect(descendants).toContain(child1);
      expect(descendants).toContain(child2);
      expect(descendants).toContain(grandchild);
    });

    test('returns empty array when no descendants', () => {
      const parent = new PlanItemImpl('Parent task');

      const descendants = parent.getAllDescendants();
      expect(descendants).toEqual([]);
    });
  });

  describe('PlanImpl', () => {
    test('creates new empty plan', () => {
      const plan = new PlanImpl();

      expect(plan.items).toEqual([]);
      expect(plan.createdAt).toBeDefined();
      expect(plan.lastModified).toBe(plan.createdAt);

      // Dates should be valid ISO strings
      expect(() => new Date(plan.createdAt)).not.toThrow();
      expect(() => new Date(plan.lastModified)).not.toThrow();
    });

    test('adds root item correctly', async () => {
      const plan = new PlanImpl();
      const originalLastModified = plan.lastModified;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));

      const item = plan.addItem('Test task');

      expect(plan.items).toHaveLength(1);
      expect(plan.items[0]).toBe(item);
      expect(item.text).toBe('Test task');
      expect(plan.lastModified).not.toBe(originalLastModified);
    });

    test('adds item with custom ID', () => {
      const plan = new PlanImpl();
      const customId = 'custom-plan-item-id';

      const item = plan.addItem('Test task', customId);

      expect(item.id).toBe(customId);
      expect(plan.items[0]).toBe(item);
    });

    test('removes root item correctly', () => {
      const plan = new PlanImpl();
      const item1 = plan.addItem('Task 1');
      const item2 = plan.addItem('Task 2');

      expect(plan.items).toHaveLength(2);

      const removed = plan.removeItem(item1.id);
      expect(removed).toBe(true);
      expect(plan.items).toHaveLength(1);
      expect(plan.items[0]).toBe(item2);
    });

    test('removes nested item correctly', () => {
      const plan = new PlanImpl();
      const parent = plan.addItem('Parent task');
      const child = (parent as PlanItemImpl).addChild('Child task');

      expect(parent.children).toHaveLength(1);

      const removed = plan.removeItem(child.id);
      expect(removed).toBe(true);
      expect(parent.children).toHaveLength(0);
    });

    test('returns false when removing non-existent item', () => {
      const plan = new PlanImpl();
      plan.addItem('Test task');

      const removed = plan.removeItem('non-existent-id');
      expect(removed).toBe(false);
    });

    test('finds root item correctly', () => {
      const plan = new PlanImpl();
      const item1 = plan.addItem('Task 1');
      const item2 = plan.addItem('Task 2');

      const found1 = plan.findItem(item1.id);
      expect(found1).toBe(item1);

      const found2 = plan.findItem(item2.id);
      expect(found2).toBe(item2);
    });

    test('finds nested item correctly', () => {
      const plan = new PlanImpl();
      const parent = plan.addItem('Parent task');
      const child = (parent as PlanItemImpl).addChild('Child task');
      const grandchild = (child as PlanItemImpl).addChild('Grandchild task');

      const found = plan.findItem(grandchild.id);
      expect(found).toBe(grandchild);
    });

    test('returns null when item not found', () => {
      const plan = new PlanImpl();
      plan.addItem('Test task');

      const found = plan.findItem('non-existent-id');
      expect(found).toBe(null);
    });

    test('gets all items correctly', () => {
      const plan = new PlanImpl();
      const item1 = plan.addItem('Task 1');
      const item2 = plan.addItem('Task 2');
      const child = (item1 as PlanItemImpl).addChild('Child task');

      const allItems = plan.getAllItems();

      expect(allItems).toHaveLength(3);
      expect(allItems).toContain(item1);
      expect(allItems).toContain(item2);
      expect(allItems).toContain(child);
    });

    test('returns empty array when no items', () => {
      const plan = new PlanImpl();

      const allItems = plan.getAllItems();
      expect(allItems).toEqual([]);
    });

    test('clears plan correctly', async () => {
      const plan = new PlanImpl();
      plan.addItem('Task 1');
      plan.addItem('Task 2');

      expect(plan.items).toHaveLength(2);

      const originalLastModified = plan.lastModified;
      await new Promise(resolve => setTimeout(resolve, 1));

      plan.clear();

      expect(plan.items).toEqual([]);
      expect(plan.lastModified).not.toBe(originalLastModified);
    });

    test('calculates statistics correctly for empty plan', () => {
      const plan = new PlanImpl();

      const stats = plan.getStats();

      expect(stats.totalItems).toBe(0);
      expect(stats.completedItems).toBe(0);
      expect(stats.pendingItems).toBe(0);
      expect(stats.completionRate).toBe(0);
    });

    test('calculates statistics correctly with mixed items', () => {
      const plan = new PlanImpl();
      const item1 = plan.addItem('Task 1');
      const item2 = plan.addItem('Task 2');
      const child = (item1 as PlanItemImpl).addChild('Child task');

      // Complete some items
      (item1 as PlanItemImpl).complete();
      (child as PlanItemImpl).complete();

      const stats = plan.getStats();

      expect(stats.totalItems).toBe(3);
      expect(stats.completedItems).toBe(2);
      expect(stats.pendingItems).toBe(1);
      expect(stats.completionRate).toBeCloseTo(2 / 3);
    });

    test('updates last modified when touched', async () => {
      const plan = new PlanImpl();
      const originalLastModified = plan.lastModified;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));

      plan.touch();

      expect(plan.lastModified).not.toBe(originalLastModified);
    });
  });

  describe('PlanManager', () => {
    test('creates plan manager with custom file path', () => {
      const manager = new PlanManager(tempPlanFile);

      expect(manager).toBeDefined();
      expect(manager.getCurrentPlan()).toBeDefined();
    });

    test('creates plan manager with default file path', () => {
      const manager = new PlanManager();

      expect(manager).toBeDefined();
    });

    test('loads empty plan when file does not exist', async () => {
      const manager = new PlanManager(tempPlanFile);

      const plan = await manager.loadPlan();

      expect(plan.items).toEqual([]);
      expect(plan.createdAt).toBeDefined();
      expect(plan.lastModified).toBeDefined();
    });

    test('saves and loads plan correctly', async () => {
      const manager = new PlanManager(tempPlanFile);

      // Add some items
      await manager.addItem('Task 1');
      const item2 = await manager.addItem('Task 2');
      await manager.expandItem(item2.id, ['Subtask 1', 'Subtask 2']);

      // Create new manager instance to test loading
      const manager2 = new PlanManager(tempPlanFile);
      const loadedPlan = await manager2.loadPlan();

      expect(loadedPlan.items).toHaveLength(2);
      expect(loadedPlan.items[0]?.text).toBe('Task 1');
      expect(loadedPlan.items[1]?.text).toBe('Task 2');
      expect(loadedPlan.items[1]?.children).toHaveLength(2);
      expect(loadedPlan.items[1]?.children[0]?.text).toBe('Subtask 1');
      expect(loadedPlan.items[1]?.children[1]?.text).toBe('Subtask 2');
    });

    test('handles invalid JSON gracefully', async () => {
      // Write invalid JSON to plan file
      await fs.writeFile(tempPlanFile, '{ invalid json }');

      const manager = new PlanManager(tempPlanFile);

      await expect(manager.loadPlan()).rejects.toThrow('Failed to load plan');
    });

    test('adds root item correctly', async () => {
      const manager = new PlanManager(tempPlanFile);

      const item = await manager.addItem('Test task');

      expect(item.text).toBe('Test task');
      expect(item.status).toBe('pending');

      const plan = manager.getCurrentPlan();
      expect(plan.items).toHaveLength(1);
      expect(plan.items[0]).toBe(item);
    });

    test('adds child item correctly', async () => {
      const manager = new PlanManager(tempPlanFile);

      const parent = await manager.addItem('Parent task');
      const child = await manager.addItem('Child task', parent.id);

      expect(child.text).toBe('Child task');
      expect(parent.children).toHaveLength(1);
      expect(parent.children[0]).toBe(child);
    });

    test('throws error when adding to non-existent parent', async () => {
      const manager = new PlanManager(tempPlanFile);

      await expect(manager.addItem('Child task', 'non-existent-id')).rejects.toThrow(
        'Parent item with ID non-existent-id not found'
      );
    });

    test('completes item correctly', async () => {
      const manager = new PlanManager(tempPlanFile);

      const item = await manager.addItem('Test task');
      const success = await manager.completeItem(item.id);

      expect(success).toBe(true);
      expect(item.status).toBe('complete');
      expect(item.completedAt).toBeDefined();
    });

    test('returns false when completing non-existent item', async () => {
      const manager = new PlanManager(tempPlanFile);

      const success = await manager.completeItem('non-existent-id');
      expect(success).toBe(false);
    });

    test('expands item with subtasks correctly', async () => {
      const manager = new PlanManager(tempPlanFile);

      const item = await manager.addItem('Parent task');
      const subtasks = ['Subtask 1', 'Subtask 2', 'Subtask 3'];

      const addedItems = await manager.expandItem(item.id, subtasks);

      expect(addedItems).toHaveLength(3);
      expect(addedItems[0]?.text).toBe('Subtask 1');
      expect(addedItems[1]?.text).toBe('Subtask 2');
      expect(addedItems[2]?.text).toBe('Subtask 3');

      expect(item.children).toHaveLength(3);
      expect(item.children[0]).toBe(addedItems[0]);
      expect(item.children[1]).toBe(addedItems[1]);
      expect(item.children[2]).toBe(addedItems[2]);
    });

    test('throws error when expanding non-existent item', async () => {
      const manager = new PlanManager(tempPlanFile);

      await expect(
        manager.expandItem('non-existent-id', ['Subtask 1'])
      ).rejects.toThrow('Item with ID non-existent-id not found');
    });

    test('clears plan correctly', async () => {
      const manager = new PlanManager(tempPlanFile);

      await manager.addItem('Task 1');
      await manager.addItem('Task 2');

      let plan = manager.getCurrentPlan();
      expect(plan.items).toHaveLength(2);

      await manager.clearPlan();

      plan = manager.getCurrentPlan();
      expect(plan.items).toEqual([]);
    });

    test('returns correct statistics', async () => {
      const manager = new PlanManager(tempPlanFile);

      const item1 = await manager.addItem('Task 1');
      await manager.addItem('Task 2');
      const subtasks = await manager.expandItem(item1.id, ['Subtask 1', 'Subtask 2']);

      // Complete some items
      await manager.completeItem(item1.id);
      await manager.completeItem(subtasks[0]!.id);

      const stats = manager.getStats();

      expect(stats.totalItems).toBe(4); // 2 root + 2 subtasks
      expect(stats.completedItems).toBe(2);
      expect(stats.pendingItems).toBe(2);
      expect(stats.completionRate).toBe(0.5);
    });

    test('creates directory if it does not exist', async () => {
      const deepPath = path.join(tempDir, 'nested', 'deep', 'plan.json');
      const manager = new PlanManager(deepPath);

      await manager.addItem('Test task');

      // Verify the file was created
      const exists = await fs
        .access(deepPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
  });
});
