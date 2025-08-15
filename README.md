# Vibe Guide

<div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin: 20px 0;">
  <img src="images/icon.png" alt="Vibe Guide Icon" width="256" height="256">
  <p style="margin-top: 16px; max-width: 256px;">A Model Context Protocol server that provides a persistent planning system and workflow guidance for AI agents.</p>
</div>

## Overview

Vibe is a planning tool designed for AI agents that provides:

1. **Persistent Plan Management**: A nested todo list system that serves as long-term memory for agents
2. **Workflow Guidance**: 77+ searchable workflows that provide step-by-step inspiration for development tasks
3. **MCP Integration**: Seamless integration with AI agents via Model Context Protocol

Agents can break down complex problems into manageable tasks, create nested subtasks on the fly, and maintain persistent plans that survive across different work periods.

## Installation

Configure Vibe as an MCP server in VS Code by creating `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "vibe-guide": {
      "type": "stdio",
      "command": "npx",
      "args": ["vibe-guide@latest", "mcp-server"],
      "cwd": "${workspaceFolder}",
      "env": {}
    }
  }
}
```

**Note**: After creating this file, restart VS Code to enable the MCP integration.

## Usage

Once configured, AI agents can use Vibe to:

- **Manage persistent plans**: Add, complete, and break down tasks into subtasks
- **Search workflow guidance**: Find relevant workflows for inspiration and best practices
- **Track progress**: Monitor completion status and maintain context across work periods
- **Plan dynamically**: Create nested todo lists that can be expanded to arbitrary detail

Vibe automatically detects project type and adapts its recommendations accordingly.

## Features

- **Persistent Plan System**: Nested todo lists that persist automatically
- **Workflow Guidance Library**: 77+ searchable workflows covering development, testing, documentation, and more
- **MCP Server Integration**: Native support for AI agent communication
- **Dynamic Planning**: Break down tasks into subtasks on the fly
- **Project type detection** and adaptation
- **Quality guidance** for development best practices
- **Cross-platform compatibility**
- **Configurable workflow definitions**
- **Local execution** - runs safely on user's machine, no server required

## Core MCP Tools

Agents have access to these key tools:

### Plan Management

- **`get_plan_status()`**: View current plan status with completion statistics
- **`add_plan_item(text, parent_id?)`**: Add new tasks or subtasks to the plan
- **`complete_plan_item(item_id)`**: Mark tasks as complete
- **`expand_plan_item(item_id, sub_tasks[])`**: Break down tasks into multiple subtasks
- **`clear_plan()`**: Start fresh with a clean plan

### Workflow Guidance

- **`query_workflows(pattern?, category?)`**: Search available workflows for inspiration
- **`run <workflow_name>`**: Display detailed guidance for specific workflows

### Project Support

- **`check_vibe_environment()`**: Validate Vibe configuration
- **`lint_project(fix?)`**: Run project quality checks
- **Reduce token usage**: Follow structured plans instead of thinking from scratch

This enables agents to compose complex workflows dynamically while maintaining persistent progress tracking.
