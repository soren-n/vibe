"""Basic tests for vibe to enable self-testing."""

import pytest

from vibe import __version__
from vibe.analyzer import PromptAnalyzer
from vibe.config import VibeConfig


def test_version() -> None:
    """Test that version is defined."""
    assert __version__ == "0.1.0"


def test_config_loading() -> None:
    """Test that config can be loaded."""
    config = VibeConfig.load_from_file()
    # Project type should be auto-detected as "python" since we have pyproject.toml
    assert config.project_type == "python"
    assert "analysis" in config.workflows
    assert "implementation" in config.workflows


def test_prompt_analysis() -> None:
    """Test basic prompt analysis."""
    config = VibeConfig.load_from_file()
    analyzer = PromptAnalyzer(config)

    # Test analysis detection
    workflows = analyzer.analyze("analyze the project", show_analysis=False)
    assert "analysis" in workflows

    # Test testing detection
    workflows = analyzer.analyze("run tests", show_analysis=False)
    assert "testing" in workflows


def test_project_type_detection() -> None:
    """Test project type detection."""
    config = VibeConfig.load_from_file()
    # This will detect Python since we have pyproject.toml
    project_type = config.detect_project_type()
    assert project_type == "python"


if __name__ == "__main__":
    pytest.main([__file__])
