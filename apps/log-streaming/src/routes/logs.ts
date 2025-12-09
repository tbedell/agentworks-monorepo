import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@agentworks/shared';
import type { LogStreamEvent } from '@agentworks/shared';
import { 
  storeLogEvent, 
  getLogEvents, 
  getRecentLogEvents, 
  deleteLogEvents, 
  getLogStatistics, 
  searchLogEvents 
} from '../lib/log-storage.js';
import { broadcastLogEvent } from '../lib/stream-manager.js';

const logger = createLogger('log-streaming:logs');

const logEventSchema = z.object({
  runId: z.string(),
  type: z.enum(['log', 'status', 'error', 'completion']),
  data: z.object({
    level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
    message: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    status: z.string().optional(),
    error: z.string().optional(),
    result: z.any().optional(),
  }),
  timestamp: z.string().datetime(),
});

const queryLogsSchema = z.object({
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(1000)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(0)).optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
  type: z.enum(['log', 'status', 'error', 'completion']).optional(),
});

const searchLogsSchema = z.object({
  query: z.string().min(1),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(500)).optional(),
  caseSensitive: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
});

export async function logRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Create/send log event
  app.post('/:runId/events', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      const eventData = request.body as any;
      
      const event: LogStreamEvent = {
        runId,
        type: eventData.type,
        data: eventData.data,
        timestamp: eventData.timestamp ? new Date(eventData.timestamp) : new Date(),
      };
      
      // Validate the event
      logEventSchema.parse({
        runId,
        ...eventData,
        timestamp: event.timestamp.toISOString(),
      });
      
      // Broadcast the event (this also stores it)
      await broadcastLogEvent(runId, event);
      
      logger.debug('Log event created', {
        runId,
        type: event.type,
      });
      
      return reply.send({
        success: true,
        event: {
          runId,
          type: event.type,
          timestamp: event.timestamp,
        },
      });
      
    } catch (error) {
      logger.error('Failed to create log event', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid log event data',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'LOG_EVENT_FAILED',
        message: 'Failed to create log event',
      });
    }
  });

  // Get log events for a run
  app.get('/:runId', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      const query = queryLogsSchema.parse(request.query);
      
      const events = await getLogEvents(runId, {
        limit: query.limit || 50,
        offset: query.offset || 0,
        since: query.since ? new Date(query.since) : undefined,
        until: query.until ? new Date(query.until) : undefined,
        level: query.level,
        type: query.type,
      });
      
      return reply.send({
        runId,
        events,
        total: events.length,
        query: {
          limit: query.limit || 50,
          offset: query.offset || 0,
          filters: {
            since: query.since,
            until: query.until,
            level: query.level,
            type: query.type,
          },
        },
      });
      
    } catch (error) {
      logger.error('Failed to get log events', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'LOGS_FETCH_FAILED',
        message: 'Failed to fetch log events',
      });
    }
  });

  // Get recent log events for a run
  app.get('/:runId/recent', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      const { limit } = request.query as { limit?: string };
      
      const limitNum = limit ? parseInt(limit, 10) : 20;
      
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return reply.status(400).send({
          error: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 100',
        });
      }
      
      const events = await getRecentLogEvents(runId, limitNum);
      
      return reply.send({
        runId,
        events,
        limit: limitNum,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get recent log events', { error });
      
      return reply.status(500).send({
        error: 'RECENT_LOGS_FETCH_FAILED',
        message: 'Failed to fetch recent log events',
      });
    }
  });

  // Search log events
  app.get('/:runId/search', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      const searchParams = searchLogsSchema.parse(request.query);
      
      const events = await searchLogEvents(runId, searchParams.query, {
        limit: searchParams.limit || 50,
        caseSensitive: searchParams.caseSensitive || false,
      });
      
      return reply.send({
        runId,
        query: searchParams.query,
        events,
        total: events.length,
        options: {
          limit: searchParams.limit || 50,
          caseSensitive: searchParams.caseSensitive || false,
        },
      });
      
    } catch (error) {
      logger.error('Failed to search log events', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid search parameters',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'SEARCH_FAILED',
        message: 'Failed to search log events',
      });
    }
  });

  // Get log statistics
  app.get('/:runId/stats', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      
      const stats = await getLogStatistics(runId);
      
      return reply.send({
        runId,
        statistics: stats,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get log statistics', { error });
      
      return reply.status(500).send({
        error: 'STATS_FETCH_FAILED',
        message: 'Failed to fetch log statistics',
      });
    }
  });

  // Delete log events for a run
  app.delete('/:runId', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      
      await deleteLogEvents(runId);
      
      logger.info('Log events deleted', { runId });
      
      return reply.send({
        success: true,
        runId,
        message: 'Log events deleted successfully',
      });
      
    } catch (error) {
      logger.error('Failed to delete log events', { error });
      
      return reply.status(500).send({
        error: 'DELETE_FAILED',
        message: 'Failed to delete log events',
      });
    }
  });

  // Batch create log events
  app.post('/batch', async (request, reply) => {
    try {
      const { events } = request.body as { events: any[] };
      
      if (!Array.isArray(events) || events.length === 0) {
        return reply.status(400).send({
          error: 'INVALID_BATCH',
          message: 'Events array is required and must not be empty',
        });
      }
      
      if (events.length > 100) {
        return reply.status(400).send({
          error: 'BATCH_TOO_LARGE',
          message: 'Batch size cannot exceed 100 events',
        });
      }
      
      const results = [];
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < events.length; i++) {
        try {
          const eventData = events[i];
          
          if (!eventData.runId) {
            throw new Error('runId is required');
          }
          
          const event: LogStreamEvent = {
            runId: eventData.runId,
            type: eventData.type,
            data: eventData.data,
            timestamp: eventData.timestamp ? new Date(eventData.timestamp) : new Date(),
          };
          
          // Validate the event
          logEventSchema.parse({
            ...eventData,
            timestamp: event.timestamp.toISOString(),
          });
          
          // Broadcast the event
          await broadcastLogEvent(event.runId, event);
          
          results.push({
            index: i,
            success: true,
            runId: event.runId,
            type: event.type,
          });
          
          successCount++;
          
        } catch (error) {
          results.push({
            index: i,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          
          failCount++;
        }
      }
      
      logger.info('Batch log events processed', {
        total: events.length,
        successful: successCount,
        failed: failCount,
      });
      
      return reply.send({
        results,
        summary: {
          total: events.length,
          successful: successCount,
          failed: failCount,
        },
      });
      
    } catch (error) {
      logger.error('Failed to process batch log events', { error });
      
      return reply.status(500).send({
        error: 'BATCH_FAILED',
        message: 'Failed to process batch log events',
      });
    }
  });

  // Get log export (for downloading logs)
  app.get('/:runId/export', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      const { format = 'json' } = request.query as { format?: string };
      
      if (!['json', 'txt'].includes(format)) {
        return reply.status(400).send({
          error: 'INVALID_FORMAT',
          message: 'Format must be json or txt',
        });
      }
      
      const events = await getLogEvents(runId, { limit: 10000 }); // Large limit for export
      
      if (format === 'json') {
        reply.type('application/json');
        reply.header('Content-Disposition', `attachment; filename="logs-${runId}.json"`);
        return reply.send({
          runId,
          exportedAt: new Date(),
          events,
        });
      } else {
        // Text format
        const textOutput = events.map(event => {
          const timestamp = new Date(event.timestamp).toISOString();
          const level = event.data?.level || event.type;
          const message = event.data?.message || JSON.stringify(event.data);
          return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        }).join('\n');
        
        reply.type('text/plain');
        reply.header('Content-Disposition', `attachment; filename="logs-${runId}.txt"`);
        return reply.send(textOutput);
      }
      
    } catch (error) {
      logger.error('Failed to export logs', { error });
      
      return reply.status(500).send({
        error: 'EXPORT_FAILED',
        message: 'Failed to export logs',
      });
    }
  });
}