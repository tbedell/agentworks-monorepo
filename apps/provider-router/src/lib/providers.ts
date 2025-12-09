import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createLogger, calculateBilling, type Provider, type ProviderRequest, type ProviderResponse } from '@agentworks/shared';
import { cacheProviderHealth, getProviderHealth, incrementProviderFailure } from './redis.js';
import { getBYOACredential, executeWithBYOA, type BYOACredential } from './byoa-client.js';

const logger = createLogger('provider-router:providers');

// Provider clients
let openai: OpenAI | null = null;
let anthropic: Anthropic | null = null;

// Cost per million tokens (in USD)
const PROVIDER_COSTS: Record<string, Record<string, { input: number; output: number }>> = {
  openai: {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  },
  anthropic: {
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
    'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  },
  google: {
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  },
  nanobanana: {
    'nanobanana-default': { input: 1.00, output: 2.00 },
  },
};

export async function initializeProviders(): Promise<void> {
  try {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      logger.info('OpenAI client initialized');
    } else {
      logger.warn('OpenAI API key not provided');
    }

    // Initialize Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      logger.info('Anthropic client initialized');
    } else {
      logger.warn('Anthropic API key not provided');
    }

    // TODO: Initialize Google AI and NanoBanana clients

    logger.info('Providers initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize providers', { error });
    throw error;
  }
}

export async function executeRequest(request: ProviderRequest): Promise<ProviderResponse> {
  const provider = request.provider;
  const extendedRequest = request as ProviderRequest & { 
    tenantId?: string; 
    agentName?: string;
    useBYOA?: boolean;
  };
  
  logger.info('Executing provider request', {
    provider,
    model: request.model,
    messageCount: request.messages.length,
    workspaceId: request.workspaceId,
    tenantId: extendedRequest.tenantId,
    agentName: extendedRequest.agentName,
  });

  try {
    if (extendedRequest.tenantId && extendedRequest.useBYOA !== false) {
      const byoaCredential = await getBYOACredential(
        extendedRequest.tenantId,
        extendedRequest.agentName
      );

      if (byoaCredential) {
        logger.info('Using BYOA credential', {
          tenantId: extendedRequest.tenantId,
          byoaProvider: byoaCredential.provider,
          subscriptionTier: byoaCredential.subscriptionTier,
        });

        try {
          const response = await executeWithBYOA(request, byoaCredential);
          
          logger.info('BYOA request completed successfully', {
            provider: byoaCredential.provider,
            model: response.model,
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
            byoa: true,
          });

          return response;
        } catch (byoaError) {
          logger.warn('BYOA execution failed, falling back to platform provider', {
            tenantId: extendedRequest.tenantId,
            error: (byoaError as Error).message,
          });
        }
      }
    }

    const isHealthy = await getProviderHealth(provider);
    if (isHealthy === false) {
      throw new Error(`Provider ${provider} is marked as unhealthy`);
    }

    let response: ProviderResponse;

    switch (provider) {
      case 'openai':
        response = await executeOpenAI(request);
        break;
      case 'anthropic':
        response = await executeAnthropic(request);
        break;
      case 'google':
        response = await executeGoogle(request);
        break;
      case 'nanobanana':
        response = await executeNanoBanana(request);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    await cacheProviderHealth(provider, true);

    logger.info('Provider request completed successfully', {
      provider,
      model: request.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      cost: response.usage.cost,
      price: response.usage.price,
      byoa: false,
    });

    return response;

  } catch (error) {
    const err = error as any;
    logger.error('Provider request failed', {
      provider,
      model: request.model,
      error: err.message,
    });

    const failures = await incrementProviderFailure(provider);
    
    if (failures >= 3) {
      await cacheProviderHealth(provider, false);
      logger.warn(`Provider ${provider} marked as unhealthy due to repeated failures`);
    }

    throw error;
  }
}

async function executeOpenAI(request: ProviderRequest): Promise<ProviderResponse> {
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  const completion = await openai.chat.completions.create({
    model: request.model,
    messages: request.messages,
    temperature: request.temperature || 0.7,
    max_tokens: request.maxTokens || 4000,
    stream: false, // We don't support streaming yet
  });

  const inputTokens = completion.usage?.prompt_tokens || 0;
  const outputTokens = completion.usage?.completion_tokens || 0;
  
  const { cost, price } = calculateCost(request.provider, request.model, inputTokens, outputTokens);

  return {
    content: completion.choices[0]?.message?.content || '',
    usage: {
      inputTokens,
      outputTokens,
      cost,
      price,
    },
    model: request.model,
    provider: request.provider,
  };
}

async function executeAnthropic(request: ProviderRequest): Promise<ProviderResponse> {
  if (!anthropic) {
    throw new Error('Anthropic client not initialized');
  }

  // Convert messages format for Anthropic
  const systemMessage = request.messages.find(m => m.role === 'system');
  const userMessages = request.messages.filter(m => m.role !== 'system');

  const completion = await anthropic.messages.create({
    model: request.model,
    max_tokens: request.maxTokens || 4000,
    temperature: request.temperature || 0.7,
    system: systemMessage?.content,
    messages: userMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  });

  const inputTokens = completion.usage.input_tokens;
  const outputTokens = completion.usage.output_tokens;
  
  const { cost, price } = calculateCost(request.provider, request.model, inputTokens, outputTokens);

  const content = completion.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('');

  return {
    content,
    usage: {
      inputTokens,
      outputTokens,
      cost,
      price,
    },
    model: request.model,
    provider: request.provider,
  };
}

async function executeGoogle(request: ProviderRequest): Promise<ProviderResponse> {
  // TODO: Implement Google AI client
  throw new Error('Google AI provider not yet implemented');
}

async function executeNanoBanana(request: ProviderRequest): Promise<ProviderResponse> {
  // TODO: Implement NanoBanana client
  throw new Error('NanoBanana provider not yet implemented');
}

function calculateCost(provider: Provider, model: string, inputTokens: number, outputTokens: number): { cost: number; price: number } {
  const modelCosts = PROVIDER_COSTS[provider]?.[model];
  
  if (!modelCosts) {
    logger.warn('Cost information not available for model', { provider, model });
    // Use default cost calculation
    return calculateBilling(inputTokens, outputTokens, 1.0); // $1 per million tokens default
  }

  const inputCost = (inputTokens / 1_000_000) * modelCosts.input;
  const outputCost = (outputTokens / 1_000_000) * modelCosts.output;
  const totalCost = inputCost + outputCost;

  return calculateBilling(inputTokens, outputTokens, totalCost * 1_000_000 / (inputTokens + outputTokens));
}

export function getAvailableProviders(): Provider[] {
  const available: Provider[] = [];
  
  if (process.env.OPENAI_API_KEY) {
    available.push('openai');
  }
  if (process.env.ANTHROPIC_API_KEY) {
    available.push('anthropic');
  }
  if (process.env.GOOGLE_AI_API_KEY) {
    available.push('google');
  }
  if (process.env.NANOBANANA_API_KEY) {
    available.push('nanobanana');
  }

  return available;
}

export function getAvailableModels(provider: Provider): string[] {
  return Object.keys(PROVIDER_COSTS[provider] || {});
}

export function isProviderAvailable(provider: Provider): boolean {
  return getAvailableProviders().includes(provider);
}

export async function testProviderConnection(provider: Provider): Promise<boolean> {
  try {
    const testRequest: ProviderRequest = {
      provider,
      model: getAvailableModels(provider)[0] || 'default',
      messages: [{ role: 'user', content: 'Hello, this is a test.' }],
      maxTokens: 10,
      workspaceId: 'test',
    };

    await executeRequest(testRequest);
    return true;
  } catch (error) {
    logger.error(`Provider ${provider} connection test failed`, { error });
    return false;
  }
}

export { PROVIDER_COSTS };