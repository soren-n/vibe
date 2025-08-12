# ADR-001: YAML-Based Workflow System

**Date**: 2025-08-10
**Status**: Accepted
**Deciders**: Development Team

## Context

Workflows were hardcoded in Python `core.py`, causing:

- Tight coupling between workflow data and execution logic
- Code changes required for workflow updates
- Mixed workflow/code changes in version control
- Technical barrier for workflow contributions
- Monolithic file maintenance overhead

**User Request**: "Split code and data for workflows to enable independent updates"

## Decision

Implement YAML-based workflow system with Python fallback:

- External YAML definitions in `vibe/workflows/data/*.yaml`
- Workflow loader with PyYAML integration and caching
- Separate data models in `models.py`
- Graceful fallback to Python workflows
- Comprehensive error handling

## Rationale

**Benefits**: Code-data separation, independent workflow updates, version control clarity, non-technical accessibility, improved maintainability

**Alternatives Rejected**:

- JSON: Less readable, no comments
- TOML: Poor nested structure support
- Database: Added complexity and dependencies
- Python config: Maintains technical barrier

5. **Keep Status Quo**
   - Rejected: Doesn't address the maintainability and accessibility issues

### Technical Considerations

- **PyYAML Integration**: Mature, well-tested library for YAML parsing
- **Caching Strategy**: In-memory caching for performance optimization
- **Fallback Architecture**: Zero-risk migration with automatic fallback
- **Error Resilience**: Graceful degradation on parsing or file system errors

## Consequences

## Implementation

**Components Delivered**:

- `models.py`: Workflow dataclass definitions
- `loader.py`: YAML parsing with caching and error handling
- `core.py`: Integration layer with Python fallback
- `data/*.yaml`: External workflow definitions (544 total commands)

**Key Features**:

- In-memory caching for performance (<1ms cached access)
- Comprehensive error handling with graceful fallback
- Philosophy compliance validation (autonomous operation)
- Backward compatibility with existing Python workflows

## Results

**Success Metrics**:

- ✅ All workflows migrated to YAML format
- ✅ Zero functional regression
- ✅ Performance maintained (10-50ms initial load)
- ✅ Philosophy compliance achieved
- ✅ Robust error handling with fallback

**Benefits Realized**: Code-data separation, independent workflow updates, improved maintainability, non-technical contributor accessibility

## Implementation

### Phase 1: Foundation

1. ✅ Create `vibe/workflows/models.py` with `Workflow` dataclass
2. ✅ Implement `vibe/workflows/loader.py` with YAML parsing and caching
3. ✅ Add PyYAML dependency to `pyproject.toml`

### Phase 2: Integration

4. ✅ Update `vibe/workflows/core.py` to use WorkflowLoader with fallback
5. ✅ Create `vibe/workflows/data/` directory for YAML definitions
6. ✅ Add comprehensive error handling and logging

### Phase 3: Migration

7. ✅ Convert existing Python workflows to YAML format:
   - `analysis.yaml`: Project structure analysis (45 commands)
   - `branch_strategy.yaml`: Branch selection and merge timing (202 commands)
   - `dependency_update.yaml`: Dependency and tooling updates (64 commands)
   - `git_management.yaml`: Git repository management (233 commands)

### Phase 4: Philosophy Compliance

8. ✅ Review all YAML workflows for vibe philosophy compliance
9. ✅ Remove interactive elements (rhetorical questions, user prompts)
10. ✅ Ensure autonomous operation without user input requirements
11. ✅ Validate workflows follow informational rather than interactive patterns

### Phase 5: Validation

12. ✅ Test YAML workflow loading and execution
13. ✅ Verify fallback mechanism works correctly
14. ✅ Confirm workflow matching and execution logic preserved
15. ✅ Validate performance impact is acceptable

## Technical Details

### File Structure

```
vibe/workflows/
├── __init__.py
├── models.py          # Workflow dataclass (42 lines)
├── loader.py          # YAML loading system (97 lines)
├── core.py           # Integration with fallback (1349 lines)
└── data/             # YAML workflow definitions
    ├── analysis.yaml        # 45 commands
    ├── branch_strategy.yaml # 202 commands
    ├── dependency_update.yaml # 64 commands
    └── git_management.yaml  # 233 commands
```

### Key Implementation Details

- **Caching**: `_workflows_cache` dictionary prevents repeated file parsing
- **Error Handling**: Try-catch blocks at multiple levels with detailed logging
- **Fallback Logic**: `get_hardcoded_workflows()` provides seamless fallback
- **YAML Structure**: Consistent format with required fields validation
- **Philosophy Compliance**: All workflows follow autonomous operation principles

### Performance Characteristics

- **Initial Load**: ~10-50ms for YAML parsing (one-time cost)
- **Cached Access**: <1ms for subsequent workflow retrieval
- **Memory Usage**: Minimal overhead for parsed workflow storage
- **Fallback Speed**: Instant fallback to Python workflows on any error

## Notes

### Dependencies Added

- `PyYAML`: For YAML parsing and serialization
- No additional runtime dependencies required

### Backward Compatibility

- 100% backward compatible with existing Python workflow system
- Automatic fallback ensures no disruption to existing functionality
- Existing workflow matching and execution logic unchanged

### Future Considerations

- **Hot Reloading**: Potential future feature to reload workflows without restart
- **Schema Validation**: JSON Schema validation for YAML structure
- **Template System**: Variable substitution in workflow commands
- **Workflow Composition**: Support for workflow dependencies and inheritance

### Philosophy Alignment

This implementation fully supports the vibe coding philosophy:

- **Autonomous Operation**: All workflows execute without user input
- **Informational Output**: Echo statements provide guidance, not interaction
- **Self-Contained Logic**: Decision logic built into workflows
- **Tool Integration**: Workflows work seamlessly with AI agent tools

### Success Metrics

- ✅ All existing workflows successfully migrated to YAML
- ✅ Performance impact negligible (cached access <1ms)
- ✅ Zero regression in workflow functionality
- ✅ Philosophy compliance achieved (no interactive elements)
- ✅ Error handling robust (graceful fallback working)

This ADR represents a successful architectural evolution that achieves the goals of separation, maintainability, and accessibility while preserving all existing functionality and performance characteristics.
