/**
 * Prompt analysis engine for determining appropriate workflows and checklists
 * TypeScript translation of vibe/analyzer.py
 */

import type { VibeConfigImpl } from './config';
import { loadAllChecklists, loadAllWorkflows } from './workflows';
import type { Checklist, Workflow } from './models';

export class PromptAnalyzer {
  private config: VibeConfigImpl;
  private allWorkflows: Record<string, Workflow>;
  private allChecklists: Record<string, Checklist>;

  constructor(config: VibeConfigImpl) {
    this.config = config;
    this.allWorkflows = this.loadWorkflows();
    this.allChecklists = this.loadChecklists();
  }

  private loadWorkflows(): Record<string, Workflow> {
    try {
      // Load from YAML files using the workflow loader
      return loadAllWorkflows();
    } catch (error) {
      console.error('Error loading workflows:', error);
      return {};
    }
  }

  private loadChecklists(): Record<string, Checklist> {
    try {
      return loadAllChecklists();
    } catch (error) {
      console.error('Error loading checklists:', error);
      return {};
    }
  }

  /**
   * Analyze a prompt and return matching workflow names
   */
  async analyze(prompt: string, _showAnalysis: boolean = false): Promise<string[]> {
    const promptLower = prompt.toLowerCase();

    // First try built-in workflows (loaded from YAML files)
    const builtInWorkflows = await this.matchBuiltInWorkflows(promptLower);

    // Match workflows from config
    const configWorkflows = await this.matchConfigWorkflows(promptLower);

    // Match checklists
    const matchingChecklists = await this.matchChecklists(promptLower);

    // Combine results
    const allItems = [...builtInWorkflows, ...configWorkflows, ...matchingChecklists];

    // Debug display
    if (process.env['VIBE_DEBUG'] === 'true') {
      this.displayAnalysis(
        prompt,
        allItems,
        builtInWorkflows,
        configWorkflows,
        matchingChecklists
      );
    }

    return allItems;
  }

  /**
   * Match prompt against built-in workflows from YAML files and workflow registry
   */
  private async matchBuiltInWorkflows(prompt: string): Promise<string[]> {
    const matchedWorkflows: string[] = [];

    for (const [workflowName, workflow] of Object.entries(this.allWorkflows)) {
      if (this.matchesTriggers(prompt, workflow.triggers || [])) {
        // Check if workflow applies to current project type
        const projectType = await this.config.detectProjectType();
        if (
          !workflow.projectTypes ||
          workflow.projectTypes.length === 0 ||
          workflow.projectTypes.includes('generic') ||
          workflow.projectTypes.includes(projectType)
        ) {
          matchedWorkflows.push(workflowName);
        }
      }
    }

    return matchedWorkflows;
  }

  /**
   * Match prompt against config-defined workflows
   */
  private async matchConfigWorkflows(prompt: string): Promise<string[]> {
    const promptLower = prompt.toLowerCase();
    const matchedWorkflows = new Set<string>();

    // Get project-specific workflows first
    const projectType = await this.config.detectProjectType();
    const projectConfig = this.config.projectTypes?.[projectType];

    // Check project-specific workflows
    if (projectConfig?.workflows) {
      for (const workflowName of projectConfig.workflows) {
        // Check if the workflow name or related keywords match the prompt
        if (this.basicKeywordMatch(promptLower, workflowName)) {
          matchedWorkflows.add(workflowName);
        }
      }
    }

    // Check global workflow configurations
    if (this.config.workflows) {
      for (const [workflowName, workflowConfig] of Object.entries(
        this.config.workflows
      )) {
        if (
          workflowConfig.triggers &&
          this.matchesTriggers(promptLower, workflowConfig.triggers)
        ) {
          matchedWorkflows.add(workflowName);
        } else if (this.basicKeywordMatch(promptLower, workflowName)) {
          matchedWorkflows.add(workflowName);
        }
      }
    }

    // Default to research guidance if no matches found
    if (matchedWorkflows.size === 0) {
      matchedWorkflows.add('Research Guidance for Agents');
    }

    return Array.from(matchedWorkflows);
  }

  /**
   * Match prompt against available checklists
   */
  private async matchChecklists(prompt: string): Promise<string[]> {
    const promptLower = prompt.toLowerCase();
    const matchedChecklists: string[] = [];

    for (const [checklistName, checklist] of Object.entries(this.allChecklists)) {
      if (this.matchesTriggers(promptLower, checklist.triggers || [])) {
        // Check if the checklist applies to current project type
        const projectType = await this.config.detectProjectType();
        if (
          !checklist.projectTypes ||
          checklist.projectTypes.length === 0 ||
          checklist.projectTypes.includes(projectType) ||
          checklist.projectTypes.includes('generic')
        ) {
          matchedChecklists.push(`checklist:${checklistName}`);
        }
      }
    }

    return matchedChecklists;
  }

  /**
   * Match prompt against trigger patterns (supports regex and word boundaries)
   */
  private matchesTriggers(prompt: string, triggers: string[]): boolean {
    for (const trigger of triggers) {
      // Support both simple word matching and regex patterns
      try {
        // Convert trigger to regex with word boundaries
        const pattern = trigger.replace(/\*/g, '\\w*');
        const regex = new RegExp(`\\b${pattern}\\b`, 'i');

        if (regex.test(prompt)) {
          return true;
        }
      } catch (_error) {
        // Fallback to simple substring matching
        if (prompt.toLowerCase().includes(trigger.toLowerCase())) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Basic keyword matching for workflow names
   */
  private basicKeywordMatch(prompt: string, workflowName: string): boolean {
    const workflowKeywords = workflowName.toLowerCase().split(/[_\s-]+/);
    return workflowKeywords.some(
      keyword => keyword.length > 2 && prompt.includes(keyword)
    );
  }

  /**
   * Build item descriptions for workflows and checklists (matching Python version)
   */
  private buildItemDescriptions(
    builtInWorkflows: string[],
    configWorkflows: string[],
    matchingChecklists: string[]
  ): string[] {
    const descriptions: string[] = [];

    // Add built-in workflow descriptions
    for (const workflow of builtInWorkflows) {
      descriptions.push(`  → Built-in workflow: ${workflow}`);
    }

    // Add config workflow descriptions
    for (const workflow of configWorkflows) {
      descriptions.push(`  → Config workflow: ${workflow}`);
    }

    // Add checklist descriptions
    for (const checklist of matchingChecklists) {
      descriptions.push(`  → Checklist: ${checklist}`);
    }

    return descriptions;
  }

  /**
   * Display analysis results (simplified version for MCP server)
   */
  private displayAnalysis(
    prompt: string,
    allItems: string[],
    builtInWorkflows: string[],
    configWorkflows: string[],
    matchingChecklists: string[]
  ): void {
    // Show sections of the analysis
    this.displayPromptPanel(prompt);
    this.displayWorkflowResults(
      allItems,
      builtInWorkflows,
      configWorkflows,
      matchingChecklists
    );
  }

  /**
   * Display the prompt being analyzed
   */
  private displayPromptPanel(prompt: string): void {
    if (process.env['VIBE_DEBUG'] === 'true') {
      console.log('\n=== Analyzing Prompt ===');
      console.log(`"${prompt}"`);
      console.log('========================');
    }
  }

  /**
   * Display detected workflows and checklists
   */
  private displayWorkflowResults(
    allItems: string[],
    builtInWorkflows: string[],
    configWorkflows: string[],
    matchingChecklists: string[]
  ): void {
    if (allItems.length > 0) {
      const itemDescriptions = this.buildItemDescriptions(
        builtInWorkflows,
        configWorkflows,
        matchingChecklists
      );
      this.displayDetectedItemsPanel(itemDescriptions);
    } else {
      this.displayNoDetectionPanel();
    }
  }

  /**
   * Display panel with detected workflows and checklists
   */
  private displayDetectedItemsPanel(itemDescriptions: string[]): void {
    if (process.env['VIBE_DEBUG'] === 'true') {
      console.log('\n=== Detected Workflow and Checklist Needs ===');
      itemDescriptions.forEach(desc => console.log(desc));
      console.log('==============================================');
    }
  }

  /**
   * Display panel when no workflows are detected
   */
  private displayNoDetectionPanel(): void {
    if (process.env['VIBE_DEBUG'] === 'true') {
      console.log('\n=== No Specific Workflows or Checklists Detected ===');
      console.log('  → Defaulting to analysis workflow');
      console.log('====================================================');
    }
  }
}
