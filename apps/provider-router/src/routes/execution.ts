import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger, PROVIDERS } from '@agentworks/shared';
import type { ProviderRequest, ProviderResponse } from '@agentworks/shared';
import { executeRequest, isProviderAvailable, getAvailableModels } from '../lib/providers.js';
import { trackUsage, recordProviderLatency, recordProviderError } from '../lib/usage-tracker.js';
import { checkRateLimit } from '../lib/redis.js';

const logger = createLogger('provider-router:execution');

const executeRequestSchema = z.object({
  provider: z.enum(PROVIDERS),
  model: z.string().min(1),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32000).optional(),
  stream: z.boolean().optional(),
  workspaceId: z.string().uuid(),
  metadata: z.record(z.any()).optional(),
});

const batchRequestSchema = z.object({
  requests: z.array(executeRequestSchema).min(1).max(10), // Limit batch size
});

export async function executionRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Single execution endpoint
  app.post('/', async (request, reply) => {
    const startTime = Date.now();
    let provider: string | undefined;
    
    try {
      const requestData = executeRequestSchema.parse(request.body);
      provider = requestData.provider;
      
      // Check rate limits
      const rateLimit = await checkRateLimit(requestData.workspaceId, 100, 3600);
      if (!rateLimit.allowed) {
        return reply.status(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for workspace',
          resetTime: rateLimit.resetTime,
          remaining: rateLimit.remaining,
        });
      }
      
      // Add rate limit headers
      reply.header('X-RateLimit-Limit', '100');
      reply.header('X-RateLimit-Remaining', rateLimit.remaining.toString());
      reply.header('X-RateLimit-Reset', rateLimit.resetTime.toString());
      
      // Check if provider is available
      if (!isProviderAvailable(requestData.provider)) {
        return reply.status(400).send({
          error: 'PROVIDER_NOT_AVAILABLE',
          message: `Provider ${requestData.provider} is not available or not configured`,
        });
      }
      
      // Validate model for provider
      const availableModels = getAvailableModels(requestData.provider);
      if (availableModels.length > 0 && !availableModels.includes(requestData.model)) {
        return reply.status(400).send({
          error: 'MODEL_NOT_AVAILABLE',
          message: `Model ${requestData.model} is not available for provider ${requestData.provider}`,
          availableModels,
        });
      }
      
      logger.info('Processing execution request', {
        provider: requestData.provider,
        model: requestData.model,
        workspaceId: requestData.workspaceId,
        messageCount: requestData.messages.length,
      });
      
      // Execute request
      const response = await executeRequest(requestData);
      
      // Record latency
      const latency = Date.now() - startTime;
      await recordProviderLatency(requestData.provider, latency);
      
      // Track usage
      await trackUsage(requestData, response, {
        latency,
        requestId: generateRequestId(),
      });
      
      logger.info('Execution completed successfully', {
        provider: requestData.provider,
        model: requestData.model,
        latency,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      });
      
      return reply.send(response);
      
    } catch (error) {
      const latency = Date.now() - startTime;
      
      if (provider) {
        await recordProviderError(provider, error as any);
      }
      
      const err = error as any;
      logger.error('Execution failed', {
        provider,
        error: err.message,
        latency,
      });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid execution request',
          details: error.errors,
        });
      }
      
      // Check for specific provider errors
      if (err.message.includes('rate limit') || err.message.includes('quota')) {
        return reply.status(429).send({
          error: 'PROVIDER_RATE_LIMIT',
          message: 'Provider rate limit exceeded',
        });
      }
      
      if (err.message.includes('authentication') || err.message.includes('unauthorized')) {
        return reply.status(401).send({
          error: 'PROVIDER_AUTH_ERROR',
          message: 'Provider authentication failed',
        });
      }
      
      return reply.status(500).send({
        error: 'EXECUTION_FAILED',
        message: err.message || 'Request execution failed',
      });
    }
  });

  // Batch execution endpoint
  app.post('/batch', async (request, reply) => {
    try {
      const { requests } = batchRequestSchema.parse(request.body);
      
      logger.info('Processing batch execution request', {
        requestCount: requests.length,
      });
      
      // Execute all requests in parallel with error handling
      const results = await Promise.allSettled(
        requests.map(async (req, index) => {
          try {
            const startTime = Date.now();
            
            // Check rate limits for each workspace
            const rateLimit = await checkRateLimit(req.workspaceId, 100, 3600);
            if (!rateLimit.allowed) {
              throw new Error('Rate limit exceeded for workspace');
            }
            
            const response = await executeRequest(req);
            const latency = Date.now() - startTime;
            
            await recordProviderLatency(req.provider, latency);
            await trackUsage(req, response, {
              latency,
              requestId: generateRequestId(),
              batchIndex: index,
            });
            
            return {
              index,
              success: true,
              response,
            };
          } catch (error) {
            await recordProviderError(req.provider, error as any);
            
            const err = error as any;
            return {
              index,
              success: false,
              error: {
                message: err.message,
                provider: req.provider,
              },
            };
          }
        })
      );
      
      const responses = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            index,
            success: false,
            error: {
              message: result.reason?.message || 'Unknown error',
            },
          };
        }
      });
      
      const successful = responses.filter(r => r.success).length;
      const failed = responses.length - successful;
      
      logger.info('Batch execution completed', {
        total: requests.length,
        successful,
        failed,
      });
      
      return reply.send({
        results: responses,
        summary: {
          total: requests.length,
          successful,
          failed,
        },
      });
      
    } catch (error) {
      logger.error('Batch execution failed', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid batch execution request',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'BATCH_EXECUTION_FAILED',
        message: 'Batch execution failed',
      });
    }
  });

  // Stream execution endpoint (for future implementation)
  app.post('/stream', async (request, reply) => {
    return reply.status(501).send({
      error: 'NOT_IMPLEMENTED',
      message: 'Streaming execution not yet implemented',
    });
  });

  // Execution validation endpoint
  app.post('/validate', async (request, reply) => {
    try {
      const requestData = executeRequestSchema.parse(request.body);
      
      // Check if provider is available
      if (!isProviderAvailable(requestData.provider)) {
        return reply.send({
          valid: false,
          error: 'PROVIDER_NOT_AVAILABLE',
          message: `Provider ${requestData.provider} is not available`,
        });
      }
      
      // Check rate limits
      const rateLimit = await checkRateLimit(requestData.workspaceId, 100, 3600);
      if (!rateLimit.allowed) {
        return reply.send({
          valid: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit would be exceeded',
          resetTime: rateLimit.resetTime,
        });
      }
      
      // Validate model
      const availableModels = getAvailableModels(requestData.provider);
      if (availableModels.length > 0 && !availableModels.includes(requestData.model)) {
        return reply.send({
          valid: false,
          error: 'MODEL_NOT_AVAILABLE',
          message: `Model ${requestData.model} is not available`,
          availableModels,
        });
      }
      
      return reply.send({
        valid: true,
        provider: requestData.provider,
        model: requestData.model,
        estimatedCost: estimateRequestCost(requestData),
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime,
        },
      });
      
    } catch (error) {
      logger.error('Execution validation failed', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid validation request',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'VALIDATION_FAILED',
        message: 'Validation failed',
      });
    }
  });
}

function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function estimateRequestCost(request: any): number {
  // Rough estimation based on message length
  const totalChars = request.messages.reduce((sum: number, msg: any) => sum + msg.content.length, 0);
  const estimatedTokens = Math.ceil(totalChars / 3); // Rough approximation
  
  // Use average cost of $1 per 1M tokens
  return (estimatedTokens / 1_000_000) * 1.0;
}