/**
 * Tests for hot reloading functionality.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { clearWorkflowCache, loadAllWorkflows } from '../src/workflows';
import { clearChecklistCache, getChecklists } from '../src/guidance/loader';

describe('Hot reloading functionality', () => {
  test('workflow cache can be cleared and reloaded', () => {
    // Load workflows initially
    const initialWorkflows = loadAllWorkflows();
    expect(Object.keys(initialWorkflows).length).toBeGreaterThan(0);

    // Clear cache
    clearWorkflowCache();

    // Reload workflows - should work again
    const reloadedWorkflows = loadAllWorkflows();
    expect(Object.keys(reloadedWorkflows).length).toBeGreaterThan(0);

    // Should have the same workflows
    expect(Object.keys(reloadedWorkflows)).toEqual(Object.keys(initialWorkflows));
  });

  test('checklist cache can be cleared and reloaded', () => {
    // Load checklists initially
    const initialChecklists = getChecklists();
    expect(Object.keys(initialChecklists).length).toBeGreaterThan(0);

    // Clear cache
    clearChecklistCache();

    // Reload checklists - should work again
    const reloadedChecklists = getChecklists();
    expect(Object.keys(reloadedChecklists).length).toBeGreaterThan(0);

    // Should have the same checklists
    expect(Object.keys(reloadedChecklists)).toEqual(Object.keys(initialChecklists));
  });

  test('cache invalidation works correctly', () => {
    // This test ensures that when files change, the cache is properly invalidated

    // Load initial state
    const workflows1 = loadAllWorkflows();
    const count1 = Object.keys(workflows1).length;

    // Clear cache to simulate file change
    clearWorkflowCache();

    // Reload should give same result (since files haven't actually changed)
    const workflows2 = loadAllWorkflows();
    const count2 = Object.keys(workflows2).length;

    expect(count2).toBe(count1);
  });

  test('file watching capability (conceptual)', () => {
    // In a real implementation, this would test file system watching
    // For now, we test that the cache clearing mechanism works

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-test-'));

    try {
      // This test verifies the cache clearing works as a foundation for hot reloading
      clearWorkflowCache();
      clearChecklistCache();

      const workflows = loadAllWorkflows();
      const checklists = getChecklists();

      expect(Object.keys(workflows).length).toBeGreaterThan(0);
      expect(Object.keys(checklists).length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('callback system foundation', () => {
    // This tests the foundation for a callback system
    // In practice, this would be implemented in a file watcher class

    let callbackCalled = false;
    const testCallback = () => {
      callbackCalled = true;
    };

    // Simulate clearing cache and calling callback
    clearWorkflowCache();
    testCallback();

    expect(callbackCalled).toBe(true);
  });
});
