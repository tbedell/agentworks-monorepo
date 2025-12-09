import type { ServiceHealth, ServiceError } from '../types/index.js';

export function createHealthResponse(
  status: 'healthy' | 'unhealthy',
  version: string,
  uptime: number,
  dependencies?: Record<string, 'healthy' | 'unhealthy'>
): ServiceHealth {
  return {
    status,
    timestamp: new Date(),
    uptime,
    version,
    dependencies,
  };
}

export function createServiceError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ServiceError {
  return {
    code,
    message,
    details,
    timestamp: new Date(),
  };
}

export function calculateBilling(inputTokens: number, outputTokens: number, costPerMillion: number, multiplier: number = 5): { cost: number; price: number } {
  const totalTokens = inputTokens + outputTokens;
  const cost = (totalTokens / 1_000_000) * costPerMillion;
  const price = Math.ceil(cost * multiplier / 0.25) * 0.25; // Round up to nearest $0.25
  
  return { cost, price };
}

export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function validateWorkspaceAccess(userId: string, workspaceId: string, userRole: string): boolean {
  // Basic validation - in real implementation, this would check database
  return !!(userId && workspaceId && ['owner', 'member', 'viewer'].includes(userRole));
}

export function createLogger(serviceName: string, correlationId?: string) {
  const baseMetadata = {
    service: serviceName,
    timestamp: new Date().toISOString(),
    correlationId,
  };

  return {
    info: (message: string, metadata?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: 'info',
        message,
        ...baseMetadata,
        ...metadata,
      }));
    },
    warn: (message: string, metadata?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: 'warn',
        message,
        ...baseMetadata,
        ...metadata,
      }));
    },
    error: (message: string, metadata?: Record<string, unknown>) => {
      console.error(JSON.stringify({
        level: 'error',
        message,
        ...baseMetadata,
        ...metadata,
      }));
    },
    debug: (message: string, metadata?: Record<string, unknown>) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(JSON.stringify({
          level: 'debug',
          message,
          ...baseMetadata,
          ...metadata,
        }));
      }
    },
  };
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

export function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
  maxDelayMs = 10000
): Promise<T> {
  return new Promise((resolve, reject) => {
    let retries = 0;

    const attempt = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        if (retries >= maxRetries) {
          reject(error);
          return;
        }

        retries++;
        const delay = Math.min(baseDelayMs * Math.pow(2, retries - 1), maxDelayMs);
        setTimeout(attempt, delay);
      }
    };

    attempt();
  });
}