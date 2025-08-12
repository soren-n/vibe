# Core Data Models API Reference

This module defines the core data structures used throughout Vibe for workflows, checklists, and session management.

## Workflow Models

### Workflow Interface

Represents a complete workflow definition with execution steps and metadata.

```
Interface Workflow:
  name: string                    # Unique identifier for the workflow
  description: string             # Human-readable description of workflow purpose
  triggers: list<string>          # Regex patterns that activate this workflow
  steps: list<string>            # Textual guidance steps (not executable commands)
  dependencies: list<string>      # Required tools/packages (optional, defaults to empty)
  project_types: list<string>     # Applicable project types (optional, defaults to empty)
  conditions: list<string>        # Conditions that must be met (optional, defaults to empty)
```

**Properties:**

- `name: string` - Unique identifier for the workflow
- `description: string` - Human-readable description of workflow purpose
- `triggers: list<string>` - Regex patterns that activate this workflow
- `steps: list<string>` - Textual guidance steps (not executable commands)
- `dependencies: list<string>` - Required tools/packages (optional)
- `project_types: list<string>` - Applicable project types (optional)
- `conditions: list<string>` - Conditions that must be met (optional)

**Initialization Requirements:**

- Initialize optional fields to empty lists if not provided

**Usage Notes:**

- Steps are textual guidance, not executable commands
- Commands may be included within guidance text when appropriate
- Steps provide suggestions, reminders, and directions for human execution

### Checklist Interface

Represents a validation checklist with verification items and metadata.

```
Interface Checklist:
  name: string                    # Unique identifier for the checklist
  description: string             # Human-readable description of validation purpose
  triggers: list<string>          # Regex patterns that activate this checklist
  items: list<string>            # Validation checks to perform
  dependencies: list<string>      # Required tools/packages (optional, defaults to empty)
  project_types: list<string>     # Applicable project types (optional, defaults to empty)
  conditions: list<string>        # Conditions that must be met (optional, defaults to empty)
```

**Properties:**

- `name: string` - Unique identifier for the checklist
- `description: string` - Human-readable description of validation purpose
- `triggers: list<string>` - Regex patterns that activate this checklist
- `items: list<string>` - Validation checks to perform
- `dependencies: list<string>` - Required tools/packages (optional)
- `project_types: list<string>` - Applicable project types (optional)
- `conditions: list<string>` - Conditions that must be met (optional)

**Initialization Requirements:**

- Initialize optional fields to empty lists if not provided

**Usage Notes:**

- Items are validation checks, not executable commands
- Items specify things to verify, validate, or ensure are in place
- Focus on verification rather than implementation

## Session Models

### WorkflowFrame Interface

Represents a single workflow in the execution stack with step tracking.

```
Interface WorkflowFrame:
  workflow_name: string           # Name of the workflow being executed
  steps: list<string>            # All steps in this workflow
  current_step: integer          # Index of current step (0-based)
  context: map<string, any>      # Additional context data for this workflow
```

**Properties:**

- `workflow_name: string` - Name of the workflow being executed
- `steps: list<string>` - All steps in this workflow
- `current_step: integer` - Index of current step (0-based)
- `context: map<string, any>` - Additional context data for this workflow

**Computed Properties:**

#### is_complete

```
Method is_complete() -> boolean:
  // Check if all steps in this workflow are complete
  return current_step >= steps.length
```

#### current_step_text

```
Method current_step_text() -> string | null:
  // Get the text of the current step, or null if complete
  if is_complete():
    return null
  return steps[current_step]
```

**Methods:**

#### advance()

```
Method advance() -> boolean:
  // Advance to the next step
  // Returns: true if advanced to next step, false if workflow is complete
  if is_complete():
    return false
  current_step = current_step + 1
  return true
```

#### back()

```
Method back() -> boolean:
  // Go back to the previous step
  // Returns: true if moved back, false if already at first step
  if current_step <= 0:
    return false
  current_step = current_step - 1
  return true
```

#### restart()

```
Method restart() -> void:
  // Reset to the first step
  current_step = 0
```

### WorkflowSession Interface

Manages a complete workflow session with stack-based execution.

```
Interface WorkflowSession:
  session_id: string                    # Unique session identifier
  prompt: string                        # Original prompt that created this session
  workflow_stack: list<WorkflowFrame>   # Stack of workflows (LIFO execution)
  created_at: timestamp                 # Session creation timestamp
  last_accessed: timestamp              # Last access timestamp
  session_config: SessionConfig         # Session behavior configuration
```

**Properties:**

- `session_id: string` - Unique session identifier
- `prompt: string` - Original prompt that created this session
- `workflow_stack: list<WorkflowFrame>` - Stack of workflows (LIFO execution)
- `created_at: timestamp` - Session creation timestamp
- `last_accessed: timestamp` - Last access timestamp
- `session_config: SessionConfig` - Session behavior configuration

**Computed Properties:**

#### current_workflow

```
Method current_workflow() -> WorkflowFrame | null:
  // Get the currently active workflow (top of stack)
  if workflow_stack.length > 0:
    return workflow_stack[workflow_stack.length - 1]
  return null
```

#### is_complete

```
Method is_complete() -> boolean:
  // Check if all workflows in the session are complete
  return workflow_stack.length == 0
```

#### current_step

```
Method current_step() -> string | null:
  // Get the current step text from the active workflow
  current = current_workflow()
  if current != null:
    return current.current_step_text()
  return null
```

**Factory Methods:**

#### create(prompt, initial_workflows, session_config)

```
Static Method create(
  prompt: string,
  initial_workflows: list<tuple<string, list<string>>>,
  session_config: SessionConfig | null
) -> WorkflowSession:
  // Create a new session with initial workflows

  session_id = generate_uuid()
  now = current_timestamp()

  // Create workflow frames from (name, steps) tuples
  workflow_stack = []
  for each (name, steps) in initial_workflows:
    frame = new WorkflowFrame(
      workflow_name = name,
      steps = steps,
      current_step = 0,
      context = empty_map()
    )
    workflow_stack.append(frame)

  return new WorkflowSession(
    session_id = session_id,
    prompt = prompt,
    workflow_stack = workflow_stack,
    created_at = now,
    last_accessed = now,
    session_config = session_config or default_session_config()
  )
```

**Session Management Methods:**

#### advance()

```
Method advance() -> map<string, any>:
  // Advance to next step in current workflow
  if workflow_stack.length == 0:
    return {
      "success": false,
      "session_complete": true,
      "message": "Session complete - no workflows remaining"
    }

  current = workflow_stack[workflow_stack.length - 1]
  advanced = current.advance()

  if not advanced:  // Workflow completed
    workflow_stack.remove_last()
    return {
      "success": true,
      "workflow_complete": true,
      "session_complete": workflow_stack.length == 0,
      "current_step": current_step(),
      "message": "Completed workflow: " + current.workflow_name
    }

  return {
    "success": true,
    "workflow_complete": false,
    "session_complete": false,
    "current_step": current_step(),
    "message": "Advanced to step " + (current.current_step + 1)
  }
```

#### back()

```
Method back() -> map<string, any>:
  // Go back to previous step in current workflow
  if workflow_stack.length == 0:
    return {
      "success": false,
      "message": "No active workflow to go back in"
    }
        }

    current = self.workflow_stack[-1]
    moved_back = current.back()

    if not moved_back:
        return {
            "success": False,
            "message": "Already at first step of workflow"
        }

    return {
        "success": True,
        "current_step": self.current_step,
        "message": f"Moved back to step {current.current_step + 1}"
    }
```

#### restart()

```python
def restart(self) -> dict[str, Any]:
    """Restart session from the beginning."""
    for workflow in self.workflow_stack:
        workflow.restart()

    self.last_accessed = datetime.now()

    return {
        "success": True,
        "current_step": self.current_step,
        "message": "Session restarted from beginning"
    }
```

#### push_workflow(workflow_name, steps)

```python
def push_workflow(self, workflow_name: str, steps: list[str]) -> None:
    """Add a new workflow to the top of the stack."""
    frame = WorkflowFrame(
        workflow_name=workflow_name,
        steps=steps,
        current_step=0,
        context={}
    )
    self.workflow_stack.append(frame)
```

#### to_dict()

```python
def to_dict(self) -> dict[str, Any]:
    """Convert session to dictionary for serialization."""
    return {
        "session_id": self.session_id,
        "prompt": self.prompt,
        "workflow_stack": [asdict(frame) for frame in self.workflow_stack],
        "created_at": self.created_at.isoformat(),
        "last_accessed": self.last_accessed.isoformat(),
        "session_config": asdict(self.session_config)
    }
```

#### from_dict(data)

```python
@classmethod
def from_dict(cls, data: dict[str, Any]) -> "WorkflowSession":
    """Create session from dictionary (deserialization)."""
    workflow_stack = [
        WorkflowFrame(**frame_data)
        for frame_data in data["workflow_stack"]
    ]

    return cls(
        session_id=data["session_id"],
        prompt=data["prompt"],
        workflow_stack=workflow_stack,
        created_at=datetime.fromisoformat(data["created_at"]),
        last_accessed=datetime.fromisoformat(data["last_accessed"]),
        session_config=SessionConfig(**data["session_config"])
    )
```

## Data Structure Relationships

```
WorkflowSession
├── session_id: str
├── prompt: str
├── workflow_stack: list[WorkflowFrame]
│   └── WorkflowFrame
│       ├── workflow_name: str
│       ├── steps: list[str]
│       ├── current_step: int
│       └── context: dict[str, Any]
├── created_at: datetime
├── last_accessed: datetime
└── session_config: SessionConfig

Workflow
├── name: str
├── description: str
├── triggers: list[str]
├── steps: list[str]
├── dependencies: list[str]
├── project_types: list[str]
└── conditions: list[str]

Checklist
├── name: str
├── description: str
├── triggers: list[str]
├── items: list[str]
├── dependencies: list[str]
├── project_types: list[str]
└── conditions: list[str]
```

## Usage Patterns

### Creating a Session

```python
# Create session with multiple workflows
session = WorkflowSession.create(
    prompt="Set up Python project",
    initial_workflows=[
        ("python_setup", ["Create virtual environment", "Install dependencies"]),
        ("git_init", ["Initialize git repository", "Create .gitignore"])
    ]
)

# Add additional workflow
session.push_workflow("testing_setup", ["Install pytest", "Create test directory"])
```

### Session Execution Loop

```python
while not session.is_complete:
    current_step = session.current_step
    print(f"Current step: {current_step}")

    # Execute step logic here

    result = session.advance()
    if result["workflow_complete"]:
        print(f"Completed workflow: {result['message']}")
```

### Serialization

```python
# Save session to JSON
session_data = session.to_dict()
with open("session.json", "w") as f:
    json.dump(session_data, f)

# Load session from JSON
with open("session.json", "r") as f:
    session_data = json.load(f)
session = WorkflowSession.from_dict(session_data)
```
