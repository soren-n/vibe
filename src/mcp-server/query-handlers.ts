interface QueryWorkflowsResult {
  success: boolean;
  workflows?: {
    name: string;
    description: string;
    category: string | undefined;
    triggers: string[];
  }[];
  error?: string;
}

import { loadAllWorkflows } from '../workflows.js';

export class QueryHandlers {
  async queryWorkflows(pattern?: string, category?: string): Promise<QueryWorkflowsResult> {
    try {
      const allWorkflows = loadAllWorkflows();
      
      let filteredWorkflows = Object.entries(allWorkflows).map(([name, workflow]) => ({
        name,
        description: workflow.description,
        category: workflow.category,
        triggers: workflow.triggers || []
      }));

      // Filter by pattern if provided
      if (pattern) {
        const lowerPattern = pattern.toLowerCase();
        filteredWorkflows = filteredWorkflows.filter(workflow =>
          workflow.name.toLowerCase().includes(lowerPattern) ||
          workflow.description.toLowerCase().includes(lowerPattern) ||
          workflow.triggers.some(trigger => trigger.toLowerCase().includes(lowerPattern))
        );
      }

      // Filter by category if provided
      if (category) {
        const lowerCategory = category.toLowerCase();
        filteredWorkflows = filteredWorkflows.filter(workflow =>
          workflow.category?.toLowerCase() === lowerCategory
        );
      }

      return {
        success: true,
        workflows: filteredWorkflows
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to query workflows: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
