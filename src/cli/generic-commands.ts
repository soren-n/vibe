/**
 * Generic command handlers (guide, config, etc.)
 */
import * as fs from 'node:fs';
import type { VibeConfig } from '../models';
import { type CLIResult, createErrorResponse, createSuccessResponse } from './utils';

/**
 * Handles guide command
 */
export async function handleGuide(
  query?: string,
  _options?: { format?: string }
): Promise<CLIResult> {
  try {
    if (!query) {
      return createSuccessResponse({
        message: 'Vibe Guide',
        description: 'Use workflows and checklists to improve your development process',
        usage: 'uv run vibe guide "what should I do next?"',
      });
    }

    // Dynamically import to avoid circular dependencies
    const configModule = await import('../config.js');
    const orchestratorModule = await import('../orchestrator.js');

    const config = new configModule.VibeConfigImpl();
    const orchestrator = new orchestratorModule.WorkflowOrchestrator(config);

    // Plan workflow for the query
    const plan = orchestrator.planWorkflow({ query });

    if (!plan) {
      return createSuccessResponse({
        message: 'No specific workflow found',
        suggestion:
          'Try describing your task more specifically, like "help me test my code" or "set up development environment"',
        query: query,
      });
    }

    return createSuccessResponse({
      message: 'Workflow Guidance',
      query: query,
      suggested_workflow: plan.workflow.name,
      description: plan.workflow.description,
      confidence: plan.confidence,
      reasoning: plan.reasoning,
      steps_preview: plan.workflow.steps
        .slice(0, 3)
        .map(step =>
          typeof step === 'string' ? step : (step.step_text ?? step.command ?? 'Step')
        ),
      total_steps: plan.workflow.steps.length,
      next_action: `Run: vibe mcp start "${query}"`,
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : String(error));
  }
}

/**
 * Handles config show command
 */
export async function handleConfigShow(options: {
  format?: string;
}): Promise<CLIResult> {
  try {
    const isJsonOutput = options.format === 'json';

    // Try to load config file
    let config: Partial<VibeConfig> = {};
    const configPath = 'vibe.config.js';

    if (fs.existsSync(configPath)) {
      // Would normally require() the config, but keeping it simple
      config = { projectType: 'detected from config' };
    }

    if (isJsonOutput) {
      return createSuccessResponse({ config });
    } else {
      return createSuccessResponse({
        message: 'Current configuration:',
        projectType: config.projectType ?? 'not set',
        configFile: fs.existsSync(configPath) ? 'found' : 'not found',
      });
    }
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Handles config init command
 */
async function _handleConfigInit(options: { format?: string }): Promise<CLIResult> {
  try {
    const isJsonOutput = options.format === 'json';
    const configPath = 'vibe.config.js';

    const defaultConfig = `// Vibe Configuration
module.exports = {
  projectType: 'generic',
  preferences: {
    maxSessions: 10,
    sessionTimeout: 3600000, // 1 hour
    enableLogging: true
  }
};
`;

    if (fs.existsSync(configPath)) {
      return createErrorResponse('Configuration file already exists');
    }

    fs.writeFileSync(configPath, defaultConfig);

    if (isJsonOutput) {
      return createSuccessResponse({
        status: 'created',
        file: configPath,
      });
    } else {
      return createSuccessResponse({
        message: 'Configuration file created',
        file: configPath,
      });
    }
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : String(error));
  }
}
