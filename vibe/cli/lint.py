"""CLI commands for project linting."""

import json
from pathlib import Path
from typing import Any

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from ..lint import LintReport, ProjectLinter


@click.group()
def lint() -> None:
    """Project linting commands."""
    pass


@lint.command()
@click.option(
    "--path",
    type=click.Path(exists=True),
    default=None,
    help="Path to project directory (default: current directory)",
)
@click.option(
    "--format",
    type=click.Choice(["rich", "json", "summary"]),
    default="rich",
    help="Output format",
)
@click.option(
    "--severity",
    type=click.Choice(["error", "warning", "info"]),
    default=None,
    help="Filter by severity level",
)
@click.option(
    "--type",
    "issue_type",
    type=click.Choice(["naming_convention", "emoji_usage", "unprofessional_language"]),
    default=None,
    help="Filter by issue type",
)
def project(
    path: str | None, format: str, severity: str | None, issue_type: str | None
) -> None:
    """Lint entire project for naming conventions and language issues."""
    project_path = Path(path) if path else Path.cwd()

    console = Console()

    # Only show progress for interactive formats
    if format == "json":
        linter = ProjectLinter()
        issues = linter.lint_project(project_path)
    else:
        with console.status("[bold green]Linting project..."):
            linter = ProjectLinter()
            issues = linter.lint_project(project_path)

    # Apply filters
    if severity:
        issues = [issue for issue in issues if issue.severity == severity]
    if issue_type:
        issues = [issue for issue in issues if issue.issue_type == issue_type]

    # Generate report
    report = linter.generate_report(issues)

    if format == "json":
        # Convert issues to serializable format
        issues_data = [
            {
                "file_path": str(issue.file_path),
                "issue_type": issue.issue_type,
                "severity": issue.severity,
                "message": issue.message,
                "line_number": issue.line_number,
                "column": issue.column,
                "suggestion": issue.suggestion,
            }
            for issue in issues
        ]
        click.echo(json.dumps({"issues": issues_data, "report": report}, indent=2))
        return

    if format == "summary":
        _print_summary(console, report)
        return

    # Rich format (default)
    _print_rich_report(console, issues, report)


@lint.command()
@click.argument("text")
@click.option(
    "--context",
    type=click.Choice(["general", "step_message", "documentation"]),
    default="general",
    help="Context for text analysis",
)
@click.option(
    "--format",
    type=click.Choice(["json", "rich", "summary"]),
    default="rich",
    help="Output format (json for machine parsing)",
)
def text(text: str, context: str, format: str) -> None:
    """Lint text content for quality and professionalism."""
    linter = ProjectLinter()
    quality_issues = linter.lint_text(text, context)

    # Route to appropriate output format
    if format == "json":
        _print_text_json_report(quality_issues)
    elif format == "summary":
        _print_text_summary_report(quality_issues)
    else:
        _print_text_rich_report(quality_issues)


def _print_text_json_report(quality_issues: list[dict[str, Any]]) -> None:
    """Print text quality issues in JSON format."""
    import json

    result = {
        "issues": quality_issues,
        "report": _build_text_quality_report(quality_issues),
    }
    print(json.dumps(result, indent=2))


def _build_text_quality_report(quality_issues: list[dict[str, Any]]) -> dict[str, Any]:
    """Build a quality report summary from issues."""
    report: dict[str, Any] = {
        "total_issues": len(quality_issues),
        "issues_by_type": {},
        "issues_by_severity": {},
        "suggestions": [],
    }

    for issue in quality_issues:
        issue_type = issue["type"]
        severity = issue["severity"]

        # Count by type and severity
        issues_by_type = report["issues_by_type"]
        issues_by_type[issue_type] = issues_by_type.get(issue_type, 0) + 1

        issues_by_severity = report["issues_by_severity"]
        issues_by_severity[severity] = issues_by_severity.get(severity, 0) + 1

        # Collect suggestions
        if suggestion := issue.get("suggestion"):
            suggestions = report["suggestions"]
            suggestions.append(suggestion)

    return report


def _print_text_summary_report(quality_issues: list[dict[str, Any]]) -> None:
    """Print text quality issues in summary format."""
    if not quality_issues:
        print("Text quality: PASS")
        return

    print(f"Text quality issues: {len(quality_issues)} found")
    for issue in quality_issues:
        print(f"  {issue['severity'].upper()}: {issue['message']}")


def _print_text_rich_report(quality_issues: list[dict[str, Any]]) -> None:
    """Print text quality issues in rich table format."""
    console = Console()

    if not quality_issues:
        console.print("✅ [green]Text quality looks good![/green]")
        return

    # Create and populate table
    table = Table(title="Text Quality Analysis")
    table.add_column("Type", style="cyan")
    table.add_column("Severity", style="yellow")
    table.add_column("Message", style="white")
    table.add_column("Suggestion", style="green")

    for issue in quality_issues:
        table.add_row(
            issue["type"],
            issue["severity"],
            issue["message"],
            issue.get("suggestion", ""),
        )

    console.print(table)


def _print_summary(console: Console, report: LintReport) -> None:
    """Print a summary of linting results."""
    total = report["total_issues"]

    if total == 0:
        console.print("✅ [green]No linting issues found![/green]")
        return

    console.print("📊 [bold]Linting Summary[/bold]")
    console.print(f"Total issues: {total}")
    console.print()

    # Issues by severity
    if report["issues_by_severity"]:
        console.print("[bold]By Severity:[/bold]")
        for severity, count in report["issues_by_severity"].items():
            emoji = {"error": "🔴", "warning": "🟡", "info": "🔵"}.get(severity, "⚪")
            console.print(f"  {emoji} {severity.title()}: {count}")
        console.print()

    # Issues by type
    if report["issues_by_type"]:
        console.print("[bold]By Type:[/bold]")
        for issue_type, count in report["issues_by_type"].items():
            console.print(f"  • {issue_type.replace('_', ' ').title()}: {count}")


def _print_rich_report(console: Console, issues: list[Any], report: LintReport) -> None:
    """Print detailed rich-formatted linting report."""
    total = len(issues)

    if total == 0:
        console.print("✅ [green]No linting issues found![/green]")
        return

    # Print all sections of the report
    _print_summary_panel(console, total, report)
    _print_detailed_issues(console, issues, total)
    _print_suggestions_panel(console, report)


def _print_summary_panel(console: Console, total: int, report: LintReport) -> None:
    """Print the summary panel with issue counts by severity."""
    summary_text = Text()
    summary_text.append(f"Total Issues: {total}\n", style="bold")

    for severity, count in report["issues_by_severity"].items():
        color = {"error": "red", "warning": "yellow", "info": "blue"}.get(
            severity, "white"
        )
        summary_text.append(f"{severity.title()}: {count}  ", style=color)

    console.print(Panel(summary_text, title="📊 Linting Summary", border_style="blue"))
    console.print()


def _print_detailed_issues(console: Console, issues: list[Any], total: int) -> None:
    """Print detailed issue information with formatting."""
    # Show first 20 issues with details
    for issue in issues[:20]:
        issue_text = _format_single_issue(issue)
        console.print(issue_text)
        console.print()

    # Show overflow message if needed
    if total > 20:
        console.print(f"... and {total - 20} more issues")
        console.print("💡 Use --format=summary for a condensed view")


def _format_single_issue(issue: Any) -> Text:
    """Format a single issue with emojis, colors, and location info."""
    # Choose emoji and color based on issue type and severity
    type_emoji = {
        "naming_convention": "📝",
        "emoji_usage": "😀",
        "unprofessional_language": "💬",
    }.get(issue.issue_type, "⚠️")

    severity_color = {"error": "red", "warning": "yellow", "info": "blue"}.get(
        issue.severity, "white"
    )

    # Format location info
    location = _format_issue_location(issue)

    # Build issue text
    issue_text = Text()
    issue_text.append(f"{type_emoji} ", style="")
    issue_text.append(f"[{issue.severity.upper()}] ", style=severity_color)
    issue_text.append(f"{issue.message}\n", style="white")
    issue_text.append(f"   📁 {location}", style="dim")

    if issue.suggestion:
        issue_text.append(f"\n   💡 {issue.suggestion}", style="green")

    return issue_text


def _format_issue_location(issue: Any) -> str:
    """Format the location string for an issue."""
    location = str(issue.file_path)
    if issue.line_number:
        location += f":{issue.line_number}"
        if issue.column:
            location += f":{issue.column}"
    return location


def _print_suggestions_panel(console: Console, report: LintReport) -> None:
    """Print the suggestions panel with quick fixes."""
    if not report["suggestions"]:
        return

    console.print()
    suggestions_text = Text()
    suggestions_text.append("🔧 Quick Fixes:\n", style="bold green")

    # Show top 5 suggestions
    for i, suggestion in enumerate(report["suggestions"][:5], 1):
        if isinstance(suggestion, dict):
            suggestion_text = suggestion.get("suggestion", str(suggestion))
            file_name = suggestion.get("file", "unknown")
        else:
            suggestion_text = str(suggestion)
            file_name = "unknown"

        suggestions_text.append(f"{i}. {suggestion_text}\n", style="green")
        suggestions_text.append(f"   {Path(file_name).name}\n", style="dim")

    console.print(Panel(suggestions_text, title="💡 Suggestions", border_style="green"))
