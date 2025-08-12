#!/usr/bin/env python3
"""
Repository Sprawl Analysis Tool

Analyzes the Vibe project repository to identify:
- Verbose filenames
- Duplicate/overlapping content
- Consolidation opportunities
- Organization improvements

Provides empirical data to guide repository cleanup.
"""

import argparse
import re
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

import yaml


class RepositoryAnalyzer:
    def __init__(self, repo_root: str):
        self.repo_root = Path(repo_root)
        self.data_dir = self.repo_root / "vibe" / "data"
        self.workflows_dir = self.data_dir / "workflows"
        self.checklists_dir = self.data_dir / "checklists"

        # Redundant words that could be removed from filenames
        self.redundant_words = {
            "validation",
            "checklist",
            "check",
            "verify",
            "quality",
            "standards",
            "guide",
            "process",
            "procedure",
        }

    def analyze_filename_verbosity(self):
        """Analyze filename length and redundancy."""
        results = {"long_names": [], "redundant_names": [], "stats": {}}

        all_files = list(self.workflows_dir.rglob("*.yaml")) + list(
            self.checklists_dir.rglob("*.yaml")
        )

        lengths = []
        for file_path in all_files:
            relative_path = file_path.relative_to(self.data_dir)
            filename = file_path.stem
            lengths.append(len(filename))

            # Check for long names (>30 chars)
            if len(filename) > 30:
                results["long_names"].append(
                    {
                        "file": str(relative_path),
                        "length": len(filename),
                        "name": filename,
                    }
                )

            # Check for redundant words
            words = filename.split("_")
            redundant = [word for word in words if word in self.redundant_words]
            if redundant:
                results["redundant_names"].append(
                    {
                        "file": str(relative_path),
                        "redundant_words": redundant,
                        "name": filename,
                    }
                )

        results["stats"] = {
            "total_files": len(all_files),
            "avg_length": sum(lengths) / len(lengths),
            "max_length": max(lengths),
            "long_names_count": len(results["long_names"]),
            "redundant_names_count": len(results["redundant_names"]),
        }

        return results

    def load_yaml_file(self, file_path: Path):
        """Load and parse YAML file safely."""
        try:
            with open(file_path, encoding="utf-8") as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            return None

    def analyze_content_similarity(self):
        """Find similar content between files."""
        results = {
            "similar_pairs": [],
            "duplicate_triggers": [],
            "similar_descriptions": [],
        }

        all_files = list(self.workflows_dir.rglob("*.yaml")) + list(
            self.checklists_dir.rglob("*.yaml")
        )
        file_data = {}

        # Load all files
        for file_path in all_files:
            data = self.load_yaml_file(file_path)
            if data:
                file_data[file_path] = data

        # Compare files for similarity
        files = list(file_data.keys())
        for i, file1 in enumerate(files):
            for file2 in files[i + 1 :]:
                data1, data2 = file_data[file1], file_data[file2]

                # Compare descriptions
                desc1 = data1.get("description", "")
                desc2 = data2.get("description", "")
                if desc1 and desc2:
                    similarity = SequenceMatcher(
                        None, desc1.lower(), desc2.lower()
                    ).ratio()
                    if similarity > 0.7:
                        results["similar_descriptions"].append(
                            {
                                "file1": str(file1.relative_to(self.data_dir)),
                                "file2": str(file2.relative_to(self.data_dir)),
                                "similarity": similarity,
                                "desc1": desc1,
                                "desc2": desc2,
                            }
                        )

                # Compare triggers
                triggers1 = set(data1.get("triggers", []))
                triggers2 = set(data2.get("triggers", []))
                if triggers1 and triggers2:
                    overlap = triggers1.intersection(triggers2)
                    if overlap:
                        results["duplicate_triggers"].append(
                            {
                                "file1": str(file1.relative_to(self.data_dir)),
                                "file2": str(file2.relative_to(self.data_dir)),
                                "overlapping_triggers": list(overlap),
                            }
                        )

        return results

    def analyze_category_balance(self):
        """Analyze distribution of files across categories."""
        results = {
            "workflows": defaultdict(int),
            "checklists": defaultdict(int),
            "total_by_category": defaultdict(int),
        }

        # Count workflows by category
        for category_dir in self.workflows_dir.iterdir():
            if category_dir.is_dir():
                count = len(list(category_dir.glob("*.yaml")))
                results["workflows"][category_dir.name] = count
                results["total_by_category"][category_dir.name] += count

        # Count checklists by category
        for category_dir in self.checklists_dir.iterdir():
            if category_dir.is_dir():
                count = len(list(category_dir.glob("*.yaml")))
                results["checklists"][category_dir.name] = count
                results["total_by_category"][category_dir.name] += count

        return results

    def suggest_consolidations(self):
        """Suggest specific consolidation opportunities."""
        suggestions = []

        # Find files with very similar names
        all_files = list(self.workflows_dir.rglob("*.yaml")) + list(
            self.checklists_dir.rglob("*.yaml")
        )

        name_groups = defaultdict(list)
        for file_path in all_files:
            # Group by base name (without suffixes like _validation, _checklist)
            base_name = re.sub(
                r"_(validation|checklist|check|verify|quality).*$", "", file_path.stem
            )
            name_groups[base_name].append(file_path)

        for base_name, files in name_groups.items():
            if len(files) > 1:
                # Check if they're in the same category
                categories = set(f.parent.name for f in files)
                if len(categories) == 1:  # Same category
                    suggestions.append(
                        {
                            "type": "merge_similar_names",
                            "base_name": base_name,
                            "files": [str(f.relative_to(self.data_dir)) for f in files],
                            "category": list(categories)[0],
                        }
                    )

        return suggestions

    def generate_report(self):
        """Generate comprehensive analysis report."""
        print("🔍 Repository Sprawl Analysis Report")
        print("=" * 50)

        # Filename Analysis
        filename_analysis = self.analyze_filename_verbosity()
        print("\n📊 Filename Analysis:")
        print(f"  Total files: {filename_analysis['stats']['total_files']}")
        print(
            f"  Average filename length: {filename_analysis['stats']['avg_length']:.1f} characters"
        )
        print(
            f"  Longest filename: {filename_analysis['stats']['max_length']} characters"
        )
        print(
            f"  Files with long names (>30 chars): {filename_analysis['stats']['long_names_count']}"
        )
        print(
            f"  Files with redundant words: {filename_analysis['stats']['redundant_names_count']}"
        )

        if filename_analysis["long_names"]:
            print("\n  🚨 Longest filenames:")
            for item in sorted(
                filename_analysis["long_names"], key=lambda x: x["length"], reverse=True
            )[:5]:
                print(f"    {item['length']} chars: {item['file']}")

        # Content Similarity
        similarity_analysis = self.analyze_content_similarity()
        print("\n🔄 Content Similarity Analysis:")
        print(
            f"  Similar descriptions found: {len(similarity_analysis['similar_descriptions'])}"
        )
        print(
            f"  Duplicate triggers found: {len(similarity_analysis['duplicate_triggers'])}"
        )

        if similarity_analysis["similar_descriptions"]:
            print("\n  🚨 Most similar descriptions:")
            for item in sorted(
                similarity_analysis["similar_descriptions"],
                key=lambda x: x["similarity"],
                reverse=True,
            )[:3]:
                print(
                    f"    {item['similarity']:.2f}: {item['file1']} <-> {item['file2']}"
                )

        # Category Balance
        category_analysis = self.analyze_category_balance()
        print("\n📂 Category Balance:")
        for category, count in sorted(
            category_analysis["total_by_category"].items(),
            key=lambda x: x[1],
            reverse=True,
        ):
            workflows = category_analysis["workflows"].get(category, 0)
            checklists = category_analysis["checklists"].get(category, 0)
            print(
                f"  {category}: {count} total ({workflows} workflows, {checklists} checklists)"
            )

        # Consolidation Suggestions
        suggestions = self.suggest_consolidations()
        print("\n💡 Consolidation Suggestions:")
        print(f"  Found {len(suggestions)} consolidation opportunities")

        for suggestion in suggestions[:5]:  # Show top 5
            print(
                f"    Merge {len(suggestion['files'])} files with base name '{suggestion['base_name']}':"
            )
            for file in suggestion["files"]:
                print(f"      - {file}")

        return {
            "filename_analysis": filename_analysis,
            "similarity_analysis": similarity_analysis,
            "category_analysis": category_analysis,
            "consolidation_suggestions": suggestions,
        }


def main():
    parser = argparse.ArgumentParser(description="Analyze repository sprawl")
    parser.add_argument("--repo-root", default=".", help="Repository root path")
    parser.add_argument("--output", help="Output JSON file for detailed results")

    args = parser.parse_args()

    analyzer = RepositoryAnalyzer(args.repo_root)
    results = analyzer.generate_report()

    if args.output:
        import json

        with open(args.output, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n💾 Detailed results saved to {args.output}")


if __name__ == "__main__":
    main()
