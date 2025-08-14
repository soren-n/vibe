import { promises as fs } from 'fs';
import * as path from 'path';
import type { VibeConfigImpl } from '../config.js';
import { generateSessionId } from '../utils/ids.js';
import { FilesystemError, SessionNotFoundError, categorizeError } from '../errors.js';
import { getLogger, logAsyncOperation, retryWithLogging } from '../logging.js';
import type { SessionConfig, WorkflowStepObject } from './types.js';
import { WorkflowSessionImpl } from './workflow-session.js';

/**
 * SessionManager with both sync (test) and async (production) APIs
 */
export class SessionManager {
  private sessions: Map<string, WorkflowSessionImpl> = new Map();
  private sessionDir: string;
  private vibeConfig: VibeConfigImpl;
  private logger = getLogger();
  private loaded = false;

  constructor(
    sessionDirOrConfig: string | VibeConfigImpl,
    vibeConfig?: VibeConfigImpl
  ) {
    if (typeof sessionDirOrConfig === 'string') {
      // New API: SessionManager(sessionDir, vibeConfig)
      this.sessionDir = sessionDirOrConfig;
      this.vibeConfig = vibeConfig as VibeConfigImpl;
    } else {
      // Legacy API: SessionManager(vibeConfig)
      this.vibeConfig = sessionDirOrConfig;
      // Use sessionDir from config if provided, otherwise default to current working directory
      this.sessionDir =
        this.vibeConfig.session.sessionDir ??
        path.join(process.cwd(), '.vibe', 'sessions');
    }
  }

  // Session creation (sync)
  createSession(
    prompt: string,
    workflowData: Array<[string, (string | WorkflowStepObject)[]]>,
    sessionConfig?: SessionConfig
  ): WorkflowSessionImpl {
    const sessionId = generateSessionId();
    const session = new WorkflowSessionImpl(
      sessionId,
      prompt,
      this.vibeConfig,
      sessionConfig
    );

    for (const [workflowName, steps] of workflowData) {
      session.pushWorkflow(workflowName, steps);
    }

    this.sessions.set(sessionId, session);
    return session;
  }

  // Session loading (sync)
  loadSession(sessionId: string): WorkflowSessionImpl | null {
    return this.sessions.get(sessionId) ?? null;
  }

  // Session saving (sync version for tests)
  saveSession(session: WorkflowSessionImpl): void {
    this.sessions.set(session.sessionId, session);
  }

  // Session saving (async)
  async saveSessionAsync(session: WorkflowSessionImpl): Promise<void> {
    await retryWithLogging(
      'saveSession',
      async () => {
        // Ensure parent directory structure exists
        const parentDir = path.dirname(this.sessionDir);
        await fs.mkdir(parentDir, { recursive: true });
        await fs.mkdir(this.sessionDir, { recursive: true });

        const filePath = path.join(this.sessionDir, `${session.sessionId}.json`);
        const data = JSON.stringify(session.toDict(), null, 2);
        await fs.writeFile(filePath, data, 'utf-8');
      },
      {
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        shouldRetry: (error: Error) => {
          const vibeError = categorizeError(error);
          return vibeError instanceof FilesystemError && vibeError.retryable;
        },
      },
      {
        component: 'SessionManager',
        sessionId: session.sessionId,
        operation: 'save',
      }
    );
  }

  // Sync methods for test compatibility
  listSessions(): WorkflowSessionImpl[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
    );
  }

  listActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  archiveSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    this.sessions.delete(sessionId);
    return true;
  }

  cleanupOldSessions(maxAgeDays = 7): number {
    const maxAgeHours = maxAgeDays * 24;
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const staleSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      // Use lastAccessed for cleanup decisions
      const lastAccessed = new Date(session.lastAccessed);
      if (lastAccessed < cutoffTime) {
        staleSessions.push(sessionId);
        this.sessions.delete(sessionId);
      }
    }

    return staleSessions.length;
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  getSessionHealthSummary(): Record<string, unknown> {
    const sessions = Array.from(this.sessions.values());
    const now = new Date();

    const summary = {
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.isComplete).length,
      activeSessions: sessions.filter(s => !s.isComplete).length,
      dormantSessions: 0,
      staleSessions: 0,
      oldestSession: null as string | null,
      newestSession: null as string | null,
    };

    let oldestDate = now;
    let newestDate = new Date(0);

    for (const session of sessions) {
      const createdAt = new Date(session.createdAt);
      const lastAccessed = new Date(session.lastAccessed);

      if (createdAt < oldestDate) {
        oldestDate = createdAt;
        summary.oldestSession = session.sessionId;
      }

      if (createdAt > newestDate) {
        newestDate = createdAt;
        summary.newestSession = session.sessionId;
      }

      const minutesSinceAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60);
      if (minutesSinceAccess > 10) {
        summary.dormantSessions++;
      }
      if (minutesSinceAccess > 30) {
        summary.staleSessions++;
      }
    }

    return summary;
  }

  // Async methods for production use
  async loadSessionsAsync(): Promise<void> {
    if (this.loaded) return;

    await logAsyncOperation(
      'loadSessions',
      async () => {
        try {
          const files = await fs.readdir(this.sessionDir);
          const jsonFiles = files.filter(f => f.endsWith('.json'));

          for (const file of jsonFiles) {
            try {
              const filePath = path.join(this.sessionDir, file);
              const content = await fs.readFile(filePath, 'utf-8');
              const data = JSON.parse(content);
              const session = WorkflowSessionImpl.fromDict(data, this.vibeConfig);
              this.sessions.set(session.sessionId, session);
            } catch (error) {
              this.logger.warn('Failed to load session file', {
                file,
                error: categorizeError(error as Error),
              });
            }
          }

          this.logger.info('Loaded sessions from disk', {
            sessionCount: this.sessions.size,
            sessionDir: this.sessionDir,
          });
          this.loaded = true;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
          this.logger.info('Session directory does not exist yet', {
            sessionDir: this.sessionDir,
          });
          this.loaded = true;
        }
      },
      {
        component: 'SessionManager',
      }
    );
  }

  async listSessionsAsync(): Promise<WorkflowSessionImpl[]> {
    await this.loadSessionsAsync();
    return this.listSessions();
  }

  async removeSessionAsync(sessionId: string): Promise<boolean> {
    return await logAsyncOperation(
      'removeSession',
      async () => {
        const session = this.sessions.get(sessionId);
        if (!session) {
          throw new SessionNotFoundError(sessionId);
        }

        this.sessions.delete(sessionId);

        const filePath = path.join(this.sessionDir, `${sessionId}.json`);
        try {
          await fs.unlink(filePath);
        } catch (error) {
          this.logger.warn('Failed to remove session file', {
            sessionId,
            filePath,
            error: categorizeError(error as Error),
          });
        }

        this.logger.info('Removed session', { sessionId });
        return true;
      },
      {
        component: 'SessionManager',
        sessionId,
      }
    );
  }

  async cleanupStaleSessionsAsync(maxAgeHours = 24): Promise<number> {
    return await logAsyncOperation(
      'cleanupStaleSessions',
      async () => {
        const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        const staleSessions: string[] = [];

        for (const [sessionId, session] of this.sessions) {
          const lastAccessed = new Date(session.lastAccessed);
          if (lastAccessed < cutoffTime) {
            staleSessions.push(sessionId);
          }
        }

        for (const sessionId of staleSessions) {
          await this.removeSessionAsync(sessionId);
        }

        this.logger.info('Cleaned up stale sessions', {
          cleanedCount: staleSessions.length,
          maxAgeHours,
          remainingSessions: this.sessions.size,
        });

        return staleSessions.length;
      },
      {
        component: 'SessionManager',
        maxAgeHours,
      }
    );
  }
}
