# ADR-005: Planning-Focused Architecture

## Status

Accepted

## Context

The vibe-mcp project has architectural confusion between being a "planning tool" and a "workflow orchestrator". Analysis revealed:

1. **Documentation Claims**: "Planning tool" with "guidance-only workflows"
2. **Implementation Reality**: Complex workflow orchestration with execution planning
3. **Code Evidence**: 199-line WorkflowOrchestrator with sophisticated planning logic
4. **User Confusion**: Unclear what the tool actually does vs. what it claims to do

The current architecture tries to serve two masters and serves neither well.

## Decision

**We will focus vibe-mcp as a pure planning tool with guidance-only workflows.**

### What This Means:

1. **Core Focus**: Persistent nested todo lists (plan management)
2. **Workflow Role**: Read-only inspiration and guidance, not execution
3. **MCP Integration**: Plan management tools + workflow search/reference
4. **Simplification**: Remove complex workflow orchestration logic

### What We're Removing:

- Complex workflow execution planning in `WorkflowOrchestrator`
- `ExecutionPlanStep` and `WorkflowPlanResult` interfaces
- Workflow confidence scoring and reasoning
- Multi-step workflow orchestration

### What We're Keeping:

- Complete plan management system (PlanManager, PlanItem)
- Workflow loading and search for reference
- MCP protocol implementation
- All existing MCP plan management tools

## Consequences

### Positive:

- **Clarity**: Clear, focused purpose
- **Simplicity**: Easier to understand and maintain
- **Performance**: Lighter weight, faster
- **Testing**: Easier to achieve high test coverage
- **Documentation**: Truth alignment between docs and implementation

### Negative:

- **Feature Reduction**: Less sophisticated workflow features
- **User Impact**: Users relying on complex workflow planning may need alternatives
- **Code Deletion**: Significant refactoring required

## Implementation Plan

1. Simplify `WorkflowOrchestrator` to `WorkflowRegistry` (search/reference only)
2. Remove execution planning logic
3. Update MCP server to reflect new architecture
4. Align documentation with implementation
5. Update tests to cover new simplified architecture

## Alternatives Considered

- **Option B**: Embrace full workflow orchestrator role - Rejected due to scope creep and complexity
- **Hybrid Approach**: Keep both - Rejected due to architectural confusion

## Date

2025-08-15
