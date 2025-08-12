/**
 * Comprehensive tests for SessionMonitor functionality
 * Tests parity with Python vibe/session_monitor.py implementation
 */

import {
  SessionAlert,
  SessionMonitor,
  SessionStatusSummary,
} from '../src/session_monitor';
import { WorkflowOrchestrator } from '../src/orchestrator';
import { VibeConfigImpl } from '../src/config';
import { EnhancedWorkflowSession, SessionManager } from '../src/session';

describe('SessionMonitor Comprehensive Tests', () => {
  let config: VibeConfigImpl;
  let orchestrator: WorkflowOrchestrator;
  let sessionMonitor: SessionMonitor;
  let sessionManager: SessionManager;

  beforeEach(async () => {
    // Load real config for integration testing
    config = await VibeConfigImpl.loadFromFile();
    orchestrator = new WorkflowOrchestrator(config);
    sessionMonitor = new SessionMonitor(orchestrator);
    sessionManager = orchestrator.sessionManagerInstance;
  });

  afterEach(async () => {
    // Cleanup any test sessions
    const sessionIds = await sessionManager.listActiveSessions();
    for (const sessionId of sessionIds) {
      await sessionManager.archiveSession(sessionId);
    }
  });

  describe('Session Health Monitoring', () => {
    test('checkSessionHealth returns alerts for dormant sessions', async () => {
      // Clean up any existing sessions first
      const existingSessions = await sessionManager.listActiveSessions();
      for (const sessionId of existingSessions) {
        await sessionManager.archiveSession(sessionId);
      }

      // Create a test session
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1', 'Step 2', 'Step 3']],
      ]);

      // Mock the session to appear dormant (older lastAccessed)
      const dormantTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
      (session as any).lastAccessed = dormantTime.toISOString();
      sessionManager.saveSession(session);

      const alerts = await sessionMonitor.checkSessionHealth();

      expect(alerts.length).toBeGreaterThan(0);
      const dormantAlert = alerts.find(
        a => a.alert_type === 'dormant_session' && a.session_id === session.sessionId
      );
      expect(dormantAlert).toBeDefined();
      expect(dormantAlert?.session_id).toBe(session.sessionId);
      expect(dormantAlert?.severity).toBe('medium');
    });

    test('checkSessionHealth returns alerts for stale sessions', async () => {
      // Create a test session
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1', 'Step 2']],
      ]);

      // Mock the session to appear stale (older lastAccessed)
      const staleTime = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago
      (session as any).lastAccessed = staleTime.toISOString();
      sessionManager.saveSession(session);

      const alerts = await sessionMonitor.checkSessionHealth();

      const staleAlert = alerts.find(a => a.alert_type === 'stale_session');
      expect(staleAlert).toBeDefined();
      expect(staleAlert?.session_id).toBe(session.sessionId);
      expect(staleAlert?.severity).toBe('high');
    });

    test('checkSessionHealth identifies auto-archive candidates', async () => {
      // Create a test session
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1']],
      ]);

      // Mock the session to be very old
      const oldTime = new Date(Date.now() - 7 * 60 * 60 * 1000); // 7 hours ago
      (session as any).createdAt = oldTime.toISOString();
      (session as any).lastAccessed = oldTime.toISOString();
      sessionManager.saveSession(session);

      const alerts = await sessionMonitor.checkSessionHealth();

      const archiveAlert = alerts.find(a => a.alert_type === 'auto_archive');
      expect(archiveAlert).toBeDefined();
      expect(archiveAlert?.session_id).toBe(session.sessionId);
      expect(archiveAlert?.severity).toBe('low');
    });

    test('checkSessionHealth ignores completed sessions', async () => {
      // Create a completed session
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1']],
      ]);

      // Complete the session
      session.advanceStep(); // Move past the only step
      expect(session.isComplete).toBe(true);
      sessionManager.saveSession(session);

      const alerts = await sessionMonitor.checkSessionHealth();

      // Should not have alerts for completed sessions
      const sessionAlerts = alerts.filter(a => a.session_id === session.sessionId);
      expect(sessionAlerts.length).toBe(0);
    });
  });

  describe('Agent Response Analysis', () => {
    test('analyzeAgentResponse detects forgotten completion patterns', async () => {
      // Create an active session
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1', 'Step 2']],
      ]);

      // Test completion-like responses
      const completionResponses = [
        'The task is now complete and ready for review.',
        'I have finished implementing the requested functionality.',
        'In summary, all requirements have been fulfilled.',
        'That concludes the implementation work.',
        'The work is done and ready to use.',
      ];

      for (const response of completionResponses) {
        const alert = sessionMonitor.analyzeAgentResponse(session.sessionId, response);

        expect(alert).toBeDefined();
        expect(alert?.alert_type).toBe('forgotten_completion');
        expect(alert?.session_id).toBe(session.sessionId);
        expect(alert?.severity).toBe('high');
      }
    });

    test('analyzeAgentResponse ignores responses with workflow management', async () => {
      // Create an active session
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1', 'Step 2']],
      ]);

      // Test responses that mention workflow management
      const workflowResponses = [
        'The task is complete. Let me advance_workflow to continue.',
        'I have finished this step. I should check get_workflow_status.',
        'The work is done. Time to break_workflow and finish.',
        'Summary: Complete. Next I will continue workflow to next step.',
      ];

      for (const response of workflowResponses) {
        const alert = sessionMonitor.analyzeAgentResponse(session.sessionId, response);

        expect(alert).toBeNull();
      }
    });

    test('analyzeAgentResponse ignores responses for completed sessions', async () => {
      // Create and complete a session
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1']],
      ]);

      // Advance past the single step to complete the session
      session.advanceStep();
      expect(session.isComplete).toBe(true);
      sessionManager.saveSession(session);

      const alert = sessionMonitor.analyzeAgentResponse(
        session.sessionId,
        'The task is now complete.'
      );

      expect(alert).toBeNull();
    });

    test('analyzeAgentResponse handles non-existent sessions', async () => {
      const alert = sessionMonitor.analyzeAgentResponse(
        'nonexistent-session-id',
        'Some response text'
      );

      expect(alert).toBeNull();
    });
  });

  describe('Intervention Message Generation', () => {
    test('generateInterventionMessage creates appropriate dormant reminders', async () => {
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1', 'Step 2']],
      ]);

      const alert: SessionAlert = {
        session_id: session.sessionId,
        alert_type: 'dormant_session',
        message: 'Session is dormant',
        severity: 'medium',
        timestamp: new Date(),
        suggested_actions: [],
      };

      const intervention = await sessionMonitor.generateInterventionMessage(alert);

      expect(intervention).toContain('Active Workflow Session Detected');
      expect(intervention).toContain(session.sessionId);
      expect(intervention).toContain('advance_workflow');
      expect(intervention).toContain('break_workflow');
      expect(intervention).toContain('get_workflow_status');
    });

    test('generateInterventionMessage creates appropriate stale reminders', async () => {
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1']],
      ]);

      const alert: SessionAlert = {
        session_id: session.sessionId,
        alert_type: 'stale_session',
        message: 'Session is stale',
        severity: 'high',
        timestamp: new Date(),
        suggested_actions: [],
      };

      const intervention = await sessionMonitor.generateInterventionMessage(alert);

      expect(intervention).toContain('Stale Workflow Session');
      expect(intervention).toContain(session.sessionId);
      expect(intervention).toContain('break_workflow');
    });

    test('generateInterventionMessage creates appropriate completion reminders', async () => {
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1', 'Step 2']],
      ]);

      const alert: SessionAlert = {
        session_id: session.sessionId,
        alert_type: 'forgotten_completion',
        message: 'Completion pattern detected',
        severity: 'high',
        timestamp: new Date(),
        suggested_actions: [],
      };

      const intervention = await sessionMonitor.generateInterventionMessage(alert);

      expect(intervention).toContain('Workflow Management Reminder');
      expect(intervention).toContain('completed a task');
      expect(intervention).toContain('advance_workflow');
      expect(intervention).toContain('break_workflow');
    });

    test('generateInterventionMessage handles non-existent sessions', async () => {
      const alert: SessionAlert = {
        session_id: 'nonexistent-session',
        alert_type: 'dormant_session',
        message: 'Session is dormant',
        severity: 'medium',
        timestamp: new Date(),
        suggested_actions: [],
      };

      const intervention = await sessionMonitor.generateInterventionMessage(alert);

      expect(intervention).toBe('');
    });
  });

  describe('Session Status Summary', () => {
    test('getSessionStatusSummary provides comprehensive status', async () => {
      // Create multiple test sessions
      const session1 = sessionManager.createSession('prompt 1', [
        ['workflow-1', ['Step 1', 'Step 2']],
      ]);

      const session2 = sessionManager.createSession('prompt 2', [
        ['workflow-2', ['Step 1']],
      ]);

      // Make one session dormant
      const dormantTime = new Date(Date.now() - 15 * 60 * 1000);
      (session2 as any).lastAccessed = dormantTime.toISOString();
      sessionManager.saveSession(session2);

      const summary = await sessionMonitor.getSessionStatusSummary();

      expect(summary.total_active_sessions).toBe(2);
      expect(summary.dormant_sessions).toBe(1);
      expect(summary.stale_sessions).toBe(0);
      expect(summary.forgotten_completions).toBe(0);
      expect(summary.alerts.length).toBeGreaterThan(0);
      expect(summary.session_details.length).toBe(2);

      // Check session details structure
      const sessionDetail = summary.session_details[0];
      expect(sessionDetail).toHaveProperty('session_id');
      expect(sessionDetail).toHaveProperty('created_at');
      expect(sessionDetail).toHaveProperty('last_accessed');
      expect(sessionDetail).toHaveProperty('current_workflow');
      expect(sessionDetail).toHaveProperty('current_step');
      expect(sessionDetail).toHaveProperty('total_steps');
      expect(sessionDetail).toHaveProperty('is_complete');
    });

    test('getSessionStatusSummary handles empty session list', async () => {
      const summary = await sessionMonitor.getSessionStatusSummary();

      expect(summary.total_active_sessions).toBe(0);
      expect(summary.dormant_sessions).toBe(0);
      expect(summary.stale_sessions).toBe(0);
      expect(summary.forgotten_completions).toBe(0);
      expect(summary.alerts.length).toBe(0);
      expect(summary.session_details.length).toBe(0);
    });
  });

  describe('Session Cleanup', () => {
    test('cleanupStaleSessions archives old sessions', async () => {
      // Create a test session
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1']],
      ]);

      // Make it very old (beyond auto-archive threshold)
      const veryOldTime = new Date(Date.now() - 8 * 60 * 60 * 1000); // 8 hours ago
      (session as any).createdAt = veryOldTime.toISOString();
      sessionManager.saveSession(session);

      const cleanedSessions = await sessionMonitor.cleanupStaleSessions();

      expect(cleanedSessions).toContain(session.sessionId);

      // Verify session was archived
      const loadedSession = sessionManager.loadSession(session.sessionId);
      expect(loadedSession).toBeNull();
    });

    test('cleanupStaleSessions preserves recent sessions', async () => {
      // Create a recent session
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1']],
      ]);

      const cleanedSessions = await sessionMonitor.cleanupStaleSessions();

      expect(cleanedSessions).not.toContain(session.sessionId);

      // Verify session still exists
      const loadedSession = sessionManager.loadSession(session.sessionId);
      expect(loadedSession).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles malformed session data gracefully', async () => {
      // This tests robustness against corrupted session data
      expect(() => {
        sessionMonitor.analyzeAgentResponse('', '');
      }).not.toThrow();

      expect(() => {
        sessionMonitor.checkSessionHealth();
      }).not.toThrow();
    });

    test('handles very long response text', async () => {
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1']],
      ]);

      const longResponse =
        'This is a very long response. '.repeat(1000) +
        'The task is now complete and finished.';

      const alert = sessionMonitor.analyzeAgentResponse(
        session.sessionId,
        longResponse
      );

      expect(alert).toBeDefined();
      expect(alert?.alert_type).toBe('forgotten_completion');
    });

    test('handles unicode and special characters in responses', async () => {
      const session = sessionManager.createSession('test prompt', [
        ['test-workflow', ['Step 1']],
      ]);

      const unicodeResponse = '任务已完成 ✅ The work is done! 🎉 Summary: complete.';

      const alert = sessionMonitor.analyzeAgentResponse(
        session.sessionId,
        unicodeResponse
      );

      expect(alert).toBeDefined();
      expect(alert?.alert_type).toBe('forgotten_completion');
    });

    test('performance with many sessions', async () => {
      // Create multiple sessions to test performance
      const sessions: EnhancedWorkflowSession[] = [];
      for (let i = 0; i < 50; i++) {
        const session = sessionManager.createSession(`test prompt ${i}`, [
          ['test-workflow', [`Step ${i}`]],
        ]);
        sessions.push(session);
      }

      const start = Date.now();
      await sessionMonitor.checkSessionHealth();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      const summary = await sessionMonitor.getSessionStatusSummary();
      expect(summary.total_active_sessions).toBe(50);
    });
  });

  describe('Integration with WorkflowOrchestrator', () => {
    test('integrates properly with orchestrator session manager', async () => {
      // Verify that sessionMonitor uses the same sessionManager as orchestrator
      const result = orchestrator.startSession('test prompt');
      const sessionId = result.session_id;

      const alerts = await sessionMonitor.checkSessionHealth();
      const summary = await sessionMonitor.getSessionStatusSummary();

      expect(summary.total_active_sessions).toBeGreaterThan(0);

      // Should find the session we just created
      const sessionDetail = summary.session_details.find(
        detail => detail.session_id === sessionId
      );
      expect(sessionDetail).toBeDefined();
    });

    test('monitoring works across orchestrator operations', async () => {
      // Start a session via orchestrator
      const result = orchestrator.startSession('test workflow session');
      const sessionId = result.session_id;

      if (!sessionId) {
        throw new Error('Failed to create session');
      }

      // Advance through orchestrator
      await orchestrator.advanceSession(sessionId);

      // Monitor should see the updated session
      const summary = await sessionMonitor.getSessionStatusSummary();
      const sessionDetail = summary.session_details.find(
        detail => detail.session_id === sessionId
      );

      expect(sessionDetail).toBeDefined();

      // Load the actual session to check completion status
      const session = sessionManager.loadSession(sessionId);
      expect(sessionDetail?.is_complete).toBe(session?.isComplete || false);
    });
  });
});
