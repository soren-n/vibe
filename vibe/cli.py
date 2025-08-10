"""
CLI interface for vibe.
"""

import shutil
import subprocess
import sys
from pathlib import Path

import click
import yaml
from rich.console import Console

from . import __version__
from .analyzer import PromptAnalyzer
from .config import VibeConfig
from .orchestrator import WorkflowOrchestrator
from .workflows.quality import (
    format_workflow_yamls,
    validate_workflow_yamls,
)

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
    """Initialize vibe configuration and provide setup guidance."""
    # Check if .vibe.yaml already exists in current working directory
    vibe_config_path = Path.cwd() / ".vibe.yaml"

    if vibe_config_path.exists():
        console.print("[yellow]📋 Vibe project already initialized![/yellow]")
        console.print()
        console.print("Found existing [blue].vibe.yaml[/blue] file.")
        console.print("To validate your current configuration, run:")
        console.print()
        console.print("  [bold cyan]vibe check[/bold cyan]")
        console.print()
        console.print("To see available workflows for this project:")
        console.print()
        console.print('  [bold cyan]vibe run "what can I do?"[/bold cyan]')
        return

    # Use the init workflow for guidance instead of creating files
    run_workflow("initialize vibe project", "init", quiet=False)


def _get_migration_guide(from_version: int | str, to_version: int) -> str:
    """Get version-specific migration guidance."""
    # Convert string versions to int for comparison
    if isinstance(from_version, str):
        try:
            # Handle string versions like "1.0" -> 1, "0.9" -> 0
            from_version = int(float(from_version))
        except (ValueError, TypeError):
            from_version = 0

    migration_guides = {
        # Version migrations (from_version -> to_version)
        (0, 1): "Update to protocol_version: 1 and add VS Code chat mode support",
        # Future migrations can be added here
    }

    guide = migration_guides.get((from_version, to_version))
    if guide:
        return f"Migration: {guide}"
    else:
        return f"Update to 'protocol_version: {to_version}' in .vibe.yaml"


@cli.command()
def check() -> None:
    """
    Validate vibe environment and configuration.

    Checks:
    - Environment compatibility (required tools, dependencies)
    - .vibe.yaml configuration validity and protocol version
    - Workflow dependencies and tool availability
    """
    console.print("[bold]🔍 Vibe Environment & Configuration Check[/bold]")
    console.print("=" * 45)
    console.print()

    issues_found = []

    # Check 1: Configuration file validation
    console.print("[bold]📁 Configuration Status:[/bold]")
    vibe_config_path = Path.cwd() / ".vibe.yaml"

    if not vibe_config_path.exists():
        console.print("❌ .vibe.yaml not found")
        issues_found.append("missing_config")
        console.print(
            '   💡 [dim]Create .vibe.yaml with: protocol_version: 1 and project_type: "auto"[/dim]'
        )
    else:
        console.print("✅ .vibe.yaml found")

        # Validate config content
        try:
            with open(vibe_config_path) as f:
                config_data = yaml.safe_load(f) or {}

            # Check protocol version
            protocol_version = config_data.get("protocol_version")
            current_version = 1  # Current supported version (integer)

            if not protocol_version:
                console.print("⚠️  Protocol version missing")
                issues_found.append("missing_protocol_version")
                console.print(
                    "   💡 [dim]Add 'protocol_version: 1' to .vibe.yaml[/dim]"
                )
            else:
                # Normalize protocol version to integer
                try:
                    if isinstance(protocol_version, str):
                        # Handle string versions like "1.0" -> 1
                        normalized_version = int(float(protocol_version))
                    else:
                        normalized_version = int(protocol_version)

                    if normalized_version != current_version:
                        console.print(
                            f"⚠️  Protocol version {protocol_version} != current {current_version}"
                        )
                        issues_found.append("outdated_protocol")

                        # Provide version-specific migration guidance
                        migration_guide = _get_migration_guide(
                            normalized_version, current_version
                        )
                        console.print(f"   💡 [dim]{migration_guide}[/dim]")
                    else:
                        console.print(
                            f"✅ Protocol version {protocol_version} (current)"
                        )
                except (ValueError, TypeError):
                    console.print(
                        f"⚠️  Invalid protocol version format: {protocol_version}"
                    )
                    issues_found.append("invalid_protocol_version")
                    console.print(
                        "   💡 [dim]Use integer format: protocol_version: 1[/dim]"
                    )  # Check project type
            if "project_type" not in config_data:
                console.print("⚠️  Project type missing")
                issues_found.append("missing_project_type")
                console.print(
                    "   💡 [dim]Add 'project_type: \"auto\"' or specific type to .vibe.yaml[/dim]"
                )
            else:
                console.print(f"✅ Project type: {config_data['project_type']}")

        except yaml.YAMLError as e:
            console.print(f"❌ Invalid YAML syntax: {e}")
            issues_found.append("invalid_yaml")
        except Exception as e:
            console.print(f"❌ Error reading config: {e}")
            issues_found.append("config_read_error")

    console.print()

    # Check 2: Environment validation
    console.print("[bold]🔧 Environment Compatibility:[/bold]")

    # Check Python
    try:
        result = subprocess.run(["python", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            console.print(f"✅ Python: {result.stdout.strip()}")
        else:
            console.print("❌ Python not available")
            issues_found.append("missing_python")
            console.print("   💡 [dim]Install Python 3.13+ from python.org[/dim]")
    except FileNotFoundError:
        console.print("❌ Python not found in PATH")
        issues_found.append("missing_python")
        console.print("   💡 [dim]Install Python 3.13+ and add to PATH[/dim]")

    # Check vibe CLI
    vibe_path = shutil.which("vibe")
    if vibe_path:
        console.print(f"✅ Vibe CLI: {vibe_path}")
    else:
        console.print("❌ Vibe CLI not in PATH")
        issues_found.append("missing_vibe_cli")
        console.print("   💡 [dim]Install vibe package: pip install vibe[/dim]")

    console.print()

    # Check 3: Workflow-specific tool validation
    console.print("[bold]🛠️  Workflow Tool Dependencies:[/bold]")

    # Load configuration to get available workflows
    try:
        config = VibeConfig.load_from_file()
        project_type = config.detect_project_type()

        # Collect all unique commands from workflow steps
        workflow_commands = set()

        # Get built-in workflows
        for workflow_name, workflow in config.workflows.items():
            for step in workflow.steps:
                # Extract tool commands from workflow steps (first word of each step if it's a command)
                if step and not step.strip().startswith("echo"):
                    # Handle complex commands like "python -m pytest"
                    step_parts = step.strip().split()
                    if step_parts:
                        base_cmd = step_parts[0]
                        # Handle special cases
                        if (
                            base_cmd == "python"
                            and len(step_parts) > 2
                            and step_parts[1] == "-m"
                        ):
                            workflow_commands.add(
                                step_parts[2]
                            )  # e.g., pytest from "python -m pytest"
                        elif base_cmd not in [
                            "if",
                            "grep",
                            "find",
                            "ls",
                            "echo",
                            "which",
                        ]:
                            workflow_commands.add(base_cmd)

        # Get project-specific workflows
        project_config = config.project_types.get(project_type)
        if project_config:
            for workflow_name, workflow in project_config.workflows.items():
                for step in workflow.steps:
                    if step and not step.strip().startswith("echo"):
                        step_parts = step.strip().split()
                        if step_parts:
                            base_cmd = step_parts[0]
                            if (
                                base_cmd == "python"
                                and len(step_parts) > 2
                                and step_parts[1] == "-m"
                            ):
                                workflow_commands.add(step_parts[2])
                            elif base_cmd not in [
                                "if",
                                "grep",
                                "find",
                                "ls",
                                "echo",
                                "which",
                            ]:
                                workflow_commands.add(base_cmd)

        # Common tools to always check
        standard_tools = [
            ("git", "Git version control", "Install Git from git-scm.com"),
            ("python", "Python runtime", "Install Python 3.13+ from python.org"),
        ]

        # Project-specific tools based on detected type
        project_specific_tools = {
            "python": [
                ("pytest", "Python testing framework", "Install: pip install pytest"),
                ("ruff", "Python linter/formatter", "Install: pip install ruff"),
                ("black", "Python code formatter", "Install: pip install black"),
                ("mypy", "Python type checker", "Install: pip install mypy"),
            ],
            "vue_typescript": [
                ("node", "Node.js runtime", "Install Node.js from nodejs.org"),
                ("npm", "Node package manager", "Install Node.js (includes npm)"),
                (
                    "bun",
                    "Bun package manager",
                    "Install: curl -fsSL https://bun.sh/install | bash",
                ),
                ("vue", "Vue CLI", "Install: npm install -g @vue/cli"),
                ("tsc", "TypeScript compiler", "Install: npm install -g typescript"),
            ],
            "generic": [
                ("node", "Node.js runtime", "Install Node.js from nodejs.org"),
                ("npm", "Node package manager", "Install Node.js (includes npm)"),
            ],
        }

        # Combine standard tools with project-specific ones
        tools_to_check = standard_tools[:]
        if project_type in project_specific_tools:
            tools_to_check.extend(project_specific_tools[project_type])

        # Add workflow-detected commands
        for cmd in sorted(workflow_commands):
            if cmd not in [tool[0] for tool in tools_to_check]:
                tools_to_check.append(
                    (cmd, f"{cmd} command", f"Install {cmd} as required by workflows")
                )

        # Check each tool
        for tool, description, install_guide in tools_to_check:
            tool_path = shutil.which(tool)
            if tool_path:
                try:
                    result = subprocess.run(
                        [tool, "--version"], capture_output=True, text=True, timeout=5
                    )
                    if result.returncode == 0 and result.stdout:
                        version_info = result.stdout.strip().split("\n")[0]
                        console.print(f"✅ {description}: {version_info}")
                    else:
                        console.print(f"✅ {description}: available")
                except:
                    console.print(f"✅ {description}: available")
            else:
                console.print(f"⚠️  {description}: not found")
                console.print(f"   💡 [dim]{install_guide}[/dim]")
                if tool in ["python", "git"]:  # Critical tools
                    issues_found.append(f"missing_{tool}")

    except Exception as e:
        console.print(f"⚠️  Could not validate workflow tools: {e}")
        console.print("   💡 [dim]Ensure .vibe.yaml is valid and accessible[/dim]")

    console.print()

    # Check 4: GitHub AI Integration (if applicable)
    console.print("[bold]🤖 GitHub AI Integration:[/bold]")

    github_dir = Path.cwd() / ".github"
    if github_dir.exists():
        console.print("✅ .github directory found")

        # Check for copilot-instructions.md
        instructions_file = github_dir / "copilot-instructions.md"
        if instructions_file.exists():
            console.print("✅ copilot-instructions.md found")
        else:
            console.print("⚠️  copilot-instructions.md not found")
            issues_found.append("missing_copilot_instructions")
            console.print(
                "   💡 [dim]Create copilot-instructions.md in .github/ for AI agent guidance[/dim]"
            )

        # Check for chatmodes directory and vibe-agent.chatmode.md
        chatmodes_dir = github_dir / "chatmodes"
        if chatmodes_dir.exists():
            console.print("✅ .github/chatmodes directory found")

            chatmode_file = chatmodes_dir / "vibe-agent.chatmode.md"
            if chatmode_file.exists():
                console.print("✅ vibe-agent.chatmode.md found")
            else:
                console.print("⚠️  vibe-agent.chatmode.md not found")
                issues_found.append("missing_chatmode_file")
                console.print(
                    "   💡 [dim]Create vibe-agent.chatmode.md in .github/chatmodes/ for VS Code chat mode[/dim]"
                )
        else:
            console.print("⚠️  .github/chatmodes directory not found")
            issues_found.append("missing_chatmodes_dir")
            console.print(
                "   💡 [dim]Create .github/chatmodes/ directory and vibe-agent.chatmode.md[/dim]"
            )
    else:
        console.print("⚠️  .github directory not found")
        issues_found.append("missing_github_dir")
        console.print(
            "   💡 [dim]Create .github directory with copilot-instructions.md and chatmodes/[/dim]"
        )

    console.print()

    # Summary
    if issues_found:
        console.print(
            f"[yellow]⚠️  Found {len(issues_found)} issue(s) that may affect vibe functionality[/yellow]"
        )
        console.print()
        console.print("[bold]🔧 Quick Fix Commands:[/bold]")

        if "missing_config" in issues_found:
            console.print("• Create .vibe.yaml with minimum content:")
            console.print("  [cyan]protocol_version: 1[/cyan]")
            console.print('  [cyan]project_type: "auto"[/cyan]')
            console.print(
                '• [cyan]vibe guide "setup vibe project configuration"[/cyan] - Get detailed setup steps'
            )
        if (
            "missing_protocol_version" in issues_found
            or "outdated_protocol" in issues_found
            or "invalid_protocol_version" in issues_found
        ):
            console.print(
                "• Edit .vibe.yaml and add/update: [cyan]protocol_version: 1[/cyan]"
            )
            console.print(
                '• [cyan]vibe guide "migrate protocol version"[/cyan] - Get migration guidance'
            )
        if "missing_project_type" in issues_found:
            console.print(
                '• Edit .vibe.yaml and add: [cyan]project_type: "auto"[/cyan]'
            )
        if "missing_python" in issues_found:
            console.print("• Install Python 3.13+ from [cyan]https://python.org[/cyan]")
            console.print(
                '• [cyan]vibe guide "setup python environment"[/cyan] - Get environment setup steps'
            )
        if "missing_vibe_cli" in issues_found:
            console.print("• Install vibe: [cyan]pip install vibe[/cyan]")
            console.print(
                '• [cyan]vibe guide "install vibe cli"[/cyan] - Get installation guidance'
            )

        # GitHub AI integration suggestions
        if (
            "missing_github_dir" in issues_found
            or "missing_copilot_instructions" in issues_found
            or "missing_chatmodes_dir" in issues_found
            or "missing_chatmode_file" in issues_found
        ):
            console.print(
                '• [cyan]vibe guide "setup github ai integration"[/cyan] - Get GitHub AI setup steps'
            )
            console.print(
                "• Create .github/copilot-instructions.md for AI agent guidance"
            )
            console.print(
                "• Create .github/chatmodes/vibe-agent.chatmode.md for VS Code integration"
            )

        console.print()
        console.print(
            'For detailed setup guidance: [cyan]vibe guide "setup vibe project"[/cyan]'
        )
        console.print("Run [cyan]vibe check[/cyan] again after applying fixes.")
    else:
        console.print("[green]✅ All checks passed! Vibe is ready for use.[/green]")
        console.print()
        console.print("Next steps:")
        console.print(
            '• [cyan]vibe run "what should I do?"[/cyan] - Get workflow recommendations'
        )
        console.print("• [cyan]vibe list-workflows[/cyan] - See available workflows")
        console.print(
            '• [cyan]vibe guide "setup development workflow"[/cyan] - Get development guidance'
        )
        console.print(
            '• [cyan]vibe guide "optimize vibe configuration"[/cyan] - Get configuration tips'
        )


@cli.group()
def workflows() -> None:
    """Operations for YAML-defined workflows (validate/format)."""


@workflows.command("validate")
@click.option(
    "--path",
    "path",
    type=click.Path(exists=True, path_type=Path),
    default=None,
    help="Directory to scan (defaults to built-in workflows directory)",
)
def workflows_validate(path: Path | None) -> None:
    """Validate all YAML workflow files for schema and quality issues."""
    issues = validate_workflow_yamls(path)
    if not issues:
        console.print("[green]✅ All workflow YAML files look good[/green]")
        return

    console.print("[yellow]⚠️ Found workflow YAML issues:[/yellow]")
    for issue in issues:
        console.print(f" - {issue}")
    sys.exit(1)


@workflows.command("format")
@click.option(
    "--write/--no-write",
    default=False,
    help="Write normalized YAML back to files (default: dry-run)",
)
@click.option(
    "--path",
    "path",
    type=click.Path(exists=True, path_type=Path),
    default=None,
    help="Directory to scan (defaults to built-in workflows directory)",
)
def workflows_format(write: bool, path: Path | None) -> None:
    """Normalize and optionally rewrite YAML workflow files for consistency."""
    changes = format_workflow_yamls(path, write=write)
    if not changes:
        console.print("[green]✅ No formatting changes needed[/green]")
        return

    console.print(
        "[bold]🧹 Workflow YAML normalization preview[/bold]"
        if not write
        else "[bold]🧹 Applied workflow YAML normalization[/bold]"
    )
    for c in changes:
        console.print(f" - {c}")
    if not write:
        console.print("\n[dim]Tip: re-run with --write to apply these changes[/dim]")

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
                steps = workflow_config.steps or ["(no steps)"]
                console.print(f"  [cyan]{name}[/cyan]: {len(steps)} steps")

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

            if workflow_config.steps:
                console.print(
                    f"  [dim]Steps: {len(workflow_config.steps)} configured[/dim]"
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
    known_commands = [
        "run",
        "init",
        "check",
        "config-info",
        "list-workflows",
        "guide",
        "workflows",
    ]
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
