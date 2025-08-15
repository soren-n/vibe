# CLI Interface API Reference

The CLI interface provides command-line access to Vibe's plan management and workflow guidance capabilities.

## Core Architecture

Vibe now focuses on two main areas:

1. **Plan Management**: Persistent nested todo lists for AI agents
2. **Workflow Guidance**: Searchable workflows that provide inspiration and best practices

## Plan Commands

### plan status

Shows the current plan with completion statistics.

```bash
vibe plan status [options]
```

**Options:**

- `--format <format>`: Output format (table, json). Default: table

**Example Output:**

```
Plan Status (1/2 complete)
✅ Complete first task
⏳ Work on second task
Total: 2, Completed: 1, Pending: 1
50% complete
```

### plan add

Adds a new item to the plan.

```bash
vibe plan add <text> [options]
```

**Parameters:**

- `text: str` - Description of the task to add (required)

**Options:**

- `--parent <parentId>`: Parent item ID for creating subtasks
- `--format <format>`: Output format (json, text). Default: text

**Examples:**

```bash
vibe plan add "Implement user authentication"
vibe plan add "Write unit tests" --parent abc123
```

### plan complete

Marks a plan item as complete.

```bash
vibe plan complete <itemId> [options]
```

**Parameters:**

- `itemId: str` - ID of the item to complete (required)

**Options:**

- `--format <format>`: Output format (json, text). Default: text

### plan expand

Expands a plan item by adding multiple subtasks.

```bash
vibe plan expand <itemId> <subTasks...> [options]
```

**Parameters:**

- `itemId: str` - ID of the item to expand (required)
- `subTasks: str[]` - Array of subtask descriptions (required)

**Options:**

- `--format <format>`: Output format (json, text). Default: text

**Example:**

```bash
vibe plan expand abc123 "Design API" "Implement endpoints" "Write tests"
```

### plan clear

Clears the entire plan, removing all items.

```bash
vibe plan clear [options]
```

**Options:**

- `--format <format>`: Output format (json, text). Default: text

## Workflow Commands

### workflows list

Lists all available workflows for guidance.

```bash
vibe workflows list [options]
```

**Options:**

- `--project-type <type>`: Filter by project type
- `--format <format>`: Output format (table, json). Default: table

### workflows show

Shows detailed information about a specific workflow.

```bash
vibe workflows show <name> [options]
```

**Parameters:**

- `name: str` - Name of the workflow to display (required)

**Options:**

- `--format <format>`: Output format (yaml, json). Default: yaml

### run (Guidance Mode)

Displays workflow guidance instead of executing workflows.

```bash
vibe run <workflow> [options]
```

**Parameters:**

- `workflow: str` - Name of the workflow to show guidance for (required)

**Options:**

- `--interactive`: Display in interactive format
- `--timeout <ms>`: Timeout in milliseconds (legacy option, ignored)

**Note**: This command now shows guidance and inspiration rather than executing workflows.

## Utility Commands

### check

Validates the Vibe environment and configuration.

```bash
vibe check [options]
```

**Options:**

- `--json`: Output results in JSON format for MCP compatibility

### init

Initializes Vibe configuration for a project.

```bash
vibe init [options]
```

**Options:**

- `--project-type <type>`: Specify project type (typescript, javascript, python, rust, etc.)

### workflows validate

Validates all YAML workflow files for schema compliance.

```bash
vibe workflows validate [options]
```

**Options:**

- `--json`: Output results in JSON format

## Lint Commands

### lint run

Runs project linting with optional auto-fixing.

```bash
vibe lint run [options]
```

**Options:**

- `--fix`: Automatically fix issues where possible
- `--format <format>`: Output format (table, json). Default: table

## Output Formats

Most commands support multiple output formats:

- **table**: Human-readable table format (default for most commands)
- **json**: Machine-readable JSON format (useful for scripting and MCP)
- **yaml**: YAML format (for workflow display)
- **text**: Simple text format (for simple responses)

## Configuration

Commands automatically detect and use:

- `.vibe.yaml`: Project configuration
- `.vibe-plan.json`: Persistent plan storage
- `data/workflows/`: Workflow guidance files

## Migration from Session-Based Interface

If you were using the previous session-based commands:

| Old Command           | New Equivalent                                | Notes                                   |
| --------------------- | --------------------------------------------- | --------------------------------------- |
| `vibe guide "prompt"` | `vibe workflows list` + `vibe run <workflow>` | Search workflows, then view guidance    |
| Session management    | `vibe plan status`                            | Plans are persistent, no session needed |
| Workflow execution    | `vibe run <workflow>`                         | Now shows guidance instead of executing |

            config.project_type = project_type
