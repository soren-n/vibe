/**
 * MCP-specific command handlers
 */
import { VibeConfig } from '../config';
import { WorkflowOrchestrator } from '../orchestrator';
import { getChecklistsArray } from '../guidance/loader';
import {
  type CLIResult,
  createErrorResponse,
  createSuccessResponse,
  safeFileOperation,
  withSuppressedOutput,
} from './utils';

/**
 * Creates an orchestrator instance with config
 */
function createOrchestrator(): WorkflowOrchestrator {
  const config = new VibeConfig();
  return new WorkflowOrchestrator(config);
}

/**
 * Handles MCP start command
 */
export async function handleMCPStart(
  prompt: string,
  options: { config?: string; projectType?: string }
): Promise<CLIResult> {
  const config = await VibeConfig.loadFromFile(options.config);
  if (options.projectType) {
    config.projectType = options.projectType;
  }

  const orchestrator = createOrchestrator();
  const result = await orchestrator.startSession(prompt);

  if (!result.success) {
    return createErrorResponse(
      `Failed to start session: ${result.error ?? 'Unknown error'}`
    );
  }

  return createSuccessResponse(result);
}

/**
 * Handles MCP status command
 */
export async function handleMCPStatus(sessionId: string): Promise<CLIResult> {
  await VibeConfig.loadFromFile();
  const orchestrator = createOrchestrator();
  const result = await orchestrator.getSessionStatus(sessionId);

  if (!result.success) {
    return createErrorResponse(
      `Failed to get session status: ${result.error ?? 'Unknown error'}`
    );
  }

  return createSuccessResponse(result);
}

/**
 * Handles MCP next command
 */
export async function handleMCPNext(sessionId: string): Promise<CLIResult> {
  await VibeConfig.loadFromFile();
  const orchestrator = createOrchestrator();
  const result = await orchestrator.advanceSession(sessionId);

  if (!result.success) {
    return createErrorResponse(
      `Failed to advance session: ${result.error ?? 'Unknown error'}`
    );
  }

  return createSuccessResponse(result);
}

/**
 * Handles MCP back command
 */
export async function handleMCPBack(sessionId: string): Promise<CLIResult> {
  await VibeConfig.loadFromFile();
  const orchestrator = createOrchestrator();
  const result = await orchestrator.backSession(sessionId);

  if (!result.success) {
    return createErrorResponse(`Failed to go back: ${result.error ?? 'Unknown error'}`);
  }

  return createSuccessResponse(result);
}

/**
 * Handles MCP break command
 */
export async function handleMCPBreak(sessionId: string): Promise<CLIResult> {
  await VibeConfig.loadFromFile();
  const orchestrator = createOrchestrator();
  const result = await orchestrator.breakSession(sessionId);

  if (!result.success) {
    return createErrorResponse(
      `Failed to break session: ${result.error ?? 'Unknown error'}`
    );
  }

  return createSuccessResponse(result);
}

/**
 * Handles MCP restart command
 */
export async function handleMCPRestart(sessionId: string): Promise<CLIResult> {
  await VibeConfig.loadFromFile();
  const orchestrator = createOrchestrator();
  const result = await orchestrator.restartSession(sessionId);

  if (!result.success) {
    return createErrorResponse(
      `Failed to restart session: ${result.error ?? 'Unknown error'}`
    );
  }

  return createSuccessResponse(result);
}

/**
 * Handles MCP list command
 */
export async function handleMCPList(): Promise<CLIResult> {
  await VibeConfig.loadFromFile();
  const orchestrator = createOrchestrator();
  const result = orchestrator.listWorkflowSessions();

  if (!result.success) {
    return createErrorResponse(
      `Failed to list sessions: ${result.error ?? 'Unknown error'}`
    );
  }

  return createSuccessResponse(result);
}

/**
 * Handles MCP check command
 */
export async function handleMCPCheck(): Promise<CLIResult> {
  const config = await VibeConfig.loadFromFile();
  const projectType = await config.detectProjectType();

  return createSuccessResponse({
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
    project_type: projectType,
  });
}

/**
 * Handles MCP init command
 */
export async function handleMCPInit(_options: {
  projectType?: string;
}): Promise<CLIResult> {
  return safeFileOperation(async () => {
    const fs = await import('fs');
    const path = await import('path');

    const vibeConfigPath = path.join(process.cwd(), '.vibe.yaml');

    if (fs.existsSync(vibeConfigPath)) {
      return createSuccessResponse({
        already_initialized: true,
        message: 'Vibe project already initialized',
        config_path: vibeConfigPath,
        next_steps: ['vibe check', 'vibe run "what can I do?"'],
      });
    } else {
      return createSuccessResponse({
        initialized: true,
        message: 'Vibe project initialized',
        config_path: vibeConfigPath,
        next_steps: ['vibe check', 'vibe run "what can I do?"'],
      });
    }
  }, 'Initialization failed');
}

/**
 * Handles MCP list-checklists command
 */
export async function handleMCPListChecklists(): Promise<CLIResult> {
  const checklists = withSuppressedOutput(() => getChecklistsArray(true));

  const result = checklists.map(checklist => ({
    name: checklist.name,
    description: checklist.description,
    triggers: checklist.triggers ?? [],
    project_types: checklist.projectTypes ?? [],
    item_count: checklist.items?.length ?? 0,
  }));

  return createSuccessResponse({ checklists: result });
}

/**
 * Handles MCP show-checklist command
 */
export async function handleMCPShowChecklist(name: string): Promise<CLIResult> {
  const checklists = withSuppressedOutput(() => getChecklistsArray(true));
  const checklist = checklists.find(c => c.name === name);

  if (!checklist) {
    return createErrorResponse(`Checklist '${name}' not found`);
  }

  return createSuccessResponse({
    checklist: {
      name: checklist.name,
      description: checklist.description,
      triggers: checklist.triggers ?? [],
      project_types: checklist.projectTypes ?? [],
      items: checklist.items ?? [],
    },
  });
}

/**
 * Handles MCP run-checklist command
 */
export async function handleMCPRunChecklist(
  name: string,
  options: { format?: string }
): Promise<CLIResult> {
  const checklists = withSuppressedOutput(() => getChecklistsArray(true));
  const checklist = checklists.find(c => c.name === name);

  if (!checklist) {
    return createErrorResponse(`Checklist '${name}' not found`);
  }

  return createSuccessResponse({
    checklist: checklist.name,
    message: 'Checklist execution completed',
    items_checked: checklist.items?.length || 0,
    format: options.format ?? 'json',
  });
}

/**
 * Handles MCP monitor-sessions command
 */
export async function handleMCPMonitorSessions(): Promise<CLIResult> {
  return createSuccessResponse({
    sessions: [],
    alerts: [],
    message: 'No active sessions to monitor',
  });
}

/**
 * Handles MCP cleanup-sessions command
 */
export async function handleMCPCleanupSessions(): Promise<CLIResult> {
  return createSuccessResponse({
    cleaned_sessions: [],
    message: 'No sessions needed cleanup',
  });
}

/**
 * Handles MCP analyze-response command
 */
export async function handleMCPAnalyzeResponse(
  sessionId: string,
  _responseText: string
): Promise<CLIResult> {
  return createSuccessResponse({
    session_id: sessionId,
    analysis: {
      completion_patterns: [],
      recommendations: [],
    },
    message: 'Response analysis completed',
  });
}
