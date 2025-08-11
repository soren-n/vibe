#!/usr/bin/env node
/**
 * Vibe MCP Workflow Server
 *
 * Provides MCP tools for step-by-step workflow execution using Vibe.
 * This server acts as a lightweight wrapper around Vibe's CLI commands,
 * enabling token-efficient workflow orchestration for AI agents.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { promisify } from 'util';

/**
 * Execute a Vibe CLI command and return parsed JSON result.
 *
 * @param {string[]} args - Command arguments to pass to vibe CLI
 * @returns {Promise<Object>} Parsed JSON response
 */
async function executeVibeCommand(args) {
  return new Promise((resolve, reject) => {
    // Get the directory of this MCP server (should be in vibe/mcp-server/)
    const mcpServerDir = new URL('.', import.meta.url).pathname;
    const vibeProjectDir = mcpServerDir + '../';

    const process = spawn('uv', ['run', 'python', 'main.py', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: vibeProjectDir // Run from vibe project root
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Vibe command failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse Vibe output as JSON: ${e.message}\\nOutput: ${stdout}`));
      }
    });

    process.on('error', (error) => {
      reject(new Error(`Failed to spawn Vibe process: ${error.message}`));
    });
  });
}

/**
 * Validate session ID format.
 *
 * @param {string} sessionId - Session ID to validate
 * @returns {boolean} True if valid
 */
function isValidSessionId(sessionId) {
  // Session IDs should be 8-character hex strings
  return /^[a-f0-9]{8}$/.test(sessionId);
}

// Create MCP server
const server = new Server(
  {
    name: 'vibe-workflow-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool: Start Workflow Session
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'start_workflow': {
        const { prompt, config, project_type } = args;

        if (!prompt || typeof prompt !== 'string') {
          throw new Error('prompt is required and must be a string');
        }

        const vibeArgs = ['mcp', 'start', prompt];
        if (config) vibeArgs.push('--config', config);
        if (project_type) vibeArgs.push('--project-type', project_type);

        const result = await executeVibeCommand(vibeArgs);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_workflow_status': {
        const { session_id } = args;

        if (!session_id || !isValidSessionId(session_id)) {
          throw new Error('session_id is required and must be a valid 8-character hex string');
        }

        const result = await executeVibeCommand(['mcp', 'status', session_id]);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'advance_workflow': {
        const { session_id } = args;

        if (!session_id || !isValidSessionId(session_id)) {
          throw new Error('session_id is required and must be a valid 8-character hex string');
        }

        const result = await executeVibeCommand(['mcp', 'next', session_id]);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'break_workflow': {
        const { session_id } = args;

        if (!session_id || !isValidSessionId(session_id)) {
          throw new Error('session_id is required and must be a valid 8-character hex string');
        }

        const result = await executeVibeCommand(['mcp', 'break', session_id]);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'list_workflow_sessions': {
        const result = await executeVibeCommand(['mcp', 'list']);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// Tool definitions
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
              description: 'Natural language prompt describing what you want to accomplish'
            },
            config: {
              type: 'string',
              description: 'Optional path to Vibe configuration file'
            },
            project_type: {
              type: 'string',
              description: 'Optional project type override (e.g., python, vue_typescript, generic)'
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'get_workflow_status',
        description: 'Get the current status and step information for a workflow session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The session ID returned from start_workflow'
            }
          },
          required: ['session_id']
        }
      },
      {
        name: 'advance_workflow',
        description: 'Mark the current step as complete and advance to the next step in the workflow',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The session ID for the workflow to advance'
            }
          },
          required: ['session_id']
        }
      },
      {
        name: 'break_workflow',
        description: 'Break out of the current workflow and return to the parent workflow (if any)',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The session ID for the workflow to break out of'
            }
          },
          required: ['session_id']
        }
      },
      {
        name: 'list_workflow_sessions',
        description: 'List all active workflow sessions',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Vibe MCP Workflow Server running on stdio');
}

// Handle process termination
process.on('SIGINT', async () => {
  console.error('Shutting down Vibe MCP Workflow Server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down Vibe MCP Workflow Server...');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}
