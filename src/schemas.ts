/**
 * Zod schemas for runtime validation and type safety
 * Replaces manual type checking and provides strong typing
 */

import { z } from 'zod';

// Core ID types with proper validation
export const sessionIdSchema = z.string().min(8).max(20).regex(/^[a-z0-9]+$/);
export type SessionId = z.infer<typeof sessionIdSchema>;

// Workflow step can be simple string or structured object
export const workflowStepObjectSchema = z.object({
  stepText: z.string(),
  command: z.string().optional(),
  workingDir: z.string().optional(),
});

export const workflowStepSchema = z.union([
  z.string(),
  workflowStepObjectSchema,
]);

// Enhanced Workflow schema with proper validation
export const workflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  triggers: z.array(z.string()),
  steps: z.array(workflowStepSchema),
  dependencies: z.array(z.string()).optional(),
  projectTypes: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  category: z.string().optional(),
});

// Session configuration with validation
export const sessionConfigSchema = z.object({
  interactive: z.boolean().optional(),
  maxSessions: z.number().int().positive().optional(),
  sessionTimeout: z.number().int().positive().optional(),
  enableLogging: z.boolean().optional(),
});

// Vibe configuration with comprehensive validation
export const vibeConfigSchema = z.object({
  projectType: z.string().optional(),
  workflows: z.record(z.string(), z.unknown()).optional(),
  workflowOverrides: z.record(z.string(), z.unknown()).optional(),
  checklistOverrides: z.record(z.string(), z.unknown()).optional(),
  preferences: sessionConfigSchema.optional(),
});

// Workflow step with proper typing
export const workflowStepDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  message: z.string(),
  description: z.string().optional(),
  command: z.string().optional(),
  script: z.string().optional(),
  completed: z.boolean(),
  order: z.number().int().nonnegative(),
});

// Checklist schema with validation
export const checklistSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  triggers: z.array(z.string()),
  items: z.array(z.string()),
  dependencies: z.array(z.string()).optional(),
  projectTypes: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  category: z.string().optional(),
});

// Execution plan schemas
export const executionPlanStepSchema = z.object({
  type: z.enum(['workflow', 'checklist']),
  name: z.string(),
  title: z.string(),
  description: z.string(),
  steps: z.array(z.string()),
  reasoning: z.string(),
});

export const workflowPlanResultSchema = z.object({
  success: z.boolean(),
  workflows: z.array(z.string()),
  checklists: z.array(z.string()).optional(),
  executionPlan: z.array(executionPlanStepSchema),
  guidance: z.string(),
  errors: z.array(z.string()).optional(),
});

// Infer types from schemas for type safety
export type WorkflowStepObject = z.infer<typeof workflowStepObjectSchema>;
export type WorkflowStep = z.infer<typeof workflowStepSchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type SessionConfig = z.infer<typeof sessionConfigSchema>;
export type VibeConfig = z.infer<typeof vibeConfigSchema>;
export type WorkflowStepDetail = z.infer<typeof workflowStepDetailSchema>;
export type Checklist = z.infer<typeof checklistSchema>;
export type ExecutionPlanStep = z.infer<typeof executionPlanStepSchema>;
export type WorkflowPlanResult = z.infer<typeof workflowPlanResultSchema>;
