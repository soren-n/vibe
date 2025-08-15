# Implementation Guide

Use this guide to understand and maintain the simplified Vibe system.

## Architecture Overview

Vibe is now a **plan-focused guidance system** with these core components:

- **Plan System**: Persistent nested todo lists (primary feature)
- **Workflow Registry**: 77+ guidance workflows (inspiration only)
- **MCP Interface**: Plan management tools for AI agents
- **Project Detection**: Automatic project type detection
- **Linting Support**: Code quality guidance

## Core Data Models

### Plan System

**PlanItem** interface with properties:

- `id: string` (UUID)
- `text: string` (task description)
- `status: 'pending' | 'complete'`
- `children: PlanItem[]` (nested subtasks)
- `createdAt: string`
- `completedAt?: string`

**Plan** interface with:

- `items: PlanItem[]` (root level items)
- `lastModified: string`
- `createdAt: string`

**PlanManager** class with:

- Persistent storage to `~/.vibe/current-plan.json`
- CRUD operations for plan items
- Nested item management
- Statistics and status reporting

### Workflow System (Guidance Only)

**Workflow** interface with:

- `name: string`
- `description: string`
- `steps: string[]`
- `triggers: string[]`
- `category?: string`
- `projectTypes?: string[]`

**WorkflowOrchestrator** class with:

- Workflow loading from YAML files
- Pattern-based workflow discovery
- Guidance generation (no execution)

## Core Components

### Plan Management

**PlanHandlers** (MCP interface):

- `getPlanStatus()` - show current plan with statistics
- `addPlanItem(text, parentId?)` - add tasks or subtasks
- `completePlanItem(itemId)` - mark items complete
- `expandPlanItem(itemId, subTasks[])` - break down tasks
- `clearPlan()` - reset the entire plan

**Plan CLI Commands**:

- `vibe plan status` - show plan overview
- `vibe plan add <text>` - add root level items
- `vibe plan complete <itemId>` - mark items complete
- `vibe plan expand <itemId> <subTasks...>` - add subtasks
- `vibe plan clear` - clear entire plan

### Workflow Guidance

**WorkflowHandlers** (MCP interface):

- `queryWorkflows(pattern?, category?)` - search workflows

**Workflow CLI Commands**:

- `vibe workflows list` - show available workflows
- `vibe workflows show <name>` - show workflow details
- `vibe run <workflow>` - display workflow guidance (not execution)

## MCP Interface

### Plan-Focused Tools

- `get_plan_status`: Show current plan with completion statistics
- `add_plan_item`: Add new tasks with optional parent for nesting
- `complete_plan_item`: Mark tasks as complete
- `expand_plan_item`: Break down tasks into subtasks
- `clear_plan`: Reset the entire plan

### Guidance Tools

- `query_workflows`: Search 77+ workflows for inspiration
- `check_vibe_environment`: Validate configuration
- `lint_project`: Run quality checks

## Key Simplifications ✅

These systems were removed during the architectural refactoring:

- ~~**Session Management**~~ - Replaced with persistent plans
- ~~**Checklist System**~~ - Converted to workflows
- ~~**Workflow Execution**~~ - Now guidance-only
- ~~**Session-based MCP Tools**~~ - Replaced with plan tools

### Implementation Benefits

1. **Single Persistent Plan**: Instead of multiple temporary sessions
2. **Guidance-Only Workflows**: Provide inspiration, not automation
3. **Plan-Focused Interface**: All MCP tools revolve around plan management
4. **No Session State**: Plans persist automatically, no session management needed

## File Structure

```
src/
├── plan.ts                    # Core plan system (NEW)
├── workflows.ts               # Workflow loading and querying
├── orchestrator.ts           # Simplified workflow orchestrator
├── mcp-server.ts            # Plan-focused MCP interface
├── mcp-server/
│   ├── plan-handlers.ts     # Plan management tools (NEW)
│   ├── workflow-handlers.ts # Workflow guidance tools
│   ├── query-handlers.ts    # Generic query tools
│   ├── lint-handlers.ts     # Linting support
│   └── environment-handlers.ts # Environment validation
├── cli/
│   ├── plan-commands.ts     # Plan CLI interface (NEW)
│   ├── workflow-commands.ts # Workflow CLI interface
│   ├── core-commands.ts     # Core CLI commands
│   └── generic-commands.ts  # Generic CLI commands
└── config/                  # Configuration system
    ├── types.ts             # Configuration types
    ├── defaults.ts          # Default configurations
    ├── loader.ts            # Configuration loading
    └── vibe-config.ts       # Main configuration class
```

## Data Storage

- **Plan Data**: `~/.vibe/current-plan.json` (persistent, survives restarts)
- **Workflow Data**: `data/workflows/**/*.yaml` (read-only guidance)
- **Configuration**: `.vibe.yaml` (project settings)

## Development Workflow

### Adding New Plan Features

1. Update `PlanItem` or `Plan` interfaces in `src/plan.ts`
2. Implement logic in `PlanManager` class
3. Add MCP tools in `src/mcp-server/plan-handlers.ts`
4. Add CLI commands in `src/cli/plan-commands.ts`
5. Update tests in `tests/`

### Adding New Workflows

1. Create YAML file in `data/workflows/category/`
2. Include required fields: `name`, `description`, `steps`, `triggers`
3. Test with `vibe workflows show <name>`
4. Workflows automatically discovered on next load

### Configuration Changes

1. Update types in `src/config/types.ts`
2. Add defaults in `src/config/defaults.ts`
3. Update loading logic in `src/config/loader.ts`
4. Test configuration loading

## Testing Strategy

- **Unit Tests**: Core functionality in each module
- **Integration Tests**: End-to-end workflows
- **CLI Tests**: Command interface validation
- **MCP Tests**: Protocol compliance
- **Plan Persistence Tests**: Data integrity across restarts

## Quality Assurance

### Current Status ✅

- ✅ All core functionality works end-to-end
- ✅ Plan system persists correctly
- ✅ Workflow guidance accessible via CLI and MCP
- ✅ Build succeeds without errors
- ✅ Core tests pass after simplification
- ✅ Documentation updated to reflect new architecture

### Testing Commands

```bash
# Build and test
npm run build
npm test

# CLI functionality
npm run cli -- plan status
npm run cli -- plan add "Test task"
npm run cli -- workflows list

# Environment validation
npm run cli -- check

# Quality checks
npm run quality
```

## Troubleshooting

### Common Issues

**Plan not persisting**: Check `~/.vibe/` directory permissions
**Workflows not loading**: Verify `data/workflows/` YAML syntax
**MCP tools not working**: Ensure VS Code MCP configuration is correct
**CLI errors**: Run `npm run build` to ensure dist/ is up to date

### Debug Commands

```bash
# Check configuration
npm run cli -- config-info

# Validate workflows
npm run cli -- workflows validate

# Environment diagnostics
npm run cli -- check --json
```

## Future Enhancements

Potential improvements while maintaining architectural simplicity:

- **Plan Templates**: Common planning patterns
- **Plan Analytics**: Usage insights and statistics
- **Workflow Interactivity**: Enhanced guidance with examples
- **Plan Sharing**: Export/import capabilities
- **Better Search**: Enhanced workflow discovery algorithms

Each enhancement should preserve the core simplicity and plan-focused architecture.
