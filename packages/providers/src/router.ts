import type { Provider } from '@agentworks/shared';
import type { ProviderAdapter, CompletionRequest, CompletionResponse, StreamChunk } from './types.js';
import { OpenAIAdapter } from './openai.js';
import { AnthropicAdapter } from './anthropic.js';
import { calculateCost, calculatePrice } from './pricing.js';

export interface RouterConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
}

export interface RouteResult extends CompletionResponse {
  provider: Provider;
  cost: number;
  price: number;
}

export class ProviderRouter {
  private adapters: Map<Provider, ProviderAdapter> = new Map();

  constructor(config: RouterConfig = {}) {
    this.adapters.set('openai', new OpenAIAdapter(config.openaiApiKey));
    this.adapters.set('anthropic', new AnthropicAdapter(config.anthropicApiKey));
  }

  getAdapter(provider: Provider): ProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Provider ${provider} not configured`);
    }
    return adapter;
  }

  async complete(
    provider: Provider,
    request: CompletionRequest
  ): Promise<RouteResult> {
    const adapter = this.getAdapter(provider);
    const response = await adapter.complete(request);
    const cost = calculateCost(response.inputTokens, response.outputTokens, request.model);
    const price = calculatePrice(cost);

    return {
      ...response,
      provider,
      cost,
      price,
    };
  }

  async *stream(
    provider: Provider,
    request: CompletionRequest
  ): AsyncIterable<StreamChunk> {
    const adapter = this.getAdapter(provider);
    yield* adapter.stream(request);
  }

  estimateCost(
    provider: Provider,
    inputTokens: number,
    outputTokens: number,
    model: string
  ): { cost: number; price: number } {
    const cost = calculateCost(inputTokens, outputTokens, model);
    const price = calculatePrice(cost);
    return { cost, price };
  }
}

let routerInstance: ProviderRouter | null = null;

export function getRouter(config?: RouterConfig): ProviderRouter {
  if (!routerInstance) {
    routerInstance = new ProviderRouter(config);
  }
  return routerInstance;
}
