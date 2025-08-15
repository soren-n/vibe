/**
 * Plan command handlers for CLI interface
 */

import { type PlanItem, PlanManager } from '../plan.js';
import { type CLIResult, createErrorResponse, createSuccessResponse } from './utils.js';

/**
 * Show current plan status
 */
export async function handlePlanStatus(options: {
  format?: string;
}): Promise<CLIResult> {
  try {
    const planManager = new PlanManager();
    await planManager.loadPlan();
    const plan = planManager.getCurrentPlan();
    const stats = planManager.getStats();

    if (options.format === 'json') {
      return createSuccessResponse({
        plan: {
          items: plan.items,
          stats,
          lastModified: plan.lastModified,
          createdAt: plan.createdAt,
        },
      });
    }

    // Text format
    const formatItem = (item: PlanItem, depth = 0): string => {
      const indent = '  '.repeat(depth);
      const status = item.status === 'complete' ? '[X]' : '[ ]';
      const children =
        item.children
          ?.map((child: PlanItem) => formatItem(child, depth + 1))
          .join('\n') ?? '';
      return `${indent}${status} ${item.text}${children ? '\n' + children : ''}`;
    };

    const planText =
      plan.items.length > 0
        ? plan.items.map((item: PlanItem) => formatItem(item)).join('\n')
        : 'No plan items. Use `vibe plan add <text>` to add items.';

    return createSuccessResponse({
      status: `Plan Status (${stats.completedItems}/${stats.totalItems} complete)`,
      items: planText,
      statistics: `Total: ${stats.totalItems}, Completed: ${stats.completedItems}, Pending: ${stats.pendingItems}`,
      completion: `${Math.round(stats.completionRate * 100)}% complete`,
    });
  } catch (error) {
    return createErrorResponse(`Failed to get plan status: ${String(error)}`);
  }
}

/**
 * Add an item to the plan
 */
export async function handlePlanAdd(
  text: string,
  options: { parent?: string; format?: string }
): Promise<CLIResult> {
  try {
    const planManager = new PlanManager();
    await planManager.loadPlan();

    const item = await planManager.addItem(text, options.parent);

    if (options.format === 'json') {
      return createSuccessResponse({
        item: {
          id: item.id,
          text: item.text,
          status: item.status,
          createdAt: item.createdAt,
        },
        message: options.parent
          ? `Added sub-item to parent ${options.parent}`
          : 'Added root-level item',
      });
    }

    return createSuccessResponse({
      message: options.parent
        ? `Added sub-item: "${text}" to parent ${options.parent}`
        : `Added item: "${text}"`,
      item_id: item.id,
    });
  } catch (error) {
    return createErrorResponse(`Failed to add plan item: ${String(error)}`);
  }
}

/**
 * Complete a plan item
 */
export async function handlePlanComplete(
  itemId: string,
  options: { format?: string }
): Promise<CLIResult> {
  try {
    const planManager = new PlanManager();
    await planManager.loadPlan();

    const success = await planManager.completeItem(itemId);

    if (!success) {
      return createErrorResponse(`Plan item with ID ${itemId} not found`);
    }

    if (options.format === 'json') {
      return createSuccessResponse({
        item_id: itemId,
        status: 'completed',
        message: 'Item marked as complete',
      });
    }

    return createSuccessResponse({
      message: `Marked item ${itemId} as complete`,
    });
  } catch (error) {
    return createErrorResponse(`Failed to complete plan item: ${String(error)}`);
  }
}

/**
 * Expand a plan item with sub-tasks
 */
export async function handlePlanExpand(
  itemId: string,
  subTasks: string[],
  options: { format?: string }
): Promise<CLIResult> {
  try {
    const planManager = new PlanManager();
    await planManager.loadPlan();

    const addedItems = await planManager.expandItem(itemId, subTasks);

    if (options.format === 'json') {
      return createSuccessResponse({
        parent_id: itemId,
        added_items: addedItems.map(item => ({
          id: item.id,
          text: item.text,
          status: item.status,
          createdAt: item.createdAt,
        })),
        message: `Added ${addedItems.length} sub-tasks`,
      });
    }

    return createSuccessResponse({
      message: `Expanded item ${itemId} with ${addedItems.length} sub-tasks`,
      sub_tasks: subTasks.map((task, index) => `  ${index + 1}. ${task}`).join('\n'),
    });
  } catch (error) {
    return createErrorResponse(`Failed to expand plan item: ${String(error)}`);
  }
}

/**
 * Clear the entire plan
 */
export async function handlePlanClear(options: {
  format?: string;
}): Promise<CLIResult> {
  try {
    const planManager = new PlanManager();
    await planManager.loadPlan();

    await planManager.clearPlan();

    if (options.format === 'json') {
      return createSuccessResponse({
        message: 'Plan cleared successfully',
        status: 'empty',
      });
    }

    return createSuccessResponse({
      message: 'Plan cleared successfully. All items removed.',
    });
  } catch (error) {
    return createErrorResponse(`Failed to clear plan: ${String(error)}`);
  }
}
