import type { WorkflowRegistry } from '../workflow-registry.js';

interface WorkflowQueryResult {
  success: boolean;
  workflows?: {
    name: string;
    description: string;
    category: string | undefined;
    triggers: string[];
    steps?: string[];
  }[];
  error?: string;
}

interface WorkflowGuidanceResult {
  success: boolean;
  workflow?: {
    name: string;
    description: string;
    steps: string[];
    guidance: string;
  };
  error?: string;
}

export class WorkflowHandlers {
  constructor(private workflowRegistry: WorkflowRegistry) {}

  async queryWorkflows(pattern?: string, category?: string): Promise<WorkflowQueryResult> {
    try {
      const result = this.workflowRegistry.searchWorkflows(pattern, category);
      
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        workflows: result.workflows ? result.workflows.map(w => ({
          name: w.name,
          description: w.description,
          category: w.category,
          triggers: w.triggers,
          steps: this.getWorkflowSteps(w.name)
        })) : []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private getWorkflowSteps(workflowName: string): string[] {
    const workflow = this.workflowRegistry.getWorkflow(workflowName);
    if (!workflow?.steps) return [];
    
    return workflow.steps.map(step => 
      typeof step === 'string' ? step : step.step_text ?? step.command ?? 'Step'
    );
  }

  async getWorkflowGuidance(name: string): Promise<WorkflowGuidanceResult> {
    try {
      const workflow = this.workflowRegistry.getWorkflow(name);

      if (!workflow) {
        return {
          success: false,
          error: `Workflow '${name}' not found`
        };
      }

      return {
        success: true,
        workflow: {
          name: workflow.name,
          description: workflow.description ?? '',
          steps: this.getWorkflowSteps(name),
          guidance: `This workflow provides guidance for: ${workflow.description}. Use these steps as inspiration for your development process.`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
