# WorkflowOrchestrator API Reference

The `WorkflowOrchestrator` plans workflow execution and provides step-by-step guidance for autonomous AI agent operation.

## Interface Definition

```
Interface WorkflowOrchestrator:
  config: VibeConfig                    # Project configuration
  console: Console                      # Output formatting interface
  workflow_registry: WorkflowRegistry   # Built-in workflow registry
  session_manager: SessionManager      # Session state management

  Method initialize(config: VibeConfig)
  Method plan_workflows(items: list<string>, prompt: string, show_display: boolean) -> map<string, any>
  Method plan_execution_order(workflows: list<string>) -> list<string>
  Method generate_execution_plan(workflows: list<string>, checklists: list<string>, prompt: string) -> list<map<string, any>>
  Method format_guidance(execution_plan: list<map<string, any>>) -> string
```

## Constructor

### initialize(config)

Initializes the workflow orchestrator with configuration.

**Parameters:**

- `config: VibeConfig` - Project configuration object

## Properties

- `config: VibeConfig` - Project configuration
- `console: Console` - Output formatting interface for displaying results
- `workflow_registry: WorkflowRegistry` - Built-in workflow registry
- `session_manager: SessionManager` - Session state management

## Methods

### plan_workflows(items, prompt, show_display)

Plans execution for workflows and checklists, generating detailed guidance.

**Parameters:**

- `items: list<string>` - List of workflow and checklist names to execute
- `prompt: string` - Original prompt that triggered the workflows
- `show_display: boolean` - Whether to display execution plan (default: true)

**Returns:**

```
{
  "success": boolean,
  "workflows": list<string>,           # Workflow names in execution order
  "checklists": list<string>,          # Checklist names
  "execution_plan": list<map<string, any>>, # Detailed execution steps
  "guidance": string                   # Formatted guidance for AI agents
}
```

**Algorithm:**

1. Separate workflows from checklists (prefixed with "checklist:")
2. Plan optimal execution order for workflows
3. Generate detailed execution plan with steps
4. Format guidance for autonomous AI agent consumption
5. Optionally display rich formatted plan

### plan_execution_order(workflows)

Determines optimal execution order for workflows based on dependencies.

**Parameters:**

- `workflows: list<string>` - List of workflow names

**Returns:**

- `list<string>` - Workflows ordered for execution

**Algorithm:**

1. Build dependency graph from workflow definitions
2. Perform topological sort to resolve dependencies
3. Handle circular dependencies with warnings
4. Return linearized execution order

### generate_execution_plan(workflows, checklists, prompt)

Creates detailed execution plan with steps and context.

**Parameters:**

- `workflows: list<string>` - Ordered workflow names
- `checklists: list<string>` - Checklist names
- `prompt: string` - Original prompt

**Returns:**

- `list[dict[str, Any]]` - Execution plan steps

**Step Structure:**

```python
{
    "type": "workflow" | "checklist",
    "name": str,
    "description": str,
    "steps": list[str],
    "context": dict[str, Any],
    "dependencies": list[str],
    "project_types": list[str]
}
```

### \_plan_workflow_step(workflow_name, prompt)

Plans execution for a single workflow.

**Parameters:**

- `workflow_name: str` - Name of workflow to plan
- `prompt: str` - Original prompt for context

**Returns:**

- `dict[str, Any] | None` - Workflow step definition or None if not found

**Implementation:**

1. Lookup workflow in built-in registry
2. Fallback to config-defined workflows
3. Merge steps and metadata
4. Add prompt context and dependencies

### \_plan_checklist_step(checklist_name, prompt)

Plans execution for a single checklist.

**Parameters:**

- `checklist_name: str` - Name of checklist to plan
- `prompt: str` - Original prompt for context

**Returns:**

- `dict[str, Any] | None` - Checklist step definition or None if not found

### \_format_guidance_for_agent(execution_plan)

Formats execution plan as guidance text for AI agents.

**Parameters:**

- `execution_plan: list[dict]` - Detailed execution plan

**Returns:**

- `str` - Formatted guidance text optimized for AI agent consumption

**Format:**

- Numbered workflow steps with clear instructions
- Checklist items marked with ✅ for validation
- Autonomous operation commands (no user interaction)
- Context-aware step descriptions

### \_display_execution_guidance(execution_plan, prompt)

Displays rich formatted execution plan to user.

**Parameters:**

- `execution_plan: list[dict]` - Plan to display
- `prompt: str` - Original prompt

**Output Features:**

- Rich panel layout with color coding
- Workflow steps marked with 🔄
- Checklist items marked with ✅
- Dependency information and project type filtering
- Estimated execution time and complexity

## Dependency Resolution

The orchestrator handles workflow dependencies:

1. **Graph Construction** - Build directed graph from workflow dependencies
2. **Cycle Detection** - Identify and warn about circular dependencies
3. **Topological Sort** - Order workflows for sequential execution
4. **Conflict Resolution** - Handle conflicting dependencies gracefully

## Session Integration

The orchestrator integrates with the session system:

- **Session Creation** - Converts plans to executable sessions
- **State Management** - Tracks workflow progress and context
- **Step Advancement** - Manages incremental execution
- **Error Recovery** - Handles failures and provides restart options

## Project Type Filtering

Workflows are filtered by project compatibility:

```python
# Example project type filtering
if workflow.project_types:
    if config.project_type not in workflow.project_types:
        continue  # Skip incompatible workflow
```

## Error Handling

- **Missing Workflows** - Log warnings and continue with available workflows
- **Dependency Failures** - Skip workflows with missing dependencies
- **Invalid Configurations** - Graceful degradation with error reporting
- **Session Errors** - Automatic recovery and state restoration

## Usage Example

```python
from vibe.config import VibeConfig
from vibe.orchestrator import WorkflowOrchestrator

config = VibeConfig.load()
orchestrator = WorkflowOrchestrator(config)

# Plan execution for matched workflows
items = ["bug_fix_workflow", "checklist:testing_validation"]
result = orchestrator.plan_workflows(items, "fix authentication bug")

# Result contains:
# - Ordered workflow execution plan
# - Checklist validation steps
# - Formatted guidance for AI agents
# - Session-ready execution structure
```
