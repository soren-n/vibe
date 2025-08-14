/**
 * Workflow data structures for vibe CLI
 *
 * This module contains the core interface definitions for workflows and checklists,
 * separated to avoid circular imports between core modules and loader.
 */

/**
 * Represents a complete workflow with triggers, guidance steps, and metadata.
 *
 * A workflow consists of:
 * - name: Unique identifier for the workflow
 * - description: Human-readable description of what the workflow does
 * - triggers: List of patterns that should activate this workflow
 * - steps: List of guidance text/suggestions (may contain commands,
 *   but not limited to commands)
 * - dependencies: Optional list of required tools/packages
 * - projectTypes: Optional list of project types this applies to
 * - conditions: Optional list of conditions that must be met
 *
 * Note: Steps are textual guidance, not executable commands. They provide suggestions,
 * reminders, and directions that humans can follow. Commands may be included within
 * the guidance text when appropriate.
 */
export interface Workflow {
  name: string;
  description: string;
  triggers: string[];
  steps: string[];
  dependencies?: string[];
  projectTypes?: string[];
  conditions?: string[];
  category?: string;
}

/**
 * Represents a checklist with validation items and metadata.
 *
 * A checklist consists of:
 * - name: Unique identifier for the checklist
 * - description: Human-readable description of what the checklist validates
 * - triggers: List of patterns that should activate this checklist
 * - items: List of validation items/checks to perform
 * - dependencies: Optional list of required tools/packages
 * - projectTypes: Optional list of project types this applies to
 * - conditions: Optional list of conditions that must be met
 *
 * Note: Items are validation checks, not executable commands. They provide
 * things to verify, validate, or ensure are in place.
 */
export interface Checklist {
  name: string;
  description?: string;
  triggers: string[];
  items: string[];
  dependencies?: string[];
  projectTypes?: string[];
  conditions?: string[];
  checks?: string[]; // Backwards compatibility
}
