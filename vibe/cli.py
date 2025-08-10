"""
CLI interface for vibe.
"""

import sys
from pathlib import Path

import click
from rich.console import Console

from . import __version__
from .analyzer import PromptAnalyzer
from .config import VibeConfig
from .orchestrator import WorkflowOrchestrator

console = Console()


@click.group()
@click.option("--version", "-v", is_flag=True, help="Show version and exit")
@click.pass_context
def cli(ctx: click.Context, version: bool) -> None:
    """
    Vibe: Intelligent workflow orchestrator for vibe coding.

    Analyzes your prompts and executes appropriate development workflows.
    """
    if version:
        console.print(f"vibe version {__version__}")
        sys.exit(0)


@cli.command()
@click.option("--workflow", "-w", help="Force specific workflow")
@click.option("--config", "-c", type=click.Path(exists=True), help="Config file path")
@click.option("--project-type", "-t", help="Override project type detection")
@click.option("--quiet", "-q", is_flag=True, help="Suppress analysis output")
@click.argument("prompt")
def run(
    workflow: str | None,
    config: str | None,
    project_type: str | None,
    quiet: bool,
    prompt: str,
) -> None:
    """
    Run workflow based on prompt analysis.

    Examples:
        vibe run "analyze the codebase structure"
        vibe run "implement user authentication"
        vibe run --workflow testing "validate everything"
    """
    run_workflow(prompt, workflow, config, project_type, quiet)


def run_workflow(
    prompt: str,
    workflow: str | None = None,
    config_path: str | None = None,
    project_type: str | None = None,
    quiet: bool = False,
) -> None:
    """Run workflow based on prompt analysis."""
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
                console.print(f"[blue]🎯 Using forced workflow: {workflow}[/blue]")
                console.print()
        else:
            analyzer = PromptAnalyzer(config)
            workflows = analyzer.analyze(prompt, show_analysis=not quiet)

        # Plan workflows and provide guidance
        orchestrator = WorkflowOrchestrator(config)
        result = orchestrator.plan_workflows(workflows, prompt)

        if not result["success"]:
            sys.exit(1)

    except KeyboardInterrupt:
        console.print("\n[yellow]🛑 Interrupted by user[/yellow]")
        sys.exit(130)
    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.option(
    "--project-type", "-t", help="Project type (python, vue_typescript, generic)"
)
def init(project_type: str | None) -> None:
    """Initialize vibe configuration in current directory."""
    config_path = Path(".vibe.yaml")

    if config_path.exists():
        console.print("[yellow]⚠️ .vibe.yaml already exists[/yellow]")
        if not click.confirm("Overwrite existing configuration?"):
            return

    # Auto-detect project type if not specified
    if not project_type:
        config = VibeConfig()
        detected_type = config.detect_project_type()
        project_type = detected_type
        console.print(f"[blue]🔍 Detected project type: {project_type}[/blue]")

    # Create basic configuration
    config_content = f"""# Vibe workflow configuration
project_type: "{project_type}"

# Customize workflows for your project
workflows:
  testing:
    commands:
      - "echo 'Add your test commands here'"
  quality:
    commands:
      - "echo 'Add your quality check commands here'"
  analysis:
    commands:
      - "echo 'Add your analysis commands here'"

# Override triggers if needed
# workflows:
#   custom_workflow:
#     triggers: ["custom", "special"]
#     commands: ["echo 'Custom workflow'"]
#     description: "🎨 Custom workflow description"
"""

    with open(config_path, "w") as f:
        f.write(config_content)

    console.print("[green]✅ Created .vibe.yaml configuration[/green]")
    console.print(
        "[blue]📝 Edit .vibe.yaml to customize workflows for your project[/blue]"
    )


@cli.command("config-info")
def config_info() -> None:
    """Show current configuration information."""
    try:
        config = VibeConfig.load_from_file()
        project_type = config.detect_project_type()

        console.print("[bold]Vibe Configuration[/bold]")
        console.print(f"Project Type: [blue]{project_type}[/blue]")
        console.print(
            f"Config Source: [blue]{config._find_config_file() or 'defaults'}[/blue]"
        )

        console.print("\n[bold]Available Workflows:[/bold]")
        for name, workflow_config in config.workflows.items():
            console.print(f"  [green]{name}[/green]: {workflow_config.description}")

        # Show project-specific workflows
        project_config = config.project_types.get(project_type)
        if project_config and project_config.workflows:
            console.print("\n[bold]Project-Specific Workflows:[/bold]")
            for name, workflow_config in project_config.workflows.items():
                commands = workflow_config.commands or ["(no commands)"]
                console.print(f"  [cyan]{name}[/cyan]: {len(commands)} commands")

    except Exception as e:
        console.print(f"[red]❌ Error loading configuration: {e}[/red]")
        sys.exit(1)


@cli.command("list-workflows")
@click.argument("workflows", nargs=-1)
def list_workflows(workflows: tuple[str, ...]) -> None:
    """List available workflows and their triggers."""
    try:
        config = VibeConfig.load_from_file()

        console.print("[bold]Available Workflows:[/bold]\n")

        target_workflows = workflows if workflows else config.workflows.keys()

        for workflow_name in target_workflows:
            workflow_config = config.workflows.get(workflow_name)
            if not workflow_config:
                console.print(f"[red]❌ Unknown workflow: {workflow_name}[/red]")
                continue

            console.print(f"[bold green]{workflow_name}[/bold green]")
            console.print(f"  {workflow_config.description}")

            if workflow_config.triggers:
                triggers_str = ", ".join(workflow_config.triggers)
                console.print(f"  [dim]Triggers: {triggers_str}[/dim]")

            if workflow_config.commands:
                console.print(
                    f"  [dim]Commands: {len(workflow_config.commands)} configured[/dim]"
                )

            console.print()

    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")
        sys.exit(1)


# For backwards compatibility with simple prompt usage
def main() -> None:
    """Main entry point with smart command detection."""
    args = sys.argv[1:]

    # If no args, show help
    if not args:
        cli(["--help"])
        return

    # If first arg is a known command, use normal CLI
    known_commands = ["run", "init", "config-info", "list-workflows", "guide"]
    if args[0] in known_commands or args[0].startswith("-"):
        cli()
        return

    # Otherwise, treat as a prompt for run command
    # Extract options first
    prompt_args = []
    options = []
    i = 0
    while i < len(args):
        if args[i].startswith("--"):
            options.append(args[i])
            if i + 1 < len(args) and not args[i + 1].startswith("--"):
                options.append(args[i + 1])
                i += 2
            else:
                i += 1
        elif args[i].startswith("-") and args[i] != "-":
            options.append(args[i])
            if i + 1 < len(args) and not args[i + 1].startswith("-"):
                options.append(args[i + 1])
                i += 2
            else:
                i += 1
        else:
            prompt_args.append(args[i])
            i += 1

    # Join all non-option args as prompt
    prompt = " ".join(prompt_args)

    # Run the command
    sys.argv = ["vibe", "run"] + options + [prompt]
    cli()


@cli.command()
@click.argument("prompt", required=True)
@click.option("--config", "-c", "config_path", help="Path to config file")
@click.option(
    "--project-type", "-t", help="Project type (python, vue_typescript, generic)"
)
def guide(
    prompt: str,
    config_path: str | None = None,
    project_type: str | None = None,
) -> None:
    """
    Get plain text guidance for AI agents (no rich formatting).

    This command outputs structured guidance that AI agents can easily
    parse and execute.

    Examples:
        vibe guide "implement authentication"
        vibe guide "prepare for release"
        vibe guide "fix code quality issues"
    """
    try:
        # Load configuration
        config = VibeConfig.load_from_file(Path(config_path) if config_path else None)

        # Override project type if specified
        if project_type:
            config.project_type = project_type

        # Analyze prompt
        analyzer = PromptAnalyzer(config)
        workflows = analyzer.analyze(prompt, show_analysis=False)

        # Plan workflows
        orchestrator = WorkflowOrchestrator(config)
        result = orchestrator.plan_workflows(workflows, prompt, show_display=False)

        if result["success"]:
            # Output plain text guidance for AI agents
            print(result["guidance"])
        else:
            print("ERROR: Unable to generate workflow guidance")
            sys.exit(1)

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
