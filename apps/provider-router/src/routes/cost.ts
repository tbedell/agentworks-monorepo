import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger, calculateBilling, PRICING_MULTIPLIER, PRICING_INCREMENT } from '@agentworks/shared';
import { PROVIDER_COSTS, isProviderAvailable, getAvailableModels } from '../lib/providers.js';
import { getWorkspaceUsage } from '../lib/usage-tracker.js';

const logger = createLogger('provider-router:cost');

const calculateCostSchema = z.object({
  provider: z.string(),
  model: z.string(),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
});

const estimateCostSchema = z.object({
  provider: z.string(),
  model: z.string(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
  estimatedOutputTokens: z.number().int().min(1).optional(),
});

const workspaceUsageSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export async function costRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Calculate exact cost for token usage
  app.post('/calculate', async (request, reply) => {
    try {
      const { provider, model, inputTokens, outputTokens } = calculateCostSchema.parse(request.body);
      
      if (!isProviderAvailable(provider as any)) {
        return reply.status(400).send({
          error: 'PROVIDER_NOT_AVAILABLE',
          message: `Provider ${provider} is not available`,
        });
      }
      
      const modelCosts = PROVIDER_COSTS[provider]?.[model];
      
      if (!modelCosts) {
        return reply.status(400).send({
          error: 'MODEL_COSTS_NOT_AVAILABLE',
          message: `Cost information not available for model ${model} on provider ${provider}`,
        });
      }
      
      // Calculate base cost
      const inputCost = (inputTokens / 1_000_000) * modelCosts.input;
      const outputCost = (outputTokens / 1_000_000) * modelCosts.output;
      const totalBaseCost = inputCost + outputCost;
      
      // Apply AgentWorks markup and rounding
      const { cost, price } = calculateBilling(
        inputTokens,
        outputTokens,
        totalBaseCost * 1_000_000 / (inputTokens + outputTokens)
      );
      
      return reply.send({
        provider,
        model,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
        costs: {
          baseCost: totalBaseCost,
          cost, // Our cost
          price, // Customer price (with markup)
          markup: PRICING_MULTIPLIER,
          increment: PRICING_INCREMENT,
        },
        breakdown: {
          inputCost: (inputTokens / 1_000_000) * modelCosts.input,
          outputCost: (outputTokens / 1_000_000) * modelCosts.output,
          inputRate: modelCosts.input,
          outputRate: modelCosts.output,
        },
        currency: 'USD',
      });
      
    } catch (error) {
      logger.error('Failed to calculate cost', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid cost calculation request',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'COST_CALCULATION_FAILED',
        message: 'Failed to calculate cost',
      });
    }
  });

  // Estimate cost for a request before execution
  app.post('/estimate', async (request, reply) => {
    try {
      const { provider, model, messages, estimatedOutputTokens = 1000 } = estimateCostSchema.parse(request.body);
      
      if (!isProviderAvailable(provider as any)) {
        return reply.status(400).send({
          error: 'PROVIDER_NOT_AVAILABLE',
          message: `Provider ${provider} is not available`,
        });
      }
      
      const modelCosts = PROVIDER_COSTS[provider]?.[model];
      
      if (!modelCosts) {
        return reply.status(400).send({
          error: 'MODEL_COSTS_NOT_AVAILABLE',
          message: `Cost information not available for model ${model} on provider ${provider}`,
        });
      }
      
      // Estimate input tokens (rough approximation: 1 token ≈ 3-4 characters)
      const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
      const estimatedInputTokens = Math.ceil(totalChars / 3.5);
      
      // Calculate estimated cost
      const inputCost = (estimatedInputTokens / 1_000_000) * modelCosts.input;
      const outputCost = (estimatedOutputTokens / 1_000_000) * modelCosts.output;
      const totalBaseCost = inputCost + outputCost;
      
      const { cost, price } = calculateBilling(
        estimatedInputTokens,
        estimatedOutputTokens,
        totalBaseCost * 1_000_000 / (estimatedInputTokens + estimatedOutputTokens)
      );
      
      return reply.send({
        provider,
        model,
        estimate: {
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
          totalTokens: estimatedInputTokens + estimatedOutputTokens,
        },
        costs: {
          baseCost: totalBaseCost,
          cost,
          price,
          markup: PRICING_MULTIPLIER,
          range: {
            min: price * 0.7, // Conservative estimate
            max: price * 1.5, // Liberal estimate
          },
        },
        accuracy: 'estimate',
        notes: [
          'Token count is estimated based on character count',
          'Actual usage may vary based on tokenization',
          'Output tokens are estimated and may differ significantly',
        ],
      });
      
    } catch (error) {
      logger.error('Failed to estimate cost', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid cost estimation request',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'COST_ESTIMATION_FAILED',
        message: 'Failed to estimate cost',
      });
    }
  });

  // Get cost breakdown for all available models
  app.get('/models', async (request, reply) => {
    try {
      const allCosts: any = {};
      
      for (const [provider, models] of Object.entries(PROVIDER_COSTS)) {
        if (!isProviderAvailable(provider as any)) {
          continue;
        }
        
        allCosts[provider] = {};
        
        for (const [model, costs] of Object.entries(models)) {
          // Calculate price per 1K tokens for easy comparison
          const { cost: cost1k, price: price1k } = calculateBilling(500, 500, (costs.input + costs.output) / 2);
          
          allCosts[provider][model] = {
            baseCosts: costs,
            perThousandTokens: {
              cost: cost1k,
              price: price1k,
            },
            category: categorizeModelByCost(costs),
            currency: 'USD',
          };
        }
      }
      
      return reply.send({
        costs: allCosts,
        metadata: {
          markup: PRICING_MULTIPLIER,
          increment: PRICING_INCREMENT,
          currency: 'USD',
          unit: 'per million tokens',
          lastUpdated: new Date(),
        },
      });
      
    } catch (error) {
      logger.error('Failed to get model costs', { error });
      
      return reply.status(500).send({
        error: 'COSTS_FETCH_FAILED',
        message: 'Failed to fetch model costs',
      });
    }
  });

  // Get workspace usage and costs
  app.get('/workspace/:workspaceId', async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const query = workspaceUsageSchema.parse(request.query);
      
      const endDate = query.endDate ? new Date(query.endDate) : new Date();
      const startDate = query.startDate ? new Date(query.startDate) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      const usage = await getWorkspaceUsage(workspaceId, {
        start: startDate,
        end: endDate,
      });
      
      return reply.send({
        workspaceId,
        period: {
          start: startDate,
          end: endDate,
          days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        },
        usage,
        currency: 'USD',
      });
      
    } catch (error) {
      logger.error('Failed to get workspace usage', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'USAGE_FETCH_FAILED',
        message: 'Failed to fetch workspace usage',
      });
    }
  });

  // Get cost comparison between providers for similar capabilities
  app.get('/compare', async (request, reply) => {
    try {
      const { tokens = '10000', category } = request.query as { tokens?: string; category?: string };
      const tokenCount = parseInt(tokens, 10);
      
      if (isNaN(tokenCount) || tokenCount <= 0) {
        return reply.status(400).send({
          error: 'INVALID_TOKEN_COUNT',
          message: 'Token count must be a positive number',
        });
      }
      
      const comparisons: any[] = [];
      
      for (const [provider, models] of Object.entries(PROVIDER_COSTS)) {
        if (!isProviderAvailable(provider as any)) {
          continue;
        }
        
        for (const [model, costs] of Object.entries(models)) {
          const modelCategory = categorizeModelByCost(costs);
          
          if (category && modelCategory !== category) {
            continue;
          }
          
          const inputTokens = Math.floor(tokenCount * 0.7); // 70% input
          const outputTokens = Math.floor(tokenCount * 0.3); // 30% output
          
          const { cost, price } = calculateBilling(
            inputTokens,
            outputTokens,
            (costs.input + costs.output) / 2
          );
          
          comparisons.push({
            provider,
            model,
            category: modelCategory,
            costs: {
              cost,
              price,
              baseCost: (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output,
            },
            tokens: {
              input: inputTokens,
              output: outputTokens,
              total: tokenCount,
            },
          });
        }
      }
      
      // Sort by price (ascending)
      comparisons.sort((a, b) => a.costs.price - b.costs.price);
      
      return reply.send({
        tokenCount,
        category: category || 'all',
        comparisons,
        metadata: {
          currency: 'USD',
          markup: PRICING_MULTIPLIER,
          sortedBy: 'price_ascending',
        },
      });
      
    } catch (error) {
      logger.error('Failed to compare costs', { error });
      
      return reply.status(500).send({
        error: 'COST_COMPARISON_FAILED',
        message: 'Failed to compare costs',
      });
    }
  });
}

function categorizeModelByCost(costs: { input: number; output: number }): string {
  const avgCost = (costs.input + costs.output) / 2;
  
  if (avgCost >= 10) {
    return 'premium';
  } else if (avgCost >= 2) {
    return 'standard';
  } else if (avgCost >= 0.5) {
    return 'economy';
  } else {
    return 'budget';
  }
}