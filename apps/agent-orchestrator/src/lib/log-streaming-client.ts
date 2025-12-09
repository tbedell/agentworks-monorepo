import { createLogger, withTimeout, type LogStreamEvent } from '@agentworks/shared';

const logger = createLogger('agent-orchestrator:log-streaming-client');

class LogStreamingClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.LOG_STREAMING_URL || 'http://localhost:8003';
  }

  async sendEvent(runId: string, event: LogStreamEvent): Promise<void> {
    logger.debug('Sending log event', {
      runId,
      type: event.type,
    });

    try {
      const response = await this.request('POST', `/logs/${runId}/events`, event);
      
      if (!response.ok) {
        throw new Error(`Failed to send log event: ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send log event', { runId, error });
      // Don't throw - logging failures shouldn't stop execution
    }
  }

  async getLogs(runId: string, options?: {
    limit?: number;
    level?: string;
    since?: Date;
  }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    
    if (options?.limit) {
      searchParams.set('limit', options.limit.toString());
    }
    if (options?.level) {
      searchParams.set('level', options.level);
    }
    if (options?.since) {
      searchParams.set('since', options.since.toISOString());
    }
    
    const query = searchParams.toString();
    const path = `/logs/${runId}${query ? `?${query}` : ''}`;
    
    const response = await this.request('GET', path);
    const data = await response.json() as any;
    return data.logs || [];
  }

  async createSession(runId: string, metadata?: any): Promise<string> {
    const response = await this.request('POST', '/sessions', {
      runId,
      metadata,
    });
    
    const result = await response.json() as any;
    return result.sessionId;
  }

  async endSession(sessionId: string): Promise<void> {
    await this.request('DELETE', `/sessions/${sessionId}`);
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
    
    logger.debug('Making request to Log Streaming', { method, url });
    
    const response = await withTimeout(
      fetch(url, requestInit),
      5000, // 5 second timeout for log requests
      `Log Streaming request timed out: ${method} ${path}`
    );
    
    return response;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request('GET', '/health');
      const health = await response.json() as any;
      return health.status === 'healthy';
    } catch (error) {
      logger.error('Log Streaming health check failed', { error });
      return false;
    }
  }
}

let client: LogStreamingClient | null = null;

export function getLogStreamingClient(): LogStreamingClient {
  if (!client) {
    client = new LogStreamingClient();
  }
  return client;
}