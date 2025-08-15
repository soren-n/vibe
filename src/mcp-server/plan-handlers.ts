/**
 * MCP handlers for plan operations
 */

import { type PlanItem, PlanManager } from '../plan.js';

export class PlanHandlers {
  private planManager: PlanManager;

  constructor() {
    this.planManager = new PlanManager();
  }

  /**
   * Get current plan status
   */
  async getPlanStatus(  ): Promise<{
    success: boolean;
    plan?: {
      items: PlanItem[];
      stats: {
        totalItems: number;
        completedItems: number;
        pendingItems: number;
        completionRate: number;
      };
      lastModified: string;
      createdAt: string;
    };
    error?: string;
  }> {
    try {
      await this.planManager.loadPlan();
      const plan = this.planManager.getCurrentPlan();
      const stats = this.planManager.getStats();

      return {
        success: true,
        plan: {
          items: plan.items as PlanItem[],
          stats: {
            totalItems: stats.totalItems,
            completedItems: stats.completedItems,
            pendingItems: stats.pendingItems,
            completionRate: stats.completionRate,
          },
          lastModified: plan.lastModified,
          createdAt: plan.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Add an item to the plan
   */
  async addPlanItem(
    text: string,
    parentId?: string
  ): Promise<{
    success: boolean;
    item?: {
      id: string;
      text: string;
      status: string;
      createdAt: string;
    };
    message?: string;
    error?: string;
  }> {
    const item: { text: string; parentId?: string } = { text };
    if (parentId) {
      item.parentId = parentId;
    }
    const result = await this.addPlanItems([item]);
    if (!result.success) {
      return {
        success: false,
        error: result.error ?? 'Unknown error',
      };
    }
    
    const addedItem = result.items?.[0];
    if (!addedItem) {
      return {
        success: false,
        error: 'Failed to retrieve added item',
      };
    }
    return {
      success: true,
      item: addedItem,
      message: parentId
        ? `Added sub-item to parent ${parentId}`
        : 'Added root-level item',
    };
  }

  /**
   * Add multiple items to the plan in a single batch operation
   * 
   * This handler provides efficient batch processing for plan items,
   * significantly improving performance when adding multiple tasks.
   * 
   * @param items Array of items to add with text and optional parentId
   * @returns Success/error response with created items details
   */
  async addPlanItems(
    items: Array<{ text: string; parentId?: string }>
  ): Promise<{
    success: boolean;
    items?: Array<{
      id: string;
      text: string;
      status: string;
      createdAt: string;
    }>;
    message?: string;
    error?: string;
  }> {
    try {
      await this.planManager.loadPlan();
      const addedItems = await this.planManager.addItems(items);

      return {
        success: true,
        items: addedItems.map(item => ({
          id: item.id,
          text: item.text,
          status: item.status,
          createdAt: item.createdAt,
        })),
        message: `Added ${addedItems.length} item${addedItems.length === 1 ? '' : 's'} to plan`,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Complete a plan item
   */
  async completePlanItem(itemId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      await this.planManager.loadPlan();
      const success = await this.planManager.completeItem(itemId);

      if (!success) {
        return {
          success: false,
          error: `Plan item with ID ${itemId} not found`,
        };
      }

      return {
        success: true,
        message: `Item ${itemId} marked as complete`,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Expand a plan item with sub-tasks
   */
  async expandPlanItem(
    itemId: string,
    subTasks: string[]
  ): Promise<{
    success: boolean;
    addedItems?: Array<{
      id: string;
      text: string;
      status: string;
      createdAt: string;
    }>;
    message?: string;
    error?: string;
  }> {
    try {
      await this.planManager.loadPlan();
      const addedItems = await this.planManager.expandItem(itemId, subTasks);

      return {
        success: true,
        addedItems: addedItems.map(item => ({
          id: item.id,
          text: item.text,
          status: item.status,
          createdAt: item.createdAt,
        })),
        message: `Added ${addedItems.length} sub-tasks to item ${itemId}`,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Clear the entire plan
   */
  async clearPlan(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      await this.planManager.loadPlan();
      await this.planManager.clearPlan();

      return {
        success: true,
        message: 'Plan cleared successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }
}
