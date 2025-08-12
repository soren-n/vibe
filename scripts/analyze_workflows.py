#!/usr/bin/env python3
"""
Analyze all workflows to identify steps that should be converted to checklists.
"""

import re
from pathlib import Path

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


def analyze_workflow_file(file_path: Path) -> dict:
    """Analyze a single workflow file."""
    try:
        with open(file_path) as f:
            data = yaml.safe_load(f)

        if not data or "steps" not in data:
            return None

        results = {
            "name": data.get("name", file_path.stem),
            "file": str(file_path),
            "total_steps": len(data["steps"]),
            "steps_analysis": [],
            "validation_steps": [],
            "execution_steps": [],
            "mixed_steps": [],
            "unclear_steps": [],
        }

        for i, step in enumerate(data["steps"]):
            step_text = (
                step if isinstance(step, str) else step.get("step_text", str(step))
            )
            step_type, confidence = analyze_step(step_text)

            step_info = {
                "index": i,
                "text": step_text[:100] + "..." if len(step_text) > 100 else step_text,
                "type": step_type,
                "confidence": confidence,
            }

            results["steps_analysis"].append(step_info)

            if step_type == "VALIDATION":
                results["validation_steps"].append(step_info)
            elif step_type == "EXECUTION":
                results["execution_steps"].append(step_info)
            elif step_type == "MIXED":
                results["mixed_steps"].append(step_info)
            else:
                results["unclear_steps"].append(step_info)

        # Calculate overall workflow classification
        validation_pct = len(results["validation_steps"]) / results["total_steps"]
        execution_pct = len(results["execution_steps"]) / results["total_steps"]

        results["validation_percentage"] = validation_pct
        results["execution_percentage"] = execution_pct
        results["refactor_priority"] = (
            "HIGH"
            if validation_pct > 0.3
            else "MEDIUM"
            if validation_pct > 0.1
            else "LOW"
        )

        return results

    except Exception as e:
        print(f"Error analyzing {file_path}: {e}")
        return None


def main():
    """Main analysis function."""
    workflows_dir = Path("vibe/workflows/data")

    # Skip checklist directory since those are already checklists
    workflow_files = []
    for yaml_file in workflows_dir.rglob("*.yaml"):
        if "checklists" not in str(yaml_file):
            workflow_files.append(yaml_file)

    print(f"Analyzing {len(workflow_files)} workflow files...\n")

    high_priority = []
    medium_priority = []
    low_priority = []

    for file_path in sorted(workflow_files):
        result = analyze_workflow_file(file_path)
        if result:
            if result["refactor_priority"] == "HIGH":
                high_priority.append(result)
            elif result["refactor_priority"] == "MEDIUM":
                medium_priority.append(result)
            else:
                low_priority.append(result)

    # Print summary
    print("WORKFLOW REFACTORING ANALYSIS")
    print("=" * 50)

    print(f"\nHIGH PRIORITY (>30% validation steps): {len(high_priority)} workflows")
    for workflow in high_priority:
        print(
            f"  📋 {workflow['name']} ({workflow['validation_percentage']:.1%} validation)"
        )
        print(f"     File: {workflow['file']}")
        print(
            f"     Steps: {len(workflow['validation_steps'])} validation, {len(workflow['execution_steps'])} execution"
        )
        if workflow["validation_steps"]:
            print("     Validation examples:")
            for step in workflow["validation_steps"][:2]:
                print(f"       - {step['text']}")
        print()

    print(f"\nMEDIUM PRIORITY (10-30% validation): {len(medium_priority)} workflows")
    for workflow in medium_priority:
        print(
            f"  🔧 {workflow['name']} ({workflow['validation_percentage']:.1%} validation)"
        )

    print(f"\nLOW PRIORITY (<10% validation): {len(low_priority)} workflows")
    print("  These workflows are mostly execution-focused and need minimal changes.")

    # Create refactoring recommendations
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
