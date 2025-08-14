/**
 * Workflow command handlers
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadAllWorkflows } from '../workflows';
import type { Workflow } from '../models';
import {
  type CLIResult,
  createErrorResponse,
  createSuccessResponse,
  withSuppressedOutput,
} from './utils';

/**
 * Simple workflow summary interface
 */
interface WorkflowSummary {
  name: string;
  description?: string;
  project_types?: string[];
  stepCount: number;
}

/**
 * Handles workflow list command
 */
export async function handleWorkflowList(options: {
  projectType?: string;
  format?: string;
}): Promise<CLIResult> {
  try {
    const isJsonOutput = options.format === 'json';
    const workflows = withSuppressedOutput(() => loadAllWorkflows());

    const workflowSummaries: WorkflowSummary[] = Object.values(workflows).map(
      (workflow: Workflow) => ({
        name: workflow.name,
        description: workflow.description,
        project_types: workflow.projectTypes ?? [],
        stepCount: workflow.steps?.length ?? 0,
      })
    );

    let filtered = workflowSummaries;

    if (options.projectType) {
      filtered = workflowSummaries.filter((workflow: WorkflowSummary) => {
        if (!workflow.project_types) {
          return true; // Include workflows with no project type restriction
        }
        return (
          workflow.project_types.includes(options.projectType as string) ||
          workflow.project_types.includes('generic')
        );
      });
    }

    if (isJsonOutput) {
      return createSuccessResponse({ workflows: filtered });
    } else {
      const message = `Found ${filtered.length} workflows:`;
      const list = filtered
        .map(
          (workflow: WorkflowSummary) =>
            `  ${workflow.name}: ${workflow.description ?? 'No description'}`
        )
        .join('\n');

      return createSuccessResponse({
        message,
        list,
        count: filtered.length,
      });
    }
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Handles workflow show command
 */
export async function handleWorkflowShow(
  name: string,
  options: { format?: string }
): Promise<CLIResult> {
  try {
    const isJsonOutput = options.format === 'json';

    const workflows = withSuppressedOutput(() => loadAllWorkflows());
    const workflow = workflows[name];

    if (!workflow) {
      return createErrorResponse(`Workflow '${name}' not found`);
    }

    if (isJsonOutput) {
      return createSuccessResponse({ workflow });
    } else {
      const details = {
        name: workflow.name,
        description: workflow.description ?? 'No description',
        stepCount: workflow.steps?.length ?? 0,
        projectTypes: workflow.projectTypes?.join(', ') ?? 'Any',
        triggers: workflow.triggers?.length ? workflow.triggers.join(', ') : 'None',
      };

      return createSuccessResponse(details);
    }
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Handles workflow validate command
 */
export async function handleWorkflowValidate(options?: {
  format?: string;
  json?: boolean;
}): Promise<CLIResult> {
  try {
    const isJsonOutput = options?.format === 'json' || options?.json === true;
    const workflowsPath = 'data/workflows';

    if (!fs.existsSync(workflowsPath)) {
      return createErrorResponse(`Workflows directory not found: ${workflowsPath}`);
    }

    const errors: string[] = [];
    const validFiles: string[] = [];

    const validateDirectory = (dirPath: string): void => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          validateDirectory(fullPath);
        } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
          try {
            const relativePath = path.relative(process.cwd(), fullPath);

            // Simple validation by trying to load workflows
            withSuppressedOutput(() => {
              loadAllWorkflows();
            });

            validFiles.push(relativePath);
          } catch (error) {
            const relativePath = path.relative(process.cwd(), fullPath);
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`${relativePath}: ${errorMessage}`);
          }
        }
      }
    };

    validateDirectory(workflowsPath);

    if (isJsonOutput) {
      return createSuccessResponse({
        validation: {
          valid_files: validFiles,
          errors: errors.map(error => {
            const [file, ...messageParts] = error.split(': ');
            return {
              file,
              error: messageParts.join(': '),
            };
          }),
          summary: {
            total_files: validFiles.length + errors.length,
            valid_files: validFiles.length,
            invalid_files: errors.length,
          },
        },
      });
    } else {
      const summary = {
        message: `✅ validated ${validFiles.length + errors.length} workflow files`,
        valid: validFiles.length,
        invalid: errors.length,
      };

      if (errors.length > 0) {
        return createErrorResponse(
          `Validation failed with ${errors.length} errors:\n${errors.join('\n')}`
        );
      }

      return createSuccessResponse({
        ...summary,
        status: 'All workflow files are valid',
      });
    }
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : String(error));
  }
}
