# Vibe MCP Architecture Documentation

This document provides an in-depth overview of Vibe's architecture, design decisions, and implementation patterns.

## Table of Contents

- [Overview](#overview)
- [Architectural Principles](#architectural-principles)
- [System Components](#system-components)
- [Data Flow](#data-flow)
- [Design Patterns](#design-patterns)
- [Technology Choices](#technology-choices)
- [Performance Considerations](#performance-considerations)
- [Security Model](#security-model)

## Overview

Vibe is built around a **plan-centric architecture** where persistent nested todo lists serve as the primary data structure and interaction model. The system is designed to be:

- **Simple yet powerful** - Complex problems broken into manageable tasks
- **Persistent by default** - Plans survive across sessions and context switches
- **Guidance-oriented** - Workflows provide inspiration, not execution
- **Agent-friendly** - Optimized for AI agent interaction patterns

## Architectural Principles

### 1. Plan-Centric Design

Everything in Vibe revolves around the concept of a "plan" - a persistent, nested structure of tasks.

```
Plan
├── Task 1 (pending)
├── Task 2 (complete)
│   ├── Subtask 2.1 (complete)
│   └── Subtask 2.2 (pending)
└── Task 3 (pending)
    ├── Subtask 3.1 (pending)
    ├── Subtask 3.2 (pending)
    └── Subtask 3.3 (pending)
```

**Benefits:**

- Natural hierarchical breakdown of complex problems
- Clear progress tracking and completion metrics
- Flexible structure that adapts to any workflow
- Persistent context that survives session boundaries

### 2. Separation of Concerns

The architecture cleanly separates different responsibilities:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Server    │    │  Plan System    │    │ Workflow System │
│   (Protocol)    │◄──►│   (State)       │    │   (Guidance)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Tool Handlers  │    │ File Persistence│    │  YAML Loader    │
│  (Operations)   │    │  (Storage)      │    │  (Static Data)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 3. Stateless Operations, Stateful Data

- **Operations are stateless** - Each MCP tool call is independent
- **Data is stateful** - Plans persist and maintain context
- **Handlers are pure** - Given same input, produce same output
- **Side effects isolated** - File I/O and state changes clearly separated

## System Components

### Core Layer

#### PlanManager (`src/plan.ts`)

The heart of Vibe's persistence system.

```typescript
class PlanManager {
  private currentPlan: PlanImpl;
  private planFile: string;

  // Core operations
  async loadPlan(): Promise<PlanImpl>;
  async savePlan(): Promise<void>;
  async addItem(text: string, parentId?: string): Promise<PlanItem>;
  async completeItem(itemId: string): Promise<boolean>;
  async expandItem(itemId: string, subTasks: string[]): Promise<PlanItem[]>;
}
```

**Key Design Decisions:**

- Single active plan per user (simplicity)
- Automatic persistence on every change (reliability)
- UUID-based item identification (global uniqueness)
- Immutable timestamps (audit trail)

#### WorkflowRegistry (`src/workflow-registry.ts`)

Simple, focused workflow search and reference system.

```typescript
class WorkflowRegistry {
  private workflows: Record<string, Workflow>;

  getAllWorkflows(): Record<string, Workflow>;
  getWorkflow(name: string): Workflow | null;
  searchWorkflows(pattern?: string, category?: string): SearchResult;
  getCategories(): string[];
}
```

**Key Design Decisions:**

- Read-only workflow access (immutable guidance)
- In-memory caching for performance
- Simple string-based search (adequate for 58 workflows)
- Category-based organization

### Protocol Layer

#### MCP Server (`src/mcp-server.ts`)

Implements the Model Context Protocol for AI agent communication.

```typescript
class VibeMCPServer {
  private server: Server;
  private workflowRegistry: WorkflowRegistry;
  private planHandlers: PlanHandlers;
  private workflowHandlers: WorkflowHandlers;

  async run(): Promise<void>;
}
```

**Key Design Decisions:**

- Stdio transport (standard MCP approach)
- JSON-RPC protocol compliance
- Modular handler architecture
- Comprehensive error handling

### Handler Layer

Specialized handlers for different tool categories:

```
src/mcp-server/
├── plan-handlers.ts         # Plan CRUD operations
├── workflow-handlers.ts     # Workflow search operations
├── environment-handlers.ts  # Environment validation
├── lint-handlers.ts         # Code quality operations
└── query-handlers.ts        # Generic queries
```

Each handler follows consistent patterns:

- Async/await for all operations
- Structured success/error responses
- Input validation and sanitization
- Proper error propagation

## Data Flow

### Plan Operations Flow

```
Agent Request
     │
     ▼
MCP Server (JSON-RPC)
     │
     ▼
Plan Handler (validation)
     │
     ▼
Plan Manager (business logic)
     │
     ▼
Plan Implementation (data structure)
     │
     ▼
File System (persistence)
     │
     ▼
Response to Agent
```

### Workflow Query Flow

```
Agent Request
     │
     ▼
MCP Server (JSON-RPC)
     │
     ▼
Workflow Handler (validation)
     │
     ▼
Workflow Registry (search logic)
     │
     ▼
YAML Files (static data)
     │
     ▼
Response to Agent
```

## Design Patterns

### 1. Command Pattern

Each MCP tool represents a command with:

- Clear input parameters
- Deterministic output
- Error handling
- State isolation

```typescript
interface ToolCommand<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
  validate(input: TInput): boolean;
}
```

### 2. Repository Pattern

Plan persistence follows repository pattern:

```typescript
interface PlanRepository {
  load(): Promise<Plan>;
  save(plan: Plan): Promise<void>;
  exists(): Promise<boolean>;
}
```

### 3. Factory Pattern

Plan items created through factory methods:

```typescript
class PlanItemFactory {
  static create(text: string, id?: string): PlanItem;
  static fromJSON(data: any): PlanItem;
}
```

### 4. Observer Pattern (Future)

Plan changes could notify observers:

```typescript
interface PlanObserver {
  onItemAdded(item: PlanItem): void;
  onItemCompleted(item: PlanItem): void;
  onPlanCleared(): void;
}
```

## Technology Choices

### TypeScript

**Why chosen:**

- Strong type safety reduces bugs
- Excellent IDE support and refactoring
- Self-documenting interfaces
- Gradual adoption path from JavaScript

**Trade-offs:**

- Build step required
- Learning curve for pure JS developers
- Compilation overhead

### Pure ES Modules

**Why chosen:**

- Modern JavaScript standard
- Better tree shaking and bundling
- Static analysis capabilities
- Future-proof approach

**Trade-offs:**

- Node.js version requirements
- Some legacy compatibility issues
- Different syntax from CommonJS

### File-Based Persistence

**Why chosen:**

- Simple and transparent
- Works offline
- Easy backup and version control
- No external dependencies

**Trade-offs:**

- Single-user limitation
- No concurrent access protection
- Manual conflict resolution needed

### YAML for Workflows

**Why chosen:**

- Human-readable and editable
- Great for structured configuration
- Supports comments and documentation
- Version control friendly

**Trade-offs:**

- Parsing overhead
- Schema validation complexity
- Potential YAML injection risks

## Performance Considerations

### Memory Management

```typescript
// Workflows cached in memory (58 workflows = ~50KB)
private workflows: Record<string, Workflow> // Cached on startup

// Plans loaded on-demand and kept in memory
private currentPlan: PlanImpl // Single plan per session
```

### I/O Optimization

```typescript
// Debounced saves to avoid excessive file writes
private savePlan = debounce(this._savePlan.bind(this), 100)

// Lazy loading of workflow data
private loadWorkflows(): Record<string, Workflow> {
  if (!this.workflowsCache) {
    this.workflowsCache = loadAllWorkflows()
  }
  return this.workflowsCache
}
```

### Search Performance

```typescript
// Simple string matching (adequate for 58 workflows)
const matches = workflows.filter(workflow => {
  return (
    workflow.name.toLowerCase().includes(pattern.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(pattern.toLowerCase())
  );
});
```

**Scalability considerations:**

- Current implementation supports up to ~200 workflows efficiently
- For larger datasets, would need indexing (Lunr.js, Fuse.js)
- Plan items scale to thousands without performance issues

## Security Model

### Filesystem Access

```typescript
// Plans stored in user home directory
const planPath = path.join(os.homedir(), '.vibe', 'current-plan.json');

// Workflows read from application directory (read-only)
const workflowPath = path.join(__dirname, '../data/workflows');
```

**Security measures:**

- Plans isolated to user home directory
- No network access required
- Workflows are read-only application data
- Input sanitization on all user data

### Input Validation

```typescript
// All inputs validated before processing
function validateTaskText(text: string): void {
  if (!text || text.trim().length === 0) {
    throw new Error('Task text cannot be empty');
  }
  if (text.length > 1000) {
    throw new Error('Task text too long');
  }
}
```

### Error Handling

```typescript
// Errors never expose internal details
catch (error) {
  return {
    success: false,
    error: 'Failed to save plan' // Generic message
  }
}
```

## Future Architecture Considerations

### Multi-User Support

```typescript
// Plan isolation by user ID
class PlanManager {
  constructor(private userId: string) {
    this.planFile = path.join(os.homedir(), '.vibe', `plan-${userId}.json`);
  }
}
```

### Plan Templates

```typescript
interface PlanTemplate {
  name: string;
  description: string;
  tasks: TaskTemplate[];
}

class TemplateManager {
  async createPlanFromTemplate(templateId: string): Promise<Plan>;
}
```

### Workflow Execution

```typescript
// If execution were added (architectural change)
interface ExecutableWorkflow extends Workflow {
  execute(context: ExecutionContext): Promise<ExecutionResult>;
}
```

### Real-time Collaboration

```typescript
// WebSocket-based plan synchronization
interface PlanSyncManager {
  broadcastChange(change: PlanChange): void;
  onRemoteChange(handler: (change: PlanChange) => void): void;
}
```

## Conclusion

Vibe's architecture prioritizes simplicity, reliability, and agent-friendliness over complex features. The plan-centric approach provides a natural model for AI agents to organize and track work, while the clean separation of concerns enables easy testing and maintenance.

The current architecture supports the intended use cases well and provides clear extension points for future enhancements while maintaining backward compatibility.

Key architectural strengths:

- **Clear mental model** - Plans are intuitive for both agents and humans
- **Reliable persistence** - Plans never get lost
- **Extensible design** - New tool types can be easily added
- **High test coverage** - Architecture supports comprehensive testing
- **Performance appropriate** - Fast enough for intended scale

This foundation provides a solid base for growing Vibe into a more comprehensive planning and workflow tool while maintaining its core simplicity and reliability.
