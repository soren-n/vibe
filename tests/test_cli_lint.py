"""Tests for CLI lint functionality."""

import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
from click.testing import CliRunner

from vibe.cli.lint import _print_rich_report, _print_summary, lint
from vibe.lint import LintReport


def test_lint_group_help() -> None:
    """Test lint command group help."""
    runner = CliRunner()
    result = runner.invoke(lint, ["--help"])
    assert result.exit_code == 0
    assert "Project linting commands" in result.output


def test_project_command_help() -> None:
    """Test project command help."""
    runner = CliRunner()
    result = runner.invoke(lint, ["project", "--help"])
    assert result.exit_code == 0
    assert "project" in result.output.lower()


def test_text_command_help() -> None:
    """Test text command help."""
    runner = CliRunner()
    result = runner.invoke(lint, ["text", "--help"])
    assert result.exit_code == 0
    assert "text" in result.output.lower()


def test_project_command_basic() -> None:
    """Test project command runs without crashing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        runner = CliRunner()
        result = runner.invoke(lint, ["project", "--path", temp_dir])
        # Should not crash
        assert result.exit_code == 0


def test_project_command_current_directory() -> None:
    """Test project command with current directory."""
    runner = CliRunner()
    result = runner.invoke(lint, ["project"])
    # Should not crash
    assert result.exit_code == 0


def test_project_command_json_format() -> None:
    """Test project command with JSON output."""
    with tempfile.TemporaryDirectory() as temp_dir:
        runner = CliRunner()
        result = runner.invoke(
            lint, ["project", "--path", temp_dir, "--format", "json"]
        )
        assert result.exit_code == 0

        # Output should be valid JSON
        try:
            json.loads(result.output)
        except json.JSONDecodeError:
            pytest.fail("Output is not valid JSON")


def test_project_command_summary_format() -> None:
    """Test project command with summary output."""
    with tempfile.TemporaryDirectory() as temp_dir:
        runner = CliRunner()
        result = runner.invoke(
            lint, ["project", "--path", temp_dir, "--format", "summary"]
        )
        assert result.exit_code == 0


def test_project_command_with_severity_filter() -> None:
    """Test project command with severity filter."""
    with tempfile.TemporaryDirectory() as temp_dir:
        runner = CliRunner()
        result = runner.invoke(
            lint, ["project", "--path", temp_dir, "--severity", "error"]
        )
        assert result.exit_code == 0


def test_project_command_with_type_filter() -> None:
    """Test project command with issue type filter."""
    with tempfile.TemporaryDirectory() as temp_dir:
        runner = CliRunner()
        result = runner.invoke(
            lint, ["project", "--path", temp_dir, "--type", "naming_convention"]
        )
        assert result.exit_code == 0


def test_text_command_basic() -> None:
    """Test text command with basic text."""
    runner = CliRunner()
    result = runner.invoke(lint, ["text", "This is some test text"])
    assert result.exit_code == 0


def test_text_command_with_context() -> None:
    """Test text command with context."""
    runner = CliRunner()
    result = runner.invoke(lint, ["text", "test text", "--context", "general"])
    assert result.exit_code == 0


def test_text_command_json_format() -> None:
    """Test text command with JSON output."""
    runner = CliRunner()
    result = runner.invoke(lint, ["text", "test text", "--format", "json"])
    assert result.exit_code == 0

    # Output should be valid JSON
    try:
        json.loads(result.output)
    except json.JSONDecodeError:
        pytest.fail("Output is not valid JSON")


def test_text_command_summary_format() -> None:
    """Test text command with summary output."""
    runner = CliRunner()
    result = runner.invoke(lint, ["text", "test text", "--format", "summary"])
    assert result.exit_code == 0


@patch("vibe.cli.lint.ProjectLinter")
def test_project_command_with_mock_linter(mock_linter_class: Mock) -> None:
    """Test project command with mocked linter."""
    # Mock the linter to return a controlled report
    mock_linter = Mock()
    mock_linter.lint_project.return_value = []
    mock_linter_class.return_value = mock_linter

    with tempfile.TemporaryDirectory() as temp_dir:
        runner = CliRunner()
        result = runner.invoke(lint, ["project", "--path", temp_dir])
        assert result.exit_code == 0
        mock_linter.lint_project.assert_called_once()


def test_print_summary_function() -> None:
    """Test _print_summary function."""
    from rich.console import Console

    console = Console()

    # Create a mock report as a proper TypedDict
    report: LintReport = {
        "total_issues": 5,
        "issues_by_type": {"naming": 2, "style": 3},
        "issues_by_severity": {"error": 1, "warning": 4},
        "files_with_issues": ["test.py"],
        "suggestions": ["Use better naming"],
    }

    # Should not crash
    try:
        _print_summary(console, report)
    except Exception as e:
        pytest.fail(f"_print_summary crashed: {e}")


def test_print_rich_report_function() -> None:
    """Test _print_rich_report function."""
    from rich.console import Console

    from vibe.lint import LintIssue

    console = Console()

    # Create mock issues as LintIssue objects
    issues = [
        LintIssue(
            file_path=Path("test.py"),
            issue_type="naming_convention",
            severity="warning",
            message="Test message",
            line_number=1,
            column=1,
        )
    ]

    report: LintReport = {
        "total_issues": 1,
        "issues_by_type": {"naming_convention": 1},
        "issues_by_severity": {"warning": 1},
        "files_with_issues": ["test.py"],
        "suggestions": [],
    }

    # Should not crash
    try:
        _print_rich_report(console, issues, report)
    except Exception as e:
        pytest.fail(f"_print_rich_report crashed: {e}")


def test_text_command_with_problematic_text() -> None:
    """Test text command with text that might trigger linting issues."""
    runner = CliRunner()
    # Use text that might have linting issues
    problematic_text = (
        "This is AWESOME code with really bad naming like var1 and stuff!!!"
    )
    result = runner.invoke(lint, ["text", problematic_text])
    assert result.exit_code == 0


@patch("vibe.cli.lint.Path")
def test_project_command_nonexistent_path(mock_path: Mock) -> None:
    """Test project command with path that doesn't exist."""
    runner = CliRunner()
    # Click should catch this due to exists=True validation
    result = runner.invoke(lint, ["project", "--path", "/nonexistent/path"])
    # Should fail with path validation error
    assert result.exit_code != 0
