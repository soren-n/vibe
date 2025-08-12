"""CLI commands for checklist management."""

import json
from typing import Any

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from ..guidance.loader import get_checklist, get_checklists

console = Console()


@click.group()
def checklists() -> None:
    """Checklist management commands."""
    pass


@checklists.command("list")
@click.option(
    "--project-type",
    help="Filter checklists by project type",
)
@click.option(
    "--format",
    type=click.Choice(["rich", "json", "simple"]),
    default="rich",
    help="Output format",
)
def list_checklists(project_type: str | None, format: str) -> None:
    """List all available checklists."""
    try:
        all_checklists = get_checklists()

        # Filter by project type if specified
        if project_type:
            filtered_checklists = {
                name: checklist
                for name, checklist in all_checklists.items()
                if (
                    not checklist.project_types
                    or project_type in checklist.project_types
                )
            }
        else:
            filtered_checklists = all_checklists

        if format == "json":
            result = {
                "success": True,
                "checklists": [
                    {
                        "name": name,
                        "description": checklist.description,
                        "triggers": checklist.triggers,
                        "project_types": checklist.project_types,
                        "item_count": len(checklist.items),
                    }
                    for name, checklist in filtered_checklists.items()
                ],
            }
            print(json.dumps(result, indent=2))
        elif format == "simple":
            for name in sorted(filtered_checklists.keys()):
                print(name)
        else:  # rich format
            _display_checklists_rich(filtered_checklists, project_type)

    except Exception as e:
        if format == "json":
            error_result = {
                "success": False,
                "error": f"Failed to list checklists: {str(e)}",
            }
            print(json.dumps(error_result, indent=2))
        else:
            console.print(f"[red]Error listing checklists: {e}[/red]")


@checklists.command("show")
@click.argument("name")
@click.option(
    "--format",
    type=click.Choice(["rich", "json", "simple"]),
    default="rich",
    help="Output format",
)
def show_checklist(name: str, format: str) -> None:
    """Show details of a specific checklist."""
    try:
        checklist = get_checklist(name)

        if not checklist:
            if format == "json":
                error_result = {
                    "success": False,
                    "error": f"Checklist '{name}' not found",
                }
                print(json.dumps(error_result, indent=2))
            else:
                console.print(f"[red]Checklist '{name}' not found[/red]")
            return

        if format == "json":
            result = {
                "success": True,
                "checklist": {
                    "name": checklist.name,
                    "description": checklist.description,
                    "triggers": checklist.triggers,
                    "project_types": checklist.project_types,
                    "conditions": checklist.conditions,
                    "dependencies": checklist.dependencies,
                    "items": checklist.items,
                },
            }
            print(json.dumps(result, indent=2))
        elif format == "simple":
            print(f"Name: {checklist.name}")
            print(f"Description: {checklist.description}")
            print(f"Items: {len(checklist.items)}")
            for i, item in enumerate(checklist.items, 1):
                print(f"  {i}. {item}")
        else:  # rich format
            _display_checklist_rich(checklist)

    except Exception as e:
        if format == "json":
            error_result = {
                "success": False,
                "error": f"Failed to show checklist: {str(e)}",
            }
            print(json.dumps(error_result, indent=2))
        else:
            console.print(f"[red]Error showing checklist: {e}[/red]")


@checklists.command("run")
@click.argument("name")
@click.option(
    "--format",
    type=click.Choice(["rich", "json", "simple"]),
    default="rich",
    help="Output format",
)
@click.option(
    "--interactive",
    is_flag=True,
    help="Interactive mode with checkboxes (rich format only)",
)
def run_checklist(name: str, format: str, interactive: bool) -> None:
    """Execute/display a checklist for validation."""
    try:
        checklist = get_checklist(name)

        if not checklist:
            if format == "json":
                error_result = {
                    "success": False,
                    "error": f"Checklist '{name}' not found",
                }
                print(json.dumps(error_result, indent=2))
            else:
                console.print(f"[red]Checklist '{name}' not found[/red]")
            return

        if format == "json":
            result = {
                "success": True,
                "checklist": {
                    "name": checklist.name,
                    "description": checklist.description,
                    "items": [
                        {
                            "index": i + 1,
                            "text": item,
                            "completed": False,  # Default state
                        }
                        for i, item in enumerate(checklist.items)
                    ],
                },
            }
            print(json.dumps(result, indent=2))
        elif format == "simple":
            print(f"\n{checklist.name}")
            print("=" * len(checklist.name))
            print(f"{checklist.description}\n")
            for i, item in enumerate(checklist.items, 1):
                print(f"[ ] {i}. {item}")
        else:  # rich format
            _run_checklist_rich(checklist, interactive)

    except Exception as e:
        if format == "json":
            error_result = {
                "success": False,
                "error": f"Failed to run checklist: {str(e)}",
            }
            print(json.dumps(error_result, indent=2))
        else:
            console.print(f"[red]Error running checklist: {e}[/red]")


def _display_checklists_rich(
    checklists: dict[str, Any], project_type: str | None
) -> None:
    """Display checklists in rich format."""
    if not checklists:
        console.print("[yellow]No checklists found[/yellow]")
        return

    title = "Available Checklists"
    if project_type:
        title += f" (filtered by project type: {project_type})"

    table = Table(title=title, show_header=True, header_style="bold blue")
    table.add_column("Name", style="cyan", no_wrap=True)
    table.add_column("Description", style="white")
    table.add_column("Items", justify="right", style="green")
    table.add_column("Project Types", style="yellow")

    for name, checklist in sorted(checklists.items()):
        project_types_str = (
            ", ".join(checklist.project_types) if checklist.project_types else "all"
        )
        description = (
            checklist.description[:60] + "..."
            if len(checklist.description) > 60
            else checklist.description
        )
        table.add_row(name, description, str(len(checklist.items)), project_types_str)

    console.print(table)


def _display_checklist_rich(checklist: Any) -> None:
    """Display a single checklist in rich format."""
    # Header panel
    header_text = Text()
    header_text.append(checklist.name, style="bold blue")
    header_text.append(f"\n{checklist.description}", style="white")

    if checklist.project_types:
        project_types = ", ".join(checklist.project_types)
        header_text.append(f"\nProject Types: {project_types}", style="yellow")

    if checklist.triggers:
        triggers = ", ".join(checklist.triggers[:3])
        header_text.append(f"\nTriggers: {triggers}", style="green")
        if len(checklist.triggers) > 3:
            header_text.append("...", style="green")

    console.print(Panel(header_text, title="Checklist Details", border_style="blue"))

    # Items
    console.print(f"\n[bold]Checklist Items ({len(checklist.items)} total):[/bold]")
    for i, item in enumerate(checklist.items, 1):
        console.print(f"  {i:2d}. {item}")


def _run_checklist_rich(checklist: Any, interactive: bool) -> None:
    """Run a checklist in rich format."""
    if interactive:
        console.print(
            "[yellow]Interactive mode not yet implemented. "
            "Displaying checklist items.[/yellow]\n"
        )

    # Header
    console.print(
        Panel(
            f"[bold blue]{checklist.name}[/bold blue]\n{checklist.description}",
            title="Checklist Execution",
            border_style="green",
        )
    )

    # Checklist items with checkboxes
    console.print("\n[bold]Complete the following items:[/bold]")
    for i, item in enumerate(checklist.items, 1):
        console.print(f"[ ] {i:2d}. {item}")

    console.print(
        "\n[green]Checklist ready for execution. "
        "Mark items as complete as you progress.[/green]"
    )
