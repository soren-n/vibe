# Workflow System Architecture

## System Design

YAML-based workflow system providing code-independent workflow definitions with Python fallback.

## Core Components

**Data Models** (`models.py`): Workflow and Checklist dataclass definitions
**YAML Loader** (`loader.py`): YAML parsing with caching and error handling
**Integration Layer** (`core.py`): YAML-Python bridge with graceful fallback
**Workflow Definitions** (`data/*.yaml`): External workflow specifications

## Architecture Decisions

### Code-Data Separation

**Issue**: Hardcoded Python workflows required code changes for updates
**Solution**: External YAML definitions with loader system
**Benefits**: Independent updates, non-technical accessibility, better maintainability

### Fallback Strategy

**Implementation**:

```python
try:
    return yaml_loader.load_workflows()
except Exception:
    return python_fallback_workflows()
```

### Performance Optimization

**Caching**: In-memory workflow cache with file system invalidation
**Lazy Loading**: Workflows loaded on first access
**Hot Reloading**: File system watching for development workflow

## File Structure

```
vibe/workflows/
├── __init__.py
├── models.py          # Workflow dataclass definitions
├── loader.py          # YAML loading and caching
├── core.py           # Integration and legacy workflows
└── data/             # YAML workflow definitions
    ├── analysis.yaml
    ├── branch_strategy.yaml
    ├── dependency_update.yaml
    └── git_management.yaml
```

## YAML Workflow Schema

```yaml
name: string # Required: Unique workflow identifier
description: string # Required: Workflow description
triggers: [string] # Required: Activation patterns
steps: [string] # Required: Execution guidance
dependencies: [string] # Optional: Required tools
project_types: [string] # Optional: Applicable project types
conditions: [string] # Optional: Execution conditions
```

## Processing Pipeline

1. **Discovery**: Scan `data/` directory for YAML files
2. **Parsing**: PyYAML parsing with structure validation
3. **Caching**: In-memory storage with invalidation
4. **Fallback**: Python workflow fallback on failure
5. **Hot Reload**: File system watching for development

## Error Handling

**File Errors**: Log warnings, continue with remaining workflows
**Parse Errors**: Log details, skip malformed files
**Validation Errors**: Log issues, skip incomplete workflows
**System Failure**: Graceful fallback to Python implementations

## Additional Features

### Hot Reloading

```python
from vibe.workflows.loader import start_hot_reloading
start_hot_reloading()  # Auto-reload on file changes
```

### Schema Validation

```python
from vibe.workflows.validation import validate_workflow_data
validate_workflow_data(workflow_dict)  # Structural validation
```

**Capabilities**: Real-time file watching, automatic cache invalidation, JSON schema validation, Unicode support

```

### Benefits
- **Early Error Detection**: Catch malformed workflows before runtime
- **Consistency Enforcement**: Ensure all workflows follow expected structure
- **IDE Support**: JSON Schema enables autocomplete and validation in editors
- **Documentation**: Schema serves as formal specification for workflow format

## Future Enhancements

- **Workflow Dependencies**: Support for workflow composition
- **Conditional Logic**: More detailed condition evaluation
- **Template System**: Variable substitution in workflow commands
```
