import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@agentworks/shared';
import type { BillingUsageEvent } from '@agentworks/shared';
import { getDatabase } from '../lib/database.js';
import { addUsageEvent, checkBillingRateLimit } from '../lib/redis.js';

const logger = createLogger('billing-service:usage');

const recordUsageSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  cardId: z.string().uuid().optional(),
  agentId: z.string(),
  runId: z.string(),
  provider: z.enum(['openai', 'anthropic', 'google', 'nanobanana']),
  model: z.string(),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  cost: z.number().min(0),
  price: z.number().min(0),
  timestamp: z.string().datetime().optional(),
});

const queryUsageSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  provider: z.enum(['openai', 'anthropic', 'google', 'nanobanana']).optional(),
  model: z.string().optional(),
  projectId: z.string().uuid().optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(1000)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(0)).optional(),
});

export async function usageRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Record usage event
  app.post('/events', async (request, reply) => {
    try {
      const usageData = recordUsageSchema.parse(request.body);
      
      // Check rate limit
      const allowed = await checkBillingRateLimit(usageData.workspaceId, 'record_usage', 100, 60);
      if (!allowed) {
        return reply.status(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many usage recording requests',
        });
      }
      
      const event: BillingUsageEvent = {
        ...usageData,
        timestamp: usageData.timestamp ? new Date(usageData.timestamp) : new Date(),
      };
      
      // Add to processing queue
      await addUsageEvent(event);
      
      logger.info('Usage event recorded', {
        workspaceId: event.workspaceId,
        runId: event.runId,
        provider: event.provider,
        cost: event.cost,
        price: event.price,
      });
      
      return reply.send({
        success: true,
        eventId: `event-${Date.now()}`,
        message: 'Usage event queued for processing',
      });
      
    } catch (error) {
      logger.error('Failed to record usage event', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid usage event data',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'USAGE_RECORD_FAILED',
        message: 'Failed to record usage event',
      });
    }
  });

  // Get usage events for workspace
  app.get('/workspace/:workspaceId/events', async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const query = queryUsageSchema.parse(request.query);
      
      const db = getDatabase();
      
      const endDate = query.endDate ? new Date(query.endDate) : new Date();
      const startDate = query.startDate ? new Date(query.startDate) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const where: any = {
        workspaceId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      };
      
      if (query.provider) {
        where.provider = query.provider;
      }
      
      if (query.model) {
        where.model = query.model;
      }
      
      if (query.projectId) {
        where.projectId = query.projectId;
      }
      
      const [events, total] = await Promise.all([
        db.usageEvent.findMany({
          where,
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: query.limit || 50,
          skip: query.offset || 0,
        }),
        db.usageEvent.count({ where }),
      ]);
      
      return reply.send({
        workspaceId,
        events,
        total,
        period: {
          start: startDate,
          end: endDate,
        },
        query: {
          limit: query.limit || 50,
          offset: query.offset || 0,
          filters: {
            provider: query.provider,
            model: query.model,
            projectId: query.projectId,
          },
        },
      });
      
    } catch (error) {
      logger.error('Failed to get usage events', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'EVENTS_FETCH_FAILED',
        message: 'Failed to fetch usage events',
      });
    }
  });

  // Get usage statistics for workspace
  app.get('/workspace/:workspaceId/stats', async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const { days = '30' } = request.query as { days?: string };
      
      const daysNum = parseInt(days, 10);
      if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
        return reply.status(400).send({
          error: 'INVALID_DAYS',
          message: 'Days must be between 1 and 365',
        });
      }
      
      const db = getDatabase();
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - daysNum * 24 * 60 * 60 * 1000);
      
      const [
        totalStats,
        providerStats,
        modelStats,
        dailyStats,
      ] = await Promise.all([
        // Total statistics
        db.usageEvent.aggregate({
          where: {
            workspaceId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            inputTokens: true,
            outputTokens: true,
            cost: true,
            price: true,
          },
          _count: true,
        }),
        
        // Provider breakdown
        db.usageEvent.groupBy({
          by: ['provider'],
          where: {
            workspaceId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            inputTokens: true,
            outputTokens: true,
            cost: true,
            price: true,
          },
          _count: true,
        }),
        
        // Model breakdown
        db.usageEvent.groupBy({
          by: ['model'],
          where: {
            workspaceId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            inputTokens: true,
            outputTokens: true,
            cost: true,
            price: true,
          },
          _count: true,
        }),
        
        // Daily breakdown (last 7 days for detailed view)
        db.$queryRaw`
          SELECT 
            DATE(created_at) as date,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(cost) as cost,
            SUM(price) as price,
            COUNT(*) as count
          FROM "UsageEvent"
          WHERE workspace_id = ${workspaceId}
            AND created_at >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
            AND created_at <= ${endDate}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `,
      ]);
      
      return reply.send({
        workspaceId,
        period: {
          start: startDate,
          end: endDate,
          days: daysNum,
        },
        totals: {
          requests: totalStats._count,
          inputTokens: totalStats._sum.inputTokens || 0,
          outputTokens: totalStats._sum.outputTokens || 0,
          totalTokens: (totalStats._sum.inputTokens || 0) + (totalStats._sum.outputTokens || 0),
          cost: totalStats._sum.cost || 0,
          price: totalStats._sum.price || 0,
        },
        breakdowns: {
          byProvider: providerStats,
          byModel: modelStats,
          daily: dailyStats,
        },
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get usage statistics', { error });
      
      return reply.status(500).send({
        error: 'STATS_FETCH_FAILED',
        message: 'Failed to fetch usage statistics',
      });
    }
  });

  // Get usage for specific project
  app.get('/project/:projectId/stats', async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string };
      const { days = '30' } = request.query as { days?: string };
      
      const daysNum = parseInt(days, 10);
      if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
        return reply.status(400).send({
          error: 'INVALID_DAYS',
          message: 'Days must be between 1 and 365',
        });
      }
      
      const db = getDatabase();
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - daysNum * 24 * 60 * 60 * 1000);
      
      const [project, stats] = await Promise.all([
        db.project.findUnique({
          where: { id: projectId },
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        
        db.usageEvent.aggregate({
          where: {
            projectId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            inputTokens: true,
            outputTokens: true,
            cost: true,
            price: true,
          },
          _count: true,
        }),
      ]);
      
      if (!project) {
        return reply.status(404).send({
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }
      
      return reply.send({
        project: {
          id: project.id,
          name: project.name,
          workspace: project.workspace,
        },
        period: {
          start: startDate,
          end: endDate,
          days: daysNum,
        },
        usage: {
          requests: stats._count,
          inputTokens: stats._sum.inputTokens || 0,
          outputTokens: stats._sum.outputTokens || 0,
          totalTokens: (stats._sum.inputTokens || 0) + (stats._sum.outputTokens || 0),
          cost: stats._sum.cost || 0,
          price: stats._sum.price || 0,
        },
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get project usage', { error });
      
      return reply.status(500).send({
        error: 'PROJECT_USAGE_FETCH_FAILED',
        message: 'Failed to fetch project usage',
      });
    }
  });

  // Get usage for specific run
  app.get('/run/:runId', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      
      const db = getDatabase();
      
      const usageEvent = await db.usageEvent.findUnique({
        where: { runId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      if (!usageEvent) {
        return reply.status(404).send({
          error: 'USAGE_NOT_FOUND',
          message: 'Usage event not found for this run',
        });
      }
      
      return reply.send({
        runId,
        usage: usageEvent,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get run usage', { error });
      
      return reply.status(500).send({
        error: 'RUN_USAGE_FETCH_FAILED',
        message: 'Failed to fetch run usage',
      });
    }
  });

  // Batch record usage events
  app.post('/events/batch', async (request, reply) => {
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
          const usageData = recordUsageSchema.parse(events[i]);
          
          // Check rate limit for each workspace
          const allowed = await checkBillingRateLimit(usageData.workspaceId, 'record_usage', 100, 60);
          if (!allowed) {
            throw new Error('Rate limit exceeded');
          }
          
          const event: BillingUsageEvent = {
            ...usageData,
            timestamp: usageData.timestamp ? new Date(usageData.timestamp) : new Date(),
          };
          
          await addUsageEvent(event);
          
          results.push({
            index: i,
            success: true,
            runId: event.runId,
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
      
      logger.info('Batch usage events processed', {
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
      logger.error('Failed to process batch usage events', { error });
      
      return reply.status(500).send({
        error: 'BATCH_FAILED',
        message: 'Failed to process batch usage events',
      });
    }
  });
}