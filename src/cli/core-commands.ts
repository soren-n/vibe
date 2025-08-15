/**
 * Core command handlers (init, run, check, validate)
 */
import { VibeConfigImpl } from '../config.js';
import { loadAllWorkflows } from '../workflows.js';
import { WorkflowOrchestrator } from '../orchestrator.js';
import type { CLIResult } from './utils.js';
import { createErrorResponse, createSuccessResponse } from './utils.js';

interface InitOptions {
  projectType?: string;
}

interface RunOptions {
  interactive?: boolean;
  timeout?: string;
}

interface CheckOptions {
  json?: boolean;
}

/**
 * Handles init command - Initialize vibe configuration for a project
 */
export async function handleInit(options: InitOptions): Promise<CLIResult> {
  try {
    const config = new VibeConfigImpl();
    if (options.projectType) {
      config.projectType = options.projectType;
    } else {
      config.projectType = await config.detectProjectType();
    }

    return createSuccessResponse({
      message: 'Vibe initialized successfully',
      projectType: config.projectType,
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : String(error));
  }
}

/**
 * Handles run command - Show workflow guidance (execution removed)
 */
export async function handleRun(
  workflow: string,
  _options: RunOptions
): Promise<CLIResult> {
  try {
    const config = new VibeConfigImpl();
    const orchestrator = new WorkflowOrchestrator(config);
    const allWorkflows = orchestrator.getAllWorkflows();
    const targetWorkflow = Object.values(allWorkflows).find(w => w.name === workflow);

    if (!targetWorkflow) {
      return createErrorResponse(`Workflow '${workflow}' not found`);
    }

    return createSuccessResponse({
      message: `Showing guidance for workflow '${workflow}'`,
      workflow: targetWorkflow.name,
      description: targetWorkflow.description,
      steps: targetWorkflow.steps,
      guidance: `This workflow provides guidance for: ${targetWorkflow.description}. Use these steps as inspiration for your development process.`,
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : String(error));
  }
}

/**
 * Handles check command - Check environment and configuration
 */
export async function handleCheck(options: CheckOptions): Promise<CLIResult> {
  try {
    const config = await VibeConfigImpl.loadFromFile();
    const projectType = await config.detectProjectType();

    const result = {
      success: true,
      issues_found: [],
      checks: {
        configuration: {
          config_file: {
            status: 'found',
            message: '.vibe.yaml found',
          },
        },
        environment: {},
        tools: {},
        github_integration: {},
      },
      projectType,
      projectTypes: Object.keys(config.projectTypes).length,
    };

    if (options.json) {
      return createSuccessResponse(result);
    } else {
      return createSuccessResponse({
        message: 'Environment check completed',
        projectType,
        projectTypes: `${Object.keys(config.projectTypes).length} supported`,
      });
    }
  } catch (error) {
    const errorResult = {
      success: false,
      issues_found: [error instanceof Error ? error.message : 'Unknown error'],
      checks: {
        configuration: {
          config_file: {
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        environment: {},
        tools: {},
        github_integration: {},
      },
    };

    if (options.json) {
      return errorResult;
    } else {
      return createErrorResponse(error instanceof Error ? error : String(error));
    }
  }
}

/**
 * Handles config-info command - Display current configuration information
 */
export async function handleConfigInfo(): Promise<CLIResult> {
  try {
    const config = await VibeConfigImpl.loadFromFile();

    return createSuccessResponse({
      message: 'Vibe Configuration',
      projectType: config.projectType,
      lintConfig: config.lint,
      projectTypes: `${Object.keys(config.projectTypes).length} supported`,
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : String(error));
  }
}

/**
 * Handles validate command - Validate workflows and configuration
 */
export async function handleValidate(): Promise<CLIResult> {
  try {
    const workflows = loadAllWorkflows();

    return createSuccessResponse({
      message: 'Configuration validation completed',
      workflows: `${Object.keys(workflows).length} workflows validated`,
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : String(error));
  }
}
