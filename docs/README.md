# Vibe: Workflow Orchestrator

## Overview

Vibe is a workflow orchestration tool that analyzes natural language prompts and executes development workflows. The system provides step-by-step guidance for development tasks without requiring user interaction during execution.

## Architecture

### Core Components

PromptAnalyzer: Analyzes prompts, matches workflow triggers, supports project-specific selection
WorkflowOrchestrator: Plans execution order, generates step guidance, integrates validation
**PlanManager**: Manages persistent plan structures, prevents todo overflow, maintains state persistence
Configuration: Detects project types, loads YAML workflows with Python fallback

### Execution Pipeline

```
Prompt → Analysis → Planning → Plan Management → Guidance Display
```

Process: Prompt triggers → Workflow selection → Step generation → Incremental execution → Completion

## Design Principles

Unattended Operation: Minimal user interaction after initial prompt
Plan-Based Management: Persistent todo lists prevent context loss in AI agents
YAML Workflow System: External definitions enable code-independent updates

## Implementation Components

Core Components:

- Analyzer: Prompt analysis and workflow matching
- Orchestrator: Planning and execution guidance
- Plan Manager: Persistent todo list management
- Configuration: Project detection and settings management

## Core Data Structures

### Workflow Definition Schema

```yaml
# Workflow Definition
name: string # Unique identifier for the workflow
description: string # Human-readable description
triggers: [string] # Regex patterns that activate this workflow
steps: [string] # Textual guidance steps for execution
project_types: [string] # Applicable project types (optional)
dependencies: [string] # Required tools/packages (optional)
```

### Plan Item Interface

```
PlanItem:
  id: string                  # Unique identifier
  text: string               # Task description
  status: string             # 'pending' or 'complete'
  children: list<PlanItem>   # Nested subtasks
  createdAt: string         # ISO timestamp
  completedAt?: string      # ISO timestamp (optional)
```

## Documentation

### Architecture and Philosophy

- [Autonomous Operation Philosophy](architecture/vibe-philosophy.md)
- [Workflow System Architecture](architecture/workflow-architecture.md)
- [Architectural Decision Records](adr/)

### API Reference

- [**Complete API Documentation**](api/) - **Complete implementation reference with sufficient detail to recreate the entire system**
- [Data Models and Schemas](schemas/) - YAML and configuration schemas with validation rules
- [Implementation Guide](implementation/) - Component integration patterns and development guidelines

### Key Implementation Interfaces

The API documentation provides complete interface specifications including:

- **[PromptAnalyzer](api/prompt-analyzer.md)** - Pattern matching and workflow selection algorithms
- **[WorkflowOrchestrator](api/workflow-orchestrator.md)** - Guidance planning and workflow recommendations
- **[PlanManager](api/plan-models.md)** - Persistent plan structures and nested todo management
- **[Configuration](api/configuration.md)** - Project detection and configuration management
- **[Core Data Models](api/models.md)** - Complete data structure specifications
- **[Workflow Registry](api/workflow-registry.md)** - YAML loading with hot reloading support
- **[Project Detection](api/project-detection.md)** - Framework and language detection
- **[CLI Interface](api/cli.md)** - Command routing and user interaction patterns
- **[Lint System](api/lint.md)** - Code quality and professional language validation

### Documentation Completeness Statement

**The documentation in `/docs` contains sufficient detail to implement Vibe in any programming language.** Each API document includes:

- Complete interface definitions with all methods and properties
- Detailed implementation algorithms and logic flows
- Error handling patterns and recovery strategies
- Integration examples and usage patterns
- Data structure relationships and serialization formats
- Performance considerations and optimization techniques
- Configuration options and default values
- File format specifications and validation rules

No additional context beyond what is provided in `/docs` should be needed to implement a fully functional Vibe system in any language.
