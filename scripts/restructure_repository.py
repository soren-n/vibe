#!/usr/bin/env python3
"""
Repository Restructuring Tool

Systematically reorganizes the Vibe project repository by:
- Merging duplicate/similar files
- Removing verbose filenames
- Consolidating redundant content
- Following language standards

Should be run after analyze_repository_sprawl.py to identify targets.
"""

import argparse
import shutil
from pathlib import Path
from typing import Any

import yaml


class RepositoryRestructurer:
    def __init__(self, repo_root: str, dry_run: bool = True):
        self.repo_root = Path(repo_root)
        self.data_dir = self.repo_root / "vibe" / "data"
        self.workflows_dir = self.data_dir / "workflows"
        self.checklists_dir = self.data_dir / "checklists"
        self.dry_run = dry_run
        self.changes_made = []

    def log_change(self, action: str, details: str):
        """Log a change that was made or would be made."""
        status = "[DRY RUN]" if self.dry_run else "[APPLIED]"
        message = f"{status} {action}: {details}"
        print(message)
        self.changes_made.append(message)

    def load_yaml_file(self, file_path: Path) -> dict[str, Any]:
        """Load and parse YAML file safely."""
        try:
            with open(file_path, encoding="utf-8") as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            return {}

    def save_yaml_file(self, file_path: Path, data: dict[str, Any]):
        """Save YAML data to file."""
        if not self.dry_run:
            with open(file_path, "w", encoding="utf-8") as f:
                yaml.dump(data, f, default_flow_style=False, sort_keys=False)

    def merge_similar_files(self, base_name: str, files: list[Path]) -> Path:
        """Merge multiple files with similar names/content."""
        if len(files) < 2:
            return files[0]

        # Load all files
        all_data = []
        for file_path in files:
            data = self.load_yaml_file(file_path)
            if data:
                all_data.append((file_path, data))

        if not all_data:
            return files[0]

        # Choose the primary file (shortest name, or workflow over checklist)
        primary_file, primary_data = min(
            all_data,
            key=lambda x: (
                "workflow" not in str(x[0]).lower(),  # Prefer workflows
                len(x[0].stem),  # Then shortest name
            ),
        )

        # Merge content from other files
        merged_triggers = set(primary_data.get("triggers", []))
        merged_items = primary_data.get("items", [])
        merged_steps = primary_data.get("steps", [])

        for file_path, data in all_data:
            if file_path == primary_file:
                continue

            # Merge triggers
            merged_triggers.update(data.get("triggers", []))

            # Merge items (for checklists)
            items = data.get("items", [])
            for item in items:
                if item not in merged_items:
                    merged_items.append(item)

            # Merge steps (for workflows)
            steps = data.get("steps", [])
            for step in steps:
                if step not in merged_steps:
                    merged_steps.append(step)

        # Update primary data
        primary_data["triggers"] = sorted(list(merged_triggers))
        if merged_items:
            primary_data["items"] = merged_items
        if merged_steps:
            primary_data["steps"] = merged_steps

        # Update description to be more generic
        primary_data["description"] = (
            f"Comprehensive {base_name.replace('_', ' ')} guidance"
        )

        # Save the merged file
        self.save_yaml_file(primary_file, primary_data)

        # Remove the other files
        for file_path, _ in all_data:
            if file_path != primary_file:
                self.log_change("DELETE", str(file_path.relative_to(self.data_dir)))
                if not self.dry_run:
                    file_path.unlink()

        self.log_change(
            "MERGE",
            f"Merged {len(files)} files into {primary_file.relative_to(self.data_dir)}",
        )
        return primary_file

    def rename_verbose_file(self, file_path: Path) -> Path:
        """Rename a file to remove verbosity and follow standards."""
        old_name = file_path.stem
        new_name = old_name

        # Remove redundant suffixes
        suffixes_to_remove = [
            "_validation",
            "_checklist",
            "_check",
            "_verify",
            "_quality",
            "_standards",
        ]
        for suffix in suffixes_to_remove:
            if new_name.endswith(suffix):
                new_name = new_name[: -len(suffix)]
                break

        # Simplify common verbose patterns
        replacements = {
            "documentation_driven_development": "doc_driven_dev",
            "complexity_analysis": "complexity",
            "session_management": "session",
            "comprehensive_test": "test_suite",
            "environment_setup": "env_setup",
            "guidance_approach": "guidance",
            "research_quality": "research",
            "code_quality_standards": "code_standards",
            "over_refactoring_prevention": "refactor_guard",
            "implementation_validation": "implementation",
            "help_system_validation": "help_system",
        }

        for old_pattern, new_pattern in replacements.items():
            if old_pattern in new_name:
                new_name = new_name.replace(old_pattern, new_pattern)
                break

        if new_name != old_name:
            new_path = file_path.parent / f"{new_name}.yaml"
            self.log_change(
                "RENAME",
                f"{file_path.relative_to(self.data_dir)} -> {new_path.relative_to(self.data_dir)}",
            )
            if not self.dry_run:
                file_path.rename(new_path)
            return new_path

        return file_path

    def consolidate_categories(self):
        """Reorganize over-represented categories."""
        # Move some development files to more specific categories
        dev_files_to_move = [
            ("session_management_validation_checklist.yaml", "core"),
            ("release_validation.yaml", "core"),
            ("environment_setup_validation.yaml", "core"),
            ("coding_standards_validation.yaml", "core"),
        ]

        for filename, target_category in dev_files_to_move:
            source_path = self.checklists_dir / "development" / filename
            target_path = self.checklists_dir / target_category / filename

            if source_path.exists():
                self.log_change(
                    "MOVE", f"development/{filename} -> {target_category}/{filename}"
                )
                if not self.dry_run:
                    target_path.parent.mkdir(exist_ok=True)
                    shutil.move(source_path, target_path)

    def apply_consolidation_suggestions(self, suggestions: list[dict]):
        """Apply the consolidation suggestions from the analysis."""
        for suggestion in suggestions:
            if suggestion["type"] == "merge_similar_names":
                base_name = suggestion["base_name"]
                file_paths = [self.data_dir / f for f in suggestion["files"]]

                # Only merge if all files exist
                existing_files = [f for f in file_paths if f.exists()]
                if len(existing_files) > 1:
                    self.merge_similar_files(base_name, existing_files)

    def rename_all_verbose_files(self):
        """Rename all files that are overly verbose."""
        all_files = list(self.workflows_dir.rglob("*.yaml")) + list(
            self.checklists_dir.rglob("*.yaml")
        )

        for file_path in all_files:
            if len(file_path.stem) > 25:  # Arbitrary threshold for "verbose"
                self.rename_verbose_file(file_path)

    def restructure(self, consolidation_suggestions: list[dict] = None):
        """Execute the full restructuring process."""
        print(
            f"🔄 Starting repository restructuring ({'DRY RUN' if self.dry_run else 'LIVE MODE'})"
        )
        print("=" * 60)

        # Step 1: Apply consolidation suggestions
        if consolidation_suggestions:
            print("\n1️⃣ Applying consolidation suggestions...")
            self.apply_consolidation_suggestions(consolidation_suggestions)

        # Step 2: Rename verbose files
        print("\n2️⃣ Renaming verbose files...")
        self.rename_all_verbose_files()

        # Step 3: Consolidate categories
        print("\n3️⃣ Rebalancing categories...")
        self.consolidate_categories()

        print(f"\n✅ Restructuring complete! Made {len(self.changes_made)} changes.")

        if self.dry_run:
            print("\n⚠️  This was a DRY RUN. Use --apply to execute changes.")

        return self.changes_made


def main():
    parser = argparse.ArgumentParser(
        description="Restructure repository to reduce sprawl"
    )
    parser.add_argument("--repo-root", default=".", help="Repository root path")
    parser.add_argument(
        "--apply", action="store_true", help="Apply changes (default is dry run)"
    )
    parser.add_argument(
        "--suggestions", help="JSON file with consolidation suggestions"
    )

    args = parser.parse_args()

    # Load consolidation suggestions if provided
    consolidation_suggestions = []
    if args.suggestions:
        import json

        with open(args.suggestions) as f:
            data = json.load(f)
            consolidation_suggestions = data.get("consolidation_suggestions", [])

    restructurer = RepositoryRestructurer(args.repo_root, dry_run=not args.apply)
    changes = restructurer.restructure(consolidation_suggestions)

    print("\n📋 Summary of changes:")
    for change in changes:
        print(f"  {change}")


if __name__ == "__main__":
    main()
