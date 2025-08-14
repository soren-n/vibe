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
import { WorkflowOrchestrator } from './orchestrator.js';
import { VibeConfigImpl } from './config.js';
import { ProjectLinter, createLintConfig } from './lint.js';
import {
  ChecklistHandlers,
  EnvironmentHandlers,
  LintHandlers,
  QueryHandlers,
  SessionHandlers,
  WorkflowHandlers,
} from './mcp-server/index.js';

class VibeMCPServer {
  private server: Server;
  private orchestrator: WorkflowOrchestrator;
  private linter: ProjectLinter;

  // Handler instances
  private workflowHandlers: WorkflowHandlers;
  private checklistHandlers: ChecklistHandlers;
  private lintHandlers: LintHandlers;
  private sessionHandlers: SessionHandlers;
  private queryHandlers: QueryHandlers;
  private environmentHandlers: EnvironmentHandlers;

  constructor() {
    try {
      // Initialize MCP Server
      this.server = new Server(
        {
          name: 'vibe-guide',
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
      this.orchestrator = new WorkflowOrchestrator(config);
    } catch (error) {
      throw new Error(
        `Failed to initialize configuration or workflow orchestrator: ${error instanceof Error ? error.message : String(error)}. Check if vibe.yaml configuration is valid and workflow files are accessible.`
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
      this.workflowHandlers = new WorkflowHandlers(this.orchestrator);
      this.checklistHandlers = new ChecklistHandlers();
      this.lintHandlers = new LintHandlers(this.linter);
      this.sessionHandlers = new SessionHandlers();
      this.queryHandlers = new QueryHandlers(this.orchestrator);
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
        name: 'start_workflow',
        description: 'Start a new workflow session for step-by-step execution',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt to start a workflow for',
            },
            interactive: {
              type: 'boolean',
              description: 'Whether to run in interactive mode',
              default: false,
            },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'get_workflow_status',
        description: 'Get current status of a workflow session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The workflow session ID',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'advance_workflow',
        description: 'Mark current step as complete and advance to next step',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The workflow session ID',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'back_workflow',
        description: 'Go back to the previous step in the current workflow',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The workflow session ID',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'break_workflow',
        description: 'Break out of current workflow and return to parent workflow',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The workflow session ID',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'restart_workflow',
        description: 'Restart the session from the beginning',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The workflow session ID',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'list_workflow_sessions',
        description: 'List all active workflow sessions',
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
        name: 'list_checklists',
        description: 'List available checklists',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_checklist',
        description: 'Get details for a specific checklist',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the checklist',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'run_checklist',
        description: 'Run a checklist',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the checklist to run',
            },
          },
          required: ['name'],
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
        name: 'monitor_sessions',
        description: 'Get session health monitoring data',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'cleanup_stale_sessions',
        description: 'Clean up sessions that have been inactive for too long',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'analyze_agent_response',
        description: 'Analyze an agent response for patterns',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The workflow session ID',
            },
            response_text: {
              type: 'string',
              description: 'The agent response text to analyze',
            },
          },
          required: ['session_id', 'response_text'],
        },
      },
      {
        name: 'query_workflows',
        description: 'Query available workflows by pattern or category',
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
      {
        name: 'query_checklists',
        description: 'Query available checklists by pattern',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Search pattern to filter checklists',
            },
          },
        },
      },
      {
        name: 'add_workflow_to_session',
        description: 'Add a workflow to an existing session (nested execution)',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The session ID to add the workflow to',
            },
            workflow_name: {
              type: 'string',
              description: 'Name of the workflow to add',
            },
          },
          required: ['session_id', 'workflow_name'],
        },
      },
      {
        name: 'add_checklist_to_session',
        description: 'Add a checklist to an existing session (nested execution)',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The session ID to add the checklist to',
            },
            checklist_name: {
              type: 'string',
              description: 'Name of the checklist to add',
            },
          },
          required: ['session_id', 'checklist_name'],
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
          case 'start_workflow':
            result = await this.startWorkflow(
              args?.['prompt'] as string,
              args?.['interactive'] as boolean
            );
            break;

          case 'get_workflow_status':
            result = await this.getWorkflowStatus(args?.['session_id'] as string);
            break;

          case 'advance_workflow':
            result = await this.advanceWorkflow(args?.['session_id'] as string);
            break;

          case 'back_workflow':
            result = await this.backWorkflow(args?.['session_id'] as string);
            break;

          case 'break_workflow':
            result = await this.breakWorkflow(args?.['session_id'] as string);
            break;

          case 'restart_workflow':
            result = await this.restartWorkflow(args?.['session_id'] as string);
            break;

          case 'list_workflow_sessions':
            result = await this.listWorkflowSessions();
            break;

          case 'check_vibe_environment':
            result = await this.checkVibeEnvironment();
            break;

          case 'init_vibe_project':
            result = await this.initVibeProject(args?.['project_type'] as string);
            break;

          case 'list_checklists':
            result = await this.listChecklists();
            break;

          case 'get_checklist':
            result = await this.getChecklist(args?.['name'] as string);
            break;

          case 'run_checklist':
            result = await this.runChecklist(args?.['name'] as string);
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

          case 'monitor_sessions':
            result = await this.monitorSessions();
            break;

          case 'cleanup_stale_sessions':
            result = await this.cleanupStaleSessions();
            break;

          case 'analyze_agent_response':
            result = await this.analyzeAgentResponse(
              args?.['session_id'] as string,
              args?.['response_text'] as string
            );
            break;

          case 'query_workflows':
            result = await this.queryWorkflows(
              args?.['pattern'] as string,
              args?.['category'] as string
            );
            break;

          case 'query_checklists':
            result = await this.queryChecklists(args?.['pattern'] as string);
            break;

          case 'add_workflow_to_session':
            result = await this.addWorkflowToSession(
              args?.['session_id'] as string,
              args?.['workflow_name'] as string
            );
            break;

          case 'add_checklist_to_session':
            result = await this.addChecklistToSession(
              args?.['session_id'] as string,
              args?.['checklist_name'] as string
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

  // Tool implementation methods - delegate to handlers
  private async startWorkflow(
    prompt: string,
    interactive: boolean = false
  ): Promise<{
    success: boolean;
    session_id: string;
    workflow: unknown;
    current_step: unknown;
  }> {
    return this.workflowHandlers.startWorkflow(prompt, interactive);
  }

  private async getWorkflowStatus(sessionId: string): Promise<{
    success: boolean;
    status: unknown;
  }> {
    return this.workflowHandlers.getWorkflowStatus(sessionId);
  }

  private async advanceWorkflow(sessionId: string): Promise<{
    success: boolean;
    result?: unknown;
  }> {
    return this.workflowHandlers.advanceWorkflow(sessionId);
  }

  private async backWorkflow(sessionId: string): Promise<{
    success: boolean;
    result?: unknown;
  }> {
    return this.workflowHandlers.backWorkflow(sessionId);
  }

  private async breakWorkflow(sessionId: string): Promise<{
    success: boolean;
    result?: unknown;
  }> {
    return this.workflowHandlers.breakWorkflow(sessionId);
  }

  private async restartWorkflow(sessionId: string): Promise<{
    success: boolean;
    result?: unknown;
  }> {
    return this.workflowHandlers.restartWorkflow(sessionId);
  }

  private async listWorkflowSessions(): Promise<{
    success: boolean;
    sessions: unknown;
  }> {
    return this.workflowHandlers.listWorkflowSessions();
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

  private async listChecklists(): Promise<{
    success: boolean;
    checklists: unknown;
  }> {
    return this.checklistHandlers.listChecklists();
  }

  private async getChecklist(name: string): Promise<{
    success: boolean;
    checklist: unknown;
  }> {
    return this.checklistHandlers.getChecklist(name);
  }

  private async runChecklist(name: string): Promise<{
    success: boolean;
    name: string;
    status: string;
    items: Array<{ item: string; status: string }>;
  }> {
    return this.checklistHandlers.runChecklist(name);
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

  private async monitorSessions(): Promise<{
    success: boolean;
    monitoring_data: {
      active_sessions: number;
      dormant_sessions: number;
      alerts: unknown[];
    };
  }> {
    return this.sessionHandlers.monitorSessions();
  }

  private async cleanupStaleSessions(): Promise<{
    success: boolean;
    cleaned_sessions: number;
  }> {
    return this.sessionHandlers.cleanupStaleSessions();
  }

  private async analyzeAgentResponse(
    sessionId: string,
    responseText: string
  ): Promise<{
    success: boolean;
    session_id: string;
    analysis: {
      patterns_detected: unknown[];
      suggestions: unknown[];
    };
  }> {
    return this.sessionHandlers.analyzeAgentResponse(sessionId, responseText);
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
    return this.queryHandlers.queryWorkflows(pattern, category);
  }

  private async queryChecklists(pattern?: string): Promise<{
    success: boolean;
    checklists?: {
      name: string;
      description: string | undefined;
      triggers: string[];
    }[];
    error?: string;
  }> {
    return this.queryHandlers.queryChecklists(pattern);
  }

  private async addWorkflowToSession(
    sessionId: string,
    workflowName: string
  ): Promise<{
    success: boolean;
    session_id?: string;
    message?: string;
    current_step?: unknown;
    workflow_stack?: string[];
    error?: string;
  }> {
    return this.queryHandlers.addWorkflowToSession(sessionId, workflowName);
  }

  private async addChecklistToSession(
    sessionId: string,
    checklistName: string
  ): Promise<{
    success: boolean;
    session_id?: string;
    message?: string;
    current_step?: unknown;
    workflow_stack?: string[];
    error?: string;
  }> {
    return this.queryHandlers.addChecklistToSession(sessionId, checklistName);
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
if (require.main === module) {
  try {
    const server = new VibeMCPServer();
    server.run().catch(error => {
      console.error('🔴 MCP Server Runtime Failed:');
      console.error('═══════════════════════════════');

      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);

        // Provide additional troubleshooting guidance
        console.error('\n💡 Troubleshooting Tips:');
        if (error.message.includes('transport')) {
          console.error('• Check if another MCP server instance is running');
          console.error('• Verify stdio transport is available');
          console.error('• Check process permissions');
        } else {
          console.error('• Ensure vibe is properly installed: uv sync');
          console.error('• Check if all dependencies are available');
          console.error('• Verify project structure is intact');
        }

        console.error('\n📖 For more help:');
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
    console.error('🔴 MCP Server Initialization Failed:');
    console.error('═══════════════════════════════');

    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);

      // Provide specific troubleshooting guidance based on error type
      console.error('\n💡 Troubleshooting Tips:');
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

      console.error('\n📖 For more help:');
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
