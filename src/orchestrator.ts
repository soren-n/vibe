/**
 * Minimal workflow orchestrator for plan-based architecture
 * Provides only essential functionality needed by CLI and plan system
 */

import type { VibeConfigImpl } from './config';
import type { ExecutionPlanStep, Workflow, WorkflowPlanResult } from './models';
import { loadAllWorkflows } from './workflows';
import { PromptAnalyzer } from './analyzer';

export class WorkflowOrchestrator {
  private workflows: Record<string, Workflow>;
  private config: VibeConfigImpl;
  private analyzer: PromptAnalyzer;

  constructor(config: VibeConfigImpl) {
    this.config = config;
    this.workflows = loadAllWorkflows();
    this.analyzer = new PromptAnalyzer(config);
  }

  /**
   * Load workflows (refresh cache)
   */
  private loadWorkflows(): Record<string, Workflow> {
    return loadAllWorkflows();
  }

  /**
   * Get all workflows for CLI listing
   */
  getAllWorkflows(): Record<string, Workflow> {
    return this.loadWorkflows();
  }

  /**
   * Get workflow by name
   */
  getWorkflow(name: string): Workflow | null {
    const workflows = this.loadWorkflows();
    return workflows[name] ?? null;
  }

  /**
   * Query workflows by pattern (for backward compatibility)
   */
  queryWorkflows(pattern: string): {
    success: boolean;
    workflows?: string[];
    error?: string;
  } {
    try {
      const allWorkflows = this.loadWorkflows();
      const matchingWorkflows = Object.keys(allWorkflows).filter(name => {
        const workflow = allWorkflows[name];
        if (!workflow) return false;

        const lowerPattern = pattern.toLowerCase();
        return (
          name.includes(lowerPattern) ||
          (workflow.description?.toLowerCase().includes(lowerPattern) ?? false) ||
          (workflow.triggers?.some(trigger => trigger.includes(lowerPattern)) ?? false)
        );
      });

      return {
        success: true,
        workflows: matchingWorkflows,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to query workflows: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Plan workflow based on query - main method used by CLI
   */
  async planWorkflow(request: { query: string }): Promise<WorkflowPlanResult | null> {
    try {
      // Analyze query to get matching workflows
      const matchedItems = await this.analyzer.analyze(request.query);

      // Plan workflows
      const result = await this.planWorkflows(matchedItems, request.query);
      return result;
    } catch (error) {
      console.error('Error in planWorkflow:', error);
      return null;
    }
  }

  /**
   * Plan workflows and return execution guidance
   */
  async planWorkflows(items: string[], prompt: string): Promise<WorkflowPlanResult> {
    const workflowNames = items.filter(item => this.workflows[item]);

    // Create execution plan with reasoning
    const executionPlan: ExecutionPlanStep[] = [];

    for (const workflowName of workflowNames) {
      const workflow = this.workflows[workflowName];
      if (workflow) {
        executionPlan.push({
          type: 'workflow',
          name: workflowName,
          description: workflow.description || 'No description available',
          reasoning: `Workflow analysis is relevant for: ${prompt}`,
          workflow: workflow,
        });
      }
    }

    return {
      success: true,
      workflows: workflowNames,
      execution_plan: executionPlan,
      guidance: this.generateGuidance(executionPlan, prompt),
    };
  }

  /**
   * Generate user-friendly guidance from execution plan
   */
  private generateGuidance(executionPlan: ExecutionPlanStep[], prompt: string): string {
    if (executionPlan.length === 0) {
      return `No specific workflows found for: "${prompt}". Consider using the general development workflow or breaking down your request.`;
    }

    const guidance = [
      `Based on your request: "${prompt}", here's the recommended approach:\n`,
    ];

    executionPlan.forEach((step, index) => {
      guidance.push(`${index + 1}. **${step.name}**: ${step.description}`);
      if (step.workflow?.steps) {
        step.workflow.steps.slice(0, 3).forEach((workflowStep, stepIndex) => {
          guidance.push(`   ${String.fromCharCode(97 + stepIndex)}. ${workflowStep}`);
        });
        if (step.workflow.steps.length > 3) {
          guidance.push(`   ... and ${step.workflow.steps.length - 3} more steps`);
        }
      }
      guidance.push('');
    });

    return guidance.join('\n');
  }
}
