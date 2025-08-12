"""Test checklist functionality."""

from vibe.workflows.loader import get_checklist, get_checklists
from vibe.workflows.models import Checklist


def test_checklist_loading():
    """Test that checklists can be loaded properly."""
    checklists = get_checklists()

    # Should have our example checklists
    assert len(checklists) >= 4
    assert "Quality Check" in checklists
    assert "Python Release Readiness" in checklists
    assert "Feature Development" in checklists
    assert "Bug Fix Verification" in checklists


def test_checklist_structure():
    """Test that checklists have the correct structure."""
    checklist = get_checklist("Quality Check")
    assert checklist is not None
    assert isinstance(checklist, Checklist)
    assert checklist.name == "Quality Check"
    assert "quality check" in checklist.triggers
    assert len(checklist.items) > 0
    # Verify items don't contain emojis (following language standards)
    assert all(not item.startswith("✅") for item in checklist.items)


def test_checklist_project_types():
    """Test that project type filtering works for checklists."""
    python_checklist = get_checklist("Python Release Readiness")
    assert python_checklist is not None
    assert "python" in python_checklist.project_types


def test_checklist_vs_workflow_distinction():
    """Test that checklists and workflows are distinct."""
    from vibe.workflows.loader import get_workflows

    workflows = get_workflows()
    checklists = get_checklists()

    # Should have both workflows and checklists
    assert len(workflows) > 0
    assert len(checklists) > 0

    # Names should be distinct (no overlap)
    workflow_names = set(workflows.keys())
    checklist_names = set(checklists.keys())

    # This might not be strictly required, but good practice
    assert len(workflow_names & checklist_names) == 0


def test_analyzer_with_checklists():
    """Test that the analyzer properly detects checklists."""
    from vibe.analyzer import PromptAnalyzer
    from vibe.config import VibeConfig

    config = VibeConfig()
    analyzer = PromptAnalyzer(config)

    # Test checklist detection with a generic checklist
    results = analyzer.analyze("quality check", show_analysis=False)
    checklist_items = [item for item in results if item.startswith("checklist:")]
    assert len(checklist_items) > 0
    assert "checklist:Quality Check" in results

    # Test with project type override for Python-specific checklist
    config.project_type = "python"
    analyzer = PromptAnalyzer(config)
    results = analyzer.analyze("release checklist", show_analysis=False)
    checklist_items = [item for item in results if item.startswith("checklist:")]
    assert len(checklist_items) > 0
    assert "checklist:Python Release Readiness" in results


def test_orchestrator_with_checklists():
    """Test that the orchestrator properly handles checklists."""
    from vibe.config import VibeConfig
    from vibe.orchestrator import WorkflowOrchestrator

    config = VibeConfig()
    orchestrator = WorkflowOrchestrator(config)

    # Test with checklist items
    items = ["quality", "checklist:Quality Check"]
    result = orchestrator.plan_workflows(items, "test", show_display=False)

    assert result["success"]
    assert "checklists" in result
    assert "Quality Check" in result["checklists"]
    assert len(result["execution_plan"]) >= 2  # At least workflow and checklist

    # Check that guidance includes checklist
    guidance = result["guidance"]
    assert "CHECKLIST" in guidance  # Checklist prefix should be present
