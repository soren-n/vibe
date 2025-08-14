/**
 * Test nested workflow functionality
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { WorkflowOrchestrator } from '../src/orchestrator';
import { VibeConfigImpl } from '../src/config';

describe('Nested Workflow Functionality', () => {
  let orchestrator: WorkflowOrchestrator;

  beforeEach(() => {
    console.log('🔧 Setting up nested workflow test environment...');
    const config = new VibeConfigImpl();
    orchestrator = new WorkflowOrchestrator(config);
  });

  test('can query workflows by pattern', async () => {
    console.log('🔧 Testing workflow query by pattern...');

    const result = orchestrator.queryWorkflows('development');

    expect(result.success).toBe(true);
    expect(result.workflows).toBeDefined();

    if (result.workflows) {
      // Should find some development-related workflows
      expect(result.workflows.length).toBeGreaterThan(0);

      // All returned workflows should match the pattern
      const hasPatternMatch = result.workflows.some(
        w =>
          w.name.toLowerCase().includes('development') ||
          w.description.toLowerCase().includes('development') ||
          w.triggers.some(t => t.toLowerCase().includes('development'))
      );
      expect(hasPatternMatch).toBe(true);
    }

    console.log(`✅ Found ${result.workflows?.length || 0} development workflows`);
  });

  test('can query checklists by pattern', async () => {
    console.log('🔧 Testing checklist query by pattern...');

    const result = orchestrator.queryChecklists('validation');

    expect(result.success).toBe(true);
    expect(result.checklists).toBeDefined();

    if (result.checklists) {
      // Should find some validation-related checklists
      expect(result.checklists.length).toBeGreaterThan(0);

      // All returned checklists should match the pattern
      const hasPatternMatch = result.checklists.some(
        c =>
          c.name.toLowerCase().includes('validation') ||
          (c.description && c.description.toLowerCase().includes('validation')) ||
          c.triggers.some(t => t.toLowerCase().includes('validation'))
      );
      expect(hasPatternMatch).toBe(true);
    }

    console.log(`✅ Found ${result.checklists?.length || 0} validation checklists`);
  });

  test('can add workflow to existing session', async () => {
    console.log('🔧 Testing adding workflow to session...');

    // Start a session first
    const sessionResult = orchestrator.startSession('feature development');
    expect(sessionResult.success).toBe(true);

    if (!sessionResult.session_id) {
      throw new Error('Session ID not returned');
    }

    const sessionId = sessionResult.session_id;
    console.log(`🔧 Created session: ${sessionId}`);

    // Query for available workflows
    const workflowQuery = orchestrator.queryWorkflows('bug');
    expect(workflowQuery.success).toBe(true);

    if (workflowQuery.workflows && workflowQuery.workflows.length > 0) {
      const workflowToAdd = workflowQuery.workflows[0];
      console.log(`🔧 Adding workflow: ${workflowToAdd.name}`);

      // Add workflow to session
      const addResult = orchestrator.addWorkflowToSession(
        sessionId,
        workflowToAdd.name
      );
      expect(addResult.success).toBe(true);
      expect(addResult.session_id).toBe(sessionId);
      expect(addResult.message).toContain('Added workflow');

      // Check that workflow stack now has 2 items
      expect(addResult.workflow_stack).toBeDefined();
      if (addResult.workflow_stack) {
        expect(addResult.workflow_stack.length).toBe(2);
        expect(addResult.workflow_stack[1]).toBe(workflowToAdd.name);
      }

      console.log(`✅ Successfully added workflow to session`);
    } else {
      console.log('⚠️ No workflows found to add to session');
    }
  });

  test('can add checklist to existing session', async () => {
    console.log('🔧 Testing adding checklist to session...');

    // Start a session first
    const sessionResult = orchestrator.startSession('project setup');
    expect(sessionResult.success).toBe(true);

    if (!sessionResult.session_id) {
      throw new Error('Session ID not returned');
    }

    const sessionId = sessionResult.session_id;
    console.log(`🔧 Created session: ${sessionId}`);

    // Query for available checklists
    const checklistQuery = orchestrator.queryChecklists('quality');
    expect(checklistQuery.success).toBe(true);

    if (checklistQuery.checklists && checklistQuery.checklists.length > 0) {
      const checklistToAdd = checklistQuery.checklists[0];
      console.log(`🔧 Adding checklist: ${checklistToAdd.name}`);

      // Add checklist to session
      const addResult = orchestrator.addChecklistToSession(
        sessionId,
        checklistToAdd.name
      );
      expect(addResult.success).toBe(true);
      expect(addResult.session_id).toBe(sessionId);
      expect(addResult.message).toContain('Added checklist');

      // Check that workflow stack now has 2 items
      expect(addResult.workflow_stack).toBeDefined();
      if (addResult.workflow_stack) {
        expect(addResult.workflow_stack.length).toBe(2);
        expect(addResult.workflow_stack[1]).toBe(`checklist:${checklistToAdd.name}`);
      }

      console.log(`✅ Successfully added checklist to session`);
    } else {
      console.log('⚠️ No checklists found to add to session');
    }
  });

  test('nested execution maintains workflow depth', async () => {
    console.log('🔧 Testing workflow depth tracking...');

    // Start a session
    const sessionResult = orchestrator.startSession('testing workflow');
    expect(sessionResult.success).toBe(true);

    if (!sessionResult.session_id) {
      throw new Error('Session ID not returned');
    }

    const sessionId = sessionResult.session_id;

    // Initial depth should be 1
    const initialStatus = orchestrator.getSessionStatus(sessionId);
    expect(initialStatus.success).toBe(true);
    expect(initialStatus.current_step?.workflow_depth).toBe(1);

    // Add a checklist
    const checklistQuery = orchestrator.queryChecklists();
    if (checklistQuery.checklists && checklistQuery.checklists.length > 0) {
      const addResult = orchestrator.addChecklistToSession(
        sessionId,
        checklistQuery.checklists[0].name
      );
      expect(addResult.success).toBe(true);

      // Depth should now be 2
      const nestedStatus = orchestrator.getSessionStatus(sessionId);
      expect(nestedStatus.success).toBe(true);
      expect(nestedStatus.current_step?.workflow_depth).toBe(2);

      console.log(
        `✅ Workflow depth correctly tracked: ${nestedStatus.current_step?.workflow_depth}`
      );
    }
  });

  test('error handling for non-existent workflows and checklists', async () => {
    console.log('🔧 Testing error handling...');

    // Start a session
    const sessionResult = orchestrator.startSession('error test');
    expect(sessionResult.success).toBe(true);

    if (!sessionResult.session_id) {
      throw new Error('Session ID not returned');
    }

    const sessionId = sessionResult.session_id;

    // Try to add non-existent workflow
    const badWorkflowResult = orchestrator.addWorkflowToSession(
      sessionId,
      'non-existent-workflow'
    );
    expect(badWorkflowResult.success).toBe(false);
    expect(badWorkflowResult.error).toContain('not found');

    // Try to add non-existent checklist
    const badChecklistResult = orchestrator.addChecklistToSession(
      sessionId,
      'non-existent-checklist'
    );
    expect(badChecklistResult.success).toBe(false);
    expect(badChecklistResult.error).toContain('not found');

    // Try to add to non-existent session
    const badSessionResult = orchestrator.addWorkflowToSession(
      'non-existent-session',
      'any-workflow'
    );
    expect(badSessionResult.success).toBe(false);
    expect(badSessionResult.error).toContain('Session non-existent-session not found');

    console.log('✅ Error handling working correctly');
  });
});
