/**
 * Generic command handlers (guide, config, etc.)
 */
import * as fs from 'node:fs';
import type { VibeConfig } from '../models.js';
import { type CLIResult, createErrorResponse, createSuccessResponse } from './utils.js';

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
        message: 'Vibe Workflow Guidance',
        description: 'Search workflows for development guidance',
        usage: 'uv run vibe guide "testing" or "documentation"',
        suggestion:
          'Use the plan system to organize your tasks after finding relevant workflows',
      });
    }

    // Dynamically import to avoid circular dependencies
    const configModule = await import('../config.js');
    const workflowRegistryModule = await import('../workflow-registry.js');

    const config = new configModule.VibeConfigImpl();
    const workflowRegistry = new workflowRegistryModule.WorkflowRegistry(config);

    // Search for workflows matching the query
    const searchResult = workflowRegistry.searchWorkflows(query);

    if (
      !searchResult.success ||
      !searchResult.workflows ||
      searchResult.workflows.length === 0
    ) {
      return createSuccessResponse({
        message: 'No workflows found',
        suggestion:
          'Try broader terms like "testing", "documentation", "development", or "quality"',
        query: query,
        available_categories: workflowRegistry.getCategories(),
      });
    }

    return createSuccessResponse({
      message: `Found ${searchResult.workflows.length} workflows for "${query}"`,
      query: query,
      workflows: searchResult.workflows.map(w => ({
        name: w.name,
        description: w.description,
        category: w.category,
        triggers: w.triggers.slice(0, 3), // Show first 3 triggers
      })),
      next_action:
        'Use "vibe run <workflow-name>" to see full guidance, or add tasks to your plan',
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
export default {
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
