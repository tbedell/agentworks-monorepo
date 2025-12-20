/**
 * Context API Routes
 *
 * Endpoints for managing card context including conversation history
 * and terminal session linking.
 */

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { lucia } from '../lib/auth.js';
import {
  getContextService,
  conversationMessageSchema,
  type ConversationMessage,
  type SSEEvent,
} from '@agentworks/context-service';

// Validation schemas
const appendMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  timestamp: z.string().optional(),
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        arguments: z.record(z.unknown()),
        result: z.unknown().optional(),
        error: z.string().optional(),
      })
    )
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

const linkTerminalSchema = z.object({
  sessionId: z.string(),
});

// Map to store active SSE connections by cardId
const sseConnections = new Map<string, Set<(event: SSEEvent) => void>>();

export const contextRoutes: FastifyPluginAsync = async (app) => {
  const contextService = getContextService();

  // Auth hook for all context routes
  app.addHook('preHandler', async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    (request as any).user = user;
  });

  /**
   * GET /api/context/cards/:cardId
   * Returns card context including conversation history
   */
  app.get<{ Params: { cardId: string }; Querystring: { historyLimit?: string } }>(
    '/cards/:cardId',
    async (request, reply) => {
      const user = (request as any).user;
      const { cardId } = request.params;
      const historyLimit = request.query.historyLimit
        ? parseInt(request.query.historyLimit, 10)
        : undefined;

      // Verify user has access to this card
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          board: {
            include: {
              project: {
                include: {
                  workspace: { include: { members: true } },
                },
              },
            },
          },
        },
      });

      if (!card) {
        return reply.status(404).send({ error: 'Card not found' });
      }

      const membership = card.board.project.workspace.members.find(
        (m) => m.userId === user.id
      );
      if (!membership) {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      // Get context from Redis
      const context = await contextService.getCardContext(cardId, { historyLimit });

      if (!context) {
        // Return empty context if none exists
        return {
          cardId,
          projectId: card.board.project.id,
          conversationHistory: [],
          metadata: {
            lastUpdated: new Date().toISOString(),
            totalMessages: 0,
            linkedTerminalSessions: [],
          },
        };
      }

      return context;
    }
  );

  /**
   * POST /api/context/cards/:cardId/init
   * Initialize card context if it doesn't exist
   */
  app.post<{ Params: { cardId: string }; Body: { agentName?: string } }>(
    '/cards/:cardId/init',
    async (request, reply) => {
      const user = (request as any).user;
      const { cardId } = request.params;
      const { agentName } = request.body || {};

      // Verify user has access to this card
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          board: {
            include: {
              project: {
                include: {
                  workspace: { include: { members: true } },
                },
              },
            },
          },
        },
      });

      if (!card) {
        return reply.status(404).send({ error: 'Card not found' });
      }

      const membership = card.board.project.workspace.members.find(
        (m) => m.userId === user.id
      );
      if (!membership || membership.role === 'viewer') {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      const context = await contextService.initCardContext(
        cardId,
        card.board.project.id,
        agentName
      );

      return context;
    }
  );

  /**
   * POST /api/context/cards/:cardId/message
   * Append a message to conversation history
   */
  app.post<{ Params: { cardId: string }; Body: z.infer<typeof appendMessageSchema> }>(
    '/cards/:cardId/message',
    async (request, reply) => {
      const user = (request as any).user;
      const { cardId } = request.params;

      // Validate message body
      const parseResult = appendMessageSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({ error: 'Invalid message format', details: parseResult.error });
      }

      const messageData = parseResult.data;

      // Verify user has access to this card
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          board: {
            include: {
              project: {
                include: {
                  workspace: { include: { members: true } },
                },
              },
            },
          },
        },
      });

      if (!card) {
        return reply.status(404).send({ error: 'Card not found' });
      }

      const membership = card.board.project.workspace.members.find(
        (m) => m.userId === user.id
      );
      if (!membership || membership.role === 'viewer') {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      // Initialize context if it doesn't exist
      await contextService.initCardContext(cardId, card.board.project.id);

      const message: ConversationMessage = {
        ...messageData,
        timestamp: messageData.timestamp || new Date().toISOString(),
      };

      await contextService.appendCardMessage(cardId, message);

      // Broadcast to SSE subscribers
      const subscribers = sseConnections.get(cardId);
      if (subscribers) {
        const event: SSEEvent = {
          type: 'message',
          timestamp: new Date().toISOString(),
          data: message,
        };
        subscribers.forEach((callback) => callback(event));
      }

      return { success: true, message };
    }
  );

  /**
   * GET /api/context/cards/:cardId/history
   * Get just the conversation history for a card
   */
  app.get<{ Params: { cardId: string }; Querystring: { limit?: string } }>(
    '/cards/:cardId/history',
    async (request, reply) => {
      const user = (request as any).user;
      const { cardId } = request.params;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : undefined;

      // Verify user has access to this card
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          board: {
            include: {
              project: {
                include: {
                  workspace: { include: { members: true } },
                },
              },
            },
          },
        },
      });

      if (!card) {
        return reply.status(404).send({ error: 'Card not found' });
      }

      const membership = card.board.project.workspace.members.find(
        (m) => m.userId === user.id
      );
      if (!membership) {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      const history = await contextService.getCardConversationHistory(cardId, limit);
      return { cardId, history };
    }
  );

  /**
   * DELETE /api/context/cards/:cardId
   * Clear card context
   */
  app.delete<{ Params: { cardId: string } }>(
    '/cards/:cardId',
    async (request, reply) => {
      const user = (request as any).user;
      const { cardId } = request.params;

      // Verify user has access to this card
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          board: {
            include: {
              project: {
                include: {
                  workspace: { include: { members: true } },
                },
              },
            },
          },
        },
      });

      if (!card) {
        return reply.status(404).send({ error: 'Card not found' });
      }

      const membership = card.board.project.workspace.members.find(
        (m) => m.userId === user.id
      );
      if (!membership || membership.role === 'viewer') {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      await contextService.clearCardContext(cardId);
      return { success: true };
    }
  );

  /**
   * GET /api/context/cards/:cardId/stream
   * SSE endpoint for live agent output streaming
   */
  app.get<{ Params: { cardId: string } }>(
    '/cards/:cardId/stream',
    async (request, reply) => {
      const user = (request as any).user;
      const { cardId } = request.params;

      // Verify user has access to this card
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          board: {
            include: {
              project: {
                include: {
                  workspace: { include: { members: true } },
                },
              },
            },
          },
        },
      });

      if (!card) {
        return reply.status(404).send({ error: 'Card not found' });
      }

      const membership = card.board.project.workspace.members.find(
        (m) => m.userId === user.id
      );
      if (!membership) {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      // Set up SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      });

      // Send initial connected event
      const connectedEvent: SSEEvent = {
        type: 'connected',
        timestamp: new Date().toISOString(),
        data: { cardId },
      };
      reply.raw.write(`data: ${JSON.stringify(connectedEvent)}\n\n`);

      // Set up subscriber callback
      const callback = (event: SSEEvent) => {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      // Register this connection
      if (!sseConnections.has(cardId)) {
        sseConnections.set(cardId, new Set());
      }
      sseConnections.get(cardId)!.add(callback);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        const heartbeatEvent: SSEEvent = {
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          data: null,
        };
        try {
          reply.raw.write(`data: ${JSON.stringify(heartbeatEvent)}\n\n`);
        } catch {
          // Connection closed
          clearInterval(heartbeat);
        }
      }, 30000);

      // Clean up on close
      request.raw.on('close', () => {
        clearInterval(heartbeat);
        const subscribers = sseConnections.get(cardId);
        if (subscribers) {
          subscribers.delete(callback);
          if (subscribers.size === 0) {
            sseConnections.delete(cardId);
          }
        }
      });
    }
  );

  /**
   * POST /api/context/cards/:cardId/link-terminal
   * Link a terminal session to a card
   */
  app.post<{ Params: { cardId: string }; Body: z.infer<typeof linkTerminalSchema> }>(
    '/cards/:cardId/link-terminal',
    async (request, reply) => {
      const user = (request as any).user;
      const { cardId } = request.params;

      const parseResult = linkTerminalSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { sessionId } = parseResult.data;

      // Verify user has access to this card
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          board: {
            include: {
              project: {
                include: {
                  workspace: { include: { members: true } },
                },
              },
            },
          },
        },
      });

      if (!card) {
        return reply.status(404).send({ error: 'Card not found' });
      }

      const membership = card.board.project.workspace.members.find(
        (m) => m.userId === user.id
      );
      if (!membership || membership.role === 'viewer') {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      await contextService.linkTerminalToCard(sessionId, cardId);
      return { success: true, cardId, sessionId };
    }
  );

  /**
   * DELETE /api/context/cards/:cardId/link-terminal/:sessionId
   * Unlink a terminal session from a card
   */
  app.delete<{ Params: { cardId: string; sessionId: string } }>(
    '/cards/:cardId/link-terminal/:sessionId',
    async (request, reply) => {
      const user = (request as any).user;
      const { cardId, sessionId } = request.params;

      // Verify user has access to this card
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          board: {
            include: {
              project: {
                include: {
                  workspace: { include: { members: true } },
                },
              },
            },
          },
        },
      });

      if (!card) {
        return reply.status(404).send({ error: 'Card not found' });
      }

      const membership = card.board.project.workspace.members.find(
        (m) => m.userId === user.id
      );
      if (!membership || membership.role === 'viewer') {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      await contextService.unlinkTerminalFromCard(sessionId, cardId);
      return { success: true };
    }
  );

  /**
   * GET /api/context/cards/:cardId/linked-terminals
   * Get all terminal sessions linked to a card
   */
  app.get<{ Params: { cardId: string } }>(
    '/cards/:cardId/linked-terminals',
    async (request, reply) => {
      const user = (request as any).user;
      const { cardId } = request.params;

      // Verify user has access to this card
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          board: {
            include: {
              project: {
                include: {
                  workspace: { include: { members: true } },
                },
              },
            },
          },
        },
      });

      if (!card) {
        return reply.status(404).send({ error: 'Card not found' });
      }

      const membership = card.board.project.workspace.members.find(
        (m) => m.userId === user.id
      );
      if (!membership) {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      const terminals = await contextService.getLinkedTerminalSessions(cardId);
      return { cardId, terminals };
    }
  );

  /**
   * Broadcast an SSE event to all subscribers of a card
   * This is exposed for use by the orchestrator
   */
  app.post<{ Params: { cardId: string }; Body: SSEEvent }>(
    '/cards/:cardId/broadcast',
    async (request, reply) => {
      const { cardId } = request.params;
      const event = request.body as SSEEvent;

      const subscribers = sseConnections.get(cardId);
      if (subscribers && subscribers.size > 0) {
        subscribers.forEach((callback) => callback(event));
        return { success: true, subscriberCount: subscribers.size };
      }

      return { success: true, subscriberCount: 0 };
    }
  );
};
