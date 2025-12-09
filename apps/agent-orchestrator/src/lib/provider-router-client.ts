import { createLogger, withTimeout, retryWithBackoff, type ProviderRequest, type ProviderResponse } from '@agentworks/shared';

const logger = createLogger('agent-orchestrator:provider-router-client');

class ProviderRouterClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.PROVIDER_ROUTER_URL || 'http://localhost:8002';
  }

  async executeRequest(request: ProviderRequest): Promise<ProviderResponse> {
    logger.debug('Executing provider request', {
      provider: request.provider,
      model: request.model,
      messageCount: request.messages.length,
    });

    const response = await this.request('POST', '/execute', request);
    return response.json() as Promise<ProviderResponse>;
  }

  async getProviders(): Promise<string[]> {
    const response = await this.request('GET', '/providers');
    return response.json() as Promise<string[]>;
  }

  async getModels(provider: string): Promise<string[]> {
    const response = await this.request('GET', `/providers/${provider}/models`);
    return response.json() as Promise<string[]>;
  }

  async calculateCost(request: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  }): Promise<{ cost: number; price: number }> {
    const response = await this.request('POST', '/calculate-cost', request);
    return response.json() as Promise<{ cost: number; price: number }>;
  }

  private async request(
    method: string,
    path: string,
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    
    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
    };
    
    if (body) {
      requestInit.body = JSON.stringify(body);
    }
    
    logger.debug('Making request to Provider Router', { method, url });
    
    const response = await retryWithBackoff(
      () => withTimeout(
        fetch(url, requestInit),
        60000, // 60 second timeout for LLM requests
        `Provider Router request timed out: ${method} ${path}`
      ),
      2, // Max retries (fewer for LLM requests)
      2000, // Base delay
      10000 // Max delay
    );
    
    if (!response.ok) {
      const error = await response.text();
      logger.error('Provider Router request failed', {
        method,
        url,
        status: response.status,
        error,
      });
      throw new Error(`Provider Router error: ${response.status} ${error}`);
    }
    
    return response;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request('GET', '/health');
      const health = await response.json() as any;
      return health.status === 'healthy';
    } catch (error) {
      logger.error('Provider Router health check failed', { error });
      return false;
    }
  }
}

let client: ProviderRouterClient | null = null;

export function getProviderRouterClient(): ProviderRouterClient {
  if (!client) {
    client = new ProviderRouterClient();
  }
  return client;
}