#!/usr/bin/env python3
"""
Workflow and Checklist Refactoring Script

This script analyzes and refactors Vibe workflow and checklist YAML files to remove
redundancy with the new prefix/suffix system and ensure compliance with language standards.

The new prefix/suffix system adds:
- Commands: "AUTO-VIBE: Execute without interaction..." + step + "Remember: Analyze, Reflect, Plan, Execute"
- Guidance: "AUTO-VIBE: Verify and report status briefly." + step + "Remember: Analyze, Reflect, Plan, Execute"

This means we need to remove redundant action verbs from step text.
"""

import argparse
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass
class RefactoringChange:
    """Represents a proposed change to a workflow/checklist item."""

    file_path: str
    item_type: str  # 'workflow_step' or 'checklist_item'
    original: str
    proposed: str
    confidence: str  # 'high', 'medium', 'low'
    reasoning: str


class WorkflowRefactorer:
    """Refactors workflow and checklist files to remove redundancy with prefix/suffix system."""

    def __init__(self):
        # Redundant action verbs that should be removed (case-insensitive)
        self.redundant_verbs = [
            "execute",
            "run",
            "check that",
            "verify that",
            "validate that",
            "ensure that",
            "confirm that",
            "test that",
        ]

        # More complex patterns for transformation
        self.transformation_patterns = [
            # "Execute X" → "X"
            (r"^Execute\s+(.+)$", r"\1", "high"),
            # "Run X" → "X"
            (r"^Run\s+(.+)$", r"\1", "high"),
            # "Check that X" → "X"
            (r"^Check that\s+(.+)$", r"\1", "high"),
            # "Verify that X" → "X"
            (r"^Verify that\s+(.+)$", r"\1", "high"),
            # "Validate that X" → "X"
            (r"^Validate that\s+(.+)$", r"\1", "high"),
            # "Ensure that X" → "X"
            (r"^Ensure that\s+(.+)$", r"\1", "high"),
            # "Confirm that X" → "X"
            (r"^Confirm that\s+(.+)$", r"\1", "high"),
            # "Test that X" → "X"
            (r"^Test that\s+(.+)$", r"\1", "medium"),
            # Special case: "Run X: `command`" → "X: `command`"
            (r"^Run\s+([^:]+):\s*(.+)$", r"\1: \2", "high"),
            # Special case: "Execute X with Y" → "X with Y"
            (r"^Execute\s+([^:]+)\s+with\s+(.+)$", r"\1 with \2", "high"),
        ]

    def find_workflow_files(self, base_path: Path) -> list[Path]:
        """Find all workflow and checklist YAML files."""
        yaml_files = []

        # Look in vibe/data/workflows and vibe/data/checklists
        for pattern in ["**/workflows/**/*.yaml", "**/checklists/**/*.yaml"]:
            yaml_files.extend(base_path.glob(pattern))

        return sorted(yaml_files)

    def analyze_file(self, file_path: Path) -> list[RefactoringChange]:
        """Analyze a single YAML file for refactoring opportunities."""
        changes = []

        try:
            with open(file_path, encoding="utf-8") as f:
                data = yaml.safe_load(f)

            if not data:
                return changes

            # Analyze workflow steps
            if "steps" in data:
                changes.extend(self._analyze_workflow_steps(file_path, data["steps"]))

            # Analyze checklist items
            if "items" in data:
                changes.extend(self._analyze_checklist_items(file_path, data["items"]))

        except Exception as e:
            print(f"Error analyzing {file_path}: {e}")

        return changes

    def _analyze_workflow_steps(
        self, file_path: Path, steps: list[Any]
    ) -> list[RefactoringChange]:
        """Analyze workflow steps for refactoring opportunities."""
        changes = []

        for i, step in enumerate(steps):
            step_text = ""

            # Handle both string steps and dict steps with step_text
            if isinstance(step, str):
                step_text = step
            elif isinstance(step, dict) and "step_text" in step:
                step_text = step["step_text"]
            else:
                continue

            # Check for transformation opportunities
            proposed_change = self._transform_text(step_text)
            if proposed_change and proposed_change["text"] != step_text:
                changes.append(
                    RefactoringChange(
                        file_path=str(file_path),
                        item_type="workflow_step",
                        original=step_text,
                        proposed=proposed_change["text"],
                        confidence=proposed_change["confidence"],
                        reasoning=proposed_change["reasoning"],
                    )
                )

        return changes

    def _analyze_checklist_items(
        self, file_path: Path, items: list[str]
    ) -> list[RefactoringChange]:
        """Analyze checklist items for refactoring opportunities."""
        changes = []

        for item in items:
            if not isinstance(item, str):
                continue

            proposed_change = self._transform_text(item)
            if proposed_change and proposed_change["text"] != item:
                changes.append(
                    RefactoringChange(
                        file_path=str(file_path),
                        item_type="checklist_item",
                        original=item,
                        proposed=proposed_change["text"],
                        confidence=proposed_change["confidence"],
                        reasoning=proposed_change["reasoning"],
                    )
                )

        return changes

    def _transform_text(self, text: str) -> dict[str, str] | None:
        """Transform text according to refactoring rules."""
        original_text = text.strip()

        # Try each transformation pattern
        for pattern, replacement, confidence in self.transformation_patterns:
            match = re.match(pattern, original_text, re.IGNORECASE)
            if match:
                transformed = re.sub(
                    pattern, replacement, original_text, flags=re.IGNORECASE
                )

                # Ensure first character is capitalized for professional appearance
                if transformed and transformed[0].islower():
                    transformed = transformed[0].upper() + transformed[1:]

                # Don't suggest changes that result in incomplete sentences
                if len(transformed.strip()) < 3:
                    continue

                return {
                    "text": transformed,
                    "confidence": confidence,
                    "reasoning": f"Removed redundant verb using pattern: {pattern}",
                }

        return None

    def generate_report(self, changes: list[RefactoringChange]) -> str:
        """Generate a human-readable report of proposed changes."""
        if not changes:
            return "No refactoring opportunities found."

        report = []
        report.append("Workflow and Checklist Refactoring Analysis")
        report.append("=" * 50)
        report.append(f"Total files analyzed: {len(set(c.file_path for c in changes))}")
        report.append(f"Total changes proposed: {len(changes)}")
        report.append("")

        # Group by confidence level
        high_confidence = [c for c in changes if c.confidence == "high"]
        medium_confidence = [c for c in changes if c.confidence == "medium"]
        low_confidence = [c for c in changes if c.confidence == "low"]

        for confidence, changes_list in [
            ("HIGH CONFIDENCE", high_confidence),
            ("MEDIUM CONFIDENCE", medium_confidence),
            ("LOW CONFIDENCE", low_confidence),
        ]:
            if not changes_list:
                continue

            report.append(f"{confidence} CHANGES ({len(changes_list)})")
            report.append("-" * 40)

            for change in changes_list:
                report.append(f"File: {change.file_path}")
                report.append(f"Type: {change.item_type}")
                report.append(f"Original:  {change.original}")
                report.append(f"Proposed:  {change.proposed}")
                report.append(f"Reasoning: {change.reasoning}")
                report.append("")

        return "\n".join(report)

    def apply_changes(
        self, changes: list[RefactoringChange], create_backup: bool = True
    ) -> bool:
        """Apply the refactoring changes to files."""
        if not changes:
            print("No changes to apply.")
            return True

        files_to_modify = set(change.file_path for change in changes)

        print(f"Applying changes to {len(files_to_modify)} files...")

        for file_path in files_to_modify:
            file_changes = [c for c in changes if c.file_path == file_path]

            try:
                # Create backup if requested
                if create_backup:
                    backup_path = Path(file_path + ".backup")
                    shutil.copy2(file_path, backup_path)
                    print(f"Created backup: {backup_path}")

                # Apply changes to this file
                self._apply_file_changes(Path(file_path), file_changes)
                print(f"Applied {len(file_changes)} changes to {file_path}")

            except Exception as e:
                print(f"Error applying changes to {file_path}: {e}")
                return False

        return True

    def _apply_file_changes(self, file_path: Path, changes: list[RefactoringChange]):
        """Apply changes to a specific file."""
        with open(file_path, encoding="utf-8") as f:
            data = yaml.safe_load(f)

        # Build a mapping of original → proposed text
        change_map = {c.original: c.proposed for c in changes}

        # Apply changes to workflow steps
        if "steps" in data:
            for i, step in enumerate(data["steps"]):
                if isinstance(step, str) and step in change_map:
                    data["steps"][i] = change_map[step]
                elif (
                    isinstance(step, dict)
                    and "step_text" in step
                    and step["step_text"] in change_map
                ):
                    data["steps"][i]["step_text"] = change_map[step["step_text"]]

        # Apply changes to checklist items
        if "items" in data:
            for i, item in enumerate(data["items"]):
                if isinstance(item, str) and item in change_map:
                    data["items"][i] = change_map[item]

        # Write back to file
        with open(file_path, "w", encoding="utf-8") as f:
            yaml.dump(
                data, f, default_flow_style=False, allow_unicode=True, sort_keys=False
            )


def main():
    parser = argparse.ArgumentParser(
        description="Refactor Vibe workflows and checklists"
    )
    parser.add_argument(
        "--path",
        type=Path,
        default=Path("."),
        help="Base path to search for YAML files (default: current directory)",
    )
    parser.add_argument(
        "--analyze",
        action="store_true",
        help="Analyze files and generate refactoring report (default mode)",
    )
    parser.add_argument(
        "--apply", action="store_true", help="Apply refactoring changes to files"
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Skip creating backup files when applying changes",
    )
    parser.add_argument(
        "--min-confidence",
        choices=["high", "medium", "low"],
        default="high",
        help="Minimum confidence level for changes to apply (default: high)",
    )

    args = parser.parse_args()

    refactorer = WorkflowRefactorer()

    # Find all YAML files
    yaml_files = refactorer.find_workflow_files(args.path)
    print(f"Found {len(yaml_files)} workflow/checklist YAML files")

    # Analyze all files
    all_changes = []
    for file_path in yaml_files:
        changes = refactorer.analyze_file(file_path)
        all_changes.extend(changes)

    # Filter by confidence level
    confidence_levels = {"high": 3, "medium": 2, "low": 1}
    min_level = confidence_levels[args.min_confidence]
    filtered_changes = [
        c for c in all_changes if confidence_levels.get(c.confidence, 0) >= min_level
    ]

    # Generate and display report
    report = refactorer.generate_report(filtered_changes)
    print(report)

    # Apply changes if requested
    if args.apply:
        if not filtered_changes:
            print("No changes to apply with the specified confidence level.")
            return

        print(f"\nApplying {len(filtered_changes)} changes...")
        success = refactorer.apply_changes(
            filtered_changes, create_backup=not args.no_backup
        )

        if success:
            print("Refactoring completed successfully!")
        else:
            print("Some errors occurred during refactoring.")
    else:
        print("\nTo apply these changes, run with --apply")
        print(f"(Currently showing changes with confidence >= {args.min_confidence})")


if __name__ == "__main__":
    main()
