# CLI Interface API Reference

The CLI interface provides command-line access to Vibe's workflow orchestration capabilities with command routing and user-friendly options.

## Core Commands

### run

Executes workflows based on natural language prompts with automatic analysis and orchestration.

```bash
vibe run "prompt text" [options]
```

**Parameters:**

- `prompt: str` - Natural language description of what to accomplish (required)

**Options:**

- `--workflow, -w`: Force specific workflow execution
- `--config, -c`: Path to configuration file
- `--project-type, -t`: Override automatic project type detection
- `--quiet, -q`: Suppress analysis output

**Examples:**

```bash
vibe run "analyze the codebase structure"
vibe run "implement user authentication"
vibe run --workflow testing "validate everything"
vibe run --project-type python "set up development environment"
```

**Implementation:**

```python
def run_workflow(
    prompt: str,
    workflow: str | None = None,
    config_path: str | None = None,
    project_type: str | None = None,
    quiet: bool = False,
) -> None:
    try:
        # Load configuration
        config = VibeConfig.load_from_file(Path(config_path) if config_path else None)

        # Override project type if specified
        if project_type:
            config.project_type = project_type

        # Analyze prompt or use forced workflow
        if workflow:
            workflows = [workflow]
            if not quiet:
                console.print(f"Using forced workflow: {workflow}")
        else:
            analyzer = PromptAnalyzer(config)
            workflows = analyzer.analyze(prompt, show_analysis=not quiet)

        # Plan workflows and provide guidance
        orchestrator = WorkflowOrchestrator(config)
        result = orchestrator.plan_workflows(workflows, prompt)

        if not result["success"]:
            sys.exit(1)

    except KeyboardInterrupt:
        console.print("Interrupted by user")
        sys.exit(130)
    except Exception as e:
        console.print(f"Error: {e}")
        sys.exit(1)
```

### init

Initializes Vibe configuration and provides project setup guidance.

```bash
vibe init [options]
```

**Options:**

- `--project-type, -t`: Specify project type (python, javascript, typescript, rust, generic)
- `--json`: Output results in JSON format for MCP integration

**Behavior:**

1. Checks for existing `.vibe.yaml` configuration
2. If exists, reports current configuration
3. If not exists, creates default configuration based on project detection
4. Provides setup guidance and next steps
5. Optionally outputs JSON for programmatic consumption

**Implementation:**

```python
def init(project_type: str | None, output_json: bool = False) -> None:
    vibe_config_path = Path.cwd() / ".vibe.yaml"

    if vibe_config_path.exists():
        if output_json:
            result = {
                "status": "already_initialized",
                "config_path": str(vibe_config_path),
                "message": "Vibe is already initialized"
            }
            print(json.dumps(result))
        else:
            console.print("Vibe is already initialized in this project")
        return

    # Detect or use specified project type
    if not project_type:
        from ..project_types import ProjectDetector
        detector = ProjectDetector()
        project_type = detector.detect_project_type()

    # Create default configuration
    default_config = {
        "project_type": project_type,
        "workflows": {},
        "lint": {
            "exclude_patterns": []
        }
    }

    # Write configuration file
    with open(vibe_config_path, "w") as f:
        yaml.dump(default_config, f, default_flow_style=False)

    # Provide guidance
    if output_json:
        result = {
            "status": "initialized",
            "config_path": str(vibe_config_path),
            "project_type": project_type,
            "next_steps": ["Run 'vibe run \"your prompt\"' to start"]
        }
        print(json.dumps(result))
    else:
        console.print(f"Initialized Vibe for {project_type} project")
        console.print("Next: Run 'vibe run \"your prompt\"' to start")
```

### guide

Provides guidance based on natural language requests.

```bash
vibe guide "guidance request" [options]
```

**Parameters:**

- `request: str` - Natural language guidance request

**Options:**

- `--config, -c`: Path to configuration file
- `--json`: Output in JSON format

**Examples:**

```bash
vibe guide "help me test my Python code"
vibe guide "validate my recent changes"
vibe guide "what quality checks should I run?"
```

**Implementation:**

```python
def guide(request: str, config: str | None, output_json: bool) -> None:
    try:
        # Load configuration
        config_obj = VibeConfig.load_from_file(Path(config) if config else None)

        # Analyze request for guidance
        analyzer = PromptAnalyzer(config_obj)
        suggestions = analyzer.analyze(request, show_analysis=not output_json)

        # Format guidance response
        if output_json:
            result = {
                "request": request,
                "suggestions": suggestions,
                "guidance": "Use 'vibe run' to execute suggested workflows"
            }
            print(json.dumps(result))
        else:
            if suggestions:
                console.print("[green]💡 Suggested workflows:[/green]")
                for suggestion in suggestions:
                    console.print(f"  • {suggestion}")
                console.print("\n[blue]Run with: vibe run \"your prompt\"[/blue]")
            else:
                console.print("[yellow]No specific workflows found for your request[/yellow]")

    except Exception as e:
        if output_json:
            result = {"error": str(e)}
            print(json.dumps(result))
        else:
            console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)
```

## Validation Commands

### check

Runs validation and quality checks on the project.

```bash
vibe check [target] [options]
```

**Parameters:**

- `target: str` - Optional target to check (default: all)

**Options:**

- `--config, -c`: Path to configuration file
- `--verbose, -v`: Show detailed output

**Examples:**

```bash
vibe check
vibe check workflows
vibe check config
```

### validate

Validates specific components or configurations.

```bash
vibe validate [component] [options]
```

**Examples:**

```bash
vibe validate config
vibe validate workflows
vibe validate session
```

### config-info

Displays current configuration information.

```bash
vibe config-info [options]
```

**Options:**

- `--json`: Output in JSON format
- `--path`: Show configuration file path

### list-workflows

Lists all available workflows and their triggers.

```bash
vibe list-workflows [options]
```

**Options:**

- `--project-type, -t`: Filter by project type
- `--json`: Output in JSON format

## Command Groups

### workflows

Workflow management commands.

```bash
vibe workflows [subcommand] [options]
```

**Subcommands:**

- `list`: List available workflows
- `show`: Show workflow details
- `validate`: Validate workflow definitions

### mcp

Model Context Protocol integration commands.

```bash
vibe mcp [subcommand] [options]
```

**Subcommands:**

- `server`: Start MCP server
- `client`: MCP client operations

### lint

Code quality and linting commands.

```bash
vibe lint [target] [options]
```

**Parameters:**

- `target: str` - Target to lint (default: project)

**Options:**

- `--format`: Output format (json, rich, summary)
- `--severity`: Filter by severity (error, warning, info)

### checklists

Checklist management commands.

```bash
vibe checklists [subcommand] [options]
```

**Subcommands:**

- `list`: List available checklists
- `run`: Execute checklist validation
- `show`: Show checklist details

## Main CLI Structure

### CLI Group Definition

```python
@click.group()
@click.option("--version", "-v", is_flag=True, help="Show version and exit")
@click.pass_context
def cli(ctx: click.Context, version: bool) -> None:
    """Vibe: Workflow orchestrator for vibe coding.

    Analyzes your prompts and executes appropriate development workflows.
    """
    if version:
        console.print(f"vibe version {__version__}")
        sys.exit(0)
```

### Command Registration

```python
# Add individual commands
cli.add_command(run)
cli.add_command(init)
cli.add_command(guide)
cli.add_command(check)
cli.add_command(config_info)
cli.add_command(list_workflows)
cli.add_command(validate)

# Add command groups
cli.add_command(workflows)
cli.add_command(mcp)
cli.add_command(lint)
cli.add_command(checklists)
```

### Smart Command Detection

The CLI includes intelligent command routing that treats unknown arguments as prompts:

```python
def main() -> None:
    ### Command Detection

The CLI includes command routing that treats unknown arguments as prompts:

```python
    """Main entry point with command detection."""
    args = sys.argv[1:]

    # Handle different argument scenarios
    if not args:
        cli(["--help"])
        return

    if _is_known_command_or_option(args[0]):
        cli()
        return

    # Treat as prompt for run command
    _handle_prompt_command(args)

def _is_known_command_or_option(first_arg: str) -> bool:
    """Check if the first argument is a known command or option."""
    known_commands = [
        "run", "init", "check", "config-info", "list-workflows",
        "validate", "guide", "workflows", "mcp", "lint", "checklists"
    ]
    return first_arg in known_commands or first_arg.startswith("-")

def _handle_prompt_command(args: list[str]) -> None:
    """Handle arguments as a prompt for the run command."""
    prompt_args, options = _parse_prompt_and_options(args)
    prompt = " ".join(prompt_args)

    # Run the command with parsed arguments
    sys.argv = ["vibe", "run"] + options + [prompt]
    cli()
```

This allows natural usage patterns:

```bash
# These are equivalent:
vibe run "set up testing"
vibe "set up testing"

# Options still work:
vibe --quiet "analyze code"
vibe --workflow testing "run tests"
```

## Error Handling

### Common Error Patterns

1. **KeyboardInterrupt**: Graceful handling with exit code 130
2. **Configuration errors**: Clear error messages with suggestions
3. **Workflow not found**: Helpful suggestions for similar workflows
4. **File permission errors**: Clear error messages with resolution steps

### Exit Codes

- `0`: Success
- `1`: General error
- `130`: Interrupted by user (Ctrl+C)

### Error Output

```python
def handle_error(error: Exception, quiet: bool = False) -> None:
    """Handle errors consistently across commands."""
    if isinstance(error, KeyboardInterrupt):
        if not quiet:
            console.print("\n[yellow]🛑 Interrupted by user[/yellow]")
        sys.exit(130)
    elif isinstance(error, FileNotFoundError):
        console.print(f"[red]❌ File not found: {error}[/red]")
        sys.exit(1)
    else:
        console.print(f"[red]❌ Error: {error}[/red]")
        sys.exit(1)
```

## Rich Console Integration

The CLI uses Rich for enhanced terminal output:

```python
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

# Example usage in commands
console.print("[green]✅ Success[/green]")
console.print(Panel("Important information", title="Note"))

# Tables for structured data
table = Table(title="Available Workflows")
table.add_column("Name")
table.add_column("Description")
for name, workflow in workflows.items():
    table.add_row(name, workflow.description)
console.print(table)
```

## Integration Examples

### Basic Workflow Execution

```bash
# Simple prompt analysis and execution
vibe "help me set up a Python project"

# Force specific workflow
vibe run --workflow python_setup "create environment"

# Quiet mode for scripting
vibe run --quiet "run quality checks"
```

### Configuration Management

```bash
# Initialize project
vibe init --project-type python

# Check current configuration
vibe config-info --json

# Validate setup
vibe check --verbose
```

### Workflow Discovery

```bash
# List all workflows
vibe list-workflows

# Find workflows for specific project type
vibe workflows list --project-type python

# Get guidance for specific task
vibe guide "I need to add testing to my project"
```

### Quality Assurance

```bash
# Run project-wide quality checks
vibe lint

# Check specific aspects
vibe check workflows
vibe validate config

# Run checklists
vibe checklists run python_quality
```
