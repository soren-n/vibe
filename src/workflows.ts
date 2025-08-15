/**
 * Workflow Loading System - TypeScript translation of Python YAML loading
 * Enhanced with proper error handling and fallback mechanisms
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { Workflow } from './models.js';

// YAML data interfaces for type safety
interface WorkflowYamlData {
  name?: string;
  description?: string;
  triggers?: string[];
  steps?: (string | { step_text: string; command?: string; working_dir?: string })[];
  category?: string;
  tags?: string[];
  projectTypes?: string[];
  project_types?: string[];
  priority?: number;
  enabled?: boolean;
  dependencies?: string[];
  conditions?: string[];
  [key: string]: unknown;
}

// Cache for loaded workflows
let workflowCache: Record<string, Workflow> | null = null;

// Simple logging interface
interface Logger {
  warn(message: string, details?: unknown): void;
  error(message: string, details?: unknown): void;
  info(message: string, details?: unknown): void;
}

const logger: Logger = {
  warn: (msg, details) => console.warn(`[Workflows] ${msg}`, details ?? ''),
  error: (msg, details) => console.error(`[Workflows] ${msg}`, details ?? ''),
  info: (msg, details) => console.info(`[Workflows] ${msg}`, details ?? ''),
};

/**
 * Get the data directory path relative to this module
 */
function getDataPath(): string {
  // In production (bundled), data will be copied to the same directory as the bundle
  // In development, look for data directory relative to source
  const moduleDir = path.dirname(new URL(import.meta.url).pathname);
  const possiblePaths = [
    path.join(moduleDir, '../data'), // Development path
    path.join(moduleDir, '../../data'), // Alt development path
    path.join(process.cwd(), 'data'), // Current directory
    path.join(moduleDir, 'data'), // Same directory as bundle
  ];

  for (const dataPath of possiblePaths) {
    if (fs.existsSync(dataPath)) {
      return dataPath;
    }
  }

  throw new Error('Could not find data directory with YAML workflows');
}

/**
 * Load a single YAML workflow file with enhanced error handling
 */
function loadWorkflowFile(
  filePath: string,
  categoryFromPath?: string
): Workflow | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = yaml.load(content) as WorkflowYamlData;

    // Validate required fields
    if (!data.name) {
      logger.warn(`Workflow file missing required 'name' field: ${filePath}`);
      return null;
    }

    // Convert YAML structure to our Workflow interface
    const workflow: Workflow = {
      name: data.name,
      description: data.description ?? '',
      triggers: data.triggers ?? [],
      steps: data.steps ?? [],
      dependencies: data.dependencies ?? [],
      projectTypes: data.project_types ?? data.projectTypes ?? ['generic'],
      conditions: data.conditions ?? [],
      category: data.category ?? categoryFromPath ?? 'misc',
    };

    return workflow;
  } catch (error) {
    logger.error(`Failed to load workflow from ${filePath}`, error);
    return null;
  }
}

/**
 * Recursively load all YAML workflow files from a directory
 */
function loadWorkflowsFromDirectory(
  dirPath: string,
  basePath?: string
): Record<string, Workflow> {
  const workflows: Record<string, Workflow> = {};

  if (!fs.existsSync(dirPath)) {
    return workflows;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Use directory name as category for contained workflows
      const subWorkflows = loadWorkflowsFromDirectory(fullPath, basePath ?? dirPath);
      Object.assign(workflows, subWorkflows);
    } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
      // Determine category from directory structure
      const relativeDir = basePath
        ? path.relative(basePath, path.dirname(fullPath))
        : path.basename(path.dirname(fullPath));
      const categoryFromPath = relativeDir || path.basename(path.dirname(fullPath));

      // Load individual workflow file
      const workflow = loadWorkflowFile(fullPath, categoryFromPath);
      if (workflow) {
        workflows[workflow.name] = workflow;
      }
    }
  }

  return workflows;
}

/**
 * Fallback workflows when YAML loading fails
 */
function getFallbackWorkflows(): Record<string, Workflow> {
  return {
    quality: {
      name: 'quality',
      description: 'Basic quality guidance (fallback)',
      triggers: ['quality', 'check', 'lint'],
      steps: [
        'Run linting tools for your project type',
        'Fix any issues found',
        'Run tests to verify functionality',
      ],
      dependencies: [],
      projectTypes: ['generic'],
      conditions: [],
      category: 'core',
    },
    help: {
      name: 'help',
      description: 'General help guidance (fallback)',
      triggers: ['help', 'guide', 'support'],
      steps: [
        'Identify what you need help with',
        'Check relevant documentation',
        'Ask specific questions about your issue',
      ],
      dependencies: [],
      projectTypes: ['generic'],
      conditions: [],
      category: 'core',
    },
  };
}

/**
 * Load all workflows from YAML files with graceful fallback
 */
export function loadAllWorkflows(): Record<string, Workflow> {
  if (workflowCache) {
    return workflowCache;
  }

  try {
    const dataPath = getDataPath();
    const workflowsPath = path.join(dataPath, 'workflows');

    workflowCache = loadWorkflowsFromDirectory(workflowsPath, workflowsPath);

    if (Object.keys(workflowCache).length === 0) {
      logger.warn('No workflows loaded from YAML files, using fallback workflows');
      workflowCache = getFallbackWorkflows();
    } else {
      logger.info(
        `Loaded ${Object.keys(workflowCache).length} workflows from YAML files`
      );
    }

    return workflowCache;
  } catch (error) {
    logger.error('Error loading workflows, using fallback workflows', error);

    // Graceful fallback to minimal hardcoded workflows
    workflowCache = getFallbackWorkflows();
    return workflowCache;
  }
}
