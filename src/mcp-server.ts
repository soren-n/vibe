/**
 * MCP Server implementation for Vibe
 * Provides MCP protocol support for workflow orchestration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { WorkflowRegistry } from './workflow-registry.js';
import { VibeConfigImpl } from './config.js';
import { ProjectLinter, createLintConfig } from './lint.js';
import type { PlanItem } from './plan.js';
import {
  EnvironmentHandlers,
  LintHandlers,
  PlanHandlers,
  QueryHandlers,
  WorkflowHandlers,
} from './mcp-server/index.js';

class VibeMCPServer {
  private server: Server;
  private workflowRegistry: WorkflowRegistry;
  private linter: ProjectLinter;

  // Handler instances
  private workflowHandlers: WorkflowHandlers;
  private planHandlers: PlanHandlers;
  private lintHandlers: LintHandlers;
  private queryHandlers: QueryHandlers;
  private environmentHandlers: EnvironmentHandlers;

  constructor() {
    try {
      // Initialize MCP Server
      this.server = new Server(
        {
          name: 'vibe-mcp',
          version: '1.1.1',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );
    } catch (error) {
      throw new Error(
        `Failed to initialize MCP Server: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    try {
      // Initialize configuration
      const config = new VibeConfigImpl();
      this.workflowRegistry = new WorkflowRegistry(config);
    } catch (error) {
      throw new Error(
        `Failed to initialize configuration or workflow registry: ${error instanceof Error ? error.message : String(error)}. Check if vibe.yaml configuration is valid and workflow files are accessible.`
      );
    }

    try {
      // Initialize linter
      this.linter = new ProjectLinter(createLintConfig());
    } catch (error) {
      throw new Error(
        `Failed to initialize project linter: ${error instanceof Error ? error.message : String(error)}. Check if lint configuration files are valid.`
      );
    }

    try {
      // Initialize handlers
      this.workflowHandlers = new WorkflowHandlers(this.workflowRegistry);
      this.planHandlers = new PlanHandlers();
      this.lintHandlers = new LintHandlers(this.linter);
      this.queryHandlers = new QueryHandlers();
      this.environmentHandlers = new EnvironmentHandlers();
    } catch (error) {
      throw new Error(
        `Failed to initialize command handlers: ${error instanceof Error ? error.message : String(error)}. This may indicate missing dependencies or file system permissions issues.`
      );
    }

    try {
      this.setupTools();
      this.setupHandlers();
    } catch (error) {
      throw new Error(
        `Failed to setup MCP tools and handlers: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private setupTools(): void {
    // Define all available MCP tools
    const tools: Tool[] = [
      {
        name: 'get_plan_status',
        description: 'Get current plan status showing all items and statistics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'add_plan_item',
        description: 'Add an item to the plan',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text description of the task',
            },
            parent_id: {
              type: 'string',
              description: 'Parent item ID for sub-tasks (optional for root items)',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'complete_plan_item',
        description: 'Mark a plan item as complete',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'ID of the item to complete',
            },
          },
          required: ['item_id'],
        },
      },
      {
        name: 'expand_plan_item',
        description: 'Expand a plan item by adding multiple sub-tasks',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'ID of the item to expand',
            },
            sub_tasks: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of sub-task descriptions',
            },
          },
          required: ['item_id', 'sub_tasks'],
        },
      },
      {
        name: 'clear_plan',
        description: 'Clear the entire plan, removing all items',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'check_vibe_environment',
        description: 'Validate vibe environment and configuration',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'init_vibe_project',
        description: 'Initialize vibe project configuration',
        inputSchema: {
          type: 'object',
          properties: {
            project_type: {
              type: 'string',
              description: 'The type of project to initialize',
            },
          },
        },
      },
      {
        name: 'lint_project',
        description: 'Run project linting',
        inputSchema: {
          type: 'object',
          properties: {
            fix: {
              type: 'boolean',
              description: 'Whether to auto-fix issues',
              default: false,
            },
          },
        },
      },
      {
        name: 'lint_text',
        description: 'Lint specific text content',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text content to lint',
            },
            type: {
              type: 'string',
              description: 'Type of content (e.g., typescript, javascript)',
            },
          },
          required: ['text', 'type'],
        },
      },
      {
        name: 'query_workflows',
        description: 'Query available workflows by pattern or category (guidance only)',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Search pattern to filter workflows',
            },
            category: {
              type: 'string',
              description: 'Category to filter workflows',
            },
          },
        },
      },
    ];

    // Register tools with the server
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools };
    });
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      try {
        let result: unknown;

        switch (name) {
          // Plan operations
          case 'get_plan_status':
            result = await this.getPlanStatus();
            break;

          case 'add_plan_item':
            result = await this.addPlanItem(
              args?.['text'] as string,
              args?.['parent_id'] as string
            );
            break;

          case 'complete_plan_item':
            result = await this.completePlanItem(args?.['item_id'] as string);
            break;

          case 'expand_plan_item':
            result = await this.expandPlanItem(
              args?.['item_id'] as string,
              args?.['sub_tasks'] as string[]
            );
            break;

          case 'clear_plan':
            result = await this.clearPlan();
            break;

          case 'check_vibe_environment':
            result = await this.checkVibeEnvironment();
            break;

          case 'init_vibe_project':
            result = await this.initVibeProject(args?.['project_type'] as string);
            break;

          case 'lint_project':
            result = await this.lintProject(args?.['fix'] as boolean);
            break;

          case 'lint_text':
            result = await this.lintText(
              args?.['text'] as string,
              args?.['type'] as string
            );
            break;

          case 'query_workflows':
            result = await this.queryWorkflows(
              args?.['pattern'] as string,
              args?.['category'] as string
            );
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  // Plan management methods
  private async getPlanStatus(): Promise<{
    success: boolean;
    plan?: {
      items: PlanItem[];
      stats: {
        totalItems: number;
        completedItems: number;
        pendingItems: number;
        completionRate: number;
      };
      lastModified: string;
      createdAt: string;
    };
    error?: string;
  }> {
    return this.planHandlers.getPlanStatus();
  }

  private async addPlanItem(
    text: string,
    parentId?: string
  ): Promise<{
    success: boolean;
    item?: {
      id: string;
      text: string;
      status: string;
      createdAt: string;
    };
    message?: string;
    error?: string;
  }> {
    return this.planHandlers.addPlanItem(text, parentId);
  }

  private async completePlanItem(itemId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.planHandlers.completePlanItem(itemId);
  }

  private async expandPlanItem(
    itemId: string,
    subItems: string[]
  ): Promise<{
    success: boolean;
    addedItems?: {
      id: string;
      text: string;
      status: string;
      createdAt: string;
    }[];
    message?: string;
    error?: string;
  }> {
    return this.planHandlers.expandPlanItem(itemId, subItems);
  }

  private async clearPlan(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.planHandlers.clearPlan();
  }

  private async checkVibeEnvironment(): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.environmentHandlers.checkVibeEnvironment();
  }

  private async initVibeProject(projectType?: string): Promise<{
    success: boolean;
    message: string;
    project_type?: string;
  }> {
    return this.environmentHandlers.initVibeProject(projectType);
  }

  private async lintProject(fix: boolean = false): Promise<{
    success: boolean;
    result: unknown;
  }> {
    return this.lintHandlers.lintProject(fix);
  }

  private async lintText(
    text: string,
    type: string
  ): Promise<{
    success: boolean;
    result: unknown;
  }> {
    return this.lintHandlers.lintText(text, type);
  }

  private async queryWorkflows(
    pattern?: string,
    category?: string
  ): Promise<{
    success: boolean;
    workflows?: {
      name: string;
      description: string;
      category: string | undefined;
      triggers: string[];
    }[];
    error?: string;
  }> {
    return this.workflowHandlers.queryWorkflows(pattern, category);
  }

  async run(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Vibe MCP Server running on stdio');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('EADDRINUSE')) {
          throw new Error(
            `MCP server port is already in use. Another instance might be running.`
          );
        } else if (error.message.includes('EACCES')) {
          throw new Error(
            `Permission denied when starting MCP server. Check file system permissions.`
          );
        } else if (error.message.includes('ENOENT')) {
          throw new Error(
            `MCP server dependencies not found. Ensure all required files and dependencies are available.`
          );
        } else {
          throw new Error(`Failed to start MCP server transport: ${error.message}`);
        }
      } else {
        throw new Error(`Failed to start MCP server: ${String(error)}`);
      }
    }
  }
}

// Export for use as a module
export { VibeMCPServer };

// If this file is run directly, start the server
// Check if this is the main module in ES modules style
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const server = new VibeMCPServer();
    server.run().catch(error => {
      console.error('MCP Server Runtime Failed:');
      console.error('═══════════════════════════════');

      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);

        // Provide additional troubleshooting guidance
        console.error('\nTroubleshooting Tips:');
        if (error.message.includes('transport')) {
          console.error('• Check if another MCP server instance is running');
          console.error('• Verify stdio transport is available');
          console.error('• Check process permissions');
        } else {
          console.error('• Ensure vibe is properly installed: uv sync');
          console.error('• Check if all dependencies are available');
          console.error('• Verify project structure is intact');
        }

        console.error('\nFor more help:');
        console.error('• Run: uv run vibe --help');
        console.error('• Check: docs/README.md');
        console.error('• Report issues: https://github.com/soren-n/vibe-mcp/issues');
      } else {
        console.error(`Unexpected error: ${String(error)}`);
      }

      console.error('═══════════════════════════════');
      process.exit(1);
    });
  } catch (error) {
    console.error('MCP Server Initialization Failed:');
    console.error('═══════════════════════════════');

    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);

      // Provide specific troubleshooting guidance based on error type
      console.error('\nTroubleshooting Tips:');
      if (error.message.includes('configuration')) {
        console.error('• Check if vibe.yaml exists and is valid');
        console.error('• Verify workflow files in data/workflows/ are accessible');
        console.error('• Run: uv run vibe lint to validate configuration');
      } else if (error.message.includes('linter')) {
        console.error('• Check if eslint or other lint configs are valid');
        console.error('• Verify lint configuration files are properly formatted');
      } else if (error.message.includes('handlers')) {
        console.error('• Check file system permissions for vibe directories');
        console.error('• Ensure all required dependencies are installed');
        console.error('• Try: uv sync to reinstall dependencies');
      } else {
        console.error('• Ensure vibe is properly installed: uv sync');
        console.error('• Check if all dependencies are available');
        console.error('• Verify project structure is intact');
        console.error('• Check file system permissions');
      }

      console.error('\nFor more help:');
      console.error('• Run: uv run vibe --help');
      console.error('• Check: docs/README.md');
      console.error('• Report issues: https://github.com/soren-n/vibe-mcp/issues');
    } else {
      console.error(`Unexpected error: ${String(error)}`);
    }

    console.error('═══════════════════════════════');
    process.exit(1);
  }
}
