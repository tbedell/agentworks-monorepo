import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger, generateCorrelationId } from '@agentworks/shared';
import { 
  createStreamSession, 
  endStreamSession, 
  getStreamSession, 
  updateSessionActivity 
} from '../lib/redis.js';

const logger = createLogger('log-streaming:sessions');

const createSessionSchema = z.object({
  runId: z.string(),
  metadata: z.record(z.any()).optional(),
});

const updateSessionSchema = z.object({
  metadata: z.record(z.any()).optional(),
});

export async function sessionRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Create a new streaming session
  app.post('/', async (request, reply) => {
    try {
      const { runId, metadata } = createSessionSchema.parse(request.body);
      
      const sessionId = `session-${generateCorrelationId()}`;
      
      await createStreamSession(sessionId, {
        runId,
        ...metadata,
      });
      
      logger.info('Streaming session created', {
        sessionId,
        runId,
      });
      
      return reply.send({
        sessionId,
        runId,
        createdAt: new Date(),
        status: 'active',
      });
      
    } catch (error) {
      logger.error('Failed to create streaming session', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid session creation request',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'SESSION_CREATE_FAILED',
        message: 'Failed to create streaming session',
      });
    }
  });

  // Get session details
  app.get('/:sessionId', async (request, reply) => {
    try {
      const { sessionId } = request.params as { sessionId: string };
      
      const session = await getStreamSession(sessionId);
      
      if (!session) {
        return reply.status(404).send({
          error: 'SESSION_NOT_FOUND',
          message: 'Streaming session not found',
        });
      }
      
      return reply.send({
        sessionId,
        ...session,
        uptime: Date.now() - session.createdAt,
        lastActivityAgo: Date.now() - session.lastActivity,
      });
      
    } catch (error) {
      logger.error('Failed to get streaming session', { error });
      
      return reply.status(500).send({
        error: 'SESSION_FETCH_FAILED',
        message: 'Failed to fetch streaming session',
      });
    }
  });

  // Update session metadata
  app.patch('/:sessionId', async (request, reply) => {
    try {
      const { sessionId } = request.params as { sessionId: string };
      const { metadata } = updateSessionSchema.parse(request.body);
      
      const existingSession = await getStreamSession(sessionId);
      
      if (!existingSession) {
        return reply.status(404).send({
          error: 'SESSION_NOT_FOUND',
          message: 'Streaming session not found',
        });
      }
      
      // Update session with new metadata
      const updatedSession = {
        ...existingSession,
        metadata: {
          ...existingSession.metadata,
          ...metadata,
        },
        updatedAt: Date.now(),
      };
      
      await createStreamSession(sessionId, updatedSession);
      await updateSessionActivity(sessionId);
      
      logger.info('Streaming session updated', {
        sessionId,
        metadata,
      });
      
      return reply.send({
        sessionId,
        ...updatedSession,
      });
      
    } catch (error) {
      logger.error('Failed to update streaming session', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid session update request',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'SESSION_UPDATE_FAILED',
        message: 'Failed to update streaming session',
      });
    }
  });

  // Keep session alive (update activity)
  app.post('/:sessionId/keepalive', async (request, reply) => {
    try {
      const { sessionId } = request.params as { sessionId: string };
      
      const session = await getStreamSession(sessionId);
      
      if (!session) {
        return reply.status(404).send({
          error: 'SESSION_NOT_FOUND',
          message: 'Streaming session not found',
        });
      }
      
      if (session.status === 'ended') {
        return reply.status(410).send({
          error: 'SESSION_ENDED',
          message: 'Streaming session has ended',
        });
      }
      
      await updateSessionActivity(sessionId);
      
      return reply.send({
        sessionId,
        lastActivity: new Date(),
        status: 'active',
      });
      
    } catch (error) {
      logger.error('Failed to update session activity', { error });
      
      return reply.status(500).send({
        error: 'KEEPALIVE_FAILED',
        message: 'Failed to update session activity',
      });
    }
  });

  // End a streaming session
  app.delete('/:sessionId', async (request, reply) => {
    try {
      const { sessionId } = request.params as { sessionId: string };
      
      const session = await getStreamSession(sessionId);
      
      if (!session) {
        return reply.status(404).send({
          error: 'SESSION_NOT_FOUND',
          message: 'Streaming session not found',
        });
      }
      
      await endStreamSession(sessionId);
      
      logger.info('Streaming session ended', {
        sessionId,
        duration: Date.now() - session.createdAt,
      });
      
      return reply.send({
        sessionId,
        status: 'ended',
        endedAt: new Date(),
        duration: Date.now() - session.createdAt,
      });
      
    } catch (error) {
      logger.error('Failed to end streaming session', { error });
      
      return reply.status(500).send({
        error: 'SESSION_END_FAILED',
        message: 'Failed to end streaming session',
      });
    }
  });

  // Get all active sessions
  app.get('/', async (request, reply) => {
    try {
      // This would typically query Redis for all active sessions
      // For now, return a placeholder implementation
      
      return reply.send({
        sessions: [],
        total: 0,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get all sessions', { error });
      
      return reply.status(500).send({
        error: 'SESSIONS_FETCH_FAILED',
        message: 'Failed to fetch all sessions',
      });
    }
  });

  // Get sessions by run ID
  app.get('/run/:runId', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      
      // This would typically query Redis for sessions associated with the run
      // For now, return a placeholder implementation
      
      return reply.send({
        runId,
        sessions: [],
        total: 0,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get sessions by run ID', { error });
      
      return reply.status(500).send({
        error: 'RUN_SESSIONS_FETCH_FAILED',
        message: 'Failed to fetch sessions for run',
      });
    }
  });

  // Get session metrics
  app.get('/:sessionId/metrics', async (request, reply) => {
    try {
      const { sessionId } = request.params as { sessionId: string };
      
      const session = await getStreamSession(sessionId);
      
      if (!session) {
        return reply.status(404).send({
          error: 'SESSION_NOT_FOUND',
          message: 'Streaming session not found',
        });
      }
      
      const now = Date.now();
      const uptime = now - session.createdAt;
      const timeSinceLastActivity = now - session.lastActivity;
      
      const metrics = {
        sessionId,
        status: session.status,
        uptime,
        lastActivity: {
          timestamp: new Date(session.lastActivity),
          ago: timeSinceLastActivity,
        },
        created: {
          timestamp: new Date(session.createdAt),
          ago: uptime,
        },
        ...(session.endedAt && {
          ended: {
            timestamp: new Date(session.endedAt),
            duration: session.endedAt - session.createdAt,
          },
        }),
      };
      
      return reply.send({
        sessionId,
        metrics,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get session metrics', { error });
      
      return reply.status(500).send({
        error: 'METRICS_FETCH_FAILED',
        message: 'Failed to fetch session metrics',
      });
    }
  });
}