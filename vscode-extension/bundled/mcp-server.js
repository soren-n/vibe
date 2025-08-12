#!/usr/bin/env node
/**
 * Vibe MCP Server for VS Code Extension
 *
 * Delegates workflow operations to the main Vibe CLI system
 * Provides MCP interface for VS Code integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

// Helper function to run Vibe CLI commands
function runVibeCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const projectRoot = process.env.VIBE_PROJECT_ROOT || process.cwd();
    const vibeCliPath = join(projectRoot, 'dist', 'src', 'cli.js');

    // Check if main Vibe CLI exists
    if (!existsSync(vibeCliPath)) {
      // Fallback to npm run cli
      const child = spawn('npm', ['run', 'cli', '--', ...command, ...args], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => stdout += data.toString());
      child.stderr.on('data', (data) => stderr += data.toString());

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${stderr}`));
        }
      });
    } else {
      // Use direct CLI
      const child = spawn('node', [vibeCliPath, ...command, ...args], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => stdout += data.toString());
      child.stderr.on('data', (data) => stderr += data.toString());

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${stderr}`));
        }
      });
    }
  });
}

// Create MCP server
const server = new Server(
  {
    name: 'vibe-extension',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool implementations
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'start_workflow',
        description: 'Start a new step-by-step workflow session based on a natural language prompt',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Natural language prompt describing what you want to accomplish',
            },
            working_dir: {
              type: 'string',
              description: 'Optional working directory to run commands in (defaults to current directory)',
            },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'get_workflow_status',
        description: 'Get the current status and step information for a workflow session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The session ID returned from start_workflow',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'advance_workflow',
        description: 'Mark the current step as complete and advance to the next step in the workflow',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The session ID for the workflow to advance',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'list_workflows',
        description: 'List all available workflows',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'start_workflow': {
        const { prompt } = args;

        try {
          // Delegate to main Vibe CLI
          const output = await runVibeCommand(['mcp', 'start'], [prompt]);

          // Parse the JSON response from the main CLI
          const result = JSON.parse(output.trim());

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Failed to start workflow: ${error.message}`
              })
            }]
          };
        }
      }

      case 'get_workflow_status': {
        const { session_id } = args;

        try {
          // Delegate to main Vibe CLI
          const output = await runVibeCommand(['mcp', 'status'], [session_id]);

          // Parse the JSON response from the main CLI
          const result = JSON.parse(output.trim());

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Failed to get workflow status: ${error.message}`
              })
            }]
          };
        }
      }

      case 'advance_workflow': {
        const { session_id } = args;

        try {
          // Delegate to main Vibe CLI
          const output = await runVibeCommand(['mcp', 'next'], [session_id]);

          // Parse the JSON response from the main CLI
          const result = JSON.parse(output.trim());

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Failed to advance workflow: ${error.message}`
              })
            }]
          };
        }
      }

      case 'list_workflows': {
        try {
          // Delegate to main Vibe CLI
          const output = await runVibeCommand(['list-workflows']);

          // Parse the JSON response from the main CLI
          const result = JSON.parse(output.trim());

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Failed to list workflows: ${error.message}`
              })
            }]
          };
        }
      }

      default:
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Unknown tool: ${name}`
            })
          }]
        };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message
        })
      }]
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Vibe MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
