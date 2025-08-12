"""Main CLI entry point for vibe."""

import sys

import click
from rich.console import Console

from .. import __version__
from .checklists import checklists
from .commands import guide, init, run
from .lint import lint
from .mcp import mcp
from .validation import check, config_info, list_workflows, validate
from .workflows import workflows

console = Console()


@click.group()
@click.option("--version", "-v", is_flag=True, help="Show version and exit")
@click.pass_context
def cli(ctx: click.Context, version: bool) -> None:
    """Vibe: Intelligent workflow orchestrator for vibe coding.

    Analyzes your prompts and executes appropriate development workflows.
    """
    if version:
        console.print(f"vibe version {__version__}")
        sys.exit(0)


# Add commands to the main CLI group
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


def main() -> None:
    """Main entry point with smart command detection."""
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
        "run",
        "init",
        "check",
        "config-info",
        "list-workflows",
        "validate",
        "guide",
        "workflows",
        "mcp",
        "lint",
        "checklists",
    ]
    return first_arg in known_commands or first_arg.startswith("-")


def _handle_prompt_command(args: list[str]) -> None:
    """Handle arguments as a prompt for the run command."""
    prompt_args, options = _parse_prompt_and_options(args)
    prompt = " ".join(prompt_args)

    # Run the command with parsed arguments
    sys.argv = ["vibe", "run"] + options + [prompt]
    cli()


def _parse_prompt_and_options(args: list[str]) -> tuple[list[str], list[str]]:
    """Parse arguments into prompt words and options."""
    prompt_args: list[str] = []
    options: list[str] = []
    i = 0

    while i < len(args):
        if args[i].startswith("--"):
            # Long option
            options.append(args[i])
            if i + 1 < len(args) and not args[i + 1].startswith("--"):
                options.append(args[i + 1])
                i += 2
            else:
                i += 1
        elif args[i].startswith("-") and args[i] != "-":
            # Short option (but not single dash)
            options.append(args[i])
            if i + 1 < len(args) and not args[i + 1].startswith("-"):
                options.append(args[i + 1])
                i += 2
            else:
                i += 1
        else:
            prompt_args.append(args[i])
            i += 1

    return prompt_args, options


if __name__ == "__main__":
    main()
