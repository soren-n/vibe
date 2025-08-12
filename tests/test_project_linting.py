"""Tests for the project linting system."""

import tempfile
from pathlib import Path

import pytest

from vibe.config import LintConfig
from vibe.lint import LanguageLinter, NamingConventionLinter, ProjectLinter


def test_naming_convention_linter() -> None:
    """Test file naming convention detection."""
    config = LintConfig()
    linter = NamingConventionLinter(config)

    # Test snake_case for Python files
    good_file = Path("good_python_file.py")
    issues = linter.lint_file_naming(good_file)
    assert len(issues) == 0

    # Test camelCase violation for Python files
    bad_file = Path("badCamelCaseFile.py")
    issues = linter.lint_file_naming(bad_file)
    assert len(issues) == 1
    assert issues[0].issue_type == "naming_convention"
    assert "snake_case" in issues[0].message


def test_language_linter() -> None:
    """Test language and emoji detection."""
    config = LintConfig()
    linter = LanguageLinter(config)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write("This is awesome! 😀 We gonna make this super cool!")
        temp_path = Path(f.name)

    try:
        issues = linter.lint_file_content(temp_path)

        # Should find emoji usage and unprofessional language
        emoji_issues = [i for i in issues if i.issue_type == "emoji_usage"]
        lang_issues = [i for i in issues if i.issue_type == "unprofessional_language"]

        assert len(emoji_issues) == 1  # One emoji
        assert len(lang_issues) >= 3  # awesome, super, gonna

    finally:
        temp_path.unlink()


def test_project_linter_integration() -> None:
    """Test the main ProjectLinter class."""
    linter = ProjectLinter()

    # Test text quality analysis
    bad_text = "This is awesome! 😀 We gonna make this super cool!"
    issues = linter.lint_text(bad_text)

    assert len(issues) >= 3  # Should catch multiple unprofessional words

    # Test length checking for step messages
    long_text = (
        "This is a very long step message that exceeds the recommended length "
        "for workflow steps and continues with even more unnecessary verbose "
        "text to make it longer than one hundred characters"
    )
    step_issues = linter.lint_text(long_text, "step_message")

    length_issues = [i for i in step_issues if i["type"] == "length"]
    assert len(length_issues) == 1


def test_config_defaults() -> None:
    """Test that LintConfig has sensible defaults."""
    config = LintConfig()

    assert config.check_emojis is True
    assert config.check_professional_language is True
    assert ".py" in config.naming_conventions
    assert config.naming_conventions[".py"] == "snake_case"
    assert config.directory_naming == "snake_case"
    assert config.max_step_message_length == 100


def test_exclude_patterns() -> None:
    """Test that exclude patterns work correctly."""
    config = LintConfig()
    linter = NamingConventionLinter(config)

    # Files in excluded directories shouldn't be linted
    node_modules_file = Path("node_modules/someFile.js")
    issues = linter.lint_file_naming(node_modules_file)
    assert len(issues) == 0

    # UI files should be excluded from language linting
    lang_linter = LanguageLinter(config)
    Path("src/cli/interface.py")

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write("This is awesome! 😀")
        temp_path = Path(f.name)
        # Simulate UI file by making it match UI pattern
        temp_path = temp_path.parent / "cli_interface.py"
        Path(f.name).rename(temp_path)

    try:
        issues = lang_linter.lint_file_content(temp_path)
        # Should have no issues because it's a CLI file (excluded for UI)
        assert len(issues) == 0

    finally:
        if temp_path.exists():
            temp_path.unlink()


if __name__ == "__main__":
    pytest.main([__file__])
