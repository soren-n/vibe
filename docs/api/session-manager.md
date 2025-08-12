# SessionManager API Reference

The `SessionManager` class handles step-by-step workflow execution, state persistence, and session lifecycle management.

## Class Definition

```python
class SessionManager:
    """Manages workflow sessions for step-by-step execution."""

    def __init__(self, session_dir: str = ".vibe/sessions"):
        """Initialize session manager with storage directory."""
```

## Constructor Parameters

- `session_dir: str` - Directory for session persistence (default: ".vibe/sessions")

## Properties

- `session_dir: Path` - Directory for session files
- `_sessions: dict[str, WorkflowSession]` - In-memory session cache
- `_session_configs: dict[str, SessionConfig]` - Session configurations

## Methods

### create_session(prompt, workflows, checklists=None, config=None)

Creates a new workflow session with initial workflows.

**Parameters:**

- `prompt: str` - Original prompt that triggered the session
- `workflows: list[str]` - List of workflow names to execute
- `checklists: list[str] | None` - Optional checklist names
- `config: SessionConfig | None` - Optional session configuration

**Returns:**

- `WorkflowSession` - New session instance with unique ID

**Implementation:**

```python
def create_session(
    self,
    prompt: str,
    workflows: list[str],
    checklists: list[str] | None = None,
    config: SessionConfig | None = None
) -> WorkflowSession:
    """Create a new workflow session."""

    # Convert workflows to (name, steps) tuples
    workflow_tuples = []
    for workflow_name in workflows:
        steps = self._get_workflow_steps(workflow_name)
        workflow_tuples.append((workflow_name, steps))

    # Create session with initial workflows
    session = WorkflowSession.create(
        prompt=prompt,
        initial_workflows=workflow_tuples,
        session_config=config
    )

    # Add checklists as additional workflows
    if checklists:
        for checklist_name in checklists:
            checklist_items = self._get_checklist_items(checklist_name)
            session.push_workflow(f"checklist:{checklist_name}", checklist_items)

    # Store in memory and persist
    self._sessions[session.session_id] = session
    self._save_session(session)

    return session
```

### get_session(session_id)

Retrieves an existing session by ID.

**Parameters:**

- `session_id: str` - Unique session identifier

**Returns:**

- `WorkflowSession | None` - Session instance or None if not found

**Implementation:**

- Checks in-memory cache first
- Loads from disk if not in cache
- Updates last_accessed timestamp
- Returns None for non-existent sessions

### list_sessions()

Lists all active sessions.

**Returns:**

- `list[WorkflowSession]` - All active sessions sorted by last_accessed

### advance_session(session_id)

Advances a session to the next step.

**Parameters:**

- `session_id: str` - Session to advance

**Returns:**

```python
{
    "success": bool,
    "session_complete": bool,
    "current_step": str | None,
    "workflow_complete": bool,
    "message": str
}
```

**Algorithm:**

1. Retrieve session from cache/disk
2. Advance current workflow frame
3. If workflow completes, pop from stack
4. Update session state and persist
5. Return status with next step information

### back_session(session_id)

Goes back to the previous step in current workflow.

**Parameters:**

- `session_id: str` - Session to move back

**Returns:**

- `dict[str, Any]` - Status similar to advance_session

### restart_session(session_id)

Restarts a session from the beginning.

**Parameters:**

- `session_id: str` - Session to restart

**Returns:**

- `dict[str, Any]` - Status with reset information

**Implementation:**

- Calls `session.restart()` method
- Resets all workflows to step 0
- Updates timestamps
- Persists updated state

### break_session(session_id)

Breaks out of the current workflow in a session.

**Parameters:**

- `session_id: str` - Session to break from current workflow

**Returns:**

- `dict[str, Any]` - Status with workflow change information

### delete_session(session_id)

Removes a session from memory and disk.

**Parameters:**

- `session_id: str` - Session to delete

**Returns:**

- `bool` - True if session was deleted, False if not found

### cleanup_old_sessions(max_age_hours=24)

Removes sessions older than specified age.

**Parameters:**

- `max_age_hours: int` - Maximum session age in hours (default: 24)

**Returns:**

- `int` - Number of sessions cleaned up

## Session Persistence

### File Format

Sessions are stored as JSON files:

```json
{
  "session_id": "a1b2c3d4",
  "prompt": "fix authentication bug",
  "workflow_stack": [
    {
      "workflow_name": "debug_workflow",
      "steps": ["Analyze logs", "Identify issue", "Fix code"],
      "current_step": 1,
      "context": { "issue_type": "authentication" }
    }
  ],
  "created_at": "2025-08-12T10:30:00",
  "last_accessed": "2025-08-12T11:15:00",
  "session_config": {
    "auto_advance": false,
    "max_session_age_hours": 24,
    "enable_monitoring": true,
    "checkpoint_frequency": 10
  }
}
```

### Storage Operations

#### \_save_session(session)

Persists session to disk as JSON file.

**Implementation:**

```python
def _save_session(self, session: WorkflowSession) -> None:
    """Save session to disk."""
    session_file = self.session_dir / f"{session.session_id}.json"

    # Ensure directory exists
    session_file.parent.mkdir(parents=True, exist_ok=True)

    # Serialize and save
    session_data = session.to_dict()
    with session_file.open('w', encoding='utf-8') as f:
        json.dump(session_data, f, indent=2, default=str)
```

#### \_load_session(session_id)

Loads session from disk.

**Implementation:**

```python
def _load_session(self, session_id: str) -> WorkflowSession | None:
    """Load session from disk."""
    session_file = self.session_dir / f"{session_id}.json"

    if not session_file.exists():
        return None

    try:
        with session_file.open('r', encoding='utf-8') as f:
            session_data = json.load(f)

        # Deserialize and cache
        session = WorkflowSession.from_dict(session_data)
        self._sessions[session_id] = session
        return session

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.error(f"Failed to load session {session_id}: {e}")
        return None
```

## Error Handling

### Session Not Found

```python
def get_session(self, session_id: str) -> WorkflowSession | None:
    """Get session with graceful error handling."""
    try:
        # Try memory cache first
        if session_id in self._sessions:
            session = self._sessions[session_id]
            session.last_accessed = datetime.now()
            return session

        # Try loading from disk
        return self._load_session(session_id)

    except Exception as e:
        logger.error(f"Error retrieving session {session_id}: {e}")
        return None
```

### Disk I/O Errors

- **Permission errors**: Log error, continue with in-memory operations
- **Disk full**: Log critical error, attempt cleanup
- **Corruption**: Log error, remove corrupted file, create new session

### State Inconsistency

- **Memory/disk mismatch**: Prefer disk version, log warning
- **Invalid session data**: Skip session, log validation errors
- **Missing workflows**: Continue with available workflows

## Integration Points

### Workflow Registry Integration

```python
def _get_workflow_steps(self, workflow_name: str) -> list[str]:
    """Get workflow steps from registry."""
    workflow = self.workflow_registry.get_workflow(workflow_name)
    if workflow:
        return workflow.steps

    # Fallback to config workflows
    config_workflow = self.config.workflows.get(workflow_name)
    if config_workflow:
        return config_workflow.get('steps', [])

    logger.warning(f"Workflow not found: {workflow_name}")
    return []
```

### Configuration Integration

Sessions respect global and session-specific configuration:

```python
def _apply_session_config(self, session: WorkflowSession) -> None:
    """Apply configuration to session behavior."""
    if session.session_config:
        if session.session_config.auto_advance:
            # Auto-advance implementation
            pass

        if session.session_config.enable_monitoring:
            # Register with session monitor
            self.monitor.register_session(session)
```

## Usage Example

```python
from vibe.session import SessionManager

# Initialize session manager
session_manager = SessionManager()

# Create new session
session = session_manager.create_session(
    prompt="fix authentication bug",
    workflows=["debug_workflow", "test_workflow"],
    checklists=["bug_fix_validation"]
)

# Execute step by step
while not session.is_complete:
    print(f"Current step: {session.current_step_text}")

    # AI agent executes step here

    # Advance to next step
    result = session_manager.advance_session(session.session_id)
    if not result["success"]:
        break

print("Session completed!")
```
