import { createLogger, withTimeout, retryWithBackoff } from '@agentworks/shared';

const logger = createLogger('agent-orchestrator:core-service-client');

// Internal service token for service-to-service communication
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'internal-service-token-dev';

class CoreServiceClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = process.env.CORE_SERVICE_URL || 'http://localhost:8000';
    this.token = INTERNAL_SERVICE_TOKEN;
  }

  async createAgentRun(data: {
    cardId: string;
    agentId: string;
    provider: string;
    model: string;
    userId: string;
  }): Promise<any> {
    const response = await this.request('POST', '/runs', data);
    return response.json();
  }

  async updateAgentRun(runId: string, data: any): Promise<any> {
    const response = await this.request('PATCH', `/runs/${runId}`, data);
    return response.json();
  }

  async getCard(cardId: string): Promise<any> {
    const response = await this.request('GET', `/cards/${cardId}`);
    return response.json();
  }

  async getProject(projectId: string): Promise<any> {
    const response = await this.request('GET', `/projects/${projectId}`);
    return response.json();
  }

  async getWorkspace(workspaceId: string): Promise<any> {
    const response = await this.request('GET', `/workspaces/${workspaceId}`);
    return response.json();
  }

  async validateAuth(token: string): Promise<any> {
    const response = await this.request('GET', '/auth/me', undefined, {
      'Authorization': `Bearer ${token}`,
    });
    return response.json();
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
      'Authorization': `Bearer ${this.token}`, // Always include internal service token
      ...headers,
    };
    
    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
    };
    
    if (body) {
      requestInit.body = JSON.stringify(body);
    }
    
    logger.debug('Making request to Core Service', { method, url });
    
    const response = await retryWithBackoff(
      () => withTimeout(
        fetch(url, requestInit),
        10000, // 10 second timeout
        `Core Service request timed out: ${method} ${path}`
      ),
      3, // Max retries
      1000, // Base delay
      5000 // Max delay
    );
    
    if (!response.ok) {
      const error = await response.text();
      logger.error('Core Service request failed', {
        method,
        url,
        status: response.status,
        error,
      });
      throw new Error(`Core Service error: ${response.status} ${error}`);
    }
    
    return response;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request('GET', '/health');
      const health = await response.json() as any;
      return health.status === 'healthy';
    } catch (error) {
      logger.error('Core Service health check failed', { error });
      return false;
    }
  }
}

let client: CoreServiceClient | null = null;

export function getCoreServiceClient(): CoreServiceClient {
  if (!client) {
    client = new CoreServiceClient();
  }
  return client;
}