# Checklists Organization

This directory contains YAML checklist definitions organized into logical categories for validation and verification tasks.

**Conceptual Note**: Vibe checklists provide **validation items** rather than automated commands. Each checklist item is a verification point that users can manually check to ensure quality, completeness, or compliance. Checklists complement workflows by providing structured verification after work is completed.

## Checklist Structure

Each YAML checklist contains:
- `name`: Unique identifier
- `description`: What the checklist validates
- `triggers`: Patterns that activate this checklist
- `items`: Validation items/checks to perform
- `dependencies`: Optional required tools/packages
- `project_types`: Optional project type constraints
- `conditions`: Optional activation conditions

## Directory Structure

### core/
General-purpose checklists applicable to most projects:
- `quality_check.yaml` - Code quality and standards verification

### development/
Development process checklists:
- `feature_development.yaml` - New feature implementation verification
- `bug_fix.yaml` - Bug fix completion verification

### python/
Python-specific checklists:
- `release_readiness.yaml` - Python project release preparation

## Checklist vs Workflow

- **Workflows** provide step-by-step guidance to accomplish tasks
- **Checklists** provide verification points to ensure tasks were completed properly
- **Usage**: Run workflows first to complete work, then use checklists to verify quality

## Adding New Checklists

1. Choose appropriate category directory
2. Create YAML file with checklist definition
3. Use meaningful trigger patterns
4. Follow language standards (no emojis or decorative formatting)
5. Specify applicable project types if relevant

## Integration

Checklists are automatically discovered by the prompt analyzer and suggested alongside workflows when relevant trigger patterns are detected.
