# Agent Workflow Completion Guide

This guide helps AI agents avoid forgetting to complete or properly manage Vibe workflow sessions.

## The Problem

AI agents often:
1. Start workflows using `start_workflow`
2. Execute several steps
3. Reach what they think is a conclusion
4. Summarize results and stop
5. **FORGET** to call `advance_workflow` or `break_workflow`

This leaves "orphaned" sessions that consume resources and create confusion.

## Solution: Automatic Monitoring & Intervention

Vibe now includes an automatic monitoring system that detects when agents forget workflow completion and provides intervention reminders.

## New Tools Available

### 1. Session Health Monitoring

```bash
# Check session health and get alerts
monitor_sessions
```

This returns:
- List of active sessions with health status
- Alerts for dormant/stale sessions
- Intervention messages
- Recommended actions

### 2. Response Pattern Analysis

```bash
# Analyze agent responses for completion patterns
analyze_agent_response <session_id> <response_text>
```

This detects when agents:
- Use completion language without workflow management
- Summarize without advancing workflows
- Provide final answers without proper cleanup

### 3. Automatic Cleanup

```bash
# Clean up stale sessions automatically
cleanup_stale_sessions
```

This removes sessions that have been inactive for too long.

## Best Practices for Agents

### 1. Before Concluding Any Task

**ALWAYS CHECK:** Are there active workflow sessions?

```bash
# Check for active sessions
list_workflow_sessions

# If sessions exist, check their health
monitor_sessions
```

### 2. When You Complete a Step

**DON'T JUST SUMMARIZE** - Manage the workflow:

```bash
# Either advance to next step
advance_workflow <session_id>

# OR break out if workflow is complete
break_workflow <session_id>

# OR check status if unsure
get_workflow_status <session_id>
```

### 3. Use Enhanced Session Management

When ending a development session, use the enhanced workflow:

```bash
# This includes automatic workflow completion checks
start_workflow "enhanced session management"
```

### 4. Regular Health Checks

Periodically check workflow health:

```bash
# Get dashboard view of all workflows
start_workflow "workflow health dashboard"
```

## Intervention Messages

When the monitoring system detects issues, it provides specific intervention messages:

### Example 1: Forgotten Completion
```
⚠️ **Workflow Management Reminder**

I notice you may have completed a task, but there's an active workflow session that needs attention.

You are currently on step 3 of 5 in the 'implementation' workflow.

**Please choose one of the following actions:**
- `advance_workflow` - Mark current step complete and move to next step
- `break_workflow` - Exit the current workflow (if task is complete)
- `get_workflow_status` - Check current workflow status

**Session ID:** `abc12345`
```

### Example 2: Dormant Session
```
🔄 **Active Workflow Session Detected**

You have a workflow session that's been inactive.

**Session:** `abc12345`
**Workflow:** `implementation`
Current step: Run tests to validate implementation

**Consider:**
- `get_workflow_status` - Check what step you're on
- `advance_workflow` - Continue to next step if current is complete
- `break_workflow` - Exit if workflow is no longer needed
```

## Integration with VS Code

The monitoring system is integrated with the VS Code MCP server, so these tools are available directly in Copilot chat:

- Type questions about workflow status
- Get automatic reminders when completion patterns are detected
- Access monitoring dashboard through natural language

## Workflow Completion Checklist

Use this checklist before ending any session:

```yaml
name: "Workflow Completion Validation Checklist"
items:
  - "All active workflow sessions identified: Used 'list_workflow_sessions'"
  - "Session health monitored: Used 'monitor_sessions' to check for alerts"
  - "Alerts addressed: Any session alerts have been resolved"
  - "Workflows advanced or completed: Active workflows properly managed"
  - "Stale sessions cleaned: Used 'cleanup_stale_sessions'"
  - "No orphaned sessions: Final check shows no unintended active sessions"
```

## Advanced Features

### Pattern Detection

The system recognizes these completion patterns:
- "summary", "conclusion", "final", "complete", "done", "finished"
- "that should", "this completes", "we have", "i have"
- "in summary", "to summarize", "to conclude"
- "next steps", "follow-up", "moving forward"

### Automatic Thresholds

- **Dormant**: 10+ minutes inactive
- **Stale**: 30+ minutes inactive
- **Auto-archive**: 6+ hours old

### Health Monitoring

The system tracks:
- Session creation time
- Last access time
- Current workflow progress
- Step completion status
- Response patterns

## Example: Proper Workflow Management

```bash
# Start a workflow
start_workflow "implement user authentication"

# ... do some work ...

# When you complete a step, advance
advance_workflow abc12345

# ... continue work ...

# When workflow is complete, break out
break_workflow abc12345

# Verify no active sessions remain
list_workflow_sessions
```

## Troubleshooting

### "I forgot to manage a workflow"

1. Check active sessions: `list_workflow_sessions`
2. Get workflow status: `get_workflow_status <session_id>`
3. Either advance or break: `advance_workflow <session_id>` OR `break_workflow <session_id>`

### "I have too many stale sessions"

1. Check session health: `monitor_sessions`
2. Clean up automatically: `cleanup_stale_sessions`
3. Manually break remaining: `break_workflow <session_id>` for each

### "I want to avoid this in the future"

1. Use enhanced session management workflow before concluding tasks
2. Set up regular health checks
3. Follow the workflow completion checklist

Remember: **Always manage workflow lifecycle explicitly** - don't just summarize and stop!
