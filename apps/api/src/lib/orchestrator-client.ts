import { createLogger } from '@agentworks/shared';

const logger = createLogger('api:orchestrator-client');

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:8001';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'internal-service-token-dev';

export interface ExecutionRequest {
  cardId: string;
  agentId: string;
  workspaceId: string;
  projectId: string;
  userId: string;
  context?: Record<string, any>;
  mode?: 'standard' | 'conversation'; // conversation mode reads context file for chat history
  // BYOA provider selection overrides
  provider?: string;
  model?: string;
  tenantId?: string;
}

export interface ExecutionResponse {
  runId: string;
  status: string;
  queuePosition?: number;
}

class OrchestratorClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = ORCHESTRATOR_URL;
    this.token = INTERNAL_SERVICE_TOKEN;
  }

  async executeAgent(request: ExecutionRequest): Promise<ExecutionResponse> {
    const url = `${this.baseUrl}/execution`;

    logger.info('Forwarding agent execution to orchestrator', {
      cardId: request.cardId,
      agentId: request.agentId,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Orchestrator execution request failed', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`Orchestrator error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as ExecutionResponse;

      logger.info('Agent execution started successfully', {
        runId: result.runId,
        status: result.status,
      });

      return result;
    } catch (error) {
      logger.error('Failed to communicate with orchestrator', { error });
      throw error;
    }
  }

  async getExecutorStatus(): Promise<any> {
    const url = `${this.baseUrl}/execution/status`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get executor status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      logger.error('Failed to get orchestrator status', { error });
      throw error;
    }
  }

  async validateExecution(request: ExecutionRequest): Promise<{ valid: boolean; error?: string; message?: string }> {
    const url = `${this.baseUrl}/execution/validate`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to validate execution: ${response.status}`);
      }

      return response.json() as Promise<{ valid: boolean; error?: string; message?: string }>;
    } catch (error) {
      logger.error('Failed to validate execution', { error });
      return { valid: false, error: 'VALIDATION_FAILED', message: 'Could not validate execution' };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) return false;
      const data = await response.json() as any;
      return data.status === 'healthy' || data.status === 'ok';
    } catch {
      return false;
    }
  }
}

let client: OrchestratorClient | null = null;

export function getOrchestratorClient(): OrchestratorClient {
  if (!client) {
    client = new OrchestratorClient();
  }
  return client;
}
