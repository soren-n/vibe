#!/usr/bin/env python3
"""
Project Structure Analysis Tool

Analyzes the Vibe project structure to identify reorganization opportunities
and provide systematic recommendations for reducing file sprawl while
maintaining professional organization standards.
"""

from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path


@dataclass
class StructureMetrics:
    """Metrics for analyzing project structure."""

    total_files: int
    total_dirs: int
    avg_files_per_dir: float
    max_files_in_dir: int
    empty_dirs: int
    single_file_dirs: int
    file_types: dict[str, int]
    long_filenames: list[str]
    deep_nesting: list[str]


@dataclass
class ReorganizationSuggestion:
    """A suggestion for reorganizing project structure."""

    category: str
    current_path: str
    suggested_path: str | None
    reason: str
    impact: str  # low, medium, high
    complexity: str  # simple, moderate, complex


class ProjectStructureAnalyzer:
    """Analyzes project structure and suggests improvements."""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.exclude_patterns = {
            ".git",
            ".venv",
            "__pycache__",
            "node_modules",
            ".pytest_cache",
            ".mypy_cache",
            ".ruff_cache",
            "dist",
            ".coverage",
            ".github",
        }

    def analyze(self) -> tuple[StructureMetrics, list[ReorganizationSuggestion]]:
        """Perform complete structure analysis."""
        metrics = self._calculate_metrics()
        suggestions = self._generate_suggestions()
        return metrics, suggestions

    def _should_exclude(self, path: Path) -> bool:
        """Check if path should be excluded from analysis."""
        return any(part in self.exclude_patterns for part in path.parts)

    def _calculate_metrics(self) -> StructureMetrics:
        """Calculate basic structure metrics."""
        all_files = []
        all_dirs = []
        files_per_dir = defaultdict(int)
        file_types = Counter()
        long_filenames = []
        deep_nesting = []

        for item in self.project_root.rglob("*"):
            if self._should_exclude(item):
                continue

            if item.is_file():
                all_files.append(item)
                files_per_dir[item.parent] += 1

                # File type analysis
                suffix = item.suffix.lower() if item.suffix else "no_extension"
                file_types[suffix] += 1

                # Long filename detection (>30 chars)
                if len(item.name) > 30:
                    long_filenames.append(str(item.relative_to(self.project_root)))

                # Deep nesting detection (>4 levels)
                if len(item.relative_to(self.project_root).parts) > 4:
                    deep_nesting.append(str(item.relative_to(self.project_root)))

            elif item.is_dir():
                all_dirs.append(item)

        # Calculate directory metrics
        empty_dirs = sum(1 for d in all_dirs if files_per_dir[d] == 0)
        single_file_dirs = sum(1 for d in all_dirs if files_per_dir[d] == 1)
        avg_files = sum(files_per_dir.values()) / len(all_dirs) if all_dirs else 0
        max_files = max(files_per_dir.values()) if files_per_dir else 0

        return StructureMetrics(
            total_files=len(all_files),
            total_dirs=len(all_dirs),
            avg_files_per_dir=avg_files,
            max_files_in_dir=max_files,
            empty_dirs=empty_dirs,
            single_file_dirs=single_file_dirs,
            file_types=dict(file_types),
            long_filenames=long_filenames,
            deep_nesting=deep_nesting,
        )

    def _generate_suggestions(self) -> list[ReorganizationSuggestion]:
        """Generate reorganization suggestions."""
        suggestions = []

        # Analyze documentation structure
        suggestions.extend(self._analyze_docs())

        # Analyze workflow structure
        suggestions.extend(self._analyze_workflows())

        # Analyze test structure
        suggestions.extend(self._analyze_tests())

        # Analyze script organization
        suggestions.extend(self._analyze_scripts())

        # Analyze filename conventions
        suggestions.extend(self._analyze_filenames())

        return suggestions

    def _analyze_docs(self) -> list[ReorganizationSuggestion]:
        """Analyze documentation organization."""
        suggestions = []
        docs_dir = self.project_root / "docs"

        if not docs_dir.exists():
            return suggestions

        # Check for overly granular documentation files
        doc_files = list(docs_dir.glob("*.md"))
        if len(doc_files) > 8:  # Threshold for too many top-level docs
            suggestions.append(
                ReorganizationSuggestion(
                    category="documentation",
                    current_path="docs/*.md",
                    suggested_path="docs/{categories}/",
                    reason="Too many top-level documentation files reduce discoverability",
                    impact="medium",
                    complexity="moderate",
                )
            )

        # Check for verbose filenames
        verbose_docs = [f for f in doc_files if len(f.stem) > 25]
        for doc in verbose_docs:
            suggestions.append(
                ReorganizationSuggestion(
                    category="documentation",
                    current_path=str(doc.relative_to(self.project_root)),
                    suggested_path=None,  # Will suggest shortened name
                    reason="Filename exceeds 25 characters, reducing readability",
                    impact="low",
                    complexity="simple",
                )
            )

        return suggestions

    def _analyze_workflows(self) -> list[ReorganizationSuggestion]:
        """Analyze workflow organization."""
        suggestions = []
        workflows_data = self.project_root / "vibe" / "workflows" / "data"

        if not workflows_data.exists():
            return suggestions

        # Analyze category distribution
        categories = [d for d in workflows_data.iterdir() if d.is_dir()]
        category_sizes = {}

        for category in categories:
            yaml_files = list(category.glob("*.yaml"))
            category_sizes[category.name] = len(yaml_files)

        # Suggest consolidation for small categories
        small_categories = [cat for cat, size in category_sizes.items() if size <= 2]
        if len(small_categories) > 1:
            suggestions.append(
                ReorganizationSuggestion(
                    category="workflows",
                    current_path=f"vibe/workflows/data/{{{','.join(small_categories)}}}",
                    suggested_path="vibe/workflows/data/misc/",
                    reason="Multiple categories with ≤2 files each create unnecessary complexity",
                    impact="medium",
                    complexity="moderate",
                )
            )

        # Check for oversized categories
        large_categories = [cat for cat, size in category_sizes.items() if size > 8]
        for cat in large_categories:
            suggestions.append(
                ReorganizationSuggestion(
                    category="workflows",
                    current_path=f"vibe/workflows/data/{cat}/",
                    suggested_path=f"vibe/workflows/data/{cat}/{{subcategories}}/",
                    reason=f"Category '{cat}' contains {category_sizes[cat]} files, consider subcategorization",
                    impact="medium",
                    complexity="moderate",
                )
            )

        return suggestions

    def _analyze_tests(self) -> list[ReorganizationSuggestion]:
        """Analyze test organization."""
        suggestions = []
        tests_dir = self.project_root / "tests"

        if not tests_dir.exists():
            return suggestions

        test_files = list(tests_dir.glob("test_*.py"))

        # Check for overly specific test file names
        verbose_tests = [f for f in test_files if len(f.stem) > 20]
        for test in verbose_tests:
            suggestions.append(
                ReorganizationSuggestion(
                    category="testing",
                    current_path=str(test.relative_to(self.project_root)),
                    suggested_path=None,
                    reason="Test filename is verbose, consider shorter descriptive names",
                    impact="low",
                    complexity="simple",
                )
            )

        # Suggest grouping if many test files
        if len(test_files) > 10:
            suggestions.append(
                ReorganizationSuggestion(
                    category="testing",
                    current_path="tests/test_*.py",
                    suggested_path="tests/{categories}/",
                    reason="Large number of test files could benefit from categorization",
                    impact="medium",
                    complexity="moderate",
                )
            )

        return suggestions

    def _analyze_scripts(self) -> list[ReorganizationSuggestion]:
        """Analyze script organization."""
        suggestions = []
        scripts_dir = self.project_root / "scripts"

        if not scripts_dir.exists():
            return suggestions

        script_files = list(scripts_dir.glob("*.py"))

        # Check if scripts could be consolidated
        if len(script_files) < 3:
            suggestions.append(
                ReorganizationSuggestion(
                    category="scripts",
                    current_path="scripts/",
                    suggested_path="tools/ or bin/",
                    reason="Few scripts present, consider consolidating directory structure",
                    impact="low",
                    complexity="simple",
                )
            )

        return suggestions

    def _analyze_filenames(self) -> list[ReorganizationSuggestion]:
        """Analyze filename conventions across project."""
        suggestions = []

        # Find files with verbose names
        for item in self.project_root.rglob("*"):
            if self._should_exclude(item) or not item.is_file():
                continue

            # Skip certain file types that commonly have long names
            if item.suffix in {".lock", ".json", ".yaml", ".md"}:
                continue

            if len(item.name) > 35:
                suggestions.append(
                    ReorganizationSuggestion(
                        category="naming",
                        current_path=str(item.relative_to(self.project_root)),
                        suggested_path=None,
                        reason="Filename exceeds 35 characters, impacting readability",
                        impact="low",
                        complexity="simple",
                    )
                )

        return suggestions


def print_metrics(metrics: StructureMetrics):
    """Print structure metrics in a readable format."""
    print("=== PROJECT STRUCTURE METRICS ===")
    print(f"Total files: {metrics.total_files}")
    print(f"Total directories: {metrics.total_dirs}")
    print(f"Average files per directory: {metrics.avg_files_per_dir:.1f}")
    print(f"Maximum files in any directory: {metrics.max_files_in_dir}")
    print(f"Empty directories: {metrics.empty_dirs}")
    print(f"Single-file directories: {metrics.single_file_dirs}")

    print("\n=== FILE TYPE DISTRIBUTION ===")
    for ext, count in sorted(
        metrics.file_types.items(), key=lambda x: x[1], reverse=True
    ):
        print(f"{ext or 'no extension'}: {count}")

    if metrics.long_filenames:
        print(f"\n=== LONG FILENAMES ({len(metrics.long_filenames)}) ===")
        for filename in metrics.long_filenames[:5]:  # Show first 5
            print(f"  {filename}")
        if len(metrics.long_filenames) > 5:
            print(f"  ... and {len(metrics.long_filenames) - 5} more")

    if metrics.deep_nesting:
        print(f"\n=== DEEPLY NESTED FILES ({len(metrics.deep_nesting)}) ===")
        for filepath in metrics.deep_nesting[:3]:  # Show first 3
            print(f"  {filepath}")
        if len(metrics.deep_nesting) > 3:
            print(f"  ... and {len(metrics.deep_nesting) - 3} more")


def print_suggestions(suggestions: list[ReorganizationSuggestion]):
    """Print reorganization suggestions grouped by category."""
    if not suggestions:
        print("\n=== NO REORGANIZATION SUGGESTIONS ===")
        print("Project structure appears well-organized!")
        return

    print("\n=== REORGANIZATION SUGGESTIONS ===")

    # Group by category
    by_category = defaultdict(list)
    for suggestion in suggestions:
        by_category[suggestion.category].append(suggestion)

    # Print by priority (impact level)
    impact_order = {"high": 1, "medium": 2, "low": 3}

    for category, cat_suggestions in by_category.items():
        print(f"\n--- {category.upper()} ---")

        # Sort by impact
        sorted_suggestions = sorted(
            cat_suggestions, key=lambda x: impact_order.get(x.impact, 4)
        )

        for i, suggestion in enumerate(sorted_suggestions, 1):
            print(f"{i}. {suggestion.current_path}")
            if suggestion.suggested_path:
                print(f"   → {suggestion.suggested_path}")
            print(f"   Reason: {suggestion.reason}")
            print(
                f"   Impact: {suggestion.impact}, Complexity: {suggestion.complexity}"
            )
            print()


def main():
    """Main analysis function."""
    project_root = Path(__file__).parent.parent

    print(f"Analyzing project structure: {project_root}")
    print("=" * 60)

    analyzer = ProjectStructureAnalyzer(project_root)
    metrics, suggestions = analyzer.analyze()

    print_metrics(metrics)
    print_suggestions(suggestions)

    # Summary
    high_impact = sum(1 for s in suggestions if s.impact == "high")
    medium_impact = sum(1 for s in suggestions if s.impact == "medium")
    low_impact = sum(1 for s in suggestions if s.impact == "low")

    print("\n=== SUMMARY ===")
    print(f"Total suggestions: {len(suggestions)}")
    print(f"High impact: {high_impact}")
    print(f"Medium impact: {medium_impact}")
    print(f"Low impact: {low_impact}")

    if suggestions:
        print("\nRecommended next steps:")
        print("1. Review high-impact suggestions first")
        print("2. Group related changes for efficient execution")
        print("3. Update tooling and documentation after changes")
        print("4. Re-run analysis to verify improvements")


if __name__ == "__main__":
    main()
