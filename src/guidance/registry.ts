/**
 * Workflow registry - manages workflow collection
 * TypeScript translation of guidance/registry.py
 */

import { loadAllWorkflows } from '../workflows';
import type { Workflow } from '../models';

class WorkflowRegistry {
  private workflows: Record<string, Workflow>;

  constructor() {
    this.workflows = loadAllWorkflows();
  }

  getAllWorkflows(): Workflow[] {
    return Object.values(this.workflows);
  }

  getWorkflow(name: string): Workflow | null {
    return this.workflows[name] ?? null;
  }

  getWorkflowsByTriggers(prompt: string): Workflow[] {
    const promptLower = prompt.toLowerCase();
    const matchingWorkflows: Workflow[] = [];

    for (const workflow of Object.values(this.workflows)) {
      for (const trigger of workflow.triggers) {
        if (promptLower.includes(trigger.toLowerCase())) {
          matchingWorkflows.push(workflow);
          break;
        }
      }
    }

    return matchingWorkflows;
  }

  findWorkflowsByCategory(category: string): Workflow[] {
    return Object.values(this.workflows).filter(
      workflow => workflow.category === category
    );
  }

  searchWorkflows(searchTerm: string): Workflow[] {
    const term = searchTerm.toLowerCase();

    return Object.values(this.workflows).filter(
      workflow =>
        workflow.name.toLowerCase().includes(term) ||
        workflow.description.toLowerCase().includes(term) ||
        workflow.triggers.some(trigger => trigger.toLowerCase().includes(term))
    );
  }
}

let registryInstance: WorkflowRegistry | null = null;

export function getWorkflowRegistry(): WorkflowRegistry {
  registryInstance ??= new WorkflowRegistry();
  return registryInstance;
}

export function clearWorkflowRegistry(): void {
  registryInstance = null;
}
