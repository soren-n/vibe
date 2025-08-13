# Vibe Guide

<div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin: 20px 0;">
  <img src="images/icon.png" alt="Vibe Guide Icon" width="256" height="256">
  <p style="margin-top: 16px; max-width: 256px;">A Model Context Protocol server that provides structured workflow guidance for development projects.</p>
</div>

## Overview

Vibe analyzes natural language prompts and provides appropriate development workflows, checklists, and project guidance. It operates as an MCP server that integrates with AI agents in VS Code.

## Installation

Configure Vibe as an MCP server in VS Code by adding the following to your `settings.json`:

```json
{
  "mcp.mcpServers": {
    "vibe-guide": {
      "command": "npx",
      "args": ["vibe-guide@latest", "mcp-server"],
      "env": {},
      "cwd": "${workspaceFolder}"
    }
  }
}
```

## Usage

Once configured, AI agents can use Vibe to:

- Analyze project requirements and suggest appropriate workflows
- Provide step-by-step guidance for development tasks
- Run quality checklists for code review and validation
- Initialize project configurations
- Monitor workflow progress and session state

Vibe automatically detects project type and adapts its recommendations accordingly.

## Features

- MCP server integration for AI agent compatibility
- Pattern-based prompt analysis for workflow recommendations
- Structured workflow guidance with session management
- Project type detection and adaptation
- Quality checklist validation
- Cross-platform compatibility
- Configurable workflow definitions
