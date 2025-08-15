# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Build and development
npm run build              # Full build with data copy
npm run build:fast         # Fast build without cleaning
npm run dev               # Development mode with tsx
npm run mcp-server        # Start MCP server in development

# Testing
npm test                  # Run tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage
npm run test:integration  # Run integration tests only

# Code quality
npm run lint              # Run ESLint
npm run lint:fix          # Fix linting issues automatically
npm run format            # Format code with Prettier
npm run type-check        # Run TypeScript type checking
npm run quality           # Run all quality checks (lint + format + type + test + deps)
npm run quality:fix       # Fix all automatically fixable issues

# Dependencies
npm run deps:check        # Check for unused dependencies with knip
npm run deps:fix          # Remove unused dependencies
```

## Architecture Overview

Vibe is a **planning tool** for AI agents built around two core concepts:

### 1. Plan System (Core Feature)

- **Persistent nested todo lists** that serve as long-term memory for agents
- Plans automatically persist to `~/.vibe/current-plan.json`
- Agents can break down tasks into arbitrary sub-task depth
- Key classes: `PlanManager`, `PlanImpl`, `PlanItemImpl` in `src/plan.ts`

### 2. Workflow Guidance (Read-Only Reference)

- **58+ searchable workflows** that provide inspiration and best practices
- Workflows are **guidance-only** - agents search and reference them for inspiration
- YAML files in `data/workflows/` organized by category
- Key classes: `WorkflowRegistry` in `src/workflow-registry.ts`, workflow loading in `src/workflows.ts`

### 3. MCP Integration

- Exposes plan management and workflow search via Model Context Protocol
- Main MCP tools defined in `src/mcp-server/` handlers
- Core tools: `get_plan_status`, `add_plan_item`, `complete_plan_item`, `expand_plan_item`, `clear_plan`, `query_workflows`

## Key Files and Structure

```
src/
├── plan.ts              # Core plan system (PlanManager, PlanItem classes)
├── workflow-registry.ts # Simple workflow search and reference
├── workflows.ts         # Workflow loading from YAML files
├── mcp-server.ts        # Main MCP server entry point
├── cli.ts              # CLI entry point
├── cli/
│   ├── plan-commands.ts # Plan CLI commands
│   └── workflow-commands.ts # Workflow CLI commands
├── mcp-server/
│   ├── plan-handlers.ts    # MCP plan operations
│   ├── workflow-handlers.ts # MCP workflow queries
│   └── query-handlers.ts   # Generic MCP queries
└── config/             # Configuration loading and validation

data/
└── workflows/          # YAML workflow definitions organized by category
```

## Development Notes

- **Plan-centric architecture**: Everything revolves around persistent plans that agents manage
- **No sessions**: Plans persist indefinitely until explicitly cleared by agents
- **No checklists**: Workflows serve as guidance inspiration only
- **TypeScript throughout**: Full type safety with interfaces in `src/models.ts`
- **Configuration system**: Auto-detects project types, configurable via `vibe.config.js`

## Testing Strategy

- Unit tests use Vitest framework
- Integration tests verify MCP protocol compliance
- Plan persistence tested with temporary directories
- Workflow loading and validation tested against YAML schemas

## Common Patterns

- All async operations use proper error handling with try/catch
- CLI commands follow consistent patterns with `CLIResult` responses
- MCP handlers return structured success/error objects
- File operations use `fs/promises` for async I/O
- UUIDs generated with `crypto.randomUUID()` for plan item IDs
