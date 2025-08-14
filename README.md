# Vibe Guide

<div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin: 20px 0;">
  <img src="images/icon.png" alt="Vibe Guide Icon" width="256" height="256">
  <p style="margin-top: 16px; max-width: 256px;">A Model Context Protocol server that provides structured workflow guidance for development projects.</p>
</div>

## Overview

Vibe analyzes natural language prompts and provides appropriate development workflows, checklists, and project guidance. It operates as an MCP server that integrates with AI agents in VS Code.

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

- Analyze project requirements and suggest appropriate workflows
- Provide step-by-step guidance for development tasks
- Run quality checklists for code review and validation
- Initialize project configurations
- Monitor workflow progress and session state

Vibe automatically detects project type and adapts its recommendations accordingly.

## Features

- **MCP server integration** for AI agent compatibility
- **Pattern-based prompt analysis** for workflow recommendations
- **Structured workflow guidance** with session management
- **Nested workflow execution** - agents can dynamically add workflows and checklists to running sessions
- **Workflow discovery** - query available workflows and checklists by pattern or category
- **Persistent session state** - work continues across agent runs with full context preservation
- **Project type detection** and adaptation
- **Quality checklist validation**
- **Cross-platform compatibility**
- **Configurable workflow definitions**
- **Local execution** - runs safely on user's machine, no server required

### Nested Workflow Capabilities

Agents can now:

- **Query workflows**: `query_workflows(pattern, category)` to discover relevant workflows
- **Query checklists**: `query_checklists(pattern)` to find validation checklists
- **Add workflows to sessions**: `add_workflow_to_session(session_id, workflow_name)` for dynamic composition
- **Add checklists to sessions**: `add_checklist_to_session(session_id, checklist_name)` for nested validation
- **Build execution trees**: Create nested workflow hierarchies that persist across agent runs
- **Reduce token usage**: Follow structured plans instead of thinking from scratch

This enables agents to compose complex workflows dynamically while maintaining persistent progress tracking.
