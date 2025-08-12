#!/usr/bin/env python3
"""
Analyze all workflows to identify steps that should be converted to checklists.
"""

import re
from pathlib import Path
from typing import Any

import yaml

# Keywords that indicate validation/checklist steps
VALIDATION_KEYWORDS = {
    "check",
    "verify",
    "ensure",
    "confirm",
    "validate",
    "compliance",
    "standards",
    "quality",
    "documentation",
    "exists",
    "met",
    "pass",
    "correct",
    "proper",
    "appropriate",
    "requirements",
}

# Keywords that indicate execution/workflow steps
EXECUTION_KEYWORDS = {
    "run",
    "execute",
    "install",
    "setup",
    "create",
    "build",
    "deploy",
    "update",
    "upgrade",
    "format",
    "lint",
    "test",
    "publish",
    "configure",
}


def analyze_step(step: str) -> tuple[str, float]:
    """Analyze a step to determine if it's validation or execution."""
    step_lower = step.lower()

    # Count validation vs execution keywords
    validation_count = sum(
        1 for keyword in VALIDATION_KEYWORDS if keyword in step_lower
    )
    execution_count = sum(1 for keyword in EXECUTION_KEYWORDS if keyword in step_lower)

    # Look for command patterns (quotes, backticks, specific commands)
    has_command = bool(
        re.search(r'`[^`]+`|"[^"]*(?:uv run|npm|git|python)[^"]*"', step)
    )
    if has_command:
        execution_count += 2

    # Look for question patterns
    has_question = "?" in step or step_lower.startswith(("is ", "are ", "does ", "do "))
    if has_question:
        validation_count += 1

    # Calculate confidence score
    total_keywords = validation_count + execution_count
    if total_keywords == 0:
        return "UNCLEAR", 0.0

    validation_ratio = validation_count / total_keywords
    if validation_ratio > 0.6:
        return "VALIDATION", validation_ratio
    elif validation_ratio < 0.4:
        return "EXECUTION", 1 - validation_ratio
    else:
        return "MIXED", 0.5


def _load_workflow_data(file_path: Path) -> dict[str, Any] | None:
    """Load and validate workflow data from file."""
    try:
        with open(file_path) as f:
            data = yaml.safe_load(f)

        if not data or "steps" not in data:
            return None
        return data
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return None


def _initialize_results(data: dict[str, Any], file_path: Path) -> dict[str, Any]:
    """Initialize results dictionary for workflow analysis."""
    return {
        "name": data.get("name", file_path.stem),
        "file": str(file_path),
        "total_steps": len(data["steps"]),
        "steps_analysis": [],
        "validation_steps": [],
        "execution_steps": [],
        "mixed_steps": [],
        "unclear_steps": [],
    }


def _extract_step_text(step: Any) -> str:
    """Extract step text from step object."""
    if isinstance(step, str):
        return step
    return step.get("step_text", str(step))


def _create_step_info(
    index: int, step_text: str, step_type: str, confidence: float
) -> dict[str, Any]:
    """Create step information dictionary."""
    return {
        "index": index,
        "text": step_text[:100] + "..." if len(step_text) > 100 else step_text,
        "type": step_type,
        "confidence": confidence,
    }


def _categorize_step(results: dict[str, Any], step_info: dict[str, Any]) -> None:
    """Categorize step based on type."""
    step_type = step_info["type"]
    results["steps_analysis"].append(step_info)

    if step_type == "VALIDATION":
        results["validation_steps"].append(step_info)
    elif step_type == "EXECUTION":
        results["execution_steps"].append(step_info)
    elif step_type == "MIXED":
        results["mixed_steps"].append(step_info)
    else:
        results["unclear_steps"].append(step_info)


def _calculate_workflow_classification(results: dict[str, Any]) -> None:
    """Calculate overall workflow classification metrics."""
    validation_pct = len(results["validation_steps"]) / results["total_steps"]
    execution_pct = len(results["execution_steps"]) / results["total_steps"]

    results["validation_percentage"] = validation_pct
    results["execution_percentage"] = execution_pct
    results["refactor_priority"] = (
        "HIGH" if validation_pct > 0.3 else "MEDIUM" if validation_pct > 0.1 else "LOW"
    )


def analyze_workflow_file(file_path: Path) -> dict[str, Any] | None:
    """Analyze a single workflow file."""
    data = _load_workflow_data(file_path)
    if not data:
        return None

    results = _initialize_results(data, file_path)

    for i, step in enumerate(data["steps"]):
        step_text = _extract_step_text(step)
        step_type, confidence = analyze_step(step_text)
        step_info = _create_step_info(i, step_text, step_type, confidence)
        _categorize_step(results, step_info)

    _calculate_workflow_classification(results)
    return results


def main() -> None:
    """Main analysis function."""
    workflows_dir = Path("vibe/workflows/data")

    # Collect and analyze workflow files
    workflow_files = _collect_workflow_files(workflows_dir)
    analysis_results = _analyze_workflow_files(workflow_files)

    # Categorize by priority
    prioritized_results = _categorize_by_priority(analysis_results)

    # Generate reports
    _print_analysis_summary(prioritized_results)
    _print_refactoring_recommendations(prioritized_results["high_priority"])


def _collect_workflow_files(workflows_dir: Path) -> list[Path]:
    """Collect workflow YAML files, excluding checklists."""
    workflow_files = []
    for yaml_file in workflows_dir.rglob("*.yaml"):
        if "checklists" not in str(yaml_file):
            workflow_files.append(yaml_file)
    return sorted(workflow_files)


def _analyze_workflow_files(workflow_files: list[Path]) -> list[dict[str, Any]]:
    """Analyze all workflow files and return results."""
    print(f"Analyzing {len(workflow_files)} workflow files...\n")

    results = []
    for file_path in workflow_files:
        result = analyze_workflow_file(file_path)
        if result:
            results.append(result)

    return results


def _categorize_by_priority(
    analysis_results: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """Categorize analysis results by refactoring priority."""
    high_priority = []
    medium_priority = []
    low_priority = []

    for result in analysis_results:
        if result["refactor_priority"] == "HIGH":
            high_priority.append(result)
        elif result["refactor_priority"] == "MEDIUM":
            medium_priority.append(result)
        else:
            low_priority.append(result)

    return {
        "high_priority": high_priority,
        "medium_priority": medium_priority,
        "low_priority": low_priority,
    }


def _print_analysis_summary(
    prioritized_results: dict[str, list[dict[str, Any]]],
) -> None:
    """Print the analysis summary with all priority categories."""
    print("WORKFLOW REFACTORING ANALYSIS")
    print("=" * 50)

    _print_high_priority_summary(prioritized_results["high_priority"])
    _print_medium_priority_summary(prioritized_results["medium_priority"])
    _print_low_priority_summary(prioritized_results["low_priority"])


def _print_high_priority_summary(high_priority: list[dict[str, Any]]) -> None:
    """Print high priority workflow summary."""
    print(f"\nHIGH PRIORITY (>30% validation steps): {len(high_priority)} workflows")
    for workflow in high_priority:
        validation_pct = workflow["validation_percentage"]
        print(f"  📋 {workflow['name']} ({validation_pct:.1%} validation)")
        print(f"     File: {workflow['file']}")

        val_count = len(workflow["validation_steps"])
        exec_count = len(workflow["execution_steps"])
        print(f"     Steps: {val_count} validation, {exec_count} execution")
        if workflow["validation_steps"]:
            print("     Validation examples:")
            for step in workflow["validation_steps"][:2]:
                print(f"       - {step['text']}")
        print()


def _print_medium_priority_summary(medium_priority: list[dict[str, Any]]) -> None:
    """Print medium priority workflow summary."""
    print(f"\nMEDIUM PRIORITY (10-30% validation): {len(medium_priority)} workflows")
    for workflow in medium_priority:
        validation_pct = workflow["validation_percentage"]
        print(f"  🔧 {workflow['name']} ({validation_pct:.1%} validation)")


def _print_low_priority_summary(low_priority: list[dict[str, Any]]) -> None:
    """Print low priority workflow summary."""
    print(f"\nLOW PRIORITY (<10% validation): {len(low_priority)} workflows")
    print("  These workflows are mostly execution-focused and need minimal changes.")


def _print_refactoring_recommendations(high_priority: list[dict[str, Any]]) -> None:
    """Print detailed refactoring recommendations."""
    print("\nREFACTORING RECOMMENDATIONS")
    print("=" * 50)

    for workflow in high_priority[:5]:  # Top 5 high priority
        print(f"\n🎯 {workflow['name']}")
        print(f"   Current: {workflow['total_steps']} steps")
        print("   Suggested split:")
        print(f"     - Workflow: {len(workflow['execution_steps'])} execution steps")
        print(f"     - Checklist: {len(workflow['validation_steps'])} validation items")

        if workflow["validation_steps"]:
            print("   Checklist items to extract:")
            for step in workflow["validation_steps"]:
                print(f"     ✓ {step['text']}")


if __name__ == "__main__":
    main()
