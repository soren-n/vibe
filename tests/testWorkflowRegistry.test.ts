/**
 * Comprehensive tests for workflow-registry.ts - Simple workflow registry
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { WorkflowRegistry } from '../src/workflow-registry';
import { VibeConfigImpl } from '../src/config';

describe('WorkflowRegistry', () => {
  let config: VibeConfigImpl;
  let registry: WorkflowRegistry;

  beforeEach(async () => {
    config = await VibeConfigImpl.loadFromFile();
    registry = new WorkflowRegistry(config);
  });

  describe('Constructor', () => {
    test('initializes successfully with config', () => {
      expect(registry).toBeDefined();
      expect(registry.getAllWorkflows).toBeDefined();
    });

    test('loads workflows on initialization', () => {
      const workflows = registry.getAllWorkflows();
      expect(workflows).toBeDefined();
      expect(typeof workflows).toBe('object');
    });
  });

  describe('getAllWorkflows', () => {
    test('returns all loaded workflows', () => {
      const workflows = registry.getAllWorkflows();

      expect(workflows).toBeDefined();
      expect(typeof workflows).toBe('object');

      const workflowNames = Object.keys(workflows);
      expect(workflowNames.length).toBeGreaterThan(0);

      // Check structure of first workflow
      if (workflowNames.length > 0) {
        const firstWorkflow = workflows[workflowNames[0]!];
        expect(firstWorkflow?.name).toBeDefined();
        expect(firstWorkflow?.description).toBeDefined();
        expect(Array.isArray(firstWorkflow?.triggers)).toBe(true);
        expect(Array.isArray(firstWorkflow?.steps)).toBe(true);
      }
    });
  });

  describe('getWorkflow', () => {
    test('returns specific workflow by name', () => {
      const allWorkflows = registry.getAllWorkflows();
      const workflowNames = Object.keys(allWorkflows);

      if (workflowNames.length > 0) {
        const workflowName = workflowNames[0]!;
        const workflow = registry.getWorkflow(workflowName);

        expect(workflow).toBeDefined();
        expect(workflow?.name).toBe(workflowName);
        expect(workflow).toBe(allWorkflows[workflowName]);
      }
    });

    test('returns null for non-existent workflow', () => {
      const workflow = registry.getWorkflow('non-existent-workflow');
      expect(workflow).toBe(null);
    });

    test('handles empty string workflow name', () => {
      const workflow = registry.getWorkflow('');
      expect(workflow).toBe(null);
    });
  });

  describe('searchWorkflows', () => {
    test('returns all workflows when no filters', () => {
      const result = registry.searchWorkflows();

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();
      expect(Array.isArray(result.workflows)).toBe(true);

      const allWorkflows = registry.getAllWorkflows();
      expect(result.workflows?.length).toBe(Object.keys(allWorkflows).length);
    });

    test('filters workflows by name pattern', () => {
      const result = registry.searchWorkflows('test');

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();

      if (result.workflows && result.workflows.length > 0) {
        result.workflows.forEach(workflow => {
          const matchesPattern =
            workflow.name.toLowerCase().includes('test') ||
            workflow.description.toLowerCase().includes('test') ||
            workflow.triggers.some(trigger => trigger.toLowerCase().includes('test'));
          expect(matchesPattern).toBe(true);
        });
      }
    });

    test('filters workflows by description pattern', () => {
      const result = registry.searchWorkflows('quality');

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();

      if (result.workflows && result.workflows.length > 0) {
        result.workflows.forEach(workflow => {
          const matchesPattern =
            workflow.name.toLowerCase().includes('quality') ||
            workflow.description.toLowerCase().includes('quality') ||
            workflow.triggers.some(trigger =>
              trigger.toLowerCase().includes('quality')
            );
          expect(matchesPattern).toBe(true);
        });
      }
    });

    test('filters workflows by trigger pattern', () => {
      const result = registry.searchWorkflows('validate');

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();

      if (result.workflows && result.workflows.length > 0) {
        result.workflows.forEach(workflow => {
          const matchesPattern =
            workflow.name.toLowerCase().includes('validate') ||
            workflow.description.toLowerCase().includes('validate') ||
            workflow.triggers.some(trigger =>
              trigger.toLowerCase().includes('validate')
            );
          expect(matchesPattern).toBe(true);
        });
      }
    });

    test('filters workflows by category', () => {
      const categories = registry.getCategories();

      if (categories.length > 0) {
        const testCategory = categories[0]!;
        const result = registry.searchWorkflows(undefined, testCategory);

        expect(result.success).toBe(true);
        expect(result.workflows).toBeDefined();

        if (result.workflows && result.workflows.length > 0) {
          result.workflows.forEach(workflow => {
            expect(workflow.category).toBe(testCategory);
          });
        }
      }
    });

    test('combines pattern and category filters', () => {
      const categories = registry.getCategories();

      if (categories.length > 0) {
        const testCategory = categories[0]!;
        const result = registry.searchWorkflows('test', testCategory);

        expect(result.success).toBe(true);
        expect(result.workflows).toBeDefined();

        if (result.workflows && result.workflows.length > 0) {
          result.workflows.forEach(workflow => {
            expect(workflow.category).toBe(testCategory);

            const matchesPattern =
              workflow.name.toLowerCase().includes('test') ||
              workflow.description.toLowerCase().includes('test') ||
              workflow.triggers.some(trigger => trigger.toLowerCase().includes('test'));
            expect(matchesPattern).toBe(true);
          });
        }
      }
    });

    test('returns empty results for non-matching patterns', () => {
      const result = registry.searchWorkflows('xyz123nonexistent');

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();
      expect(result.workflows?.length).toBe(0);
    });

    test('returns empty results for non-existing category', () => {
      const result = registry.searchWorkflows(undefined, 'nonexistent-category');

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();
      expect(result.workflows?.length).toBe(0);
    });

    test('handles case insensitive search', () => {
      const result1 = registry.searchWorkflows('TEST');
      const result2 = registry.searchWorkflows('test');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.workflows?.length).toBe(result2.workflows?.length);
    });

    test('returns workflow structure with required fields', () => {
      const result = registry.searchWorkflows();

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();

      if (result.workflows && result.workflows.length > 0) {
        const workflow = result.workflows[0]!;
        expect(typeof workflow.name).toBe('string');
        expect(typeof workflow.description).toBe('string');
        expect(Array.isArray(workflow.triggers)).toBe(true);
        // category can be undefined
        expect(
          workflow.category === undefined || typeof workflow.category === 'string'
        ).toBe(true);
      }
    });
  });

  describe('getCategories', () => {
    test('returns array of categories', () => {
      const categories = registry.getCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);

      // Categories should be strings
      categories.forEach(category => {
        expect(typeof category).toBe('string');
        expect(category.length).toBeGreaterThan(0);
      });
    });

    test('returns sorted categories', () => {
      const categories = registry.getCategories();

      if (categories.length > 1) {
        const sortedCategories = [...categories].sort();
        expect(categories).toEqual(sortedCategories);
      }
    });

    test('returns unique categories', () => {
      const categories = registry.getCategories();
      const uniqueCategories = [...new Set(categories)];

      expect(categories.length).toBe(uniqueCategories.length);
    });

    test('categories match workflow categories', () => {
      const categories = registry.getCategories();
      const allWorkflows = registry.getAllWorkflows();
      const workflowCategories = new Set(
        Object.values(allWorkflows)
          .map(w => w.category)
          .filter(Boolean)
      );

      expect(categories.length).toBe(workflowCategories.size);
      categories.forEach(category => {
        expect(workflowCategories.has(category)).toBe(true);
      });
    });
  });

  describe('getWorkflowsByCategory', () => {
    test('returns workflows for valid category', () => {
      const categories = registry.getCategories();

      if (categories.length > 0) {
        const testCategory = categories[0]!;
        const workflows = registry.getWorkflowsByCategory(testCategory);

        expect(Array.isArray(workflows)).toBe(true);
        workflows.forEach(workflow => {
          expect(workflow.category).toBe(testCategory);
        });
      }
    });

    test('returns empty array for non-existent category', () => {
      const workflows = registry.getWorkflowsByCategory('non-existent-category');

      expect(Array.isArray(workflows)).toBe(true);
      expect(workflows.length).toBe(0);
    });

    test('returned workflows match category filter', () => {
      const categories = registry.getCategories();

      categories.forEach(category => {
        const workflows = registry.getWorkflowsByCategory(category);
        const searchResult = registry.searchWorkflows(undefined, category);

        expect(workflows.length).toBe(searchResult.workflows?.length || 0);
      });
    });
  });

  describe('reload', () => {
    test('reload method exists and works', () => {
      expect(registry.reload).toBeDefined();
      expect(() => registry.reload()).not.toThrow();
    });

    test('reload refreshes workflow data', () => {
      const workflowsBefore = Object.keys(registry.getAllWorkflows()).length;

      registry.reload();

      const workflowsAfter = Object.keys(registry.getAllWorkflows()).length;
      expect(workflowsAfter).toBe(workflowsBefore);
    });
  });

  describe('Error Handling', () => {
    test('handles search with undefined pattern gracefully', () => {
      const result = registry.searchWorkflows(undefined);

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();
    });

    test('handles search with empty pattern gracefully', () => {
      const result = registry.searchWorkflows('');

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();
    });

    test('handles search with undefined category gracefully', () => {
      const result = registry.searchWorkflows('test', undefined);

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();
    });

    test('handles search with empty category gracefully', () => {
      const result = registry.searchWorkflows('test', '');

      expect(result.success).toBe(true);
      expect(result.workflows).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('search operations complete quickly', () => {
      const startTime = Date.now();

      // Perform multiple search operations
      registry.searchWorkflows('test');
      registry.searchWorkflows(undefined, 'core');
      registry.searchWorkflows('quality');
      registry.getCategories();
      registry.getWorkflowsByCategory('development');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Operations should complete in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    test('getAllWorkflows returns same object reference', () => {
      const workflows1 = registry.getAllWorkflows();
      const workflows2 = registry.getAllWorkflows();

      // Should return the same cached object
      expect(workflows1).toBe(workflows2);
    });
  });
});
