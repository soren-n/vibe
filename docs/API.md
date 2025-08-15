# Vibe MCP API Reference

This document provides comprehensive API documentation for all MCP tools available in Vibe.

## Overview

Vibe exposes tools via the Model Context Protocol (MCP) that allow AI agents to:

- Manage persistent plans with nested task structures
- Search and reference workflow guidance
- Validate and lint project code
- Manage development environment

All tools follow consistent patterns for success/error responses and parameter validation.

## Plan Management Tools

### get_plan_status()

Retrieves the current plan status including all tasks and completion statistics.

**Parameters:** None

**Returns:**

```json
{
  "success": true,
  "plan": {
    "items": [
      {
        "id": "uuid-string",
        "text": "Task description",
        "status": "pending" | "complete",
        "createdAt": "2024-01-01T10:00:00.000Z",
        "completedAt": "2024-01-01T11:00:00.000Z", // if completed
        "children": [] // nested subtasks
      }
    ],
    "stats": {
      "totalItems": 10,
      "completedItems": 4,
      "pendingItems": 6,
      "completionRate": 0.4
    },
    "lastModified": "2024-01-01T10:30:00.000Z",
    "createdAt": "2024-01-01T09:00:00.000Z"
  }
}
```

**Example Usage:**

```javascript
// Get current plan status
const status = await get_plan_status();
console.log(`Plan has ${status.plan.stats.totalItems} total tasks`);
console.log(`Completion rate: ${status.plan.stats.completionRate * 100}%`);
```

### add_plan_item(text, parent_id?)

Adds a new task to the plan. Can be added as root-level task or as subtask to existing item.

**Parameters:**

- `text` (string, required): Description of the task to add
- `parent_id` (string, optional): ID of parent task for creating subtasks

**Returns:**

```json
{
  "success": true,
  "item": {
    "id": "new-uuid-string",
    "text": "Task description",
    "status": "pending",
    "createdAt": "2024-01-01T10:15:00.000Z"
  },
  "message": "Added root-level item" // or "Added sub-item to parent {parent_id}"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Parent item with ID {parent_id} not found"
}
```

**Example Usage:**

```javascript
// Add root-level task
const rootTask = await add_plan_item('Implement user authentication');

// Add subtask to the root task
const subTask = await add_plan_item('Set up JWT tokens', rootTask.item.id);
```

### add_plan_items(items)

**NEW in v1.7.0** - Add multiple items to the plan in a single batch operation for improved performance.

**Parameters:**

- `items` (array, required): Array of item objects to add to the plan

Each item object has the following structure:

- `text` (string, required): Text description of the task
- `parent_id` (string, optional): Parent item ID for sub-tasks

**Returns:**

```json
{
  "success": true,
  "items": [
    {
      "id": "uuid-1",
      "text": "Task 1",
      "status": "pending",
      "createdAt": "2025-01-15T10:30:00.000Z"
    },
    {
      "id": "uuid-2",
      "text": "Task 2",
      "status": "pending",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "message": "Added 2 items to plan"
}
```

**Performance Benefits:**

- **Single disk write** regardless of item count (vs N writes for N items)
- **Transactional integrity** - all items added or none on failure
- **Mixed hierarchies** - can add root and child items in one call

**Example Usage:**

```javascript
// Add multiple root-level phases
const phases = await add_plan_items([
  { text: 'Phase 1: Setup' },
  { text: 'Phase 2: Implementation' },
  { text: 'Phase 3: Testing' },
]);

// Add multiple subtasks to first phase
const setupTasks = await add_plan_items([
  { text: 'Setup database', parent_id: phases.items[0].id },
  { text: 'Setup API', parent_id: phases.items[0].id },
  { text: 'Setup frontend', parent_id: phases.items[0].id },
]);

// Mixed batch - root item + child items in one call
const mixedItems = await add_plan_items([
  { text: 'New Feature' },
  { text: 'Sub-feature A', parent_id: 'existing-parent-id' },
  { text: 'Sub-feature B', parent_id: 'existing-parent-id' },
]);
```

### complete_plan_item(item_id)

Marks a task as complete with timestamp.

**Parameters:**

- `item_id` (string, required): ID of the task to mark as complete

**Returns:**

```json
{
  "success": true,
  "message": "Item {item_id} marked as complete"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Plan item with ID {item_id} not found"
}
```

**Example Usage:**

```javascript
// Complete a task
const result = await complete_plan_item('task-uuid-123');
if (result.success) {
  console.log('Task completed successfully!');
}
```

### expand_plan_item(item_id, sub_tasks)

Breaks down an existing task into multiple subtasks.

**Parameters:**

- `item_id` (string, required): ID of the task to expand
- `sub_tasks` (string[], required): Array of subtask descriptions

**Returns:**

```json
{
  "success": true,
  "addedItems": [
    {
      "id": "subtask-uuid-1",
      "text": "First subtask",
      "status": "pending",
      "createdAt": "2024-01-01T10:20:00.000Z"
    },
    {
      "id": "subtask-uuid-2",
      "text": "Second subtask",
      "status": "pending",
      "createdAt": "2024-01-01T10:20:01.000Z"
    }
  ],
  "message": "Added 2 sub-tasks to item {item_id}"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Item with ID {item_id} not found"
}
```

**Example Usage:**

```javascript
// Break down a task into subtasks
const result = await expand_plan_item('main-task-uuid', [
  'Design database schema',
  'Implement user model',
  'Add authentication endpoints',
  'Write integration tests',
]);

console.log(`Added ${result.addedItems.length} subtasks`);
```

### clear_plan()

Removes all tasks from the current plan, starting fresh.

**Parameters:** None

**Returns:**

```json
{
  "success": true,
  "message": "Plan cleared successfully"
}
```

**Example Usage:**

```javascript
// Start with a clean slate
await clear_plan();
console.log('All tasks cleared, ready for new plan');
```

## Workflow Guidance Tools

### query_workflows(pattern?, category?)

Searches the workflow library for workflows matching the given criteria.

**Parameters:**

- `pattern` (string, optional): Search text to match against workflow names, descriptions, and triggers
- `category` (string, optional): Workflow category filter

**Returns:**

```json
{
  "success": true,
  "workflows": [
    {
      "name": "implementation",
      "description": "Implementation workflow for new features",
      "category": "development",
      "triggers": ["implement", "feature", "development"],
      "steps": [
        "Define requirements and acceptance criteria",
        "Design component architecture",
        "Implement core functionality",
        "Add comprehensive tests",
        "Update documentation"
      ]
    }
  ]
}
```

**Available Categories:**

- `core` - Fundamental development practices
- `development` - Coding, testing, debugging
- `documentation` - Writing docs, guides, APIs
- `testing` - Unit testing, integration testing
- `automation` - CI/CD, deployment
- `configuration` - Project setup, tooling

**Example Usage:**

```javascript
// Search for testing workflows
const testingWorkflows = await query_workflows('test', 'testing');

// Search for workflows containing "documentation"
const docWorkflows = await query_workflows('documentation');

// Get all workflows in development category
const devWorkflows = await query_workflows(null, 'development');

// Get all workflows
const allWorkflows = await query_workflows();
```

## Environment Management Tools

### check_vibe_environment()

Validates the Vibe configuration and environment setup.

**Parameters:** None

**Returns:**

```json
{
  "success": true,
  "message": "Vibe environment is properly configured",
  "details": {
    "configFile": "found",
    "planStorage": "accessible",
    "workflowLibrary": "loaded",
    "workflowCount": 58
  }
}
```

**Example Usage:**

```javascript
// Verify environment is working
const envStatus = await check_vibe_environment();
if (envStatus.success) {
  console.log('✅ Vibe is ready to use');
} else {
  console.log('❌ Environment issues detected');
}
```

### init_vibe_project(project_type?)

Initializes a project with Vibe configuration.

**Parameters:**

- `project_type` (string, optional): Project type (e.g., "typescript", "python", "javascript")

**Returns:**

```json
{
  "success": true,
  "message": "Vibe project initialized successfully",
  "projectType": "typescript",
  "configCreated": true
}
```

**Example Usage:**

```javascript
// Initialize TypeScript project
await init_vibe_project('typescript');

// Auto-detect project type
await init_vibe_project();
```

## Code Quality Tools

### lint_project(fix?)

Runs project-wide linting and quality checks.

**Parameters:**

- `fix` (boolean, optional): Whether to automatically fix issues when possible

**Returns:**

```json
{
  "success": true,
  "result": {
    "filesChecked": 25,
    "issuesFound": 3,
    "issuesFixed": 1,
    "warnings": 2,
    "errors": 0,
    "details": [
      {
        "file": "src/example.ts",
        "line": 10,
        "column": 5,
        "severity": "warning",
        "message": "Prefer const over let",
        "rule": "prefer-const"
      }
    ]
  }
}
```

**Example Usage:**

```javascript
// Check project without fixing
const lintResult = await lint_project(false);
console.log(`Found ${lintResult.result.issuesFound} issues`);

// Check and auto-fix issues
const fixResult = await lint_project(true);
console.log(`Fixed ${fixResult.result.issuesFixed} issues`);
```

### lint_text(content, content_type)

Lints specific text content.

**Parameters:**

- `content` (string, required): Text content to lint
- `content_type` (string, required): Content type (e.g., "javascript", "typescript", "markdown")

**Returns:**

```json
{
  "success": true,
  "result": {
    "issues": [
      {
        "line": 1,
        "column": 10,
        "severity": "error",
        "message": "Unexpected token",
        "rule": "syntax-error"
      }
    ],
    "summary": {
      "errors": 1,
      "warnings": 0,
      "suggestions": 0
    }
  }
}
```

**Example Usage:**

```javascript
// Lint JavaScript code
const code = "const x = 'hello world'";
const result = await lint_text(code, 'javascript');

// Lint TypeScript
const tsCode = 'interface User { name: string; }';
const tsResult = await lint_text(tsCode, 'typescript');
```

## Error Handling Patterns

All Vibe MCP tools follow consistent error handling patterns:

### Success Response

```json
{
  "success": true
  // ... tool-specific data
}
```

### Error Response

```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

### Common Error Types

- **Validation Errors**: Invalid parameters or missing required fields
- **Not Found Errors**: Referenced items (tasks, workflows) don't exist
- **Permission Errors**: File system access issues
- **Configuration Errors**: Invalid or missing configuration

### Error Handling Examples

```javascript
// Always check success before using results
const result = await add_plan_item('My task');
if (result.success) {
  console.log(`Created task: ${result.item.id}`);
} else {
  console.error(`Failed to create task: ${result.error}`);
}

// Handle specific error cases
const completeResult = await complete_plan_item('invalid-id');
if (!completeResult.success) {
  if (completeResult.error.includes('not found')) {
    console.log("Task was already removed or doesn't exist");
  } else {
    console.error(`Unexpected error: ${completeResult.error}`);
  }
}
```

## Best Practices

### Plan Management

- **Descriptive task names**: Use clear, actionable descriptions
- **Logical nesting**: Group related subtasks under parent tasks
- **Regular completion**: Mark tasks complete promptly to maintain accurate progress tracking
- **Strategic breakdown**: Expand complex tasks into manageable subtasks

### Workflow Usage

- **Search broadly first**: Use general terms before specific ones
- **Multiple searches**: Try different keywords and categories
- **Reference not execute**: Workflows provide guidance, not automatic execution
- **Adapt to context**: Use workflows as inspiration, adapt to your specific needs

### Error Recovery

- **Check success**: Always verify tool responses before proceeding
- **Graceful degradation**: Have fallback approaches when tools fail
- **User feedback**: Provide meaningful error messages to end users
- **Retry logic**: Implement appropriate retry mechanisms for transient failures

## Integration Examples

### Complete Planning Workflow

```javascript
async function planFeatureImplementation(featureName) {
  // 1. Search for relevant workflows
  const workflows = await query_workflows('implementation', 'development');

  // 2. Create main task
  const mainTask = await add_plan_item(`Implement ${featureName}`);

  // 3. Break down into subtasks based on workflow guidance
  if (workflows.success && workflows.workflows.length > 0) {
    const workflow = workflows.workflows[0];
    await expand_plan_item(mainTask.item.id, workflow.steps);
  }

  // 4. Check final plan
  const status = await get_plan_status();
  console.log(`Plan created with ${status.plan.stats.totalItems} tasks`);

  return status;
}
```

### Quality Assurance Integration

```javascript
async function qualityCheck() {
  // 1. Check environment
  const envCheck = await check_vibe_environment();
  if (!envCheck.success) {
    throw new Error('Environment not ready');
  }

  // 2. Run project linting
  const lintResult = await lint_project(true);

  // 3. Create tasks for any remaining issues
  if (lintResult.success && lintResult.result.issuesFound > 0) {
    await add_plan_item(`Fix ${lintResult.result.issuesFound} linting issues`);
  }

  // 4. Search for quality workflows
  const qualityWorkflows = await query_workflows('quality', 'development');

  return {
    environmentOk: envCheck.success,
    lintIssues: lintResult.result.issuesFound,
    qualityGuidance: qualityWorkflows.workflows?.length || 0,
  };
}
```
