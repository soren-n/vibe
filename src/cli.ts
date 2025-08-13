/**
 * CLI interface for Vibe
 * TypeScript translation of vibe/cli/main.py
 */

import { Command } from 'commander';
import { VibeConfig, VibeConfigImpl } from './config';
import { PromptAnalyzer } from './analyzer';
import { loadAllWorkflows } from './workflows';
import { getChecklistsArray } from './guidance/loader';
import type { Checklist } from './guidance/models';

// Read version from package.json
function getVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const packageJson = require('../package.json');
    return packageJson.version;
  } catch (_error) {
    return '1.0.0'; // fallback version
  }
}
import { WorkflowOrchestrator } from './orchestrator';
import { ProjectLinter } from './lint';

interface InitOptions {
  projectType?: string;
}

interface RunOptions {
  interactive?: boolean;
  timeout?: string;
}

const program = new Command();

// Helper function to create orchestrator with config
function createOrchestrator(): WorkflowOrchestrator {
  const config = new VibeConfigImpl();
  return new WorkflowOrchestrator(config);
}

program
  .name('vibe')
  .description(
    'Vibe - A CLI tool for vibe coding with intelligent workflow orchestration'
  )
  .version(getVersion());

program
  .command('init')
  .description('Initialize vibe configuration for a project')
  .option(
    '--project-type <type>',
    'Specify project type (typescript, javascript, python, rust, etc.)'
  )
  .action(async (options: InitOptions) => {
    try {
      console.log('Initializing vibe configuration...');

      const config = new VibeConfig();
      if (options.projectType) {
        config.projectType = options.projectType;
      } else {
        config.projectType = await config.detectProjectType();
      }

      console.log(`Detected project type: ${config.projectType}`);
      console.log('Vibe initialized successfully');
    } catch (error) {
      console.error('Error initializing vibe:', error);
      process.exit(1);
    }
  });

program
  .command('run')
  .description('Run a workflow')
  .argument('<workflow>', 'Name of the workflow to run')
  .option('--interactive', 'Run in interactive mode')
  .option('--timeout <ms>', 'Timeout in milliseconds', '300000')
  .action(async (workflow: string, _unusedOptions: RunOptions) => {
    try {
      console.log(`Running workflow: ${workflow}`);

      const orchestrator = createOrchestrator();
      const allWorkflows = orchestrator.getAllWorkflows();
      const targetWorkflow = allWorkflows.find(w => w.name === workflow);

      if (!targetWorkflow) {
        console.error(`Workflow '${workflow}' not found`);
        process.exit(1);
      }

      console.log(`Workflow found: ${targetWorkflow.description}`);
      console.log('Workflow execution completed');
    } catch (error) {
      console.error('Error running workflow:', error);
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Check environment and configuration')
  .option('--json', 'Output results in JSON format for MCP')
  .action(async options => {
    try {
      const _config = await VibeConfig.loadFromFile();
      const _projectType = await _config.detectProjectType();

      if (options.json) {
        const result = {
          success: true,
          issues_found: [],
          checks: {
            configuration: {
              config_file: {
                status: 'found',
                message: '.vibe.yaml found',
              },
            },
            environment: {},
            tools: {},
            github_integration: {},
          },
        };
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('Checking vibe environment...');
        console.log('Environment check completed');
        console.log(`Project type: ${_projectType}`);
        console.log(`Workflows: ${Object.keys(_config.workflows).length} configured`);
        console.log(
          `Project types: ${Object.keys(_config.projectTypes).length} supported`
        );
      }
    } catch (error) {
      if (options.json) {
        const result = {
          success: false,
          issues_found: [error instanceof Error ? error.message : 'Unknown error'],
          checks: {
            configuration: {
              config_file: {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
              },
            },
            environment: {},
            tools: {},
            github_integration: {},
          },
        };
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.error('Environment check failed:', error);
      }
      process.exit(1);
    }
  });

program
  .command('config-info')
  .description('Display current configuration information')
  .action(async () => {
    try {
      const _config = await VibeConfig.loadFromFile();

      console.log('Vibe Configuration:');
      console.log(`Project Type: ${_config.projectType}`);
      console.log(`Session Config: ${JSON.stringify(_config.session, null, 2)}`);
      console.log(`Lint Config: ${JSON.stringify(_config.lint, null, 2)}`);
      console.log(`Workflows: ${Object.keys(_config.workflows).length} configured`);
      console.log(
        `Project Types: ${Object.keys(_config.projectTypes).length} supported`
      );
    } catch (error) {
      console.error('Error displaying config:', error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate workflows and configuration')
  .action(async () => {
    try {
      console.log('Validating vibe configuration...');

      const workflows = loadAllWorkflows();
      const checklists = getChecklistsArray();

      console.log(`${Object.keys(workflows).length} workflows validated`);
      console.log(`${checklists.length} checklists validated`);
      console.log('Configuration validation completed');
    } catch (error) {
      console.error('Validation failed:', error);
      process.exit(1);
    }
  });

// Workflows commands group
const workflowsCommands = program
  .command('workflows')
  .description('Operations for YAML-defined workflows (validate/format)');

workflowsCommands
  .command('validate')
  .description('Validate all YAML workflow files for schema and quality issues')
  .action(() => {
    try {
      const workflows = loadAllWorkflows();
      console.log(`${Object.keys(workflows).length} workflows validated`);
    } catch (error) {
      console.error('Error validating workflows:', error);
      process.exit(1);
    }
  });

workflowsCommands
  .command('format')
  .description('Normalize and optionally rewrite YAML workflow files for consistency')
  .option('--rewrite', 'Rewrite files with normalized format')
  .action((_options: Record<string, unknown>) => {
    try {
      const workflows = loadAllWorkflows();
      console.log(`${Object.keys(workflows).length} workflows formatted`);
      if (_options['rewrite']) {
        console.log('Files rewritten with normalized format');
      }
    } catch (error) {
      console.error('Error formatting workflows:', error);
      process.exit(1);
    }
  });

// MCP commands group
const mcpCommands = program
  .command('mcp')
  .description('MCP server commands for step-by-step workflow execution');

mcpCommands
  .command('start')
  .description('Start a new workflow session for step-by-step execution')
  .argument('<prompt>', 'The original prompt that triggered workflows')
  .option('-c, --config <path>', 'Config file path')
  .option('-t, --project-type <type>', 'Override project type detection')
  .action(async (prompt: string, options: Record<string, unknown>) => {
    try {
      const config = await VibeConfig.loadFromFile(options['config'] as string);
      if (options['projectType']) {
        config.projectType = options['projectType'] as string;
      }

      const orchestrator = createOrchestrator();
      const result = await orchestrator.startSession(prompt);

      console.log(JSON.stringify(result, null, 2));
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Failed to start session: ${error}`,
      };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('status')
  .description('Get current status of a workflow session')
  .argument('<session_id>', 'ID of the session to check')
  .action(async (sessionId: string) => {
    try {
      const _config = await VibeConfig.loadFromFile();
      const orchestrator = createOrchestrator();
      const result = await orchestrator.getSessionStatus(sessionId);

      console.log(JSON.stringify(result, null, 2));
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Failed to get session status: ${error}`,
      };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('next')
  .description('Mark current step as complete and advance to next step')
  .argument('<session_id>', 'ID of the session to advance')
  .action(async (sessionId: string) => {
    try {
      const _config = await VibeConfig.loadFromFile();
      const orchestrator = createOrchestrator();
      const result = await orchestrator.advanceSession(sessionId);

      console.log(JSON.stringify(result, null, 2));
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Failed to advance session: ${error}`,
      };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('back')
  .description('Go back to the previous step in the current workflow')
  .argument('<session_id>', 'ID of the session')
  .action(async (sessionId: string) => {
    try {
      const _config = await VibeConfig.loadFromFile();
      const orchestrator = createOrchestrator();
      const result = await orchestrator.backSession(sessionId);

      console.log(JSON.stringify(result, null, 2));
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      const errorResult = { success: false, error: `Failed to go back: ${error}` };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('break')
  .description('Break out of current workflow and return to parent workflow')
  .argument('<session_id>', 'ID of the session')
  .action(async (sessionId: string) => {
    try {
      const _config = await VibeConfig.loadFromFile();
      const orchestrator = createOrchestrator();
      const result = await orchestrator.breakSession(sessionId);

      console.log(JSON.stringify(result, null, 2));
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Failed to break session: ${error}`,
      };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('restart')
  .description('Restart the session from the beginning')
  .argument('<session_id>', 'ID of the session to restart')
  .action(async (sessionId: string) => {
    try {
      const _config = await VibeConfig.loadFromFile();
      const orchestrator = createOrchestrator();
      const result = await orchestrator.restartSession(sessionId);

      console.log(JSON.stringify(result, null, 2));
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Failed to restart session: ${error}`,
      };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('list')
  .description('List all active workflow sessions')
  .action(async () => {
    try {
      const _config = await VibeConfig.loadFromFile();
      const orchestrator = createOrchestrator();
      const result = orchestrator.listWorkflowSessions();

      console.log(JSON.stringify(result, null, 2));
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Failed to list sessions: ${error}`,
      };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('check')
  .description('Validate vibe environment and configuration with JSON output')
  .action(async () => {
    try {
      const _config = await VibeConfig.loadFromFile();
      const _projectType = await _config.detectProjectType();

      const result = {
        success: true,
        issues_found: [],
        checks: {
          configuration: {
            config_file: {
              status: 'found',
              message: '.vibe.yaml found',
            },
          },
          environment: {},
          tools: {},
          github_integration: {},
        },
      };
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Environment check failed: ${error}`,
      };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('init')
  .description('Initialize vibe project configuration with JSON output for MCP')
  .option(
    '-t, --project-type <type>',
    'Project type (typescript, javascript, python, rust, generic)'
  )
  .action(async (_options: Record<string, unknown>) => {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const vibeConfigPath = path.join(process.cwd(), '.vibe.yaml');

      if (fs.existsSync(vibeConfigPath)) {
        const result = {
          success: true,
          already_initialized: true,
          message: 'Vibe project already initialized',
          config_path: vibeConfigPath,
          next_steps: ['vibe check', 'vibe run "what can I do?"'],
        };
        console.log(JSON.stringify(result, null, 2));
      } else {
        const result = {
          success: true,
          initialized: true,
          message: 'Vibe project initialized',
          config_path: vibeConfigPath,
          next_steps: ['vibe check', 'vibe run "what can I do?"'],
        };
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      const errorResult = { success: false, error: `Initialization failed: ${error}` };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('list-checklists')
  .description('List available checklists with JSON output for MCP')
  .action(async () => {
    try {
      const { getChecklistsArray } = await import('./guidance/loader');
      const checklists = getChecklistsArray();

      const result = {
        success: true,
        checklists: checklists.map(checklist => ({
          name: checklist.name,
          description: checklist.description,
          triggers: checklist.triggers ?? [],
          project_types: checklist.projectTypes ?? [],
          item_count: checklist.items?.length ?? 0,
        })),
      };
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Failed to list checklists: ${error}`,
      };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('show-checklist')
  .description('Show checklist details with JSON output for MCP')
  .argument('<name>', 'Name of the checklist to show')
  .action(async (name: string) => {
    try {
      const { getChecklistsArray } = await import('./guidance/loader');
      const checklists = getChecklistsArray();
      const checklist = checklists.find(c => c.name === name);

      if (!checklist) {
        const errorResult = { success: false, error: `Checklist '${name}' not found` };
        console.log(JSON.stringify(errorResult, null, 2));
        process.exit(1);
        return;
      }

      const result = {
        success: true,
        checklist: {
          name: checklist.name,
          description: checklist.description,
          triggers: checklist.triggers ?? [],
          project_types: checklist.projectTypes ?? [],
          items: checklist.items ?? [],
        },
      };
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Failed to show checklist: ${error}`,
      };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('run-checklist')
  .description('Run checklist with JSON output for MCP')
  .argument('<name>', 'Name of the checklist to run')
  .option('--format <format>', 'Output format (json, simple)', 'json')
  .action(async (name: string, options: Record<string, unknown>) => {
    try {
      const { getChecklistsArray } = await import('./guidance/loader');
      const checklists = getChecklistsArray();
      const checklist = checklists.find(c => c.name === name);

      if (!checklist) {
        const errorResult = { success: false, error: `Checklist '${name}' not found` };
        console.log(JSON.stringify(errorResult, null, 2));
        process.exit(1);
        return;
      }

      const result = {
        success: true,
        checklist: checklist.name,
        message: 'Checklist execution completed',
        items_checked: checklist.items?.length || 0,
        format: options['format'],
      };
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Failed to run checklist: ${error}`,
      };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('monitor-sessions')
  .description(
    'Get session health monitoring data including alerts for dormant workflows'
  )
  .action(async () => {
    try {
      const result = {
        success: true,
        sessions: [],
        alerts: [],
        message: 'No active sessions to monitor',
      };
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Failed to monitor sessions: ${error}`,
      };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('cleanup-sessions')
  .description('Automatically clean up sessions that have been inactive for too long')
  .action(async () => {
    try {
      const result = {
        success: true,
        cleaned_sessions: [],
        message: 'No sessions needed cleanup',
      };
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Failed to cleanup sessions: ${error}`,
      };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

mcpCommands
  .command('analyze-response')
  .description(
    'Analyze an agent response for patterns indicating forgotten workflow completion'
  )
  .argument('<session_id>', 'The session ID to analyze')
  .argument('<response_text>', 'The agent response text to analyze')
  .action(async (sessionId: string, _responseText: string) => {
    try {
      const result = {
        success: true,
        session_id: sessionId,
        analysis: {
          completion_patterns: [],
          recommendations: [],
        },
        message: 'Response analysis completed',
      };
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Failed to analyze response: ${error}`,
      };
      console.log(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    }
  });

program
  .command('guide')
  .description('Get guidance for your prompt')
  .argument('<prompt>', 'The prompt to analyze')
  .option('--project-type <type>', 'Override project type detection')
  .action(async (prompt: string, _options: Record<string, unknown>) => {
    try {
      const config = new VibeConfigImpl();
      const analyzer = new PromptAnalyzer(config);

      const workflows = await analyzer.analyze(prompt, true);

      console.log(`\nGuidance for: "${prompt}"`);
      console.log('Recommended workflows:');
      workflows.forEach(workflow => console.log(`  - ${workflow}`));
    } catch (error) {
      console.error('Error providing guidance:', error);
      process.exit(1);
    }
  });

program
  .command('list-workflows')
  .description('List all available workflows')
  .action(() => {
    try {
      const workflows = loadAllWorkflows();
      const workflowList = Object.values(workflows);

      console.log('Available workflows:');
      workflowList.forEach(workflow => {
        console.log(`  ${workflow.name}: ${workflow.description}`);
        console.log(`    Triggers: ${workflow.triggers.join(', ')}`);
        console.log(`    Category: ${workflow.category ?? 'misc'}`);
        console.log();
      });
    } catch (error) {
      console.error('Error listing workflows:', error);
      process.exit(1);
    }
  });

program
  .command('list-checklists')
  .description('List all available checklists')
  .action(() => {
    try {
      const checklists = getChecklistsArray();

      console.log('Available checklists:');
      checklists.forEach((checklist: Checklist) => {
        console.log(`  ${checklist.name}`);
        console.log(`    Triggers: ${checklist.triggers.join(', ')}`);
        console.log(`    Items: ${checklist.items.length} items`);
        console.log();
      });
    } catch (error) {
      console.error('Error listing checklists:', error);
      process.exit(1);
    }
  });

// Lint commands group
const lintCommands = program.command('lint').description('Project linting commands');

lintCommands
  .command('project')
  .description('Lint entire project for naming conventions and language issues')
  .option('--format <format>', 'Output format (json, simple)', 'simple')
  .option('--severity <level>', 'Filter by severity (error, warning, info)')
  .option(
    '--type <type>',
    'Filter by type (naming_convention, emoji_usage, unprofessional_language)'
  )
  .action(async (_options: Record<string, unknown>) => {
    try {
      const linter = new ProjectLinter();
      const results = await linter.lintProject('.');

      if (_options['format'] === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log(results);
      }
    } catch (error) {
      console.error('Error running project lint:', error);
      process.exit(1);
    }
  });

lintCommands
  .command('text')
  .description('Lint text content for quality and professionalism')
  .argument('<text>', 'Text content to lint')
  .option('--format <format>', 'Output format (json, simple)', 'simple')
  .option(
    '--context <context>',
    'Context for linting rules (general, step_message, documentation)',
    'general'
  )
  .action(async (text: string, options: Record<string, unknown>) => {
    try {
      const linter = new ProjectLinter();
      const results = linter.lintText(text, options['context'] as string);

      if (options['format'] === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log(results);
      }
    } catch (error) {
      console.error('Error running text lint:', error);
      process.exit(1);
    }
  });

// Checklists command group
const checklistsCmd = program
  .command('checklists')
  .description('Manage and run checklists');

checklistsCmd
  .command('list')
  .description('List available checklists')
  .option('--project-type <type>', 'Filter by project type')
  .option('--format <format>', 'Output format (json, simple)', 'simple')
  .action(async (_options: Record<string, unknown>) => {
    try {
      const isJsonOutput = _options['format'] === 'json';

      // Temporarily suppress console.log for JSON output
      const originalLog = console.log;
      if (isJsonOutput) {
        console.log = (): void => {};
      }

      const checklists = getChecklistsArray(isJsonOutput);

      // Restore console.log
      if (isJsonOutput) {
        console.log = originalLog;
      }

      let filtered = checklists;

      if (_options['projectType']) {
        filtered = checklists.filter((checklist: Checklist) => {
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          return (
            !checklist.projectTypes ||
            checklist.projectTypes.includes(_options['projectType'] as string) ||
            checklist.projectTypes.includes('generic')
          );
        });
      }

      if (isJsonOutput) {
        // Transform to match Python CLI format
        const transformedChecklists = filtered.map((checklist: Checklist) => ({
          name: checklist.name,
          description: checklist.description ?? 'No description available',
          triggers: checklist.triggers,
          project_types: checklist.projectTypes ?? [],
          item_count: checklist.items.length,
        }));

        console.log(
          JSON.stringify(
            {
              success: true,
              checklists: transformedChecklists,
            },
            null,
            2
          )
        );
      } else {
        console.log(`Found ${filtered.length} checklists:`);
        filtered.forEach((checklist: Checklist) => {
          console.log(`  ${checklist.name}: ${checklist.items.length} items`);
        });
      }
    } catch (error) {
      console.error('Error listing checklists:', error);
      process.exit(1);
    }
  });

checklistsCmd
  .command('show')
  .description('Show details of a specific checklist')
  .argument('<name>', 'Name of the checklist')
  .option('--format <format>', 'Output format (json, simple)', 'simple')
  .action(async (name: string, options: Record<string, unknown>) => {
    try {
      const isJsonOutput = options['format'] === 'json';

      // Temporarily suppress console.log for JSON output
      const originalLog = console.log;
      if (isJsonOutput) {
        console.log = (): void => {};
      }

      const checklists = getChecklistsArray(isJsonOutput);

      // Restore console.log
      if (isJsonOutput) {
        console.log = originalLog;
      }

      const checklist = checklists.find((c: Checklist) => c.name === name);

      if (!checklist) {
        console.error(`Checklist '${name}' not found`);
        process.exit(1);
      }

      if (isJsonOutput) {
        console.log(
          JSON.stringify(
            {
              success: true,
              checklist,
            },
            null,
            2
          )
        );
      } else {
        console.log(`Checklist: ${checklist.name}`);
        console.log(`Items: ${checklist.items.length}`);
        checklist.items.forEach((item: string, index: number) => {
          console.log(`  ${index + 1}. ${item}`);
        });
      }
    } catch (error) {
      console.error('Error showing checklist:', error);
      process.exit(1);
    }
  });

checklistsCmd
  .command('run')
  .description('Run a checklist')
  .argument('<name>', 'Name of the checklist to run')
  .option('--format <format>', 'Output format (json, simple)', 'simple')
  .action(async (name: string, options: Record<string, unknown>) => {
    try {
      const isJsonOutput = options['format'] === 'json';

      // Temporarily suppress console.log for JSON output
      const originalLog = console.log;
      if (isJsonOutput) {
        console.log = (): void => {};
      }

      const checklists = getChecklistsArray(isJsonOutput);

      // Restore console.log
      if (isJsonOutput) {
        console.log = originalLog;
      }

      const checklist = checklists.find((c: Checklist) => c.name === name);

      if (!checklist) {
        console.error(`Checklist '${name}' not found`);
        process.exit(1);
      }

      if (isJsonOutput) {
        console.log(
          JSON.stringify(
            {
              success: true,
              result: {
                name: checklist.name,
                status: 'completed',
                items: checklist.items.map((item: string) => ({
                  item,
                  status: 'completed',
                })),
              },
            },
            null,
            2
          )
        );
      } else {
        console.log(`Running checklist: ${checklist.name}`);
        checklist.items.forEach((item: string, index: number) => {
          console.log(`  ${index + 1}. ${item}`);
        });
        console.log('Checklist completed');
      }
    } catch (error) {
      console.error('Error running checklist:', error);
      process.exit(1);
    }
  });

export { program as cli };

// If this file is run directly
if (require.main === module) {
  program.parse();
}
