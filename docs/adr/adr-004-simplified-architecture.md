# ADR-004: Simplified Architecture - Plan-Focused System

**Status**: Accepted
**Date**: 2025-08-15
**Authors**: Architecture Refactoring Team

## Context

During usage of the Vibe MCP tool, we realized the architecture was unnecessarily complex with multiple overlapping systems:

1. **Checklists and Workflows**: Both provided similar guidance functionality
2. **Session-based Execution**: Added complexity without clear benefit for agent usage
3. **Workflow Execution**: Agents needed guidance, not automated execution
4. **Multiple Interfaces**: Session management, workflow execution, and planning systems

This complexity made the tool harder to use and understand, especially for AI agents that needed a simple planning interface.

## Decision

We have simplified Vibe to focus on its core value proposition as a **planning tool for AI agents**:

### Architecture Changes

1. **Remove Checklists**: Converted to workflows, eliminating duplicate functionality
2. **Workflows → Guidance Only**: Removed execution capabilities, workflows now provide inspiration and best practices
3. **Remove Sessions**: Eliminated session management completely
4. **Plan System → Core**: Made the persistent plan system the primary interface
5. **MCP → Plan-Focused**: Updated MCP tools to focus on plan management

### New Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Vibe Architecture                       │
├─────────────────────────────────────────────────────────────┤
│  MCP Interface (Plan-Focused)                              │
│  ├── get_plan_status()                                     │
│  ├── add_plan_item(text, parent_id?)                       │
│  ├── complete_plan_item(item_id)                           │
│  ├── expand_plan_item(item_id, sub_tasks[])                │
│  ├── clear_plan()                                          │
│  └── query_workflows(pattern?, category?)                  │
├─────────────────────────────────────────────────────────────┤
│  Core Systems                                              │
│  ├── Plan Manager (Persistent Nested Todo Lists)          │
│  ├── Workflow Registry (77+ Guidance Workflows)           │
│  ├── Project Detection                                     │
│  └── Linting Support                                       │
└─────────────────────────────────────────────────────────────┘
```

## Benefits

### For AI Agents

- **Simple Interface**: Clear plan management tools instead of complex session handling
- **Persistent Memory**: Plans survive between interactions, serving as long-term memory
- **Flexible Planning**: Break down problems to arbitrary resolution on the fly
- **Guidance Access**: 77+ workflows available as searchable inspiration

### For Users

- **Easier Understanding**: Single persistent plan instead of multiple sessions
- **Reduced Complexity**: Fewer concepts to learn and manage
- **Better Performance**: Eliminated session overhead and management complexity

### For Maintenance

- **Simpler Codebase**: Removed ~30% of code by eliminating sessions and checklists
- **Clear Purpose**: Each component has a single, well-defined responsibility
- **Easier Testing**: Fewer interactions between systems

## Implementation

### Removed Components

- ✅ Checklist system (converted to workflows)
- ✅ Session management (SessionManager, session storage)
- ✅ Workflow execution (start/advance/back/restart operations)
- ✅ Session-based MCP tools

### Enhanced Components

- ✅ Plan system (now the core feature)
- ✅ Workflow guidance (77+ searchable workflows)
- ✅ MCP interface (plan-focused tools)

### Migration Path

- Existing checklist converted to `project-cleanup` workflow
- No breaking changes for workflow YAML files
- MCP interface updated but maintains compatibility with agent patterns

## Consequences

### Positive

- **Simplified mental model**: One persistent plan instead of multiple temporary sessions
- **Better agent experience**: Clear planning interface with persistent state
- **Reduced maintenance burden**: Fewer systems to maintain and test
- **Improved performance**: No session management overhead

### Trade-offs

- **Less workflow automation**: Workflows provide guidance rather than execution
- **No session isolation**: Single global plan instead of multiple isolated sessions
- **Different paradigm**: Users need to adapt from session-based to plan-based thinking

## Future Considerations

- Consider adding plan templates based on common patterns
- May add plan sharing/export capabilities
- Could enhance workflow guidance with interactive elements
- Might add plan analytics and insights

## Related ADRs

- ADR-001: YAML Workflow System (enhanced for guidance-only)
- ADR-003: Nested Workflow Execution (replaced with nested planning)
- ~~ADR-002: Checklist System~~ (superseded by this decision)
