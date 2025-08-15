/**
 * Plan management system for Vibe
 * Replaces session-based workflow execution with persistent nested todo lists
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Individual item in a plan with support for nested sub-tasks
 */
export interface PlanItem {
  /** Unique identifier for the plan item */
  id: string;
  /** Text description of the task */
  text: string;
  /** Current status of the item */
  status: 'pending' | 'complete';
  /** Nested sub-tasks */
  children: PlanItem[];
  /** When this item was created */
  createdAt: string;
  /** When this item was completed (if applicable) */
  completedAt?: string;
}

/**
 * Root plan structure containing all plan items
 */
export interface Plan {
  /** Root-level plan items */
  items: PlanItem[];
  /** When the plan was last modified */
  lastModified: string;
  /** When the plan was created */
  createdAt: string;
}

/**
 * Implementation of PlanItem interface
 */
export class PlanItemImpl implements PlanItem {
  public id: string;
  public text: string;
  public status: 'pending' | 'complete';
  public children: PlanItem[];
  public createdAt: string;
  public completedAt?: string;

  constructor(text: string, id?: string) {
    this.id = id ?? randomUUID();
    this.text = text;
    this.status = 'pending';
    this.children = [];
    this.createdAt = new Date().toISOString();
  }

  /**
   * Mark this item as complete
   */
  complete(): void {
    this.status = 'complete';
    this.completedAt = new Date().toISOString();
  }

  /**
   * Mark this item as pending
   */
  uncomplete(): void {
    this.status = 'pending';
    delete this.completedAt;
  }

  /**
   * Add a child item to this plan item
   */
  addChild(text: string, id?: string): PlanItem {
    const child = new PlanItemImpl(text, id);
    this.children.push(child);
    return child;
  }

  /**
   * Remove a child item by ID
   */
  removeChild(childId: string): boolean {
    const index = this.children.findIndex(child => child.id === childId);
    if (index !== -1) {
      this.children.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Find a child item by ID (recursive)
   */
  findChild(childId: string): PlanItem | null {
    // Check direct children
    for (const child of this.children) {
      if (child.id === childId) {
        return child;
      }
      // Check nested children
      const nested = (child as PlanItemImpl).findChild(childId);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  /**
   * Get all descendant items (flattened)
   */
  getAllDescendants(): PlanItem[] {
    const descendants: PlanItem[] = [];
    for (const child of this.children) {
      descendants.push(child);
      descendants.push(...(child as PlanItemImpl).getAllDescendants());
    }
    return descendants;
  }
}

/**
 * Implementation of Plan interface
 */
export class PlanImpl implements Plan {
  public items: PlanItem[];
  public lastModified: string;
  public createdAt: string;

  constructor() {
    this.items = [];
    this.createdAt = new Date().toISOString();
    this.lastModified = this.createdAt;
  }

  /**
   * Add a root-level item to the plan
   */
  addItem(text: string, id?: string): PlanItem {
    const item = new PlanItemImpl(text, id);
    this.items.push(item);
    this.updateLastModified();
    return item;
  }

  /**
   * Remove an item by ID (searches all levels)
   */
  removeItem(itemId: string): boolean {
    // Check root items first
    const index = this.items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.items.splice(index, 1);
      this.updateLastModified();
      return true;
    }

    // Check nested items
    for (const item of this.items) {
      if ((item as PlanItemImpl).removeChild(itemId)) {
        this.updateLastModified();
        return true;
      }
    }

    return false;
  }

  /**
   * Find an item by ID (searches all levels)
   */
  findItem(itemId: string): PlanItem | null {
    // Check root items
    for (const item of this.items) {
      if (item.id === itemId) {
        return item;
      }
      // Check nested items
      const nested = (item as PlanItemImpl).findChild(itemId);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  /**
   * Get all items in the plan (flattened)
   */
  getAllItems(): PlanItem[] {
    const allItems: PlanItem[] = [];
    for (const item of this.items) {
      allItems.push(item);
      allItems.push(...(item as PlanItemImpl).getAllDescendants());
    }
    return allItems;
  }

  /**
   * Clear all items from the plan
   */
  clear(): void {
    this.items = [];
    this.updateLastModified();
  }

  /**
   * Get plan statistics
   */
  getStats(): {
    totalItems: number;
    completedItems: number;
    pendingItems: number;
    completionRate: number;
  } {
    const allItems = this.getAllItems();
    const completed = allItems.filter(item => item.status === 'complete').length;
    const total = allItems.length;

    return {
      totalItems: total,
      completedItems: completed,
      pendingItems: total - completed,
      completionRate: total > 0 ? completed / total : 0,
    };
  }

  private updateLastModified(): void {
    this.lastModified = new Date().toISOString();
  }

  /**
   * Update last modified timestamp (public method for PlanManager)
   */
  touch(): void {
    this.updateLastModified();
  }
}

/**
 * Manages persistence and operations for the current plan
 */
export class PlanManager {
  private planFile: string;
  private currentPlan: PlanImpl;

  constructor(planFile?: string) {
    this.planFile =
      planFile ?? path.join(process.env['HOME'] ?? '', '.vibe', 'current-plan.json');
    this.currentPlan = new PlanImpl();
  }

  /**
   * Load the current plan from disk
   */
  async loadPlan(): Promise<Plan> {
    try {
      const data = await fs.readFile(this.planFile, 'utf-8');
      const planData = JSON.parse(data);

      // Convert plain objects back to class instances
      this.currentPlan = new PlanImpl();
      this.currentPlan.createdAt = planData.createdAt;
      this.currentPlan.lastModified = planData.lastModified;
      this.currentPlan.items = this.convertItemsToImpl(planData.items);

      return this.currentPlan;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, start with empty plan
        return this.currentPlan;
      }
      throw new Error(`Failed to load plan: ${String(error)}`);
    }
  }

  /**
   * Save the current plan to disk
   */
  async savePlan(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.planFile);
      await fs.mkdir(dir, { recursive: true });

      // Save plan
      const data = JSON.stringify(this.currentPlan, null, 2);
      await fs.writeFile(this.planFile, data, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save plan: ${String(error)}`);
    }
  }

  /**
   * Get the current plan
   */
  getCurrentPlan(): Plan {
    return this.currentPlan;
  }

  /**
   * Add an item to the plan
   */
  async addItem(text: string, parentId?: string): Promise<PlanItem> {
    if (parentId) {
      const parent = this.currentPlan.findItem(parentId);
      if (!parent) {
        throw new Error(`Parent item with ID ${parentId} not found`);
      }
      const item = (parent as PlanItemImpl).addChild(text);
      this.currentPlan.touch();
      await this.savePlan();
      return item;
    } else {
      const item = this.currentPlan.addItem(text);
      await this.savePlan();
      return item;
    }
  }

  /**
   * Complete an item
   */
  async completeItem(itemId: string): Promise<boolean> {
    const item = this.currentPlan.findItem(itemId);
    if (!item) {
      return false;
    }

    (item as PlanItemImpl).complete();
    this.currentPlan.touch();
    await this.savePlan();
    return true;
  }

  /**
   * Expand an item by adding multiple sub-tasks
   */
  async expandItem(itemId: string, subTasks: string[]): Promise<PlanItem[]> {
    const item = this.currentPlan.findItem(itemId);
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }

    const addedItems: PlanItem[] = [];
    for (const taskText of subTasks) {
      const subItem = (item as PlanItemImpl).addChild(taskText);
      addedItems.push(subItem);
    }

    this.currentPlan.touch();
    await this.savePlan();
    return addedItems;
  }

  /**
   * Clear the entire plan
   */
  async clearPlan(): Promise<void> {
    this.currentPlan.clear();
    await this.savePlan();
  }

  /**
   * Get plan statistics
   */
  getStats(): {
    totalItems: number;
    completedItems: number;
    pendingItems: number;
    completionRate: number;
  } {
    return this.currentPlan.getStats();
  }

  private convertItemsToImpl(items: PlanItem[]): PlanItemImpl[] {
    return items.map(item => {
      const impl = new PlanItemImpl(item.text, item.id);
      impl.status = item.status;
      impl.createdAt = item.createdAt;
      if (item.completedAt) {
        impl.completedAt = item.completedAt;
      }
      impl.children = this.convertItemsToImpl(item.children ?? []);
      return impl;
    });
  }
}
