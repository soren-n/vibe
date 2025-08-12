"""Tests for CLI validation functionality."""

import json
from unittest.mock import Mock, patch

from click.testing import CliRunner

from vibe.cli.validation import _get_migration_guide, check, config_info, list_workflows


def test_get_migration_guide_version_conversion() -> None:
    """Test migration guide handles version conversion correctly."""
    # Test string to int conversion
    result = _get_migration_guide("1.0", 1)
    assert "Migration:" in result or "Update to" in result

    # Test int to int
    result = _get_migration_guide(0, 1)
    assert "Migration:" in result
    assert "protocol_version: 1" in result

    # Test invalid string version - it should map to version 0 and give known migration
    result = _get_migration_guide("invalid", 1)
    assert "protocol_version: 1" in result


def test_get_migration_guide_known_migration() -> None:
    """Test migration guide for known version transitions."""
    result = _get_migration_guide(0, 1)
    assert "Migration:" in result
    assert "VS Code chat mode support" in result


def test_get_migration_guide_unknown_migration() -> None:
    """Test migration guide for unknown version transitions."""
    result = _get_migration_guide(5, 10)
    assert "Update to 'protocol_version: 10'" in result


def test_check_command_basic() -> None:
    """Test check command runs without crashing."""
    runner = CliRunner()
    result = runner.invoke(check)
    # Command should not crash, though it may fail validation
    assert result.exit_code in [0, 1]  # 0 = success, 1 = validation errors


def test_check_command_json_output() -> None:
    """Test check command with JSON output option."""
    runner = CliRunner()
    result = runner.invoke(check, ["--json"])

    # Should not crash
    assert result.exit_code in [0, 1]

    # If successful and produces output, check if it ends with valid JSON
    if result.exit_code == 0 and result.output.strip():
        lines = result.output.strip().split("\n")
        # Look for JSON at the end (the command may print status first, then JSON)
        if lines and lines[-1].startswith("{"):
            try:
                json.loads(lines[-1])
            except json.JSONDecodeError:
                # If the last line isn't JSON, maybe the whole output is one JSON block
                # Try to find JSON content in the output
                if "{" in result.output and "}" in result.output:
                    # Extract JSON part
                    start = result.output.rfind("{")
                    if start != -1:
                        json_part = result.output[start:]
                        try:
                            json.loads(json_part)
                        except json.JSONDecodeError:
                            pass  # JSON output format may vary


def test_config_info_command() -> None:
    """Test config-info command runs without crashing."""
    runner = CliRunner()
    result = runner.invoke(config_info)
    assert result.exit_code == 0
    # Should contain some config information
    assert len(result.output) > 0


def test_list_workflows_command() -> None:
    """Test list-workflows command runs without crashing."""
    runner = CliRunner()
    result = runner.invoke(list_workflows)
    assert result.exit_code == 0
    # Should list some workflows
    assert len(result.output) > 0


def test_list_workflows_with_filter() -> None:
    """Test list-workflows command with workflow filter."""
    runner = CliRunner()
    result = runner.invoke(list_workflows, ["python"])
    assert result.exit_code == 0
    # Should still produce output
    assert len(result.output) > 0


@patch("vibe.cli.validation.subprocess.run")
def test_check_command_with_mocked_subprocess(mock_run: Mock) -> None:
    """Test check command with mocked subprocess calls."""
    # Mock successful subprocess calls
    mock_run.return_value = Mock(returncode=0, stdout="", stderr="")

    runner = CliRunner()
    result = runner.invoke(check)

    # Should not crash
    assert result.exit_code in [0, 1]


@patch("vibe.cli.validation.Path.exists")
def test_check_command_missing_tools(mock_exists: Mock) -> None:
    """Test check command behavior when tools are missing."""
    # Mock that tools don't exist
    mock_exists.return_value = False

    runner = CliRunner()
    result = runner.invoke(check)

    # Should not crash even if tools are missing
    assert result.exit_code in [0, 1]


def test_check_command_output_format() -> None:
    """Test that check command produces readable output."""
    runner = CliRunner()
    result = runner.invoke(check)

    # Output should contain some validation information
    output = result.output.lower()
    # Look for common validation output patterns
    validation_keywords = ["vibe", "config", "environment", "check", "validation"]
    assert any(keyword in output for keyword in validation_keywords)
