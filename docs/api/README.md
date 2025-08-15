# API Reference

This directory contains comprehensive API documentation for all Vibe components. These documents provide sufficient detail to recreate the entire implementation.

## Core Components

- [CLI Interface](cli.md) - Command-line interface for plan management and workflow guidance
- [PromptAnalyzer](prompt-analyzer.md) - Analyzes prompts and matches workflows
- [WorkflowOrchestrator](workflow-orchestrator.md) - Provides workflow guidance and recommendations
- [Configuration](configuration.md) - Handles project configuration and detection

## Data Models

- [Core Data Models](models.md) - Core data structures for workflows and plans
- [Plan Models](plan-models.md) - Plan system for persistent nested todo lists

## Guidance System

- [Workflow Registry](workflow-registry.md) - YAML workflow loading and caching with hot reloading
- [Project Detection](project-detection.md) - Project type detection algorithms
- [Linting](lint.md) - Code quality checks and linting integration

## Deprecated Components

The following components were removed in the architectural simplification:

- Session-based workflow execution (replaced by plan system)
- Checklist system (converted to workflows)
- MCP session management tools (replaced by plan-focused tools)

See [ADR-004](../adr/adr-004-simplified-architecture.md) for details on the architectural changes.

## Quality Assurance

- [Lint System](lint.md) - Code quality, naming conventions, and professional language checking

## CLI Interface

- [Command Interface](cli.md) - Command-line interface structure and routing

## Implementation Completeness

Each API document includes:

- Complete class definitions with all methods and properties
- Detailed implementation algorithms and logic
- Error handling patterns and strategies
- Integration examples and usage patterns
- Data structure relationships and serialization
- Performance considerations and optimizations

These documents contain sufficient detail to recreate the entire `/vibe` implementation without additional context or explanations.
