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

  /**
   * Create a new card in a specific board and lane
   * Used by terminal integration to create cards from Claude CLI commands
   */
  async createCard(data: {
    boardId: string;
    laneId: string;
    title: string;
    description?: string;
    type: string;
    priority?: string;
    assignedAgent?: string;
  }): Promise<any> {
    const { boardId, laneId, ...cardData } = data;
    const response = await this.request('POST', `/cards/board/${boardId}/lane/${laneId}`, cardData);
    return response.json();
  }

  /**
   * Update a card's status
   * Used to move cards through the workflow from terminal
   */
  async updateCardStatus(cardId: string, status: string): Promise<any> {
    const response = await this.request('PATCH', `/cards/${cardId}`, { status });
    return response.json();
  }

  /**
   * Move a card to a different lane
   * Used to advance cards through the Kanban board from terminal
   */
  async moveCard(cardId: string, laneId: string, position?: number): Promise<any> {
    const response = await this.request('PATCH', `/cards/${cardId}/move`, {
      laneId,
      position: position ?? 0,
    });
    return response.json();
  }

  /**
   * Get board details including lanes
   * Used to find the correct lane for card creation
   */
  async getBoard(boardId: string): Promise<any> {
    const response = await this.request('GET', `/boards/${boardId}`);
    return response.json();
  }

  /**
   * Get project details including boards
   * Used to find board/lane info when only project ID is known
   */
  async getProjectWithBoard(projectId: string): Promise<any> {
    const response = await this.request('GET', `/projects/${projectId}`);
    return response.json();
  }

  async validateAuth(token: string): Promise<any> {
    const response = await this.request('GET', '/auth/me', undefined, {
      'Authorization': `Bearer ${token}`,
    });
    return response.json();
  }

  /**
   * Transition a card's state using the card state machine
   * Used by agent executor to update card status at start/complete
   */
  async transitionCard(
    cardId: string,
    trigger: 'agent_start' | 'agent_complete' | 'human_approve' | 'human_reject' | 'document_generated',
    performedBy: string,
    options?: {
      targetLaneNumber?: number;
      details?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<any> {
    // Call the API server directly for card transitions
    const apiUrl = process.env.API_URL || 'http://localhost:3010';
    const url = `${apiUrl}/api/cards/${cardId}/transition`;

    const requestInit: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        trigger,
        performedBy,
        ...options,
      }),
    };

    logger.debug('Transitioning card', { cardId, trigger, performedBy });

    const response = await retryWithBackoff(
      () => withTimeout(
        fetch(url, requestInit),
        10000,
        `Card transition timed out: ${cardId}`
      ),
      3,
      1000,
      5000
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error('Card transition failed', {
        cardId,
        trigger,
        status: response.status,
        error,
      });
      throw new Error(`Card transition error: ${response.status} ${error}`);
    }

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