import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type {
  LintConfig,
  ProjectTypeConfig,
  SessionConfig,
  WorkflowConfig,
} from './types.js';

/**
 * Configuration file loading and merging utilities
 */

interface LoadedConfig {
  projectType: string;
  workflows: Record<string, WorkflowConfig>;
  projectTypes: Record<string, ProjectTypeConfig>;
  lint: Partial<LintConfig>;
  session: Partial<SessionConfig>;
  projectRoot: string;
}

export async function loadFromFile(configPath?: string): Promise<LoadedConfig> {
  const actualConfigPath = configPath ?? findConfigFile();
  const projectRoot = actualConfigPath ? path.dirname(actualConfigPath) : process.cwd();

  // Initialize with empty config
  const config: LoadedConfig = {
    projectType: 'auto',
    workflows: {},
    projectTypes: {},
    lint: {},
    session: {},
    projectRoot,
  };

  if (actualConfigPath && fs.existsSync(actualConfigPath)) {
    try {
      const data =
        (yaml.load(fs.readFileSync(actualConfigPath, 'utf-8')) as Record<
          string,
          unknown
        >) ?? {};

      // Merge configuration sections
      if (data['projectType'] || data['project_type']) {
        config.projectType = (data['projectType'] ?? data['project_type']) as string;
      }

      if (data['workflows'] && typeof data['workflows'] === 'object') {
        // Merge workflow configs
        for (const [name, workflowConfig] of Object.entries(
          data['workflows'] as Record<string, unknown>
        )) {
          if (typeof workflowConfig === 'object' && workflowConfig !== null) {
            const wfConfig = workflowConfig as Record<string, unknown>;
            const newWorkflowConfig: WorkflowConfig = {
              enabled:
                wfConfig['enabled'] !== undefined
                  ? (wfConfig['enabled'] as boolean)
                  : true,
              priority:
                wfConfig['priority'] !== undefined
                  ? (wfConfig['priority'] as number)
                  : 1,
            };

            if (Array.isArray(wfConfig['triggers'])) {
              newWorkflowConfig.triggers = wfConfig['triggers'] as string[];
            }
            if (wfConfig['description']) {
              newWorkflowConfig.description = wfConfig['description'] as string;
            }
            if (Array.isArray(wfConfig['steps'])) {
              newWorkflowConfig.steps = wfConfig['steps'] as string[];
            }
            if (Array.isArray(wfConfig['commands'])) {
              newWorkflowConfig.commands = wfConfig['commands'] as string[];
            }
            if (Array.isArray(wfConfig['dependencies'])) {
              newWorkflowConfig.dependencies = wfConfig['dependencies'] as string[];
            }

            config.workflows[name] = newWorkflowConfig;
          }
        }
      }

      if (data['projectTypes'] && typeof data['projectTypes'] === 'object') {
        // Merge project type configs
        for (const [name, projectTypeConfig] of Object.entries(
          data['projectTypes'] as Record<string, unknown>
        )) {
          if (typeof projectTypeConfig === 'object' && projectTypeConfig !== null) {
            const ptConfig = projectTypeConfig as Record<string, unknown>;
            config.projectTypes[name] = {
              workflows: Array.isArray(ptConfig['workflows'])
                ? (ptConfig['workflows'] as string[])
                : [],
              tools: Array.isArray(ptConfig['tools'])
                ? (ptConfig['tools'] as string[])
                : [],
            };
          }
        }
      }

      if (data['lint'] && typeof data['lint'] === 'object') {
        const lintData = data['lint'] as Record<string, unknown>;
        const lintConfig: Partial<LintConfig> = {};

        if (lintData['checkEmojis'] !== undefined) {
          lintConfig.checkEmojis = lintData['checkEmojis'] as boolean;
        }
        if (lintData['checkProfessionalLanguage'] !== undefined) {
          lintConfig.checkProfessionalLanguage = lintData[
            'checkProfessionalLanguage'
          ] as boolean;
        }
        if (Array.isArray(lintData['allowInformalLanguage'])) {
          lintConfig.allowInformalLanguage = lintData[
            'allowInformalLanguage'
          ] as string[];
        }
        if (Array.isArray(lintData['excludePatterns'])) {
          lintConfig.excludePatterns = lintData['excludePatterns'] as string[];
        }
        if (
          lintData['namingConventions'] &&
          typeof lintData['namingConventions'] === 'object'
        ) {
          lintConfig.namingConventions = lintData['namingConventions'] as Record<
            string,
            string
          >;
        }
        if (lintData['directoryNaming']) {
          lintConfig.directoryNaming = lintData['directoryNaming'] as string;
        }
        if (lintData['maxStepMessageLength'] !== undefined) {
          lintConfig.maxStepMessageLength = lintData['maxStepMessageLength'] as number;
        }
        if (Array.isArray(lintData['unprofessionalPatterns'])) {
          lintConfig.unprofessionalPatterns = lintData[
            'unprofessionalPatterns'
          ] as string[];
        }

        config.lint = lintConfig;
      }

      if (data['session'] && typeof data['session'] === 'object') {
        const sessionData = data['session'] as Record<string, unknown>;
        const sessionConfig: Partial<SessionConfig> = {};

        if (sessionData['maxSessions'] !== undefined) {
          sessionConfig.maxSessions = sessionData['maxSessions'] as number;
        }
        if (sessionData['sessionTimeout'] !== undefined) {
          sessionConfig.sessionTimeout = sessionData['sessionTimeout'] as number;
        }
        if (sessionData['sessionDir'] !== undefined) {
          sessionConfig.sessionDir = sessionData['sessionDir'] as string;
        }

        config.session = sessionConfig;
      }
    } catch (error) {
      console.warn(`Warning: Error loading config from ${actualConfigPath}: ${error}`);
      console.warn('Using default configuration');
    }
  }

  return config;
}

function findConfigFile(): string | null {
  const currentDir = process.cwd();
  const configNames = ['.vibe.yaml', 'vibe.yaml', '.vibe.yml', 'vibe.yml'];

  // Check current directory and all parent directories
  let dir = currentDir;
  while (true) {
    for (const configName of configNames) {
      const configPath = path.join(dir, configName);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    const parentDir = path.dirname(dir);
    if (parentDir === dir) break; // Reached root
    dir = parentDir;
  }

  return null;
}

export function addGitignorePatterns(
  lintConfig: LintConfig,
  projectRoot: string
): LintConfig {
  const gitignorePatterns = readGitignorePatterns(projectRoot);
  const essentialPatterns = [
    '.git',
    '.git/**',
    '.github',
    '.github/**',
    '.gitignore',
    '.gitattributes',
    '.vscode',
    '.vscode/**',
    'node_modules',
    'node_modules/**',
    '.DS_Store',
    'Thumbs.db',
  ];

  const allPatterns = [...gitignorePatterns, ...essentialPatterns];
  const existingPatterns = new Set(lintConfig.excludePatterns);
  const newPatterns = [...lintConfig.excludePatterns];

  for (const pattern of allPatterns) {
    if (!existingPatterns.has(pattern)) {
      newPatterns.push(pattern);
    }
  }

  return {
    ...lintConfig,
    excludePatterns: newPatterns,
  };
}

function readGitignorePatterns(projectRoot: string): string[] {
  const gitignoreFiles = findGitignoreFiles(projectRoot);
  const allPatterns: string[] = [];

  for (const [gitignorePath, relativeDir] of gitignoreFiles) {
    const patterns = processGitignoreFile(gitignorePath, relativeDir);
    allPatterns.push(...patterns);
  }

  return removeDuplicatePatterns(allPatterns);
}

function findGitignoreFiles(projectRoot: string): [string, string][] {
  const gitignoreFiles: [string, string][] = [];

  try {
    // Add root .gitignore
    const rootGitignore = path.join(projectRoot, '.gitignore');
    if (fs.existsSync(rootGitignore)) {
      gitignoreFiles.push([rootGitignore, '']);
    }

    // Find subdirectory .gitignore files
    findGitignoreFilesRecursive(projectRoot, projectRoot, gitignoreFiles);
  } catch (error) {
    console.warn(`Warning: Error finding gitignore files: ${error}`);
  }

  return gitignoreFiles;
}

function findGitignoreFilesRecursive(
  currentDir: string,
  projectRoot: string,
  gitignoreFiles: [string, string][]
): void {
  try {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (shouldIncludeDirectory(entry.name)) {
          findGitignoreFilesRecursive(fullPath, projectRoot, gitignoreFiles);
        }
      } else if (entry.name === '.gitignore') {
        if (fullPath !== path.join(projectRoot, '.gitignore')) {
          const relativeDir = path.relative(projectRoot, currentDir);
          gitignoreFiles.push([fullPath, relativeDir]);
        }
      }
    }
  } catch (_error) {
    // Skip unreadable directories
  }
}

function shouldIncludeDirectory(dirName: string): boolean {
  const skipDirs = new Set([
    'node_modules',
    'dist',
    'build',
    '.vscode',
    '.git',
    '.github',
    '.cache',
    '.next',
    '.nuxt',
    'coverage',
    '.nyc_output',
    '.vite',
    '.turbo',
    '.vercel',
    '.netlify',
    'target',
    'out',
    'tmp',
    'temp',
  ]);

  return !skipDirs.has(dirName);
}

function processGitignoreFile(gitignorePath: string, relativeDir: string): string[] {
  const patterns: string[] = [];

  try {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (shouldSkipLine(trimmedLine)) {
        continue;
      }

      const pattern = normalizePattern(trimmedLine, relativeDir);
      patterns.push(...expandPattern(pattern));
    }
  } catch (_error) {
    // Skip unreadable gitignore files
  }

  return patterns;
}

function shouldSkipLine(line: string): boolean {
  if (!line || line.startsWith('#')) {
    return true;
  }

  return ['*', '**', '*/**'].includes(line);
}

function normalizePattern(line: string, relativeDir: string): string {
  if (relativeDir) {
    if (line.startsWith('/')) {
      return `${relativeDir}/${line.slice(1)}`;
    } else {
      return `${relativeDir}/${line}`;
    }
  } else {
    return line.startsWith('/') ? line.slice(1) : line;
  }
}

function expandPattern(pattern: string): string[] {
  const patterns = [pattern];

  if (!pattern.includes('*')) {
    if (pattern.endsWith('/')) {
      // For directory patterns like "dir/", add both "dir" and "dir/**"
      const basePattern = pattern.slice(0, -1);
      patterns.push(basePattern, `${basePattern}/**`);
    } else {
      // For file patterns like "file", add "file/**"
      patterns.push(`${pattern}/**`);
    }
  }

  return patterns;
}

function removeDuplicatePatterns(patterns: string[]): string[] {
  return Array.from(new Set(patterns));
}
