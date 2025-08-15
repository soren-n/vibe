# Plan Models API Reference

This document describes the core data structures for the plan-based todo list system that replaced sessions.

## PlanItem

Represents a single task or todo item in the plan hierarchy.

```typescript
interface PlanItem {
  id: string; // Unique identifier (UUID)
  text: string; // Task description
  status: 'pending' | 'complete'; // Current status
  children: PlanItem[]; // Nested sub-tasks
  createdAt: string; // Creation timestamp (ISO string)
  completedAt?: string; // Completion timestamp (ISO string)
}
```

**Properties:**

- `id: string` - Unique UUID identifier for the item
- `text: string` - Human-readable description of the task
- `status: 'pending' | 'complete'` - Current completion status
- `children: PlanItem[]` - Array of nested sub-tasks (recursive structure)
- `createdAt: string` - ISO timestamp when the item was created
- `completedAt?: string` - Optional ISO timestamp when completed

**Usage:**

```typescript
const item: PlanItem = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  text: 'Implement user authentication',
  status: 'pending',
  children: [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      text: 'Design login form',
      status: 'complete',
      children: [],
      createdAt: '2025-08-15T10:30:00.000Z',
      completedAt: '2025-08-15T11:45:00.000Z',
    },
  ],
  createdAt: '2025-08-15T10:00:00.000Z',
};
```

## Plan

Container for the complete plan with all items and metadata.

```typescript
interface Plan {
  items: PlanItem[]; // Root-level plan items
  lastModified: string; // Last modification timestamp (ISO string)
  createdAt: string; // Plan creation timestamp (ISO string)
}
```

**Properties:**

- `items: PlanItem[]` - Array of root-level plan items (nested structure)
- `lastModified: string` - ISO timestamp of last plan modification
- `createdAt: string` - ISO timestamp when plan was created

**Usage:**

```typescript
const plan: Plan = {
  items: [
    {
      id: "abc123",
      text: "Setup project infrastructure",
      status: "pending",
      children: [...],
      createdAt: "2025-08-15T09:00:00.000Z"
    }
  ],
  lastModified: "2025-08-15T12:00:00.000Z",
  createdAt: "2025-08-15T09:00:00.000Z"
};
```

## PlanManager

Core class for managing plan operations and persistence.

```typescript
class PlanManager {
  private planFile: string;
  private currentPlan: PlanImpl;

  constructor(planFile?: string);

  // Core CRUD operations
  async addItem(text: string, parentId?: string): Promise<PlanItem>;
  async completeItem(itemId: string): Promise<boolean>;
  async expandItem(itemId: string, subTasks: string[]): Promise<PlanItem[]>;
  async clearPlan(): Promise<void>;

  // Query operations
  getCurrentPlan(): Plan;
  getStats(): PlanStats;

  // Persistence
  async loadPlan(): Promise<Plan>;
  async savePlan(): Promise<void>;
}
```

**Key Methods:**

- `addItem(text, parentId?)` - Add new task, optionally as subtask of parentId
- `completeItem(itemId)` - Mark task as complete by ID
- `expandItem(itemId, subTasks)` - Add multiple subtasks to an existing item
- `clearPlan()` - Remove all items from the plan
- `getStats()` - Get completion statistics
- `loadPlan()` - Load plan from `~/.vibe/current-plan.json`
- `savePlan()` - Persist plan to disk

## PlanStats

Statistics and status information about the current plan.

```typescript
interface PlanStats {
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  completionRate: number; // 0.0 to 1.0
}
```

**Properties:**

- `totalItems: number` - Total number of items across all levels
- `completedItems: number` - Number of completed items (all levels)
- `pendingItems: number` - Number of pending items (all levels)
- `completionRate: number` - Completion percentage as decimal (0.0-1.0)

## PlanItemImpl Class

Implementation class providing business logic for plan items.

```typescript
class PlanItemImpl implements PlanItem {
  // Methods for manipulating plan items
  complete(): void;
  uncomplete(): void;
  addChild(text: string, id?: string): PlanItem;
  removeChild(childId: string): boolean;
  findChild(childId: string): PlanItem | null;
  getAllDescendants(): PlanItem[];
}
```

**Key Methods:**

- `complete()` - Mark this item as complete
- `addChild(text)` - Add a sub-task to this item
- `findChild(childId)` - Recursively search for child by ID
- `getAllDescendants()` - Get flattened list of all nested items

## Storage Format

Plans are persisted as JSON to `~/.vibe/current-plan.json`:

```json
{
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "text": "Main project task",
      "status": "pending",
      "children": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "text": "Subtask 1",
          "status": "complete",
          "children": [],
          "createdAt": "2025-08-15T10:30:00.000Z",
          "completedAt": "2025-08-15T11:45:00.000Z"
        }
      ],
      "createdAt": "2025-08-15T10:00:00.000Z"
    }
  ],
  "lastModified": "2025-08-15T12:00:00.000Z",
  "createdAt": "2025-08-15T09:00:00.000Z"
}
```

## Migration from Session Models

The plan system replaces the previous session-based workflow execution:

| Old Session Concept | New Plan Concept | Key Differences                          |
| ------------------- | ---------------- | ---------------------------------------- |
| `WorkflowSession`   | `Plan`           | Persistent vs ephemeral                  |
| `SessionStep`       | `PlanItem`       | Arbitrary nesting vs linear steps        |
| `SessionManager`    | `PlanManager`    | Simple file persistence vs complex state |
| Session advancement | Item completion  | Task-based vs step-based progression     |
| Workflow execution  | Plan management  | Planning vs automation                   |

**Benefits of the Plan System:**

- **Persistence**: Plans survive across application restarts
- **Flexibility**: Arbitrary nesting depth for complex task breakdowns
- **Simplicity**: No session lifecycle management needed
- **Agent-Friendly**: Perfect for AI agents needing long-term memory
- **Self-Contained**: Each plan item is independent and self-describing

The plan system enables AI agents to maintain context and progress across multiple interactions, treating Vibe as their persistent planning and memory system.
