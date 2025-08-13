/**
 * Guidance loading functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { Checklist, Workflow } from './models';

// Cache management
let checklistCache: Record<string, Checklist> | null = null;
let workflowCache: Record<string, Workflow> | null = null;
let fileTimestamps: Record<string, number> = {};
let cacheLoaded = false;

// Hot reloading (simplified for TypeScript - no file watching for now)
const reloadCallbacks: (() => void)[] = [];

interface LoaderOptions {
  enableValidation?: boolean;
  quiet?: boolean;
}

/**
 * Enhanced workflow loader with caching, validation, and hot reloading capabilities
 */
export class WorkflowLoader {
  private dataDir: string;
  private workflowsDir: string;
  private checklistsDir: string;
  private enableValidation: boolean;
  private quiet: boolean;

  constructor(options: LoaderOptions = {}) {
    this.dataDir = this.getDataPath();
    this.workflowsDir = path.join(this.dataDir, 'workflows');
    this.checklistsDir = path.join(this.dataDir, 'checklists');
    this.enableValidation = options.enableValidation ?? true;
    this.quiet = options.quiet ?? false;
  }

  private getDataPath(): string {
    // Try to find data directory in various locations
    const possiblePaths = [
      // When running from TypeScript source (development)
      path.join(__dirname, '../../data'),
      // When running from compiled JS in dist/src/guidance/ -> dist/data/
      path.join(__dirname, '../../data'),
      // When running from compiled JS in dist/src/ -> dist/data/
      path.join(__dirname, '../data'),
      // When running from different build structures
      path.join(__dirname, 'data'),
      // When data is in current working directory
      path.join(process.cwd(), 'data'),
      // Legacy Python structure
      path.join(process.cwd(), 'vibe/data'),
    ];

    for (const dataPath of possiblePaths) {
      if (fs.existsSync(dataPath)) {
        if (!this.quiet) {
          // Only log in development/debug mode - exclude compiled dist builds
          const isDev = __dirname.includes('/src/') && !__dirname.includes('/dist/');
          if (isDev) {
            console.log(`[Workflows] Using data directory: ${dataPath}`);
          }
        }
        return dataPath;
      }
    }

    // Provide more helpful error message
    const tried = possiblePaths.map(p => `  - ${p}`).join('\n');
    throw new Error(
      `Could not find data directory with YAML files. Tried:\n${tried}\n\nCurrent __dirname: ${__dirname}\nCurrent process.cwd(): ${process.cwd()}`
    );
  }

  private getFileTimestamp(filePath: string): number {
    try {
      return fs.statSync(filePath).mtime.getTime();
    } catch {
      return 0;
    }
  }

  private isCacheValid(): boolean {
    if (!cacheLoaded) {
      return false;
    }

    // Check if any workflow or checklist files have been modified, added, or removed
    const currentWorkflowFiles = this.getYamlFiles(this.workflowsDir);
    const currentChecklistFiles = this.getYamlFiles(this.checklistsDir);
    const currentFiles = [...currentWorkflowFiles, ...currentChecklistFiles];
    const cachedFiles = Object.keys(fileTimestamps);

    // If file set changed, cache is invalid
    if (
      currentFiles.length !== cachedFiles.length ||
      !currentFiles.every(file => cachedFiles.includes(file))
    ) {
      return false;
    }

    // Check if any existing files have been modified
    for (const filePath of currentFiles) {
      const currentTimestamp = this.getFileTimestamp(filePath);
      const cachedTimestamp = fileTimestamps[filePath] ?? 0;
      if (currentTimestamp > cachedTimestamp) {
        return false;
      }
    }

    return true;
  }

  private getYamlFiles(dirPath: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dirPath)) {
      return files;
    }

    const walkDir = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
          files.push(fullPath);
        }
      }
    };

    walkDir(dirPath);
    return files;
  }

  /**
   * Load all workflows from YAML files with dynamic discovery
   */
  loadWorkflows(forceReload = false): Record<string, Workflow> {
    if (!forceReload && this.isCacheValid() && workflowCache) {
      return workflowCache;
    }

    return this.reloadWorkflows();
  }

  /**
   * Load all checklists from YAML files with dynamic discovery
   */
  loadChecklists(forceReload = false): Record<string, Checklist> {
    if (!forceReload && this.isCacheValid() && checklistCache) {
      return checklistCache;
    }

    return this.reloadChecklists();
  }

  private reloadWorkflows(): Record<string, Workflow> {
    const workflows: Record<string, Workflow> = {};
    const timestamps: Record<string, number> = {};

    if (!fs.existsSync(this.workflowsDir)) {
      if (!this.quiet) {
        console.warn(`Workflows directory not found: ${this.workflowsDir}`);
      }
      workflowCache = workflows;
      return workflows;
    }

    const yamlFiles = this.getYamlFiles(this.workflowsDir);

    for (const yamlFile of yamlFiles) {
      const { workflow, timestamp } = this.loadSingleWorkflow(yamlFile);
      if (workflow) {
        workflows[workflow.name] = workflow;
        timestamps[yamlFile] = timestamp;
      }
    }

    // Update caches
    workflowCache = workflows;
    Object.assign(fileTimestamps, timestamps);
    cacheLoaded = true;

    if (!this.quiet) {
      console.log(
        `[Workflows] Loaded ${Object.keys(workflows).length} workflows from YAML files`
      );
    }

    return workflows;
  }

  private reloadChecklists(): Record<string, Checklist> {
    const checklists: Record<string, Checklist> = {};
    const timestamps: Record<string, number> = {};

    if (!fs.existsSync(this.checklistsDir)) {
      if (!this.quiet) {
        console.warn(`Checklists directory not found: ${this.checklistsDir}`);
      }
      checklistCache = checklists;
      return checklists;
    }

    const yamlFiles = this.getYamlFiles(this.checklistsDir);

    for (const yamlFile of yamlFiles) {
      const { checklist, timestamp } = this.loadSingleChecklist(yamlFile);
      if (checklist) {
        checklists[checklist.name] = checklist;
        timestamps[yamlFile] = timestamp;
      }
    }

    // Update caches
    checklistCache = checklists;
    Object.assign(fileTimestamps, timestamps);
    cacheLoaded = true;

    if (!this.quiet) {
      console.log(
        `[Workflows] Loaded ${Object.keys(checklists).length} checklists from YAML files`
      );
    }

    return checklists;
  }

  private loadSingleWorkflow(yamlFile: string): {
    workflow: Workflow | null;
    timestamp: number;
  } {
    try {
      const workflow = this.loadWorkflowFromYaml(yamlFile);
      const timestamp = workflow ? this.getFileTimestamp(yamlFile) : 0;
      return { workflow, timestamp };
    } catch (error) {
      if (!this.quiet) {
        console.warn(`Warning: Failed to load workflow from ${yamlFile}: ${error}`);
      }
      return { workflow: null, timestamp: 0 };
    }
  }

  private loadSingleChecklist(yamlFile: string): {
    checklist: Checklist | null;
    timestamp: number;
  } {
    try {
      const checklist = this.loadChecklistFromYaml(yamlFile);
      const timestamp = checklist ? this.getFileTimestamp(yamlFile) : 0;
      return { checklist, timestamp };
    } catch (error) {
      if (!this.quiet) {
        console.warn(`Warning: Failed to load checklist from ${yamlFile}: ${error}`);
      }
      return { checklist: null, timestamp: 0 };
    }
  }

  private loadWorkflowFromYaml(yamlFile: string): Workflow | null {
    const content = fs.readFileSync(yamlFile, 'utf-8');
    const data = yaml.load(content) as Record<string, unknown>;

    if (!data) {
      return null;
    }

    // Basic validation
    if (this.enableValidation) {
      if (!data['name'] || !data['description']) {
        if (!this.quiet) {
          console.warn(
            `Warning: Invalid workflow format in ${yamlFile}: missing name or description`
          );
        }
        return null;
      }
    }

    // Convert YAML data to Workflow instance with proper defaults
    const workflow: Workflow = {
      name: data['name'] as string,
      description: data['description'] as string,
      triggers: (data['triggers'] ?? []) as string[],
      steps: (data['steps'] ?? []) as string[],
      dependencies: (data['dependencies'] ?? []) as string[],
      projectTypes: (data['project_types'] ?? data['projectTypes'] ?? []) as string[],
      conditions: (data['conditions'] ?? []) as string[],
    };

    if (data['category']) {
      workflow.category = data['category'] as string;
    }

    return workflow;
  }

  private loadChecklistFromYaml(yamlFile: string): Checklist | null {
    const content = fs.readFileSync(yamlFile, 'utf-8');
    const data = yaml.load(content) as Record<string, unknown>;

    if (!data) {
      return null;
    }

    // Basic validation
    if (this.enableValidation) {
      if (!data['name']) {
        if (!this.quiet) {
          console.warn(
            `Warning: Invalid checklist format in ${yamlFile}: missing name`
          );
        }
        return null;
      }
    }

    const checklist: Checklist = {
      name: data['name'] as string,
      description: data['description'] as string,
      triggers: (data['triggers'] ?? []) as string[],
      items: (data['items'] ?? []) as string[],
      dependencies: (data['dependencies'] ?? []) as string[],
      projectTypes: (data['project_types'] ?? data['projectTypes'] ?? []) as string[],
      conditions: (data['conditions'] ?? []) as string[],
      checks: data['checks'] as string[], // Backwards compatibility
    };

    return checklist;
  }

  /**
   * Add callback for hot reloading
   */
  addReloadCallback(callback: () => void): void {
    reloadCallbacks.push(callback);
  }

  /**
   * Trigger reload and call all callbacks
   */
  triggerReload(): void {
    this.reloadWorkflows();
    this.reloadChecklists();

    for (const callback of reloadCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('Error in reload callback:', error);
      }
    }
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    workflowCache = null;
    checklistCache = null;
    fileTimestamps = {};
    cacheLoaded = false;
  }
}

// Global singleton instance for backwards compatibility
const defaultLoader = new WorkflowLoader();

// Legacy functions for backwards compatibility
export function getChecklists(quiet = false): Record<string, Checklist> {
  if (quiet) {
    const loader = new WorkflowLoader({ quiet: true });
    return loader.loadChecklists();
  }
  return defaultLoader.loadChecklists();
}

export function getWorkflows(quiet = false): Record<string, Workflow> {
  if (quiet) {
    const loader = new WorkflowLoader({ quiet: true });
    return loader.loadWorkflows();
  }
  return defaultLoader.loadWorkflows();
}

export function getChecklist(name: string): Checklist | null {
  const checklists = getChecklists();
  return checklists[name] ?? null;
}

export function getWorkflow(name: string): Workflow | null {
  const workflows = getWorkflows();
  return workflows[name] ?? null;
}

export function getChecklistsArray(quiet = false): Checklist[] {
  const checklists = getChecklists(quiet);
  return Object.values(checklists).sort((a, b) => a.name.localeCompare(b.name));
}

export function getWorkflowsArray(quiet = false): Workflow[] {
  const workflows = getWorkflows(quiet);
  return Object.values(workflows).sort((a, b) => a.name.localeCompare(b.name));
}

export function clearChecklistCache(): void {
  defaultLoader.clearCaches();
}

export function clearWorkflowCache(): void {
  defaultLoader.clearCaches();
}

export function clearAllCaches(): void {
  defaultLoader.clearCaches();
}
