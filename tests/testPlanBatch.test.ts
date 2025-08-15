/**
 * Tests for batch plan operations (add_plan_items)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlanManager } from '../src/plan.js';
import { PlanHandlers } from '../src/mcp-server/plan-handlers.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp } from 'fs/promises';

describe('Plan Batch Operations', () => {
  let tempDir: string;
  let planManager: PlanManager;
  let planHandlers: PlanHandlers;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await mkdtemp(join(tmpdir(), 'vibe-batch-test-'));
    const planFile = join(tempDir, 'test-plan.json');

    planManager = new PlanManager(planFile);
    planHandlers = new PlanHandlers();

    // Override the planHandlers manager to use our test one
    (planHandlers as any).planManager = planManager;

    // Ensure clean state
    await planManager.clearPlan();
  });

  describe('PlanManager.addItems()', () => {
    it('should add multiple root items efficiently', async () => {
      const items = [
        { text: 'Phase 1: Setup' },
        { text: 'Phase 2: Implementation' },
        { text: 'Phase 3: Testing' },
      ];

      const result = await planManager.addItems(items);

      expect(result).toHaveLength(3);
      expect(result[0]?.text).toBe('Phase 1: Setup');
      expect(result[1]?.text).toBe('Phase 2: Implementation');
      expect(result[2]?.text).toBe('Phase 3: Testing');

      // Verify all items have IDs and timestamps
      result.forEach(item => {
        expect(item.id).toBeDefined();
        expect(item.createdAt).toBeDefined();
        expect(item.status).toBe('pending');
      });
    });

    it('should add child items with parent references', async () => {
      // First add a parent
      const parent = await planManager.addItem('Parent Task');

      // Then add children in batch
      const children = await planManager.addItems([
        { text: 'Child Task 1', parentId: parent.id },
        { text: 'Child Task 2', parentId: parent.id },
        { text: 'Child Task 3', parentId: parent.id },
      ]);

      expect(children).toHaveLength(3);

      // Verify the parent has the children
      const plan = planManager.getCurrentPlan();
      const parentItem = plan.findItem(parent.id);
      expect(parentItem?.children).toHaveLength(3);
      expect(parentItem?.children[0]?.text).toBe('Child Task 1');
    });

    it('should handle mixed root and child items', async () => {
      // Add a parent first
      const parent = await planManager.addItem('Existing Parent');

      // Mix root and child items in one batch
      const items = await planManager.addItems([
        { text: 'New Root Task' },
        { text: 'Child of Existing', parentId: parent.id },
        { text: 'Another Root Task' },
        { text: 'Another Child', parentId: parent.id },
      ]);

      expect(items).toHaveLength(4);

      // Verify plan structure
      const plan = planManager.getCurrentPlan();
      expect(plan.items).toHaveLength(3); // original parent + 2 new root items

      const parentItem = plan.findItem(parent.id);
      expect(parentItem?.children).toHaveLength(2);
    });

    it('should maintain transactional integrity on parent not found', async () => {
      const items = [
        { text: 'Valid Task' },
        { text: 'Invalid Child', parentId: 'non-existent-id' },
        { text: 'Another Valid Task' },
      ];

      await expect(planManager.addItems(items)).rejects.toThrow(
        'Parent item with ID non-existent-id not found'
      );

      // Verify no items were added
      const plan = planManager.getCurrentPlan();
      expect(plan.items).toHaveLength(0);
    });

    it('should handle empty array gracefully', async () => {
      const result = await planManager.addItems([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('PlanHandlers.addPlanItems()', () => {
    it('should return properly formatted response for batch add', async () => {
      const items = [
        { text: 'Task 1', parentId: undefined },
        { text: 'Task 2', parentId: undefined },
      ];

      const result = await planHandlers.addPlanItems(items);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.message).toBe('Added 2 items to plan');

      result.items?.forEach(item => {
        expect(item.id).toBeDefined();
        expect(item.text).toBeDefined();
        expect(item.status).toBe('pending');
        expect(item.createdAt).toBeDefined();
      });
    });

    it('should handle errors properly in batch operations', async () => {
      const items = [
        { text: 'Valid Task', parentId: undefined },
        { text: 'Invalid Child', parentId: 'bad-id' },
      ];

      const result = await planHandlers.addPlanItems(items);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Parent item with ID bad-id not found');
      expect(result.items).toBeUndefined();
    });
  });

  describe('Performance Characteristics', () => {
    it('should only save to disk once regardless of item count', async () => {
      let saveCount = 0;

      // Mock the savePlan method to count calls
      const originalSave = planManager.savePlan.bind(planManager);
      planManager.savePlan = async () => {
        saveCount++;
        return originalSave();
      };

      // Add multiple items
      await planManager.addItems([
        { text: 'Task 1' },
        { text: 'Task 2' },
        { text: 'Task 3' },
        { text: 'Task 4' },
        { text: 'Task 5' },
      ]);

      // Should only save once
      expect(saveCount).toBe(1);
    });

    it('should be more efficient than multiple individual adds', async () => {
      let batchSaveCount = 0;
      let individualSaveCount = 0;

      // Test batch approach
      const batchManager = new PlanManager(join(tempDir, 'batch-plan.json'));
      const originalBatchSave = batchManager.savePlan.bind(batchManager);
      batchManager.savePlan = async () => {
        batchSaveCount++;
        return originalBatchSave();
      };

      await batchManager.addItems([
        { text: 'Batch Task 1' },
        { text: 'Batch Task 2' },
        { text: 'Batch Task 3' },
      ]);

      // Test individual approach
      const individualManager = new PlanManager(join(tempDir, 'individual-plan.json'));
      const originalIndividualSave = individualManager.savePlan.bind(individualManager);
      individualManager.savePlan = async () => {
        individualSaveCount++;
        return originalIndividualSave();
      };

      await individualManager.addItem('Individual Task 1');
      await individualManager.addItem('Individual Task 2');
      await individualManager.addItem('Individual Task 3');

      // Batch should be more efficient
      expect(batchSaveCount).toBe(1);
      expect(individualSaveCount).toBe(3);
      expect(batchSaveCount).toBeLessThan(individualSaveCount);
    });
  });
});
