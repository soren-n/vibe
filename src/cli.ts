#!/usr/bin/env node
/**
 * Modular CLI interface for Vibe
 */

import { Command } from 'commander';
import {
  getVersion,
  handleCheck,
  handleConfigInfo,
  handleConfigShow,
  handleGuide,
  handleInit,
  handleLintRun,
  handlePlanAdd,
  handlePlanClear,
  handlePlanComplete,
  handlePlanExpand,
  handlePlanStatus,
  handleRun,
  handleValidate,
  handleWorkflowList,
  handleWorkflowShow,
  handleWorkflowValidate,
  withErrorHandling,
} from './cli/index.js';

const program = new Command();

program
  .name('vibe')
  .description(
    'Vibe - A CLI tool for vibe coding with intelligent workflow orchestration'
  )
  .version(getVersion());

// Core commands
program
  .command('init')
  .description('Initialize vibe configuration for a project')
  .option(
    '--project-type <type>',
    'Specify project type (typescript, javascript, python, rust, etc.)'
  )
  .action(withErrorHandling(handleInit));

program
  .command('run')
  .description(
    'Show workflow guidance (execution removed - workflows are now guidance-only)'
  )
  .argument('<workflow>', 'Name of the workflow to show guidance for')
  .option('--interactive', 'Display in interactive format')
  .option('--timeout <ms>', 'Timeout in milliseconds', '300000')
  .action(withErrorHandling(handleRun));

program
  .command('check')
  .description('Check environment and configuration')
  .option('--json', 'Output results in JSON format for MCP')
  .action(withErrorHandling(handleCheck));

program
  .command('config-info')
  .description('Display current configuration information')
  .action(withErrorHandling(handleConfigInfo));

program
  .command('validate')
  .description('Validate workflows and configuration')
  .action(withErrorHandling(handleValidate));

// Workflows subcommand
const workflowsCmd = program
  .command('workflows')
  .description('Operations for YAML-defined workflows (validate/format)');

workflowsCmd
  .command('validate')
  .description('Validate all YAML workflow files for schema and quality')
  .option('--json', 'Output results in JSON format')
  .action(withErrorHandling(handleWorkflowValidate));

workflowsCmd
  .command('list')
  .description('List all available workflows')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .action(withErrorHandling(handleWorkflowList));

workflowsCmd
  .command('show')
  .description('Show details of a specific workflow')
  .argument('<name>', 'Workflow name')
  .option('--format <format>', 'Output format (yaml, json)', 'yaml')
  .action(withErrorHandling(handleWorkflowShow));

// Plan subcommand
const planCmd = program.command('plan').description('Operations for plan management');

planCmd
  .command('status')
  .description('Show current plan status')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .action(withErrorHandling(handlePlanStatus));

planCmd
  .command('add')
  .description('Add an item to the plan')
  .argument('<text>', 'Item text')
  .option('--parent <parentId>', 'Parent item ID for sub-tasks')
  .option('--format <format>', 'Output format (json, text)', 'text')
  .action(withErrorHandling(handlePlanAdd));

planCmd
  .command('complete')
  .description('Mark a plan item as complete')
  .argument('<itemId>', 'Item ID to complete')
  .option('--format <format>', 'Output format (json, text)', 'text')
  .action(withErrorHandling(handlePlanComplete));

planCmd
  .command('expand')
  .description('Expand a plan item with sub-tasks')
  .argument('<itemId>', 'Item ID to expand')
  .argument('<subTasks...>', 'Sub-task texts')
  .option('--format <format>', 'Output format (json, text)', 'text')
  .action(withErrorHandling(handlePlanExpand));

planCmd
  .command('clear')
  .description('Clear the entire plan')
  .option('--format <format>', 'Output format (json, text)', 'text')
  .action(withErrorHandling(handlePlanClear));

// Lint subcommand
const lintCmd = program.command('lint').description('Project linting commands');

lintCmd
  .command('run')
  .description('Run linter on project files')
  .option('--fix', 'Automatically fix issues where possible')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .action(withErrorHandling(handleLintRun));

lintCmd
  .command('text')
  .description('Lint text content directly')
  .argument('<text>', 'Text content to lint')
  .option('--context <context>', 'Context for linting (code, documentation, etc.)')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .action(withErrorHandling(handleLintRun));

lintCmd
  .command('project')
  .description('Lint entire project structure')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .action(withErrorHandling(handleLintRun));

// Generic commands
program
  .command('guide')
  .description('Get guidance on what to do next')
  .argument('[query]', 'Optional query for specific guidance')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(withErrorHandling(handleGuide));

program
  .command('config')
  .description('Configuration management')
  .action(withErrorHandling(handleConfigShow));

// Add list-workflows as a top-level command for backward compatibility
program
  .command('list-workflows')
  .description('List all available workflows')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .action(withErrorHandling(handleWorkflowList));

// Parse arguments and run
program.parse();
