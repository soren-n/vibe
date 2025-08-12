"""Environment validation and configuration checking for vibe."""

import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

import click
import yaml
from rich.console import Console

from ..config import VibeConfig

console = Console()


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


@click.command()
@click.option(
    "--json",
    "output_json",
    is_flag=True,
    help="Output results in JSON format for MCP",
)
def check(output_json: bool = False) -> None:
    """Validate vibe environment and configuration.

    Checks:
    - Environment compatibility (required tools, dependencies)
    - .vibe.yaml configuration validity and protocol version
    - Workflow dependencies and tool availability
    """
    check_results: dict[str, Any] = {
        "success": True,
        "issues_found": [],
        "checks": {
            "configuration": {},
            "environment": {},
            "tools": {},
            "github_integration": {},
        },
    }

    if not output_json:
        console.print("[bold]🔍 Vibe Environment & Configuration Check[/bold]")
        console.print("=" * 45)
        console.print()

    issues_found: list[str] = []

    # Run all validation checks
    _check_configuration(issues_found, check_results, output_json)
    _check_environment(issues_found, output_json)
    _check_workflow_tools(issues_found, output_json)
    _check_github_integration(issues_found, output_json)

    # Display summary and output results
    _display_summary(issues_found, output_json)

    if output_json:
        check_results["issues_found"] = issues_found
        check_results["success"] = len(issues_found) == 0
        import json

        print(json.dumps(check_results, indent=2))


def _check_configuration(
    issues_found: list[str], check_results: dict[str, Any], output_json: bool
) -> None:
    """Check .vibe.yaml configuration file and content."""
    if not output_json:
        console.print("[bold]📁 Configuration Status:[/bold]")

    vibe_config_path = Path.cwd() / ".vibe.yaml"

    if not vibe_config_path.exists():
        if not output_json:
            console.print("❌ .vibe.yaml not found")
            console.print(
                "   💡 [dim]Create .vibe.yaml with: "
                'protocol_version: 1 and project_type: "auto"[/dim]'
            )
        check_results["checks"]["configuration"]["config_file"] = {
            "status": "missing",
            "message": ".vibe.yaml not found",
        }
        issues_found.append("missing_config")
        return

    if not output_json:
        console.print("✅ .vibe.yaml found")
    check_results["checks"]["configuration"]["config_file"] = {
        "status": "found",
        "message": ".vibe.yaml found",
    }

    # Validate config content
    try:
        with open(vibe_config_path) as f:
            config_data = yaml.safe_load(f) or {}

        _validate_protocol_version(config_data, issues_found, output_json)
        _validate_project_type(config_data, issues_found, output_json)

    except yaml.YAMLError as e:
        if not output_json:
            console.print(f"❌ Invalid YAML syntax: {e}")
        issues_found.append("invalid_yaml")
    except Exception as e:
        if not output_json:
            console.print(f"❌ Error reading config: {e}")
        issues_found.append("config_read_error")

    if not output_json:
        console.print()


def _validate_protocol_version(
    config_data: dict[str, Any], issues_found: list[str], output_json: bool
) -> None:
    """Validate protocol version in config."""
    protocol_version = config_data.get("protocol_version")
    current_version = 1  # Current supported version (integer)

    if not protocol_version:
        if not output_json:
            console.print("⚠️  Protocol version missing")
            console.print("   💡 [dim]Add 'protocol_version: 1' to .vibe.yaml[/dim]")
        issues_found.append("missing_protocol_version")
        return

    # Normalize protocol version to integer
    try:
        if isinstance(protocol_version, str):
            normalized_version = int(float(protocol_version))
        else:
            normalized_version = int(protocol_version)

        if normalized_version != current_version:
            if not output_json:
                console.print(
                    f"⚠️  Protocol version {protocol_version} "
                    f"!= current {current_version}"
                )
                migration_guide = _get_migration_guide(
                    normalized_version, current_version
                )
                console.print(f"   💡 [dim]{migration_guide}[/dim]")
            issues_found.append("outdated_protocol")
        else:
            if not output_json:
                console.print(f"✅ Protocol version {protocol_version} (current)")
    except (ValueError, TypeError):
        if not output_json:
            console.print(f"⚠️  Invalid protocol version format: {protocol_version}")
            console.print("   💡 [dim]Use integer format: protocol_version: 1[/dim]")
        issues_found.append("invalid_protocol_version")


def _validate_project_type(
    config_data: dict[str, Any], issues_found: list[str], output_json: bool
) -> None:
    """Validate project type in config."""
    if "project_type" not in config_data:
        if not output_json:
            console.print("⚠️  Project type missing")
            console.print(
                "   💡 [dim]Add 'project_type: \"auto\"' "
                "or specific type to .vibe.yaml[/dim]"
            )
        issues_found.append("missing_project_type")
    else:
        if not output_json:
            console.print(f"✅ Project type: {config_data['project_type']}")


def _check_environment(issues_found: list[str], output_json: bool) -> None:
    """Check basic environment tools like Python and Vibe CLI."""
    if not output_json:
        console.print("[bold]🔧 Environment Compatibility:[/bold]")

    _check_python(issues_found, output_json)
    _check_vibe_cli(issues_found, output_json)

    if not output_json:
        console.print()


def _check_python(issues_found: list[str], output_json: bool) -> None:
    """Check Python installation and availability."""
    try:
        result = subprocess.run(["python", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            if not output_json:
                console.print(f"✅ Python: {result.stdout.strip()}")
        else:
            if not output_json:
                console.print("❌ Python not available")
                console.print("   💡 [dim]Install Python 3.13+ from python.org[/dim]")
            issues_found.append("missing_python")
    except FileNotFoundError:
        if not output_json:
            console.print("❌ Python not found in PATH")
            console.print("   💡 [dim]Install Python 3.13+ and add to PATH[/dim]")
        issues_found.append("missing_python")


def _check_vibe_cli(issues_found: list[str], output_json: bool) -> None:
    """Check Vibe CLI installation and availability."""
    vibe_path = shutil.which("vibe")
    if vibe_path:
        if not output_json:
            console.print(f"✅ Vibe CLI: {vibe_path}")
    else:
        if not output_json:
            console.print("❌ Vibe CLI not in PATH")
            console.print("   💡 [dim]Install vibe package: pip install vibe[/dim]")
        issues_found.append("missing_vibe_cli")


def _check_workflow_tools(issues_found: list[str], output_json: bool) -> None:
    """Check workflow-specific tool dependencies."""
    if not output_json:
        console.print("[bold]🛠️  Workflow Tool Dependencies:[/bold]")

    try:
        config = VibeConfig.load_from_file()
        project_type = config.detect_project_type()

        # Get tools to check
        workflow_commands = _extract_workflow_commands(config, project_type)
        tools_to_check = _get_tools_to_check(project_type, workflow_commands)

        # Check each tool
        _validate_tools(tools_to_check, issues_found, output_json)

    except Exception as e:
        if not output_json:
            console.print(f"⚠️  Could not validate workflow tools: {e}")
            console.print("   💡 [dim]Ensure .vibe.yaml is valid and accessible[/dim]")

    if not output_json:
        console.print()


def _extract_workflow_commands(config: VibeConfig, project_type: str) -> set[str]:
    """Extract unique commands from workflow steps."""
    workflow_commands: set[str] = set()

    # Get built-in workflows
    for workflow in config.workflows.values():
        for step in workflow.steps:
            _extract_command_from_step(step, workflow_commands)

    # Get project-specific workflows
    project_config = config.project_types.get(project_type)
    if project_config:
        for workflow in project_config.workflows.values():
            for step in workflow.steps:
                _extract_command_from_step(step, workflow_commands)

    return workflow_commands


def _extract_command_from_step(step: str, workflow_commands: set[str]) -> None:
    """Extract command from a workflow step."""
    if not step or step.strip().startswith("echo"):
        return

    step_parts = step.strip().split()
    if not step_parts:
        return

    base_cmd = step_parts[0]

    # Handle special cases
    if base_cmd == "python" and len(step_parts) > 2 and step_parts[1] == "-m":
        workflow_commands.add(step_parts[2])  # e.g., pytest from "python -m pytest"
    elif base_cmd not in ["if", "grep", "find", "ls", "echo", "which"]:
        workflow_commands.add(base_cmd)


def _get_tools_to_check(
    project_type: str, workflow_commands: set[str]
) -> list[tuple[str, str, str]]:
    """Get list of tools to check based on project type and workflow commands."""
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

    return tools_to_check


def _validate_tools(
    tools_to_check: list[tuple[str, str, str]],
    issues_found: list[str],
    output_json: bool,
) -> None:
    """Validate that required tools are available."""
    for tool, description, install_guide in tools_to_check:
        tool_path = shutil.which(tool)
        if tool_path:
            try:
                result = subprocess.run(
                    [tool, "--version"], capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0 and result.stdout:
                    version_info = result.stdout.strip().split("\n")[0]
                    if not output_json:
                        console.print(f"✅ {description}: {version_info}")
                else:
                    if not output_json:
                        console.print(f"✅ {description}: available")
            except Exception:
                if not output_json:
                    console.print(f"✅ {description}: available")
        else:
            if not output_json:
                console.print(f"⚠️  {description}: not found")
                console.print(f"   💡 [dim]{install_guide}[/dim]")
            if tool in ["python", "git"]:  # Critical tools
                issues_found.append(f"missing_{tool}")


def _check_github_integration(issues_found: list[str], output_json: bool) -> None:
    """Check GitHub AI integration files and directories."""
    if not output_json:
        console.print("[bold]🤖 GitHub AI Integration:[/bold]")

    github_dir = Path.cwd() / ".github"
    if not github_dir.exists():
        _handle_missing_github_dir(issues_found, output_json)
        return

    if not output_json:
        console.print("✅ .github directory found")

    _check_copilot_instructions(github_dir, issues_found, output_json)
    _check_chatmodes(github_dir, issues_found, output_json)

    if not output_json:
        console.print()


def _handle_missing_github_dir(issues_found: list[str], output_json: bool) -> None:
    """Handle case when .github directory is missing."""
    if not output_json:
        console.print("⚠️  .github directory not found")
        console.print(
            "   💡 [dim]Create .github directory with "
            "copilot-instructions.md and chatmodes/[/dim]"
        )
        console.print()
    issues_found.append("missing_github_dir")


def _check_copilot_instructions(
    github_dir: Path, issues_found: list[str], output_json: bool
) -> None:
    """Check for copilot-instructions.md file."""
    instructions_file = github_dir / "copilot-instructions.md"
    if instructions_file.exists():
        if not output_json:
            console.print("✅ copilot-instructions.md found")
    else:
        if not output_json:
            console.print("⚠️  copilot-instructions.md not found")
            console.print(
                "   💡 [dim]Create copilot-instructions.md in .github/ "
                "for AI agent guidance[/dim]"
            )
        issues_found.append("missing_copilot_instructions")


def _check_chatmodes(
    github_dir: Path, issues_found: list[str], output_json: bool
) -> None:
    """Check for chatmodes directory and vibe-agent.chatmode.md file."""
    chatmodes_dir = github_dir / "chatmodes"
    if not chatmodes_dir.exists():
        if not output_json:
            console.print("⚠️  .github/chatmodes directory not found")
            console.print(
                "   💡 [dim]Create .github/chatmodes/ directory "
                "and vibe-agent.chatmode.md[/dim]"
            )
        issues_found.append("missing_chatmodes_dir")
        return

    if not output_json:
        console.print("✅ .github/chatmodes directory found")

    chatmode_file = chatmodes_dir / "vibe-agent.chatmode.md"
    if chatmode_file.exists():
        if not output_json:
            console.print("✅ vibe-agent.chatmode.md found")
    else:
        if not output_json:
            console.print("⚠️  vibe-agent.chatmode.md not found")
            console.print(
                "   💡 [dim]Create vibe-agent.chatmode.md in "
                ".github/chatmodes/ for VS Code chat mode[/dim]"
            )
        issues_found.append("missing_chatmode_file")


def _display_summary(issues_found: list[str], output_json: bool) -> None:
    """Display summary of validation results."""
    if output_json:
        return

    if issues_found:
        console.print(
            f"[yellow]⚠️  Found {len(issues_found)} issue(s) that may affect "
            "vibe functionality[/yellow]"
        )
        console.print()
        console.print("[bold]🔧 Quick Fix Commands:[/bold]")

        _display_config_fixes(issues_found)
        _display_environment_fixes(issues_found)
        _display_github_fixes(issues_found)

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
            '• [cyan]vibe guide "setup development workflow"[/cyan] '
            "- Get development guidance"
        )
        console.print(
            '• [cyan]vibe guide "optimize vibe configuration"[/cyan] '
            "- Get configuration tips"
        )


def _display_config_fixes(issues_found: list[str]) -> None:
    """Display configuration-related fix suggestions."""
    if "missing_config" in issues_found:
        console.print("• Create .vibe.yaml with minimum content:")
        console.print("  [cyan]protocol_version: 1[/cyan]")
        console.print('  [cyan]project_type: "auto"[/cyan]')
        console.print(
            '• [cyan]vibe guide "setup vibe project configuration"[/cyan] '
            "- Get detailed setup steps"
        )

    if any(
        issue in issues_found
        for issue in [
            "missing_protocol_version",
            "outdated_protocol",
            "invalid_protocol_version",
        ]
    ):
        console.print(
            "• Edit .vibe.yaml and add/update: [cyan]protocol_version: 1[/cyan]"
        )
        console.print(
            '• [cyan]vibe guide "migrate protocol version"[/cyan] - Get '
            "migration guidance"
        )

    if "missing_project_type" in issues_found:
        console.print('• Edit .vibe.yaml and add: [cyan]project_type: "auto"[/cyan]')


def _display_environment_fixes(issues_found: list[str]) -> None:
    """Display environment-related fix suggestions."""
    if "missing_python" in issues_found:
        console.print("• Install Python 3.13+ from [cyan]https://python.org[/cyan]")
        console.print(
            '• [cyan]vibe guide "setup python environment"[/cyan] - Get '
            "environment setup steps"
        )

    if "missing_vibe_cli" in issues_found:
        console.print("• Install vibe: [cyan]pip install vibe[/cyan]")
        console.print(
            '• [cyan]vibe guide "install vibe cli"[/cyan] - Get installation guidance'
        )


def _display_github_fixes(issues_found: list[str]) -> None:
    """Display GitHub integration fix suggestions."""
    if any(
        issue in issues_found
        for issue in [
            "missing_github_dir",
            "missing_copilot_instructions",
            "missing_chatmodes_dir",
            "missing_chatmode_file",
        ]
    ):
        console.print(
            '• [cyan]vibe guide "setup github ai integration"[/cyan] - Get '
            "GitHub AI setup steps"
        )
        console.print("• Create .github/copilot-instructions.md for AI agent guidance")
        console.print(
            "• Create .github/chatmodes/vibe-agent.chatmode.md for VS Code integration"
        )


@click.command("config-info")
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


@click.command("list-workflows")
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


def validate_workflow_schemas() -> None:
    """Validate all workflow YAML files against the JSON schema."""

    from ..workflows.loader import WorkflowLoader
    from ..workflows.validation import WorkflowValidationError, validate_workflow_data

    console.print("🔍 [bold blue]Validating Workflow Schemas[/bold blue]")
    console.print()

    # Create a loader with validation enabled
    loader = WorkflowLoader(enable_validation=True)

    # First validate workflows in data directory
    valid_count = 0
    invalid_count = 0

    if loader.data_dir.exists():
        yaml_files = list(loader.data_dir.rglob("*.yaml"))
        if yaml_files:
            console.print(f"📋 Found {len(yaml_files)} workflow files to validate")
            console.print()

            for yaml_file in yaml_files:
                relative_path = yaml_file.relative_to(loader.data_dir)

                try:
                    with open(yaml_file, encoding="utf-8") as f:
                        data = yaml.safe_load(f)

                    if not data:
                        console.print(
                            f"[yellow]⚠️ {relative_path}: Empty or invalid YAML[/yellow]"
                        )
                        invalid_count += 1
                        continue

                    # Validate against schema
                    validate_workflow_data(data)
                    console.print(f"[green]✅ {relative_path}[/green]")
                    valid_count += 1

                except WorkflowValidationError as e:
                    console.print(f"[red]❌ {relative_path}:[/red]")
                    # Print validation errors with indentation
                    for line in str(e).split("\n")[1:]:  # Skip the first line
                        if line.strip():
                            console.print(f"   {line}")
                    invalid_count += 1

                except Exception as e:
                    console.print(f"[red]❌ {relative_path}: {e}[/red]")
                    invalid_count += 1

    # Now validate workflows in .vibe.yaml
    console.print()
    console.print("🔍 [bold blue]Validating .vibe.yaml Workflows[/bold blue]")
    console.print()

    try:
        config = VibeConfig.load_from_file()
        if config.workflows:
            console.print(f"📋 Found {len(config.workflows)} workflows in .vibe.yaml")
            console.print()

            for workflow_name, workflow_config in config.workflows.items():
                try:
                    # Convert WorkflowConfig to dict for validation
                    # Use commands as steps if steps is empty (legacy support)
                    steps = (
                        workflow_config.steps
                        if workflow_config.steps
                        else workflow_config.commands
                    )

                    # If both steps and commands are empty, provide default guidance
                    if not steps:
                        steps = [f"Provide guidance for {workflow_name} workflow"]

                    workflow_data = {
                        "name": workflow_config.description or workflow_name,
                        "description": workflow_config.description,
                        "triggers": workflow_config.triggers,
                        "steps": steps,
                    }

                    # Validate against schema
                    validate_workflow_data(workflow_data)
                    console.print(f"[green]✅ .vibe.yaml: {workflow_name}[/green]")
                    valid_count += 1

                except WorkflowValidationError as e:
                    console.print(f"[red]❌ .vibe.yaml: {workflow_name}:[/red]")
                    for line in str(e).split("\n")[1:]:
                        if line.strip():
                            console.print(f"   {line}")
                    invalid_count += 1

                except Exception as e:
                    console.print(f"[red]❌ .vibe.yaml: {workflow_name}: {e}[/red]")
                    invalid_count += 1
        else:
            console.print("[dim]No workflows found in .vibe.yaml[/dim]")

    except Exception as e:
        console.print(f"[red]❌ Error loading .vibe.yaml: {e}[/red]")
        invalid_count += 1

    console.print()
    console.print("📊 [bold]Validation Summary:[/bold]")
    console.print(f"   [green]✅ Valid: {valid_count}[/green]")
    console.print(f"   [red]❌ Invalid: {invalid_count}[/red]")

    total_count = valid_count + invalid_count
    console.print(f"   📋 Total: {total_count}")

    if invalid_count > 0:
        console.print()
        console.print(
            "[yellow]💡 Tip: Use 'vibe guide \"fix workflow validation\"' "
            "for help resolving issues[/yellow]"
        )
        sys.exit(1)
    else:
        console.print()
        console.print("[green]🎉 All workflows pass schema validation![/green]")


@click.command()
def validate() -> None:
    """Validate all workflow YAML files against the JSON schema."""
    validate_workflow_schemas()
