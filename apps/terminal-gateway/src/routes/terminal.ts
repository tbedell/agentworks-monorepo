import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import { z } from 'zod';
import { createLogger } from '@agentworks/shared';
import { ptyManager } from '../lib/pty-manager.js';
import {
  saveSession,
  updateSession,
  deleteSession,
  getSession,
  getSessionsByProject,
  getSessionsByUser,
  type StoredSession,
} from '../lib/session-store.js';
import { ensureProjectClaudeMd } from '../lib/claude-md-generator.js';
import {
  handleChat,
  setAgentConfig,
  getAgentConfig,
  cleanupSession,
  type AgentConfig,
} from '../lib/ai-handler.js';

const logger = createLogger('terminal-routes');

const GATEWAY_ID = process.env.GATEWAY_ID || `gateway-${process.pid}`;

// Validation schemas
const createSessionSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  devEnvId: z.string().optional(),
  cols: z.number().int().min(1).max(500).optional(),
  rows: z.number().int().min(1).max(200).optional(),
  cwd: z.string().optional(),
  // Additional context for Claude CLI integration
  workspaceId: z.string().optional(),
  boardId: z.string().optional(),
  projectName: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

const resizeSchema = z.object({
  cols: z.number().int().min(1).max(500),
  rows: z.number().int().min(1).max(200),
});

// Message types - Extended for AI chat mode
interface TerminalMessage {
  type: 'input' | 'output' | 'resize' | 'error' | 'ping' | 'pong' | 'ai_chat' | 'ai_response' | 'agent_select' | 'context_link' | 'ai_toggle';
  data?: string;
  cols?: number;
  rows?: number;
  timestamp: number;
  // AI chat specific fields
  message?: string;
  agentName?: string;
  provider?: string;
  model?: string;
  cardId?: string;
  enabled?: boolean;
  done?: boolean;
}

export async function terminalRoutes(app: FastifyInstance) {
  // Create a new terminal session
  app.post<{
    Body: z.infer<typeof createSessionSchema>;
  }>('/sessions', async (request, reply) => {
    try {
      const body = createSessionSchema.parse(request.body);
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Build environment variables for Claude CLI integration
      const envVars: Record<string, string> = {};
      if (body.workspaceId) envVars.AGENTWORKS_WORKSPACE_ID = body.workspaceId;
      if (body.boardId) envVars.AGENTWORKS_BOARD_ID = body.boardId;
      if (body.projectName) envVars.AGENTWORKS_PROJECT_NAME = body.projectName;
      if (body.cwd) envVars.AGENTWORKS_DOCS_PATH = `${body.cwd}/docs`;
      // Pass any custom metadata as env vars
      if (body.metadata) {
        Object.entries(body.metadata).forEach(([key, value]) => {
          envVars[`AGENTWORKS_META_${key.toUpperCase()}`] = value;
        });
      }

      // Create PTY session
      const ptySession = ptyManager.createSession(
        sessionId,
        body.projectId,
        body.userId,
        {
          cols: body.cols,
          rows: body.rows,
          cwd: body.cwd,
          env: envVars,
        }
      );

      // Store session in Redis
      const storedSession: StoredSession = {
        id: sessionId,
        projectId: body.projectId,
        userId: body.userId,
        devEnvId: body.devEnvId,
        status: 'active',
        cols: ptySession.cols,
        rows: ptySession.rows,
        gatewayId: GATEWAY_ID,
        createdAt: ptySession.createdAt.toISOString(),
        lastActivityAt: ptySession.lastActivityAt.toISOString(),
      };

      await saveSession(storedSession);

      // Generate per-project CLAUDE.md if cwd is provided
      if (body.cwd) {
        ensureProjectClaudeMd({
          projectId: body.projectId,
          projectName: body.projectName || body.projectId,
          projectPath: body.cwd,
          workspaceId: body.workspaceId,
          boardId: body.boardId,
        }).catch((err) => {
          logger.error('Failed to generate project CLAUDE.md', { error: err });
        });
      }

      logger.info('Terminal session created', { sessionId, projectId: body.projectId });

      return reply.status(201).send({
        id: sessionId,
        projectId: body.projectId,
        userId: body.userId,
        status: 'active',
        cols: ptySession.cols,
        rows: ptySession.rows,
        wsUrl: `/ws/terminal/${sessionId}`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      logger.error('Failed to create session', { error });
      return reply.status(500).send({ error: 'Failed to create session' });
    }
  });

  // List sessions
  app.get('/sessions', async (request, reply) => {
    const { projectId, userId } = request.query as {
      projectId?: string;
      userId?: string;
    };

    try {
      let sessions: StoredSession[];

      if (projectId) {
        sessions = await getSessionsByProject(projectId);
      } else if (userId) {
        sessions = await getSessionsByUser(userId);
      } else {
        // Return local sessions if no filter
        const localSessions = ptyManager.getAllSessions();
        sessions = localSessions.map((s) => ({
          id: s.id,
          projectId: s.projectId,
          userId: s.userId,
          devEnvId: s.devEnvId,
          status: 'active' as const,
          cols: s.cols,
          rows: s.rows,
          gatewayId: GATEWAY_ID,
          createdAt: s.createdAt.toISOString(),
          lastActivityAt: s.lastActivityAt.toISOString(),
        }));
      }

      return reply.send({ sessions });
    } catch (error) {
      logger.error('Failed to list sessions', { error });
      return reply.status(500).send({ error: 'Failed to list sessions' });
    }
  });

  // Get session details
  app.get<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params;

    const session = await getSession(sessionId);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return reply.send(session);
  });

  // Resize session
  app.post<{
    Params: { sessionId: string };
    Body: z.infer<typeof resizeSchema>;
  }>('/sessions/:sessionId/resize', async (request, reply) => {
    try {
      const { sessionId } = request.params;
      const body = resizeSchema.parse(request.body);

      const success = ptyManager.resize(sessionId, body.cols, body.rows);
      if (!success) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      await updateSession(sessionId, {
        cols: body.cols,
        rows: body.rows,
        lastActivityAt: new Date().toISOString(),
      });

      return reply.send({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      logger.error('Failed to resize session', { error });
      return reply.status(500).send({ error: 'Failed to resize session' });
    }
  });

  // Terminate session
  app.delete<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params;

    const destroyed = ptyManager.destroySession(sessionId);
    await deleteSession(sessionId);

    if (!destroyed) {
      // Session might have been on another gateway, still delete from store
      return reply.status(404).send({ error: 'Session not found on this gateway' });
    }

    logger.info('Terminal session terminated', { sessionId });
    return reply.send({ success: true });
  });

  // WebSocket endpoint for terminal I/O
  app.get<{
    Params: { sessionId: string };
    Querystring: { projectId?: string };
  }>(
    '/ws/terminal/:sessionId',
    { websocket: true },
    async (socket: WebSocket, request: FastifyRequest) => {
      const { sessionId } = request.params as { sessionId: string };
      const { projectId } = request.query as { projectId?: string };

      logger.info('WebSocket connection attempt', { sessionId, projectId });

      // Get or create PTY session
      let ptySession = ptyManager.getSession(sessionId);

      if (!ptySession && projectId) {
        // Create a new session if it doesn't exist
        // Try to fetch project localPath from API for better UX
        let projectCwd: string | undefined;
        try {
          const apiUrl = process.env.API_URL || 'http://localhost:3010';
          const projectResponse = await fetch(`${apiUrl}/api/projects/${projectId}`, {
            headers: {
              'Authorization': `Bearer ${process.env.INTERNAL_SERVICE_TOKEN || 'internal-service-token-dev'}`,
            },
          });
          if (projectResponse.ok) {
            const projectData = await projectResponse.json() as { localPath?: string };
            projectCwd = projectData.localPath || undefined;
            logger.info('Fetched project localPath for terminal', { projectId, localPath: projectCwd });
          }
        } catch (fetchErr) {
          logger.warn('Could not fetch project localPath, using default HOME', { projectId, error: fetchErr });
        }

        ptySession = ptyManager.createSession(
          sessionId,
          projectId,
          'anonymous', // In production, extract from auth
          { cols: 80, rows: 24, cwd: projectCwd }
        );

        // Store session
        const storedSession: StoredSession = {
          id: sessionId,
          projectId,
          userId: 'anonymous',
          status: 'active',
          cols: 80,
          rows: 24,
          gatewayId: GATEWAY_ID,
          createdAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
        };
        saveSession(storedSession).catch((err) => {
          logger.error('Failed to save session', { sessionId, error: err });
        });
      }

      if (!ptySession) {
        logger.warn('Session not found', { sessionId });
        const errorMessage: TerminalMessage = {
          type: 'error',
          data: 'Session not found',
          timestamp: Date.now(),
        };
        socket.send(JSON.stringify(errorMessage));
        socket.close(1008, 'Session not found');
        return;
      }

      logger.info('WebSocket connected', { sessionId });

      // Subscribe to PTY data
      const unsubscribeData = ptyManager.onData(sessionId, (data) => {
        if (socket.readyState === socket.OPEN) {
          const message: TerminalMessage = {
            type: 'output',
            data,
            timestamp: Date.now(),
          };
          socket.send(JSON.stringify(message));
        }
      });

      // Subscribe to PTY exit
      const unsubscribeExit = ptyManager.onExit(sessionId, (code) => {
        if (socket.readyState === socket.OPEN) {
          const message: TerminalMessage = {
            type: 'error',
            data: `Process exited with code ${code}`,
            timestamp: Date.now(),
          };
          socket.send(JSON.stringify(message));
          socket.close(1000, 'Process exited');
        }
      });

      // Handle incoming messages
      socket.on('message', (rawData: Buffer) => {
        try {
          const message: TerminalMessage = JSON.parse(rawData.toString());

          switch (message.type) {
            case 'input':
              if (message.data) {
                ptyManager.write(sessionId, message.data);
              }
              break;

            case 'resize':
              if (message.cols && message.rows) {
                ptyManager.resize(sessionId, message.cols, message.rows);
                updateSession(sessionId, {
                  cols: message.cols,
                  rows: message.rows,
                  lastActivityAt: new Date().toISOString(),
                }).catch(() => {});
              }
              break;

            case 'ping':
              socket.send(
                JSON.stringify({
                  type: 'pong',
                  timestamp: Date.now(),
                })
              );
              break;

            case 'ai_chat':
              // Handle AI chat message - stream response back
              if (message.message) {
                const config: Partial<AgentConfig> = {};
                if (message.agentName) config.agentName = message.agentName;
                if (message.provider) config.provider = message.provider;
                if (message.model) config.model = message.model;

                // Stream AI response
                (async () => {
                  try {
                    for await (const chunk of handleChat(sessionId, message.message!, config)) {
                      if (socket.readyState === socket.OPEN) {
                        const response: TerminalMessage = {
                          type: 'ai_response',
                          data: chunk,
                          done: false,
                          timestamp: Date.now(),
                        };
                        socket.send(JSON.stringify(response));
                      }
                    }
                    // Send completion message
                    if (socket.readyState === socket.OPEN) {
                      const doneMessage: TerminalMessage = {
                        type: 'ai_response',
                        data: '',
                        done: true,
                        timestamp: Date.now(),
                      };
                      socket.send(JSON.stringify(doneMessage));
                    }
                  } catch (err) {
                    logger.error('AI chat streaming error', { sessionId, error: err });
                    if (socket.readyState === socket.OPEN) {
                      const errorMessage: TerminalMessage = {
                        type: 'error',
                        data: `AI chat error: ${err instanceof Error ? err.message : 'Unknown error'}`,
                        timestamp: Date.now(),
                      };
                      socket.send(JSON.stringify(errorMessage));
                    }
                  }
                })();
              }
              break;

            case 'agent_select':
              // Update agent configuration for this session
              if (message.agentName) {
                // Default provider/model mappings based on agent
                const agentDefaults: Record<string, { provider: string; model: string }> = {
                  'ceo_copilot': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'strategy': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'storyboard_ux': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'prd': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'mvp_scope': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'research': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'architect': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'planner': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'code_standards': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'dev_backend': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'dev_frontend': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'devops': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'qa': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'troubleshooter': { provider: 'google', model: 'gemini-2.0-flash' },
                  'docs': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'refactor': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                  'claude_code_agent': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
                };

                const defaults = agentDefaults[message.agentName] || { provider: 'anthropic', model: 'claude-sonnet-4-20250514' };
                const provider = message.provider || defaults.provider;
                const model = message.model || defaults.model;

                setAgentConfig(sessionId, {
                  agentName: message.agentName,
                  provider,
                  model,
                });

                // Also persist to Redis session
                updateSession(sessionId, {
                  agentName: message.agentName,
                  provider,
                  model,
                  lastActivityAt: new Date().toISOString(),
                }).catch(() => {});

                // Send confirmation back to client
                if (socket.readyState === socket.OPEN) {
                  const response: TerminalMessage = {
                    type: 'agent_select',
                    agentName: message.agentName,
                    provider,
                    model,
                    timestamp: Date.now(),
                  };
                  socket.send(JSON.stringify(response));
                }

                logger.info('Agent config updated for session', {
                  sessionId,
                  agentName: message.agentName,
                  provider,
                  model,
                });
              }
              break;

            case 'context_link':
              // Link terminal session to a card for context sharing
              if (message.cardId) {
                updateSession(sessionId, {
                  linkedCardId: message.cardId,
                  lastActivityAt: new Date().toISOString(),
                }).catch(() => {});
                logger.info('Terminal linked to card', { sessionId, cardId: message.cardId });
              }
              break;

            case 'ai_toggle':
              // Toggle AI chat mode on/off
              if (typeof message.enabled === 'boolean') {
                updateSession(sessionId, {
                  aiChatEnabled: message.enabled,
                  lastActivityAt: new Date().toISOString(),
                }).catch(() => {});
                logger.info('AI chat mode toggled', { sessionId, enabled: message.enabled });
              }
              break;

            default:
              logger.debug('Unknown message type', { type: message.type });
          }
        } catch (error) {
          logger.error('Failed to parse message', { error });
        }
      });

      // Handle socket close
      socket.on('close', () => {
        logger.info('WebSocket disconnected', { sessionId });
        unsubscribeData();
        unsubscribeExit();

        // Cleanup AI session data
        cleanupSession(sessionId);

        // Update session status
        updateSession(sessionId, {
          status: 'disconnected',
          lastActivityAt: new Date().toISOString(),
        }).catch(() => {});
      });

      // Handle socket errors
      socket.on('error', (error) => {
        logger.error('WebSocket error', { sessionId, error: error.message });
        unsubscribeData();
        unsubscribeExit();
      });
    }
  );

  // Gateway stats
  app.get('/stats', async (_request, reply) => {
    const stats = ptyManager.getStats();
    return reply.send({
      gatewayId: GATEWAY_ID,
      ...stats,
    });
  });
}
