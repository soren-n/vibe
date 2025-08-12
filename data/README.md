# Workflow and Checklist Organization

This directory contains YAML-based workflow definitions and checklists organized into separate subdirectories for better maintainability and discoverability.

**Workflows**: Provide **guidance steps** rather than automated commands. Each workflow step is textual guidance that can include command suggestions, reminders, best practices, or any helpful advice. Users follow the guidance manually, maintaining full control over their development process.

**Checklists**: Provide validation and verification tasks. Checklists offer structured verification points to ensure work quality and completeness.

## Directory Structure

This directory is split into two main subdirectories:

- `workflows/` - Contains workflow YAML files organized by category
- `checklists/` - Contains checklist YAML files organized by category

Both workflows and checklists are organized into the same logical categories:

### core/ (6 workflows)

Core project operations and general functionality:

- `analysis.yaml` - Project analysis and context understanding

### core/

Core project operations and general functionality:

- **Workflows**: analysis, validation, cleanup, help, refactoring operations
- **Checklists**: quality verification, implementation validation

### development/

Development process and Git workflow management:

- **Workflows**: branch strategy, dependency updates, Git operations
- **Checklists**: feature development, bug fixes, release validation

### documentation/

Documentation creation, maintenance, and quality:

- **Workflows**: ADR management, documentation tasks, DDD workflow support
- **Checklists**: documentation quality verification

### frontend/

Frontend development and JavaScript/Node.js workflows:

- **Workflows**: JavaScript building, development servers, quality checks
- **Checklists**: frontend-specific validations

### python/

Python-specific development workflows:

- **Workflows**: building, environment management, testing, type checking
- **Checklists**: release readiness, analysis validation

### testing/

Testing workflows and validation:

- **Workflows**: comprehensive testing, dynamic test discovery
- **Checklists**: test validation and verification

### misc/

Miscellaneous utilities:

- **Workflows**: image conversion and other utilities
- **Checklists**: utility-specific validations

## File Structure

Each YAML workflow contains:

- `name`: Unique identifier
- `description`: What the workflow helps with
- `triggers`: Patterns that activate this workflow
- `steps`: Guidance text (may include suggested commands, but not limited to commands)
- `dependencies`: Optional workflow dependencies
- `project_types`: Optional project type constraints
- `conditions`: Optional activation conditions

Each YAML checklist contains:

- `name`: Unique identifier
- `description`: What the checklist validates
- `triggers`: Patterns that activate this checklist
- `checks`: Verification items to validate work quality

## Loading Architecture

The workflows and checklists are loaded from their respective directories using the updated `WorkflowLoader` in `vibe/guidance/loader.py`. The loader scans:

- `data/workflows/` for workflow YAML files
- `data/checklists/` for checklist YAML files

Both use `Path.rglob("*.yaml")` to scan all subdirectories automatically.

## Naming Convention

Workflows and checklists follow a consistent naming pattern:

- **Category prefix**: `python_`, `js_`, etc. for language-specific items
- **Action suffix**: `_build`, `_test`, `_quality`, etc. for operation type
- **Framework specific**: `react_dev`, `vue_dev` for framework items
- **Generic names**: Core items use descriptive names without prefixes

## Adding New Workflows and Checklists

When adding new items:

1. Choose the appropriate category folder under `workflows/` or `checklists/`
2. Follow the existing naming conventions
3. Use YAML format with required fields (name, description, triggers, steps/checks)
4. Test loading with the guidance system
5. Update this README if adding new categories

## Migration Notes

This organized structure was created from the previous unified directory containing workflows and checklists together. The separation provides:

- Clear distinction between guidance (workflows) and validation (checklists)
- Better organization and discoverability
- Simplified loading logic in the guidance system
- Updating the loader to handle recursive directory scanning
- Maintaining all existing workflow functionality while improving organization
