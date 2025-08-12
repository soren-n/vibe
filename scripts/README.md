# Scripts Directory

This directory contains utility scripts for maintaining and analyzing the Vibe project.

## Repository Management Scripts

### `analyze_repository_sprawl.py`
Analyzes the repository structure to identify:
- Verbose filenames and redundant naming patterns
- Duplicate/overlapping content between files
- Category imbalance and consolidation opportunities
- Provides empirical data for cleanup decisions

Usage:
```bash
python scripts/analyze_repository_sprawl.py [--output results.json]
```

### `restructure_repository.py`
Systematically reorganizes repository structure by:
- Merging duplicate/similar files
- Renaming verbose files to follow language standards
- Consolidating redundant content
- Rebalancing over-represented categories

Usage:
```bash
# Dry run (recommended first)
python scripts/restructure_repository.py [--suggestions results.json]

# Apply changes
python scripts/restructure_repository.py --apply [--suggestions results.json]
```

## Legacy Scripts

### `analyze_workflows.py`
Analyzes workflow structure and dependencies.

### `structure_analysis.py`
Provides structural analysis of the project.

### `sync_versions.py`
Synchronizes version information across project files.

## Recommended Workflow

When the repository starts to feel "sprawling" again:

1. Run analysis: `python scripts/analyze_repository_sprawl.py`
2. Review the report for specific issues
3. Run restructuring in dry-run mode: `python scripts/restructure_repository.py`
4. Review proposed changes
5. Apply if satisfied: `python scripts/restructure_repository.py --apply`
6. Clean up temporary files

This empirical approach ensures data-driven decisions and maintains repository organization over time.
