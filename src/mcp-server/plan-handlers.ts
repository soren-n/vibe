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
    try {
      await this.planManager.loadPlan();
      const item = await this.planManager.addItem(text, parentId);

      return {
        success: true,
        item: {
          id: item.id,
          text: item.text,
          status: item.status,
          createdAt: item.createdAt,
        },
        message: parentId
          ? `Added sub-item to parent ${parentId}`
          : 'Added root-level item',
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
