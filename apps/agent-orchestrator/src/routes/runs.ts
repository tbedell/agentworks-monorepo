import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@agentworks/shared';
import { getRunStatus, getActiveRuns, getAgentState } from '../lib/redis.js';
import { getLogStreamingClient } from '../lib/log-streaming-client.js';

const logger = createLogger('agent-orchestrator:runs');

const querySchema = z.object({
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(0)).optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
});

export async function runRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Get all active runs
  app.get('/active', async (request, reply) => {
    try {
      const activeRuns = await getActiveRuns();
      
      // Enrich with current status
      const enrichedRuns = await Promise.all(
        activeRuns.map(async (run) => {
          const status = await getRunStatus(run.runId);
          return {
            ...run,
            currentStatus: status,
          };
        })
      );
      
      return reply.send({
        runs: enrichedRuns,
        total: enrichedRuns.length,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get active runs', { error });
      
      return reply.status(500).send({
        error: 'ACTIVE_RUNS_FETCH_FAILED',
        message: 'Failed to fetch active runs',
      });
    }
  });

  // Get run status by ID
  app.get('/:runId/status', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      
      const status = await getRunStatus(runId);
      
      if (!status) {
        return reply.status(404).send({
          error: 'RUN_NOT_FOUND',
          message: 'Run not found or expired',
        });
      }
      
      return reply.send({
        runId,
        ...status,
      });
      
    } catch (error) {
      logger.error('Failed to get run status', { error, runId: request.params });
      
      return reply.status(500).send({
        error: 'STATUS_FETCH_FAILED',
        message: 'Failed to fetch run status',
      });
    }
  });

  // Get run state/context
  app.get('/:runId/state', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      
      const state = await getAgentState(runId);
      
      if (!state) {
        return reply.status(404).send({
          error: 'STATE_NOT_FOUND',
          message: 'Run state not found or expired',
        });
      }
      
      return reply.send({
        runId,
        ...state,
      });
      
    } catch (error) {
      logger.error('Failed to get run state', { error, runId: request.params });
      
      return reply.status(500).send({
        error: 'STATE_FETCH_FAILED',
        message: 'Failed to fetch run state',
      });
    }
  });

  // Get run logs
  app.get('/:runId/logs', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      const query = querySchema.parse(request.query);
      
      const logStreaming = getLogStreamingClient();
      
      const logs = await logStreaming.getLogs(runId, {
        limit: query.limit || 50,
        level: undefined, // Can be extended to filter by level
        since: undefined, // Can be extended to filter by time
      });
      
      return reply.send({
        runId,
        logs,
        total: logs.length,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get run logs', { error, runId: request.params });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'LOGS_FETCH_FAILED',
        message: 'Failed to fetch run logs',
      });
    }
  });

  // Get run summary/details
  app.get('/:runId', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      
      const [status, state] = await Promise.all([
        getRunStatus(runId),
        getAgentState(runId),
      ]);
      
      if (!status && !state) {
        return reply.status(404).send({
          error: 'RUN_NOT_FOUND',
          message: 'Run not found or expired',
        });
      }
      
      // Get recent logs
      let recentLogs = [];
      try {
        const logStreaming = getLogStreamingClient();
        recentLogs = await logStreaming.getLogs(runId, { limit: 10 });
      } catch (error) {
        logger.warn('Failed to fetch recent logs for run summary', { runId, error });
      }
      
      return reply.send({
        runId,
        status,
        state,
        recentLogs,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get run details', { error, runId: request.params });
      
      return reply.status(500).send({
        error: 'RUN_FETCH_FAILED',
        message: 'Failed to fetch run details',
      });
    }
  });

  // Cancel/stop a run (if supported)
  app.post('/:runId/cancel', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      
      // Check if run exists and is active
      const status = await getRunStatus(runId);
      
      if (!status) {
        return reply.status(404).send({
          error: 'RUN_NOT_FOUND',
          message: 'Run not found or expired',
        });
      }
      
      if (status.status === 'completed' || status.status === 'failed') {
        return reply.status(400).send({
          error: 'RUN_NOT_ACTIVE',
          message: 'Cannot cancel a run that is already completed or failed',
        });
      }
      
      // TODO: Implement actual cancellation logic
      // This would typically involve:
      // 1. Setting a cancellation flag in Redis
      // 2. Having the executor check for cancellation during execution
      // 3. Gracefully stopping the current operation
      
      logger.info('Run cancellation requested', { runId });
      
      return reply.send({
        runId,
        message: 'Cancellation request submitted',
        status: 'cancellation_requested',
      });
      
    } catch (error) {
      logger.error('Failed to cancel run', { error, runId: request.params });
      
      return reply.status(500).send({
        error: 'CANCEL_FAILED',
        message: 'Failed to cancel run',
      });
    }
  });

  // Get run metrics/statistics
  app.get('/:runId/metrics', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      
      const [status, state] = await Promise.all([
        getRunStatus(runId),
        getAgentState(runId),
      ]);
      
      if (!status) {
        return reply.status(404).send({
          error: 'RUN_NOT_FOUND',
          message: 'Run not found or expired',
        });
      }
      
      // Calculate metrics
      const metrics = {
        runId,
        status: status.status,
        startTime: state?.startTime,
        endTime: status.status === 'completed' || status.status === 'failed' ? status.timestamp : null,
        duration: calculateDuration(state?.startTime, status.timestamp, status.status),
        agentId: state?.context?.card?.assignee?.id,
        cardId: state?.context?.card?.id,
        projectId: state?.context?.project?.id,
        workspaceId: state?.context?.workspace?.id,
      };
      
      return reply.send(metrics);
      
    } catch (error) {
      logger.error('Failed to get run metrics', { error, runId: request.params });
      
      return reply.status(500).send({
        error: 'METRICS_FETCH_FAILED',
        message: 'Failed to fetch run metrics',
      });
    }
  });
}

function calculateDuration(startTime?: number, endTime?: number, status?: string): number | null {
  if (!startTime) return null;
  
  const end = endTime || (status === 'running' ? Date.now() : null);
  
  if (!end) return null;
  
  return end - startTime;
}