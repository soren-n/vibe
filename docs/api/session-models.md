# Session Models API Reference

This document describes the core data structures for session-based workflow execution.

## WorkflowFrame

Represents a single workflow in the execution stack.

```python
@dataclass
class WorkflowFrame:
    """Represents a single workflow in the execution stack."""

    workflow_name: str
    steps: list[str]
    current_step: int
    context: dict[str, Any]
```

### Properties

- `workflow_name: str` - Unique identifier for the workflow
- `steps: list[str]` - All steps in this workflow
- `current_step: int` - Current step index (0-based)
- `context: dict[str, Any]` - Additional context data for this workflow

### Methods

#### is_complete

```python
@property
def is_complete(self) -> bool:
    """Check if all steps in this workflow are complete."""
```

Returns `True` if `current_step >= len(steps)`, indicating workflow completion.

#### current_step_text

```python
@property
def current_step_text(self) -> str | None:
    """Get the text of the current step, or None if complete."""
```

Returns the current step text or `None` if the workflow is complete.

#### advance()

```python
def advance(self) -> bool:
    """Advance to the next step.

    Returns:
        True if advanced to next step, False if workflow is complete
    """
```

Increments `current_step` if not complete. Returns success status.

### Usage Example

```python
frame = WorkflowFrame(
    workflow_name="bug_fix",
    steps=["Analyze issue", "Write test", "Fix code", "Validate"],
    current_step=0,
    context={"issue_id": "AUTH-123"}
)

# Check current step
print(frame.current_step_text)  # "Analyze issue"
print(frame.is_complete)        # False

# Advance through steps
frame.advance()  # Returns True, current_step = 1
frame.advance()  # Returns True, current_step = 2
frame.advance()  # Returns True, current_step = 3
frame.advance()  # Returns True, current_step = 4 (complete)
frame.advance()  # Returns False, already complete
```

## WorkflowSession

Represents a complete workflow execution session with stack-based workflow management.

```python
@dataclass
class WorkflowSession:
    """Represents a complete workflow execution session."""

    session_id: str
    prompt: str
    workflow_stack: list[WorkflowFrame]
    created_at: datetime
    last_accessed: datetime
    session_config: SessionConfig | None = None
```

### Properties

- `session_id: str` - Unique identifier (8-character UUID)
- `prompt: str` - Original prompt that started this session
- `workflow_stack: list[WorkflowFrame]` - Stack of workflow frames (supports nesting)
- `created_at: datetime` - Session creation timestamp
- `last_accessed: datetime` - Last access timestamp
- `session_config: SessionConfig | None` - Optional session behavior configuration

### Class Methods

#### create()

```python
@classmethod
def create(
    cls,
    prompt: str,
    initial_workflows: list[tuple[str, list[str]]],
    session_config: SessionConfig | None = None,
) -> "WorkflowSession":
    """Create a new workflow session."""
```

Creates a new session with initial workflows loaded onto the stack.

**Parameters:**

- `prompt: str` - Original trigger prompt
- `initial_workflows: list[tuple[str, list[str]]]` - List of (workflow_name, steps) tuples
- `session_config: SessionConfig | None` - Optional configuration

**Returns:**

- `WorkflowSession` - New session instance with 8-character session ID

### Instance Methods

#### current_workflow

```python
@property
def current_workflow(self) -> WorkflowFrame | None:
    """Get the current workflow frame, or None if stack is empty."""
```

Returns the top workflow frame from the stack, or `None` if no workflows remain.

#### is_complete

```python
@property
def is_complete(self) -> bool:
    """Check if all workflows in the session are complete."""
```

Returns `True` if the workflow stack is empty (all workflows completed or broken out of).

#### current_step_text

```python
@property
def current_step_text(self) -> str | None:
    """Get the current step text, or None if session is complete."""
```

Returns the current step text from the top workflow, or `None` if session is complete.

#### advance()

```python
def advance(self) -> bool:
    """Advance the current workflow to the next step.

    Returns:
        True if advanced, False if session is complete
    """
```

Advances the current workflow. If a workflow completes, it's popped from the stack.

#### push_workflow()

```python
def push_workflow(self, workflow_name: str, steps: list[str]) -> None:
    """Push a new workflow onto the stack (for nested workflows)."""
```

Adds a new workflow to the top of the stack, enabling nested workflow execution.

#### break_workflow()

```python
def break_workflow(self) -> bool:
    """Break out of the current workflow.

    Returns:
        True if workflow was broken, False if session is complete
    """
```

Removes the current workflow from the stack without completing it.

#### back()

```python
def back(self) -> bool:
    """Go back to the previous step in the current workflow.

    Returns:
        True if went back, False if at beginning or session complete
    """
```

Decrements the current step in the active workflow.

#### restart()

```python
def restart(self) -> None:
    """Restart the session from the beginning."""
```

Resets all workflows to step 0 and updates timestamps.

#### to_dict()

```python
def to_dict(self) -> dict[str, Any]:
    """Convert session to dictionary for serialization."""
```

Serializes the session to a dictionary for JSON persistence.

#### from_dict()

```python
@classmethod
def from_dict(cls, data: dict[str, Any]) -> "WorkflowSession":
    """Create session from dictionary (deserialization)."""
```

Deserializes a session from a dictionary loaded from JSON.

### State Management

Sessions support complex state management:

1. **Stack-Based Execution** - Multiple workflows can be nested
2. **Step Navigation** - Forward/backward movement through steps
3. **Workflow Interruption** - Break out of workflows without completion
4. **Session Persistence** - Save/load session state from disk
5. **Restart Capability** - Reset session to initial state

### Usage Example

```python
# Create a new session
session = WorkflowSession.create(
    prompt="fix authentication bug",
    initial_workflows=[
        ("debug_workflow", ["Analyze logs", "Identify issue", "Fix code"]),
        ("test_workflow", ["Write test", "Run test", "Validate"])
    ]
)

# Execute step by step
print(session.current_step_text)  # "Analyze logs"
session.advance()                 # Move to "Identify issue"

# Add nested workflow
session.push_workflow("hotfix", ["Create branch", "Apply fix"])
print(session.current_step_text)  # "Create branch"

# Break out of nested workflow
session.break_workflow()
print(session.current_step_text)  # Back to "Identify issue"

# Continue main workflow
session.advance()  # "Fix code"
session.advance()  # Complete debug_workflow, start test_workflow
print(session.current_step_text)  # "Write test"
```

## SessionConfig

Configuration object for session behavior customization.

```python
@dataclass
class SessionConfig:
    """Configuration for session behavior."""

    auto_advance: bool = False
    max_session_age_hours: int = 24
    enable_monitoring: bool = True
    checkpoint_frequency: int = 10
```

### Properties

- `auto_advance: bool` - Automatically advance on successful step completion
- `max_session_age_hours: int` - Maximum session age before cleanup
- `enable_monitoring: bool` - Enable session monitoring and alerts
- `checkpoint_frequency: int` - Steps between automatic checkpoints

This configuration allows customization of session behavior for different use cases and AI agent interaction patterns.
