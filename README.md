# vibe

A CLI tool that assists you in vibe coding, essentially a scripted workflow system guiding your agent.

## Overview

Vibe is an intelligent workflow orchestrator that analyzes your natural language prompts and automatically executes the appropriate development workflows. It's designed to make "vibe coding" - that flow state of rapid, intuitive development - more structured and productive.

## Key Features

- 🧠 **Intelligent Prompt Analysis**: Uses pattern matching to understand what you want to accomplish
- 🔄 **Workflow Orchestration**: Automatically executes workflows in the optimal order
- 🏗️ **Project Type Detection**: Supports multiple project types (Python, Vue/TypeScript, etc.)
- ⚙️ **Configurable**: Customize workflows and commands for your project needs
- 🎨 **Rich Output**: Beautiful, colored terminal output with progress indicators
- 🔌 **Extensible**: Plugin architecture for custom workflows and project types

## Installation

```bash
# Install with uv (recommended)
uv add vibe

# Or with pip
pip install vibe
```

## Quick Start

```bash
# Initialize vibe in your project
vibe init

# Run a workflow based on natural language
vibe "analyze the codebase structure"
vibe "implement user authentication"
vibe "run all tests and check quality"
vibe "create a pull request"
```

## Workflow Types

- 🔍 **Analysis**: Codebase exploration, pattern identification, research
- 🛠️ **Implementation**: Feature development, bug fixes, code changes
- 🧪 **Testing**: Test execution, validation, quality verification
- 📚 **Documentation**: Documentation updates, guides, explanations
- ✨ **Quality**: Code quality, linting, formatting, compliance
- 🔄 **Git**: Git operations, commits, PRs, repository management
- 🤖 **MCP**: MCP tools integration and AI-enhanced workflows
- 🎯 **Session**: Session management, completion, cleanup

## Configuration

Create a `.vibe.yaml` file in your project root to customize workflows:

```yaml
project_type: "python"  # or "auto" for detection
workflows:
  testing:
    commands:
      - "uv run pytest"
      - "uv run ruff check"
  quality:
    commands:
      - "uv run mypy ."
      - "uv run ruff format"
```
