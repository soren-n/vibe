/**
 * Checklist command handlers
 */
import { getChecklistsArray } from '../guidance/loader';
import type { Checklist } from '../guidance/models';
import {
  type CLIResult,
  createErrorResponse,
  createSuccessResponse,
  withSuppressedOutput,
} from './utils';

/**
 * Handles checklist list command
 */
export async function handleChecklistList(options: {
  projectType?: string;
  format?: string;
}): Promise<CLIResult> {
  const isJsonOutput = options.format === 'json';
  const checklists = withSuppressedOutput(() => getChecklistsArray(isJsonOutput));

  let filtered = checklists;

  if (options.projectType) {
    filtered = checklists.filter((checklist: Checklist) => {
      return (
        !checklist.projectTypes ||
        checklist.projectTypes.includes(options.projectType as string) ||
        checklist.projectTypes.includes('generic')
      );
    });
  }

  if (isJsonOutput) {
    const transformedChecklists = filtered.map((checklist: Checklist) => ({
      name: checklist.name,
      description: checklist.description ?? 'No description available',
      triggers: checklist.triggers,
      project_types: checklist.projectTypes ?? [],
      item_count: checklist.items.length,
    }));

    return createSuccessResponse({ checklists: transformedChecklists });
  } else {
    const message = `Found ${filtered.length} checklists:`;
    const list = filtered
      .map(
        (checklist: Checklist) => `  ${checklist.name}: ${checklist.items.length} items`
      )
      .join('\n');

    return createSuccessResponse({
      message,
      list,
      count: filtered.length,
    });
  }
}

/**
 * Handles checklist show command
 */
export async function handleChecklistShow(
  name: string,
  options: { format?: string }
): Promise<CLIResult> {
  const isJsonOutput = options.format === 'json';
  const checklists = withSuppressedOutput(() => getChecklistsArray(isJsonOutput));
  const checklist = checklists.find((c: Checklist) => c.name === name);

  if (!checklist) {
    return createErrorResponse(`Checklist '${name}' not found`);
  }

  if (isJsonOutput) {
    return createSuccessResponse({ checklist });
  } else {
    const details = {
      name: checklist.name,
      itemCount: checklist.items.length,
      items: checklist.items
        .map((item: string, index: number) => `  ${index + 1}. ${item}`)
        .join('\n'),
    };

    return createSuccessResponse(details);
  }
}

/**
 * Handles checklist run command
 */
export async function handleChecklistRun(
  name: string,
  options: { format?: string }
): Promise<CLIResult> {
  const isJsonOutput = options.format === 'json';
  const checklists = withSuppressedOutput(() => getChecklistsArray(isJsonOutput));
  const checklist = checklists.find((c: Checklist) => c.name === name);

  if (!checklist) {
    return createErrorResponse(`Checklist '${name}' not found`);
  }

  if (isJsonOutput) {
    return createSuccessResponse({
      result: {
        name: checklist.name,
        status: 'completed',
        items: checklist.items.map((item: string) => ({
          item,
          status: 'completed',
        })),
      },
    });
  } else {
    return createSuccessResponse({
      message: `Running checklist: ${checklist.name}`,
      items: checklist.items
        .map((item: string, index: number) => `  ${index + 1}. ${item}`)
        .join('\n'),
      status: 'Checklist completed',
    });
  }
}
