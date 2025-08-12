"""Test checklist functionality."""

from vibe.guidance.loader import get_checklist, get_checklists
from vibe.guidance.models import Checklist


def test_load_checklists() -> None:
    """Test that checklists can be loaded successfully."""
    checklists = get_checklists()

    # Should load at least one checklist
    assert len(checklists) > 0

    # Check structure of first checklist
    first_checklist = next(iter(checklists.values()))
    assert hasattr(first_checklist, "name")
    assert hasattr(first_checklist, "triggers")
    assert hasattr(first_checklist, "items")


def test_get_checklist_by_name() -> None:
    """Test retrieving a specific checklist by name."""
    checklist = get_checklist("Python Release Readiness")
    assert checklist is not None
    assert checklist.name == "Python Release Readiness"
    assert len(checklist.items) > 0

    # Test non-existent checklist
    missing = get_checklist("Non-existent Checklist")
    assert missing is None


def test_checklist_structure() -> None:
    """Test that checklists have the correct structure."""
    checklist = get_checklist("Refactoring Validation")
    assert checklist is not None
    assert isinstance(checklist, Checklist)
    assert checklist.name == "Refactoring Validation"
    assert "refactor quality checklist" in checklist.triggers
    assert len(checklist.items) > 0
    # Verify items don't contain emojis (following language standards)
    assert all(not item.startswith("✅") for item in checklist.items)


def test_checklist_project_types() -> None:
    """Test that project type filtering works for checklists."""
    python_checklist = get_checklist("Python Release Readiness")
    assert python_checklist is not None
    assert python_checklist.project_types is not None
    assert "python" in python_checklist.project_types


def test_checklist_vs_workflow_distinction() -> None:
    """Test that checklists and workflows are distinct."""
    from vibe.guidance.loader import get_workflows

    workflows = get_workflows()
    checklists = get_checklists()

    assert workflows is not None
    assert checklists is not None

    # Should find workflows but not confuse with checklists
    workflow_names = list(workflows.keys()) if workflows else []
    checklist_names = [c.name for c in checklists.values()]

    # These should be separate lists
    assert len(workflow_names) > 0
    assert len(checklist_names) > 0

    # No overlap in names (they serve different purposes)
    overlap = set(workflow_names) & set(checklist_names)
    assert len(overlap) == 0, f"Found overlapping names: {overlap}"


def test_analyzer_with_checklists() -> None:
    """Test that the analyzer properly detects checklists."""
    from vibe.analyzer import PromptAnalyzer
    from vibe.config import VibeConfig

    config = VibeConfig()
    analyzer = PromptAnalyzer(config)

    # Test checklist detection with a generic checklist
    results = analyzer.analyze("checklist validation", show_analysis=False)
    # The analyzer should find some results, though they may not all be checklists
    assert len(results) > 0
    # Check if any results correspond to known checklists
    from vibe.guidance.loader import get_checklists

    all_checklists = get_checklists()
    checklist_found = any(result in all_checklists for result in results)
    # Accept either checklists or validation-related workflows (like "Check Vibe Configuration")
    validation_items = [item for item in results if any(word in item.lower() for word in ["validation", "check", "config"])]
    assert (
        checklist_found
        or len(validation_items) > 0
    )

    # Test with project type override for Python-specific checklist
    config.project_type = "python"
    analyzer = PromptAnalyzer(config)
    results = analyzer.analyze("release checklist", show_analysis=False)
    checklist_items = [item for item in results if item.startswith("checklist:")]
    assert len(checklist_items) > 0
    assert "checklist:Python Release Readiness" in results


def test_orchestrator_with_checklists() -> None:
    """Test that the orchestrator properly handles checklists."""
    from vibe.config import VibeConfig
    from vibe.orchestrator import WorkflowOrchestrator

    config = VibeConfig()
    orchestrator = WorkflowOrchestrator(config)

    # Test with checklist items
    items = ["quality", "checklist:Refactoring Validation"]
    result = orchestrator.plan_workflows(items, "test", show_display=False)

    assert result["success"]
    assert "checklists" in result
    assert "Refactoring Validation" in result["checklists"]
    assert len(result["execution_plan"]) >= 2  # At least workflow and checklist

    # Check that guidance includes checklist
    guidance = result["guidance"]
    assert "CHECKLIST" in guidance  # Checklist prefix should be present
