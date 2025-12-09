import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { createLogger } from '@agentworks/shared';
import { 
  getAvailableProviders, 
  getAvailableModels, 
  isProviderAvailable, 
  testProviderConnection,
  PROVIDER_COSTS 
} from '../lib/providers.js';
import { getProviderHealth, getProviderFailures } from '../lib/redis.js';

const logger = createLogger('provider-router:providers');

export async function providerRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Get all available providers
  app.get('/', async (request, reply) => {
    try {
      const providers = getAvailableProviders();
      
      const providersWithStatus = await Promise.all(
        providers.map(async (provider) => {
          const health = await getProviderHealth(provider);
          const failures = await getProviderFailures(provider);
          
          return {
            name: provider,
            available: true,
            healthy: health !== false,
            failures,
            models: getAvailableModels(provider),
          };
        })
      );
      
      return reply.send({
        providers: providersWithStatus,
        total: providers.length,
      });
    } catch (error) {
      logger.error('Failed to get providers', { error });
      
      return reply.status(500).send({
        error: 'PROVIDERS_FETCH_FAILED',
        message: 'Failed to fetch providers',
      });
    }
  });

  // Get specific provider details
  app.get('/:provider', async (request, reply) => {
    try {
      const { provider } = request.params as { provider: string };
      
      if (!isProviderAvailable(provider as any)) {
        return reply.status(404).send({
          error: 'PROVIDER_NOT_FOUND',
          message: `Provider ${provider} is not available`,
        });
      }
      
      const health = await getProviderHealth(provider);
      const failures = await getProviderFailures(provider);
      const models = getAvailableModels(provider as any);
      const costs = PROVIDER_COSTS[provider];
      
      return reply.send({
        name: provider,
        available: true,
        healthy: health !== false,
        failures,
        models: models.map(model => ({
          name: model,
          costs: costs?.[model] || null,
        })),
        totalModels: models.length,
      });
    } catch (error) {
      logger.error('Failed to get provider details', { error });
      
      return reply.status(500).send({
        error: 'PROVIDER_FETCH_FAILED',
        message: 'Failed to fetch provider details',
      });
    }
  });

  // Get models for specific provider
  app.get('/:provider/models', async (request, reply) => {
    try {
      const { provider } = request.params as { provider: string };
      
      if (!isProviderAvailable(provider as any)) {
        return reply.status(404).send({
          error: 'PROVIDER_NOT_FOUND',
          message: `Provider ${provider} is not available`,
        });
      }
      
      const models = getAvailableModels(provider as any);
      const costs = PROVIDER_COSTS[provider];
      
      const modelsWithDetails = models.map(model => ({
        name: model,
        costs: costs?.[model] || null,
        category: categorizeModel(model),
        description: getModelDescription(model),
      }));
      
      return reply.send({
        provider,
        models: modelsWithDetails,
        total: models.length,
      });
    } catch (error) {
      logger.error('Failed to get provider models', { error });
      
      return reply.status(500).send({
        error: 'MODELS_FETCH_FAILED',
        message: 'Failed to fetch provider models',
      });
    }
  });

  // Test provider connection
  app.post('/:provider/test', async (request, reply) => {
    try {
      const { provider } = request.params as { provider: string };
      
      if (!isProviderAvailable(provider as any)) {
        return reply.status(404).send({
          error: 'PROVIDER_NOT_FOUND',
          message: `Provider ${provider} is not available`,
        });
      }
      
      logger.info('Testing provider connection', { provider });
      
      const startTime = Date.now();
      const isHealthy = await testProviderConnection(provider as any);
      const latency = Date.now() - startTime;
      
      if (isHealthy) {
        logger.info('Provider connection test successful', { provider, latency });
      } else {
        logger.warn('Provider connection test failed', { provider, latency });
      }
      
      return reply.send({
        provider,
        healthy: isHealthy,
        latency,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Provider connection test failed', { error });
      
      return reply.status(500).send({
        error: 'CONNECTION_TEST_FAILED',
        message: 'Provider connection test failed',
      });
    }
  });

  // Get provider health status
  app.get('/:provider/health', async (request, reply) => {
    try {
      const { provider } = request.params as { provider: string };
      
      if (!isProviderAvailable(provider as any)) {
        return reply.status(404).send({
          error: 'PROVIDER_NOT_FOUND',
          message: `Provider ${provider} is not available`,
        });
      }
      
      const health = await getProviderHealth(provider);
      const failures = await getProviderFailures(provider);
      
      return reply.send({
        provider,
        healthy: health !== false,
        failures,
        lastCheck: health !== null ? new Date() : null,
      });
    } catch (error) {
      logger.error('Failed to get provider health', { error });
      
      return reply.status(500).send({
        error: 'HEALTH_CHECK_FAILED',
        message: 'Failed to get provider health',
      });
    }
  });

  // Get provider cost information
  app.get('/:provider/costs', async (request, reply) => {
    try {
      const { provider } = request.params as { provider: string };
      
      if (!isProviderAvailable(provider as any)) {
        return reply.status(404).send({
          error: 'PROVIDER_NOT_FOUND',
          message: `Provider ${provider} is not available`,
        });
      }
      
      const costs = PROVIDER_COSTS[provider];
      
      if (!costs) {
        return reply.status(404).send({
          error: 'COSTS_NOT_AVAILABLE',
          message: `Cost information not available for provider ${provider}`,
        });
      }
      
      return reply.send({
        provider,
        costs,
        currency: 'USD',
        unit: 'per million tokens',
        multiplier: 5, // AgentWorks markup
      });
    } catch (error) {
      logger.error('Failed to get provider costs', { error });
      
      return reply.status(500).send({
        error: 'COSTS_FETCH_FAILED',
        message: 'Failed to fetch provider costs',
      });
    }
  });

  // Get provider capabilities
  app.get('/:provider/capabilities', async (request, reply) => {
    try {
      const { provider } = request.params as { provider: string };
      
      if (!isProviderAvailable(provider as any)) {
        return reply.status(404).send({
          error: 'PROVIDER_NOT_FOUND',
          message: `Provider ${provider} is not available`,
        });
      }
      
      const capabilities = getProviderCapabilities(provider);
      
      return reply.send({
        provider,
        ...capabilities,
      });
    } catch (error) {
      logger.error('Failed to get provider capabilities', { error });
      
      return reply.status(500).send({
        error: 'CAPABILITIES_FETCH_FAILED',
        message: 'Failed to fetch provider capabilities',
      });
    }
  });
}

function categorizeModel(model: string): string {
  if (model.includes('gpt-4') || model.includes('claude-3-opus') || model.includes('claude-3-5-sonnet')) {
    return 'premium';
  } else if (model.includes('gpt-3.5') || model.includes('claude-3-haiku')) {
    return 'standard';
  } else if (model.includes('gemini') || model.includes('flash')) {
    return 'efficient';
  } else {
    return 'other';
  }
}

function getModelDescription(model: string): string {
  const descriptions: Record<string, string> = {
    'gpt-4o': 'GPT-4 Omni - Latest multimodal model',
    'gpt-4o-mini': 'GPT-4 Omni Mini - Efficient multimodal model',
    'gpt-4-turbo': 'GPT-4 Turbo - High performance for complex tasks',
    'gpt-4': 'GPT-4 - Advanced reasoning and analysis',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo - Fast and efficient',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet - Most capable model',
    'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku - Fast and efficient',
    'claude-3-opus-20240229': 'Claude 3 Opus - Highest intelligence',
    'claude-3-sonnet-20240229': 'Claude 3 Sonnet - Balanced performance',
    'claude-3-haiku-20240307': 'Claude 3 Haiku - Speed optimized',
    'gemini-1.5-pro': 'Gemini 1.5 Pro - Long context understanding',
    'gemini-1.5-flash': 'Gemini 1.5 Flash - Fast and lightweight',
  };
  
  return descriptions[model] || 'AI language model';
}

function getProviderCapabilities(provider: string): any {
  const capabilities: Record<string, any> = {
    openai: {
      streaming: true,
      functionCalling: true,
      vision: true,
      maxTokens: 128000,
      supportedFormats: ['text', 'json'],
      specialFeatures: ['function_calling', 'vision', 'dalle_integration'],
    },
    anthropic: {
      streaming: true,
      functionCalling: true,
      vision: true,
      maxTokens: 200000,
      supportedFormats: ['text', 'json', 'xml'],
      specialFeatures: ['constitutional_ai', 'long_context', 'safety_focused'],
    },
    google: {
      streaming: true,
      functionCalling: true,
      vision: true,
      maxTokens: 1000000,
      supportedFormats: ['text', 'json'],
      specialFeatures: ['ultra_long_context', 'multimodal'],
    },
    nanobanana: {
      streaming: false,
      functionCalling: false,
      vision: false,
      maxTokens: 4096,
      supportedFormats: ['text'],
      specialFeatures: ['cost_effective', 'simple_completion'],
    },
  };
  
  return capabilities[provider] || {
    streaming: false,
    functionCalling: false,
    vision: false,
    maxTokens: 4096,
    supportedFormats: ['text'],
    specialFeatures: [],
  };
}