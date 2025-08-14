#!/usr/bin/env node
/**
 * Modular CLI interface for Vibe
 */

import { Command } from 'commander';
import {
  getVersion,
  handleCheck,
  handleChecklistList,
  handleChecklistRun,
  handleChecklistShow,
  handleConfigInfo,
  handleConfigShow,
  handleGuide,
  handleInit,
  handleLintRun,
  handleMCPBack,
  handleMCPBreak,
  handleMCPList,
  handleMCPNext,
  handleMCPRestart,
  handleMCPStart,
  handleMCPStatus,
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
  .description('Run a workflow')
  .argument('<workflow>', 'Name of the workflow to run')
  .option('--interactive', 'Run in interactive mode')
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

// Checklists subcommand
const checklistsCmd = program
  .command('checklists')
  .description('Operations for checklist management');

checklistsCmd
  .command('list')
  .description('List all available checklists')
  .option('--category <category>', 'Filter by category')
  .option('--project-type <type>', 'Filter by project type')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .action(withErrorHandling(handleChecklistList));

checklistsCmd
  .command('show')
  .description('Show checklist details')
  .argument('<name>', 'Checklist name')
  .option('--format <format>', 'Output format (json, yaml)', 'json')
  .action(withErrorHandling(handleChecklistShow));

checklistsCmd
  .command('run')
  .description('Run a checklist interactively')
  .argument('<name>', 'Checklist name')
  .option('--format <format>', 'Output format (json, text)', 'text')
  .action(withErrorHandling(handleChecklistRun));

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

// MCP subcommand
const mcpCmd = program
  .command('mcp')
  .description('Model Context Protocol server operations');

mcpCmd
  .command('start')
  .description('Start an interactive workflow session')
  .argument('<prompt>', 'Initial prompt to start the session')
  .option('--timeout <ms>', 'Session timeout in milliseconds', '3600000')
  .action(withErrorHandling(handleMCPStart));

mcpCmd
  .command('status')
  .description('Get status of a workflow session')
  .argument('<sessionId>', 'Session ID to check')
  .action(withErrorHandling(handleMCPStatus));

mcpCmd
  .command('next')
  .description('Get next step in workflow session')
  .argument('<sessionId>', 'Session ID')
  .action(withErrorHandling(handleMCPNext));

mcpCmd
  .command('back')
  .description('Go back to previous step in workflow session')
  .argument('<sessionId>', 'Session ID')
  .action(withErrorHandling(handleMCPBack));

mcpCmd
  .command('break')
  .description('Break/pause current workflow session')
  .argument('<sessionId>', 'Session ID')
  .action(withErrorHandling(handleMCPBreak));

mcpCmd
  .command('restart')
  .description('Restart workflow session from beginning')
  .argument('<sessionId>', 'Session ID')
  .action(withErrorHandling(handleMCPRestart));

mcpCmd
  .command('list')
  .description('List all active workflow sessions')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .action(withErrorHandling(handleMCPList));

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
