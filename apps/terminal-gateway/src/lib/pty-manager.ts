import * as pty from 'node-pty';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('pty-manager');

export interface PtySession {
  id: string;
  projectId: string;
  userId: string;
  devEnvId?: string;
  pty: pty.IPty;
  cols: number;
  rows: number;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface PtyOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: Record<string, string>;
  shell?: string;
}

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const DEFAULT_SHELL = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';

class PtyManager {
  private sessions: Map<string, PtySession> = new Map();
  private dataHandlers: Map<string, Set<(data: string) => void>> = new Map();
  private exitHandlers: Map<string, Set<(code: number) => void>> = new Map();

  createSession(
    sessionId: string,
    projectId: string,
    userId: string,
    options: PtyOptions = {}
  ): PtySession {
    const {
      cols = DEFAULT_COLS,
      rows = DEFAULT_ROWS,
      cwd = process.env.HOME || '/tmp',
      env = {},
      shell = DEFAULT_SHELL,
    } = options;

    logger.info('Creating PTY session', { sessionId, projectId, userId, cols, rows });

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: {
        ...process.env,
        ...env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        // AgentWorks context for Claude CLI integration
        AGENTWORKS_SESSION_ID: sessionId,
        AGENTWORKS_PROJECT_ID: projectId,
        AGENTWORKS_API_URL: process.env.AGENTWORKS_API_URL || 'http://localhost:3010',
        AGENTWORKS_ORCHESTRATOR_URL: process.env.AGENTWORKS_ORCHESTRATOR_URL || 'http://localhost:8001',
      },
    });

    const session: PtySession = {
      id: sessionId,
      projectId,
      userId,
      pty: ptyProcess,
      cols,
      rows,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    this.dataHandlers.set(sessionId, new Set());
    this.exitHandlers.set(sessionId, new Set());

    // Send CWD confirmation message to help users understand context
    const cwdMessage = `\x1b[2m# Terminal started in: ${cwd}\x1b[0m\r\n`;
    ptyProcess.write(`echo '${cwdMessage.replace(/'/g, "\\'")}'\r`);

    // Handle PTY data
    ptyProcess.onData((data) => {
      session.lastActivityAt = new Date();
      const handlers = this.dataHandlers.get(sessionId);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(data);
          } catch (error) {
            logger.error('Error in data handler', { sessionId, error });
          }
        });
      }
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode }) => {
      logger.info('PTY process exited', { sessionId, exitCode });
      const handlers = this.exitHandlers.get(sessionId);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(exitCode);
          } catch (error) {
            logger.error('Error in exit handler', { sessionId, error });
          }
        });
      }
      this.destroySession(sessionId);
    });

    logger.info('PTY session created', { sessionId });
    return session;
  }

  getSession(sessionId: string): PtySession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): PtySession[] {
    return Array.from(this.sessions.values());
  }

  getSessionsByProject(projectId: string): PtySession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.projectId === projectId
    );
  }

  getSessionsByUser(userId: string): PtySession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.userId === userId
    );
  }

  write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Attempted to write to non-existent session', { sessionId });
      return false;
    }

    try {
      session.pty.write(data);
      session.lastActivityAt = new Date();
      return true;
    } catch (error) {
      logger.error('Error writing to PTY', { sessionId, error });
      return false;
    }
  }

  resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Attempted to resize non-existent session', { sessionId });
      return false;
    }

    try {
      session.pty.resize(cols, rows);
      session.cols = cols;
      session.rows = rows;
      session.lastActivityAt = new Date();
      logger.debug('Resized PTY', { sessionId, cols, rows });
      return true;
    } catch (error) {
      logger.error('Error resizing PTY', { sessionId, error });
      return false;
    }
  }

  onData(sessionId: string, handler: (data: string) => void): () => void {
    const handlers = this.dataHandlers.get(sessionId);
    if (!handlers) {
      logger.warn('Cannot add data handler to non-existent session', { sessionId });
      return () => {};
    }

    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }

  onExit(sessionId: string, handler: (code: number) => void): () => void {
    const handlers = this.exitHandlers.get(sessionId);
    if (!handlers) {
      logger.warn('Cannot add exit handler to non-existent session', { sessionId });
      return () => {};
    }

    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }

  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    logger.info('Destroying PTY session', { sessionId });

    try {
      session.pty.kill();
    } catch (error) {
      logger.error('Error killing PTY process', { sessionId, error });
    }

    this.sessions.delete(sessionId);
    this.dataHandlers.delete(sessionId);
    this.exitHandlers.delete(sessionId);

    return true;
  }

  destroyAllSessions(): void {
    logger.info('Destroying all PTY sessions', { count: this.sessions.size });
    for (const sessionId of this.sessions.keys()) {
      this.destroySession(sessionId);
    }
  }

  getStats(): {
    totalSessions: number;
    sessionsByProject: Record<string, number>;
  } {
    const sessionsByProject: Record<string, number> = {};
    for (const session of this.sessions.values()) {
      sessionsByProject[session.projectId] =
        (sessionsByProject[session.projectId] || 0) + 1;
    }

    return {
      totalSessions: this.sessions.size,
      sessionsByProject,
    };
  }
}

export const ptyManager = new PtyManager();
