import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger, AGENT_NAMES } from '@agentworks/shared';
import { executeAgent, getExecutorStatus } from '../lib/executor.js';
import { validateAgentName, isAgentAllowedInLane } from '../lib/agent-registry.js';
import { getCoreServiceClient } from '../lib/core-service-client.js';

const logger = createLogger('agent-orchestrator:execution');

// Internal service token for service-to-service communication
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'internal-service-token-dev';

const executeAgentSchema = z.object({
  cardId: z.string().uuid(),
  agentId: z.enum(AGENT_NAMES),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string(),
  context: z.record(z.any()).optional(),
  // BYOA provider selection overrides
  provider: z.string().optional(),
  model: z.string().optional(),
  tenantId: z.string().optional(),
});

const authenticateSchema = z.object({
  token: z.string(),
});

function isInternalServiceToken(token: string): boolean {
  return token === INTERNAL_SERVICE_TOKEN;
}

export async function executionRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Execute agent on card
  app.post('/', async (request, reply) => {
    try {
      const executionRequest = executeAgentSchema.parse(request.body);
      
      // Validate agent name
      if (!validateAgentName(executionRequest.agentId)) {
        return reply.status(400).send({
          error: 'INVALID_AGENT',
          message: 'Invalid agent name',
          validAgents: AGENT_NAMES,
        });
      }
      
      // Get authentication token from headers
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: 'MISSING_AUTH',
          message: 'Authorization token required',
        });
      }
      
      const token = authHeader.split(' ')[1];

      // Check if this is an internal service token (service-to-service communication)
      const isInternalCall = isInternalServiceToken(token);
      const coreService = getCoreServiceClient();

      if (!isInternalCall) {
        // Validate authentication with core service for user tokens
        try {
          await coreService.validateAuth(token);
        } catch (error) {
          return reply.status(401).send({
            error: 'INVALID_AUTH',
            message: 'Invalid or expired token',
          });
        }
      }

      logger.debug('Authentication validated', { isInternalCall });

      // Get card details to validate lane permissions
      const card = await coreService.getCard(executionRequest.cardId);
      if (!card) {
        return reply.status(404).send({
          error: 'CARD_NOT_FOUND',
          message: 'Card not found',
        });
      }
      
      // Check if agent is allowed in the card's lane
      const allowed = await isAgentAllowedInLane(
        executionRequest.agentId, 
        card.lane.laneNumber
      );
      
      if (!allowed) {
        return reply.status(403).send({
          error: 'AGENT_NOT_ALLOWED',
          message: `Agent ${executionRequest.agentId} is not allowed in lane ${card.lane.laneNumber}`,
        });
      }
      
      // Execute agent
      const result = await executeAgent(executionRequest);
      
      logger.info('Agent execution started', {
        runId: result.runId,
        cardId: executionRequest.cardId,
        agentId: executionRequest.agentId,
        userId: executionRequest.userId,
      });
      
      return reply.send(result);
      
    } catch (error) {
      logger.error('Failed to execute agent', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid execution request',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'EXECUTION_FAILED',
        message: 'Failed to start agent execution',
      });
    }
  });

  // Get executor status and metrics
  app.get('/status', async (request, reply) => {
    try {
      const status = await getExecutorStatus();
      
      return reply.send({
        ...status,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed to get executor status', { error });
      
      return reply.status(500).send({
        error: 'STATUS_FETCH_FAILED',
        message: 'Failed to fetch executor status',
      });
    }
  });

  // Validate execution prerequisites
  app.post('/validate', async (request, reply) => {
    try {
      const validationRequest = executeAgentSchema.parse(request.body);
      
      // Validate agent name
      if (!validateAgentName(validationRequest.agentId)) {
        return reply.send({
          valid: false,
          error: 'INVALID_AGENT',
          message: 'Invalid agent name',
        });
      }
      
      // Get card details
      const coreService = getCoreServiceClient();
      const card = await coreService.getCard(validationRequest.cardId);
      
      if (!card) {
        return reply.send({
          valid: false,
          error: 'CARD_NOT_FOUND',
          message: 'Card not found',
        });
      }
      
      // Check lane permissions
      const allowed = await isAgentAllowedInLane(
        validationRequest.agentId, 
        card.lane.laneNumber
      );
      
      if (!allowed) {
        return reply.send({
          valid: false,
          error: 'AGENT_NOT_ALLOWED',
          message: `Agent ${validationRequest.agentId} is not allowed in lane ${card.lane.laneNumber}`,
        });
      }
      
      // Check if card is in a valid state for execution
      const validStatuses = ['Ready', 'InProgress', 'Blocked'];
      if (!validStatuses.includes(card.status)) {
        return reply.send({
          valid: false,
          error: 'INVALID_CARD_STATUS',
          message: `Card must be in one of these statuses: ${validStatuses.join(', ')}`,
        });
      }
      
      return reply.send({
        valid: true,
        message: 'Execution prerequisites validated successfully',
        cardLane: card.lane.name,
        agentCapabilities: await getAgentCapabilities(validationRequest.agentId),
      });
      
    } catch (error) {
      logger.error('Failed to validate execution', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid validation request',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'VALIDATION_FAILED',
        message: 'Failed to validate execution prerequisites',
      });
    }
  });

  // Get execution history for a card
  app.get('/card/:cardId/history', async (request, reply) => {
    try {
      const { cardId } = request.params as { cardId: string };
      
      // TODO: Implement execution history retrieval
      // This would typically query the core service for agent runs
      // associated with the card
      
      return reply.send({
        cardId,
        runs: [], // Placeholder
        total: 0,
      });
      
    } catch (error) {
      logger.error('Failed to get execution history', { error });
      
      return reply.status(500).send({
        error: 'HISTORY_FETCH_FAILED',
        message: 'Failed to fetch execution history',
      });
    }
  });

  // Get real-time execution metrics
  app.get('/metrics', async (request, reply) => {
    try {
      // TODO: Implement comprehensive metrics
      const status = await getExecutorStatus();
      
      const metrics = {
        executor: status,
        timestamp: new Date(),
        // Add more metrics as needed
      };
      
      return reply.send(metrics);
      
    } catch (error) {
      logger.error('Failed to get execution metrics', { error });
      
      return reply.status(500).send({
        error: 'METRICS_FETCH_FAILED',
        message: 'Failed to fetch execution metrics',
      });
    }
  });
}

async function getAgentCapabilities(agentId: string): Promise<any> {
  // TODO: Get detailed agent capabilities from agent registry
  return {
    agentId,
    // Placeholder capabilities
  };
}