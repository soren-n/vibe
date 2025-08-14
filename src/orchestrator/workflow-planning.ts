// Workflow planning and execution plan generation
import type { ExecutionPlanStep, WorkflowPlanResult } from '../models.js';

// Simple workflow type for planning
interface WorkflowDefinition {
  description?: string;
  steps: (string | { step_text: string })[];
}

/**
 * Plan workflows and checklists and return execution guidance
 */
export async function planWorkflows(
  items: string[],
  prompt: string,
  showDisplay = true, // eslint-disable-line @typescript-eslint/no-unused-vars
  workflows: Record<string, WorkflowDefinition>,
  getWorkflowSteps: (name: string) => string[],
  planExecutionOrder: (workflows: string[]) => string[]
): Promise<WorkflowPlanResult> {
  if (!items || items.length === 0) {
    return {
      success: true,
      workflows: [],
      execution_plan: [],
      guidance: 'No workflows needed.',
    };
  }

  // Separate workflows from checklists
  const workflowNames = items.filter(item => !item.startsWith('checklist:'));
  const checklists = items
    .filter(item => item.startsWith('checklist:'))
    .map(item => item.replace('checklist:', ''));

  // Plan execution order for workflows only
  const executionOrder = planExecutionOrder(workflowNames);

  // Generate execution plan including both workflows and checklists
  const executionPlan = await generateExecutionPlan(
    executionOrder,
    checklists,
    prompt,
    workflows,
    getWorkflowSteps
  );

  return {
    success: true,
    workflows: executionOrder,
    checklists: checklists,
    execution_plan: executionPlan,
    guidance: formatGuidanceForAgent(executionPlan),
  };
}

/**
 * Generate execution plan for workflows and checklists
 */
async function generateExecutionPlan(
  workflows: string[],
  checklists: string[],
  prompt: string,
  workflowRegistry: Record<string, WorkflowDefinition>,
  getWorkflowSteps: (name: string) => string[]
): Promise<ExecutionPlanStep[]> {
  const plan: ExecutionPlanStep[] = [];

  // Add workflow steps
  for (const workflowName of workflows) {
    const workflowStep = await planWorkflowStep(
      workflowName,
      prompt,
      workflowRegistry,
      getWorkflowSteps
    );
    if (workflowStep) {
      plan.push(workflowStep);
    }
  }

  // Add checklist steps
  for (const checklistName of checklists) {
    const checklistStep = await planChecklistStep(checklistName, prompt);
    if (checklistStep) {
      plan.push(checklistStep);
    }
  }

  return plan;
}

/**
 * Plan a single workflow step
 */
export async function planWorkflowStep(
  workflowName: string,
  prompt: string,
  workflows: Record<string, WorkflowDefinition>,
  getWorkflowSteps: (name: string) => string[]
): Promise<ExecutionPlanStep | null> {
  const workflow = workflows[workflowName];
  const steps = getWorkflowSteps(workflowName);
  const reasoning = getWorkflowReasoning(workflowName, prompt);

  // Create step even for unknown workflows (for testing and flexibility)
  return {
    type: 'workflow',
    name: workflowName,
    title:
      workflow?.description ??
      `${workflowName.charAt(0).toUpperCase() + workflowName.slice(1)} Workflow`,
    description: workflow?.description ?? `Execute ${workflowName} workflow`,
    steps: steps.length > 0 ? steps : [`Execute ${workflowName} workflow steps`],
    reasoning: reasoning,
  };
}

/**
 * Plan a single checklist step
 */
export async function planChecklistStep(
  checklistName: string,
  prompt: string
): Promise<ExecutionPlanStep | null> {
  // Get checklist from our implemented checklist loading system
  const reasoning = getChecklistReasoning(checklistName, prompt);

  return {
    type: 'checklist',
    name: checklistName,
    title: `${checklistName.charAt(0).toUpperCase() + checklistName.slice(1)} Checklist`,
    description: `Execute ${checklistName} checklist`,
    steps: [`Run ${checklistName} checklist items`],
    reasoning: reasoning,
  };
}

/**
 * Format guidance as concise plain text for AI agents
 */
function formatGuidanceForAgent(executionPlan: ExecutionPlanStep[]): string {
  if (executionPlan.length === 0) {
    return 'No specific workflows needed.';
  }

  let guidance = 'Execution plan:\n';

  executionPlan.forEach((step, index) => {
    guidance += `${index + 1}. ${step.title}\n`;
    guidance += `   Reasoning: ${step.reasoning}\n`;
    if (step.steps.length > 0) {
      guidance += `   Key steps: ${step.steps.slice(0, 3).join(', ')}${step.steps.length > 3 ? '...' : ''}\n`;
    }
    guidance += '\n';
  });

  return guidance;
}

/**
 * Generate reasoning for why a workflow is needed
 */
function getWorkflowReasoning(workflowName: string, prompt: string): string {
  const reasoningMap: Record<string, string> = {
    analysis: `To understand the project structure and identify what needs to be done for: '${prompt}'`,
    'Research Guidance for Agents': `No specific workflow found for '${prompt}'. Providing research guidance for online information discovery.`,
    typescript_quality:
      'To ensure code quality with formatting, linting, and style checks',
    typescript_test: 'To validate that all tests pass and code works correctly',
    typescript_build: 'To create distribution packages ready for release',
    git_status: 'To check the current state of the repository',
    git_commit: 'To save the current work state',
    documentation: 'To ensure project documentation is up to date',
    implementation: 'To implement the requested feature or functionality',
    testing: 'To ensure proper test coverage and validation',
    quality: 'To maintain code quality standards',
    mcp: 'To set up or manage Model Context Protocol server functionality',
    session: 'To manage workflow session state and progression',
  };

  return (
    reasoningMap[workflowName] ??
    `Execute ${workflowName} workflow to address the requirements in: '${prompt}'`
  );
}

/**
 * Generate reasoning for why a checklist is needed
 */
function getChecklistReasoning(checklistName: string, prompt: string): string {
  const reasoningMap: Record<string, string> = {
    typescript_setup: 'To ensure TypeScript environment is properly configured',
    project_structure: 'To verify project structure follows best practices',
    code_quality: 'To validate code quality standards are met',
    testing: 'To ensure comprehensive test coverage',
    documentation: 'To verify documentation is complete and accurate',
    security: 'To check for security vulnerabilities and best practices',
    performance: 'To validate performance requirements are met',
    deployment: 'To ensure deployment readiness',
  };

  return (
    reasoningMap[checklistName] ??
    `Run ${checklistName} checklist to validate requirements for: '${prompt}'`
  );
}
