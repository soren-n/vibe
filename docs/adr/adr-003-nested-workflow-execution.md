# ADR-003: Nested Workflow Execution Feature

**Status:** Accepted
**Date:** 2025-08-13
**Deciders:** Development Team

## Context

Agents working with Vibe often need to dynamically add sub-tasks during workflow execution. Previously, agents had to think through every step from scratch, leading to high token usage and inconsistent execution patterns. The system needed a way for agents to discover and add pre-existing workflows and checklists to running sessions, creating nested execution trees that persist across agent runs.

## Decision

We have implemented a nested workflow execution feature that allows agents to:

1. **Query Available Resources**: New MCP tools `query_workflows` and `query_checklists` enable agents to discover available workflows and checklists by pattern or category.

2. **Dynamic Addition**: New MCP tools `add_workflow_to_session` and `add_checklist_to_session` allow agents to push workflows/checklists onto an existing session's execution stack.

3. **Persistent State**: The session stack maintains nested execution context across agent runs, with proper depth tracking and state persistence.

4. **Token Efficiency**: Agents can follow structured plans rather than thinking from scratch, significantly reducing token usage.

## Implementation Details

### Core Components

- **Orchestrator Methods**: Added `queryWorkflows()`, `queryChecklists()`, `addWorkflowToSession()`, and `addChecklistToSession()` methods
- **MCP Tools**: Four new tools exposed via the MCP server interface
- **Session Stack**: Leveraged existing `pushWorkflow()` mechanism in session management
- **Type Safety**: Full TypeScript type coverage with proper error handling

### API Surface

```typescript
// Query available workflows
query_workflows(pattern?: string, category?: string)

// Query available checklists
query_checklists(pattern?: string)

// Add to session stack (nested execution)
add_workflow_to_session(session_id: string, workflow_name: string)
add_checklist_to_session(session_id: string, checklist_name: string)
```

### Session Stack Behavior

- Workflows/checklists are pushed onto the session's execution stack
- Current execution focuses on the top of the stack (most recently added)
- Completing a nested workflow/checklist returns to the parent context
- Workflow depth is tracked and reported in session status
- Full state persists to disk for cross-run continuity

## Benefits

1. **Reduced Token Usage**: Agents follow structured plans instead of thinking from scratch
2. **Consistent Execution**: Reusable workflows ensure best practices are followed
3. **Nested Planning**: Agents can break complex tasks into manageable sub-workflows
4. **Persistent Progress**: Work continues across agent sessions without losing context
5. **Discovery**: Agents can find relevant workflows/checklists dynamically

## Example Usage

```typescript
// Agent discovers relevant validation checklists
const checklists = await queryChecklists('validation');

// Agent adds quality validation to current session
await addChecklistToSession(sessionId, 'Quality Validation Checklist');

// Session now executes the checklist before returning to main workflow
```

## Testing

- Comprehensive test suite covers all new functionality
- Error handling for non-existent workflows/checklists/sessions
- Workflow depth tracking validation
- Integration with existing session management
- All existing tests continue to pass

## Alternatives Considered

1. **Flat Execution Model**: Rejected due to lack of context preservation
2. **Separate Session Management**: Rejected due to complexity and state fragmentation
3. **Agent-Only Planning**: Rejected due to high token costs and inconsistency

## Consequences

### Positive

- Significantly reduced token usage for complex workflows
- Consistent execution patterns across different agents
- Persistent progress tracking
- Reusable workflow components

### Negative

- Slight increase in system complexity
- Agents need to learn new workflow discovery patterns

### Neutral

- Maintains backward compatibility with existing workflow execution
- Builds on existing session management infrastructure

## Related Decisions

- [ADR-001: YAML Workflow System](./adr-001-yaml-workflow-system.md) - Foundation for workflow definition
- [ADR-002: Checklist System](./adr-002-checklist-system.md) - Foundation for validation workflows

## Implementation Notes

The feature leverages the existing session stack mechanism, ensuring minimal impact on existing functionality while providing powerful new capabilities for agent workflow composition.
