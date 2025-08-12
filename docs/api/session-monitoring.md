# Session Monitoring API Reference

The session monitoring system detects when AI agents forget to complete workflows and provides automated intervention strategies.

## Core Classes

### SessionMonitor

Primary class for monitoring workflow sessions and detecting completion issues.

```python
class SessionMonitor:
    """Monitors workflow sessions and intervenes when agents forget to complete them."""

    def __init__(self, orchestrator: WorkflowOrchestrator):
        """Initialize with workflow orchestrator for session access."""
```

**Constructor Parameters:**

- `orchestrator: WorkflowOrchestrator` - Orchestrator instance for session management

**Properties:**

- `orchestrator: WorkflowOrchestrator` - Workflow orchestrator instance
- `session_manager: SessionManager` - Session manager from orchestrator
- `dormant_threshold_minutes: int` - Minutes before session considered dormant (default: 10)
- `stale_threshold_minutes: int` - Minutes before session considered stale (default: 30)
- `max_session_age_hours: int` - Hours before auto-archiving (default: 6)
- `completion_patterns: list[str]` - Regex patterns indicating completion
- `continuation_patterns: list[str]` - Regex patterns indicating continuation intent
- `_response_history: dict[str, list[tuple[str, datetime]]]` - Recent response tracking

**Pattern Definitions:**

#### Completion Patterns

Regex patterns that indicate an agent believes work is complete:

```python
completion_patterns = [
    r"\b(summary|conclusion|concludes|final|complete|done|finished|ready)\b",
    r"\b(that|this) (should|completes|completed)\b",
    r"\b(we have|i have) (completed|finished|done)\b",
    r"\b(in summary|to summarize|to conclude)\b"
]
```

#### Continuation Patterns

Patterns indicating agent intends to continue:

```python
continuation_patterns = [
    r"\b(next|continue|proceed|advance|step)\b",
    r"\b(next steps?|follow.?up|moving forward)\b",
    r"\b(workflow|checklist|session)\b",
    r"\b(let me|i will|shall we)\b"
]
```

**Methods:**

#### check_session_health()

Analyzes all active sessions for health issues and returns alerts.

**Returns:**

- `list[SessionAlert]` - List of alerts requiring attention

**Algorithm:**

1. Get all active sessions from session manager
2. Check each session for dormancy (10+ minutes inactive)
3. Check for staleness (30+ minutes inactive)
4. Check for auto-archive candidates (6+ hours old)
5. Generate alerts with suggested actions
6. Return combined alert list

**Implementation:**

```python
def check_session_health(self) -> list[SessionAlert]:
    alerts = []
    active_sessions = self._get_active_sessions()

    for session in active_sessions:
        if self._is_session_dormant(session):
            alerts.append(self._create_dormant_alert(session))

        if self._is_session_stale(session):
            alerts.append(self._create_stale_alert(session))

        if self._should_auto_archive(session):
            alerts.append(self._create_archive_alert(session))

    return alerts
```

#### analyze_agent_response(session_id, response_text)

Analyzes agent response for completion patterns and workflow management.

**Parameters:**

- `session_id: str` - Session identifier
- `response_text: str` - Agent response to analyze

**Returns:**

```python
{
    "session_status": str,           # "active" | "likely_complete" | "abandoned"
    "completion_indicators": int,    # Count of completion patterns found
    "continuation_indicators": int,  # Count of continuation patterns found
    "confidence": float,            # Confidence score (0.0-1.0)
    "suggested_action": str,        # Recommended action
    "patterns_found": list[str],    # Matched patterns
    "workflow_mentioned": bool      # Whether workflow/session mentioned
}
```

**Algorithm:**

1. Store response in history for pattern analysis
2. Count completion pattern matches
3. Count continuation pattern matches
4. Calculate confidence based on pattern balance
5. Determine session status and suggested action
6. Return analysis results

**Implementation:**

```python
def analyze_agent_response(self, session_id: str, response_text: str) -> dict[str, Any]:
    # Store response in history
    if session_id not in self._response_history:
        self._response_history[session_id] = []

    self._response_history[session_id].append((response_text, datetime.now()))

    # Keep only last 5 responses
    if len(self._response_history[session_id]) > 5:
        self._response_history[session_id] = self._response_history[session_id][-5:]

    # Analyze patterns
    completion_count = self._count_patterns(response_text, self.completion_patterns)
    continuation_count = self._count_patterns(response_text, self.continuation_patterns)

    # Workflow-specific mentions
    workflow_mentioned = bool(re.search(
        r'\b(workflow|session|advance|break|restart)\b',
        response_text,
        re.IGNORECASE
    ))

    # Calculate confidence and determine status
    if completion_count > continuation_count and not workflow_mentioned:
        status = "likely_complete"
        confidence = min(0.9, 0.5 + (completion_count * 0.2))
        action = "Check if workflow session should be advanced or completed"
    elif continuation_count > 0 or workflow_mentioned:
        status = "active"
        confidence = min(0.8, 0.6 + (continuation_count * 0.1))
        action = "Continue with current workflow"
    else:
        status = "abandoned"
        confidence = 0.3
        action = "Verify session status and consider cleanup"

    return {
        "session_status": status,
        "completion_indicators": completion_count,
        "continuation_indicators": continuation_count,
        "confidence": confidence,
        "suggested_action": action,
        "patterns_found": self._extract_patterns(response_text),
        "workflow_mentioned": workflow_mentioned
    }
```

#### generate_intervention_message(session_id)

Generates intervention message for forgotten sessions.

**Parameters:**

- `session_id: str` - Session to generate intervention for

**Returns:**

- `str` - Intervention message with context and suggestions

**Implementation:**

```python
def generate_intervention_message(self, session_id: str) -> str:
    session = self.session_manager.get_session(session_id)
    if not session:
        return "Session not found."

    current_step = session.current_step
    workflow_name = session.current_workflow.workflow_name if session.current_workflow else "Unknown"

    inactive_time = datetime.now() - session.last_accessed

    message = f"""
🔔 WORKFLOW SESSION REMINDER

Session: {session_id[:8]}...
Workflow: {workflow_name}
Current Step: {current_step or 'Session complete'}
Inactive for: {inactive_time.total_seconds() // 60:.0f} minutes

It appears you may have forgotten about an active workflow session.

Suggested actions:
- Use `advance_workflow` to continue to the next step
- Use `get_workflow_status` to check current status
- Use `break_workflow` if you want to exit the workflow
- Use `restart_workflow` to start over

Remember: Completing workflows helps maintain context and ensures all steps are executed properly.
"""

    return message.strip()
```

#### cleanup_stale_sessions(max_age_hours=24)

Automatically cleans up old sessions.

**Parameters:**

- `max_age_hours: int` - Maximum age before cleanup (default: 24)

**Returns:**

- `dict[str, Any]` - Cleanup results with statistics

**Implementation:**

```python
def cleanup_stale_sessions(self, max_age_hours: int = 24) -> dict[str, Any]:
    cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
    active_sessions = self._get_active_sessions()

    cleaned_sessions = []
    for session in active_sessions:
        if session.created_at < cutoff_time:
            # Archive instead of delete for recovery
            self._archive_session(session)
            cleaned_sessions.append(session.session_id)

    return {
        "cleaned_count": len(cleaned_sessions),
        "cleaned_sessions": cleaned_sessions,
        "remaining_sessions": len(active_sessions) - len(cleaned_sessions)
    }
```

### SessionAlert

Data structure representing session health alerts.

```python
@dataclass
class SessionAlert:
    """Represents an alert about a session that needs attention."""

    session_id: str
    alert_type: str
    message: str
    severity: str  # 'low', 'medium', 'high'
    timestamp: datetime
    suggested_actions: list[str] = field(default_factory=list)
```

**Properties:**

- `session_id: str` - Unique session identifier
- `alert_type: str` - Type of alert (dormant, stale, archive, completion)
- `message: str` - Human-readable alert message
- `severity: str` - Alert severity level (low, medium, high)
- `timestamp: datetime` - When alert was generated
- `suggested_actions: list[str]` - Recommended intervention actions

**Alert Types:**

#### Dormant Session Alert

```python
SessionAlert(
    session_id="abc123...",
    alert_type="dormant",
    message="Session inactive for 15 minutes",
    severity="medium",
    timestamp=datetime.now(),
    suggested_actions=[
        "Check if agent needs workflow reminder",
        "Send intervention message",
        "Verify current step status"
    ]
)
```

#### Stale Session Alert

```python
SessionAlert(
    session_id="abc123...",
    alert_type="stale",
    message="Session inactive for 45 minutes",
    severity="high",
    timestamp=datetime.now(),
    suggested_actions=[
        "Send immediate intervention",
        "Consider breaking workflow",
        "Archive if truly abandoned"
    ]
)
```

## Utility Methods

### \_get_active_sessions()

Retrieves all currently active workflow sessions.

**Returns:**

- `list[WorkflowSession]` - Active sessions sorted by last_accessed

### \_is_session_dormant(session)

Checks if session is dormant (inactive but not stale).

**Parameters:**

- `session: WorkflowSession` - Session to check

**Returns:**

- `bool` - True if session is dormant

**Logic:**

```python
def _is_session_dormant(self, session: WorkflowSession) -> bool:
    if session.is_complete:
        return False

    inactive_time = datetime.now() - session.last_accessed
    return (
        inactive_time.total_seconds() > self.dormant_threshold_minutes * 60
        and inactive_time.total_seconds() < self.stale_threshold_minutes * 60
    )
```

### \_is_session_stale(session)

Checks if session is stale (inactive for extended period).

**Parameters:**

- `session: WorkflowSession` - Session to check

**Returns:**

- `bool` - True if session is stale

### \_count_patterns(text, patterns)

Counts pattern matches in text.

**Parameters:**

- `text: str` - Text to analyze
- `patterns: list[str]` - Regex patterns to match

**Returns:**

- `int` - Total number of pattern matches

**Implementation:**

```python
def _count_patterns(self, text: str, patterns: list[str]) -> int:
    count = 0
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        count += len(matches)
    return count
```

### \_extract_patterns(text)

Extracts actual matched patterns from text.

**Parameters:**

- `text: str` - Text to analyze

**Returns:**

- `list[str]` - List of matched pattern text

## Monitoring Strategies

### Dormancy Detection

**Threshold-based Monitoring:**

- Sessions inactive for 10+ minutes flagged as dormant
- Sessions inactive for 30+ minutes flagged as stale
- Sessions older than 6 hours considered for archiving

**Pattern Analysis:**

- Completion language vs. continuation language
- Workflow-specific mentions in responses
- Historical response patterns

### Intervention Strategies

**Gentle Reminders (Dormant):**

- Workflow status summaries
- Next step suggestions
- Context preservation

**Active Intervention (Stale):**

- Direct workflow reminders
- Intervention messages
- Explicit action requests

**Automatic Cleanup (Ancient):**

- Session archiving
- Resource cleanup
- Statistics tracking

### Health Metrics

**Session Health Indicators:**

- Time since last access
- Completion pattern frequency
- Workflow mention frequency
- Response coherence with session context

**Alert Prioritization:**

- High: Stale sessions with incomplete work
- Medium: Dormant sessions with recent activity
- Low: Old sessions near completion

## Usage Examples

### Basic Monitoring

```python
# Initialize monitor
orchestrator = WorkflowOrchestrator(config)
monitor = SessionMonitor(orchestrator)

# Check session health
alerts = monitor.check_session_health()

for alert in alerts:
    print(f"{alert.severity}: {alert.message}")
    for action in alert.suggested_actions:
        print(f"  - {action}")
```

### Response Analysis

```python
# Analyze agent response
response = "In summary, the implementation is complete and ready for use."
analysis = monitor.analyze_agent_response("session_123", response)

if analysis["session_status"] == "likely_complete":
    print("Agent may have forgotten about active workflow")
    print(f"Confidence: {analysis['confidence']:.2f}")
    print(f"Action: {analysis['suggested_action']}")
```

### Automated Intervention

```python
# Generate intervention for dormant session
intervention = monitor.generate_intervention_message("session_123")
print(intervention)

# Cleanup old sessions
results = monitor.cleanup_stale_sessions(max_age_hours=12)
print(f"Cleaned {results['cleaned_count']} sessions")
```

### Health Dashboard

```python
def display_session_health():
    """Display session health dashboard."""
    alerts = monitor.check_session_health()

    # Group by severity
    high_alerts = [a for a in alerts if a.severity == "high"]
    medium_alerts = [a for a in alerts if a.severity == "medium"]
    low_alerts = [a for a in alerts if a.severity == "low"]

    print(f"Session Health Dashboard")
    print(f"High Priority: {len(high_alerts)}")
    print(f"Medium Priority: {len(medium_alerts)}")
    print(f"Low Priority: {len(low_alerts)}")

    # Show immediate actions needed
    for alert in high_alerts:
        print(f"\n🚨 {alert.message}")
        print(f"Session: {alert.session_id[:8]}...")
        print("Immediate actions:")
        for action in alert.suggested_actions:
            print(f"  • {action}")
```

## Integration with MCP

The session monitor integrates with Model Context Protocol for automated agent management:

```python
# MCP Tool Integration
def mcp_check_session_health():
    """MCP tool for session health checking."""
    monitor = get_session_monitor()
    alerts = monitor.check_session_health()

    return {
        "status": "success",
        "alerts": [
            {
                "session_id": alert.session_id,
                "type": alert.alert_type,
                "severity": alert.severity,
                "message": alert.message,
                "actions": alert.suggested_actions
            }
            for alert in alerts
        ]
    }

def mcp_analyze_response(session_id: str, response: str):
    """MCP tool for response analysis."""
    monitor = get_session_monitor()
    analysis = monitor.analyze_agent_response(session_id, response)

    if analysis["session_status"] == "likely_complete":
        # Trigger intervention
        intervention = monitor.generate_intervention_message(session_id)
        analysis["intervention_message"] = intervention

    return analysis
```

## Performance Considerations

### Efficient Monitoring

- **Lazy Loading**: Load sessions only when needed
- **Batch Processing**: Analyze multiple sessions in single pass
- **Pattern Caching**: Cache compiled regex patterns
- **History Limits**: Keep only recent response history

### Memory Management

- **Response History**: Limited to last 5 responses per session
- **Alert Expiry**: Alerts automatically expire after resolution
- **Session Archiving**: Move old sessions to archive storage
- **Cleanup Scheduling**: Regular cleanup of stale data

### Scalability

- **Distributed Monitoring**: Support for multiple monitor instances
- **Event-driven Updates**: React to session changes immediately
- **Configurable Thresholds**: Adjust monitoring sensitivity
- **Metric Aggregation**: Collect health statistics for analysis
