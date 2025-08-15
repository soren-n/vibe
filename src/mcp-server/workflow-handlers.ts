import type { WorkflowOrchestrator } from '../orchestrator.js';

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
  constructor(private orchestrator: WorkflowOrchestrator) {}

  async queryWorkflows(pattern?: string, category?: string): Promise<WorkflowQueryResult> {
    try {
      const allWorkflows = this.orchestrator.getAllWorkflows();
      let workflows = Object.values(allWorkflows);

      // Filter by pattern if provided
      if (pattern) {
        const lowerPattern = pattern.toLowerCase();
        workflows = workflows.filter(w =>
          w.name.toLowerCase().includes(lowerPattern) ||
          w.description?.toLowerCase().includes(lowerPattern) ||
          w.triggers?.some(t => t.toLowerCase().includes(lowerPattern))
        );
      }

      // Filter by category if provided
      if (category) {
        workflows = workflows.filter(w => w.category === category);
      }

      return {
        success: true,
        workflows: workflows.map(w => ({
          name: w.name,
          description: w.description ?? '',
          category: w.category,
          triggers: w.triggers ?? [],
          steps: w.steps?.map(step => typeof step === 'string' ? step : step.step_text ?? step.command ?? 'Step')
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getWorkflowGuidance(name: string): Promise<WorkflowGuidanceResult> {
    try {
      const allWorkflows = this.orchestrator.getAllWorkflows();
      const workflow = Object.values(allWorkflows).find(w => w.name === name);

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
          steps: workflow.steps?.map(step => typeof step === 'string' ? step : step.step_text ?? step.command ?? 'Step') ?? [],
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
