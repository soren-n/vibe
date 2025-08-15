/**
 * Simplified workflow registry for guidance-only workflow access
 * Replaces complex WorkflowOrchestrator with simple search and reference
 */

import type { VibeConfigImpl } from './config';
import type { Workflow } from './models';
import { loadAllWorkflows } from './workflows';

export class WorkflowRegistry {
  private workflows: Record<string, Workflow>;
  private config: VibeConfigImpl;

  constructor(config: VibeConfigImpl) {
    this.config = config;
    this.workflows = loadAllWorkflows();
  }

  /**
   * Get all workflows for listing and reference
   */
  getAllWorkflows(): Record<string, Workflow> {
    return this.workflows;
  }

  /**
   * Get workflow by name for reference
   */
  getWorkflow(name: string): Workflow | null {
    return this.workflows[name] ?? null;
  }

  /**
   * Search workflows by pattern - returns matching workflow names
   */
  searchWorkflows(
    pattern?: string,
    category?: string
  ): {
    success: boolean;
    workflows?: Array<{
      name: string;
      description: string;
      category: string | undefined;
      triggers: string[];
    }>;
    error?: string;
  } {
    try {
      let workflows = Object.values(this.workflows);

      // Filter by pattern if provided
      if (pattern) {
        const lowerPattern = pattern.toLowerCase();
        workflows = workflows.filter(workflow => {
          return (
            workflow.name.toLowerCase().includes(lowerPattern) ||
            (workflow.description?.toLowerCase().includes(lowerPattern) ?? false) ||
            (workflow.triggers?.some(trigger =>
              trigger.toLowerCase().includes(lowerPattern)
            ) ??
              false)
          );
        });
      }

      // Filter by category if provided
      if (category) {
        workflows = workflows.filter(workflow => workflow.category === category);
      }

      return {
        success: true,
        workflows: workflows.map(workflow => ({
          name: workflow.name,
          description: workflow.description ?? '',
          category: workflow.category,
          triggers: workflow.triggers ?? [],
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search workflows: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get workflow categories for organization
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    Object.values(this.workflows).forEach(workflow => {
      if (workflow.category) {
        categories.add(workflow.category);
      }
    });
    return Array.from(categories).sort();
  }

  /**
   * Get workflows by category
   */
  getWorkflowsByCategory(category: string): Workflow[] {
    return Object.values(this.workflows).filter(
      workflow => workflow.category === category
    );
  }

  /**
   * Reload workflows from disk (for development/testing)
   */
  reload(): void {
    this.workflows = loadAllWorkflows();
  }
}
