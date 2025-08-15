/**
 * Lint command handlers
 */
import { ProjectLinter, createLintConfig } from '../lint.js';
import { type CLIResult, createErrorResponse, createSuccessResponse } from './utils.js';

/**
 * Handles lint run command
 */
export async function handleLintRun(options: {
  format?: string;
  fix?: boolean;
}): Promise<CLIResult> {
  try {
    const isJsonOutput = options.format === 'json';

    // Create and run the project linter
    const linter = new ProjectLinter(createLintConfig());
    const result = await linter.lintProject('.');

    if (isJsonOutput) {
      return createSuccessResponse({
        lint_result: result,
        status: 'completed',
      });
    } else {
      return createSuccessResponse({
        message: 'Lint check completed',
        filesChecked: result.files_with_issues.length,
        totalIssues: result.total_issues,
        result: result.total_issues > 0 ? 'Issues found' : 'No issues found',
      });
    }
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : String(error));
  }
}
