import { createLogger } from '@agentworks/shared';
import type { ProviderRequest, ProviderResponse, BillingUsageEvent } from '@agentworks/shared';
import { getRedis, cacheProviderUsage } from './redis.js';

const logger = createLogger('provider-router:usage-tracker');

export async function initializeUsageTracker(): Promise<void> {
  try {
    // Start the usage aggregation worker
    startUsageAggregationWorker();
    logger.info('Usage tracker initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize usage tracker', { error });
    throw error;
  }
}

export async function trackUsage(
  request: ProviderRequest,
  response: ProviderResponse,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const usage = {
      workspaceId: request.workspaceId,
      provider: response.provider,
      model: response.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      cost: response.usage.cost,
      price: response.usage.price,
      timestamp: Date.now(),
      metadata: {
        ...request.metadata,
        ...metadata,
      },
    };

    // Cache usage for immediate access
    await cacheProviderUsage(
      request.workspaceId,
      response.provider,
      response.model,
      response.usage
    );

    // Add to usage queue for processing
    const redis = getRedis();
    await redis.lPush('usage-events', JSON.stringify(usage));

    logger.debug('Usage tracked', {
      workspaceId: request.workspaceId,
      provider: response.provider,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      cost: response.usage.cost,
      price: response.usage.price,
    });

  } catch (error) {
    logger.error('Failed to track usage', { error });
    // Don't throw - usage tracking failures shouldn't break requests
  }
}

export async function getWorkspaceUsage(
  workspaceId: string,
  timeRange: {
    start: Date;
    end: Date;
  }
): Promise<{
  totalCost: number;
  totalPrice: number;
  totalTokens: number;
  byProvider: Record<string, any>;
  byModel: Record<string, any>;
}> {
  try {
    const redis = getRedis();
    
    // Get usage events from cache (this is a simplified implementation)
    // In a real system, you'd store this in a time-series database
    const usageKey = `workspace:usage:${workspaceId}`;
    
    // This is a placeholder implementation
    // You would typically use Redis Streams or a time-series database
    const cachedUsage = await redis.get(usageKey);
    
    if (!cachedUsage) {
      return {
        totalCost: 0,
        totalPrice: 0,
        totalTokens: 0,
        byProvider: {},
        byModel: {},
      };
    }

    return JSON.parse(cachedUsage);

  } catch (error) {
    logger.error('Failed to get workspace usage', { error, workspaceId });
    throw error;
  }
}

export async function getProviderStats(): Promise<{
  totalRequests: number;
  totalCost: number;
  totalPrice: number;
  byProvider: Record<string, {
    requests: number;
    cost: number;
    price: number;
    avgLatency: number;
    errors: number;
  }>;
}> {
  try {
    const redis = getRedis();
    
    // Get provider statistics from cache
    const statsKey = 'provider:stats';
    const cachedStats = await redis.get(statsKey);
    
    if (!cachedStats) {
      return {
        totalRequests: 0,
        totalCost: 0,
        totalPrice: 0,
        byProvider: {},
      };
    }

    return JSON.parse(cachedStats);

  } catch (error) {
    logger.error('Failed to get provider stats', { error });
    throw error;
  }
}

async function startUsageAggregationWorker(): Promise<void> {
  // This worker processes usage events and aggregates them
  const processUsageEvents = async () => {
    try {
      const redis = getRedis();
      
      // Process up to 100 events at a time
      const events = [];
      for (let i = 0; i < 100; i++) {
        const event = await redis.rPop('usage-events');
        if (!event) break;
        events.push(JSON.parse(event));
      }

      if (events.length === 0) {
        return;
      }

      // Aggregate usage data
      await aggregateUsageEvents(events);

      logger.debug(`Processed ${events.length} usage events`);

    } catch (error) {
      logger.error('Error processing usage events', { error });
    }
  };

  // Run every 10 seconds
  setInterval(processUsageEvents, 10000);
  
  // Process immediately on startup
  processUsageEvents();
}

async function aggregateUsageEvents(events: any[]): Promise<void> {
  const redis = getRedis();
  
  // Aggregate by workspace
  const workspaceAggregates: Record<string, any> = {};
  
  // Aggregate by provider
  const providerAggregates: Record<string, any> = {};
  
  for (const event of events) {
    // Workspace aggregation
    if (!workspaceAggregates[event.workspaceId]) {
      workspaceAggregates[event.workspaceId] = {
        totalCost: 0,
        totalPrice: 0,
        totalTokens: 0,
        byProvider: {},
        byModel: {},
        lastUpdated: Date.now(),
      };
    }
    
    const wsAgg = workspaceAggregates[event.workspaceId];
    wsAgg.totalCost += event.cost;
    wsAgg.totalPrice += event.price;
    wsAgg.totalTokens += event.inputTokens + event.outputTokens;
    
    // By provider
    if (!wsAgg.byProvider[event.provider]) {
      wsAgg.byProvider[event.provider] = {
        cost: 0,
        price: 0,
        tokens: 0,
        requests: 0,
      };
    }
    wsAgg.byProvider[event.provider].cost += event.cost;
    wsAgg.byProvider[event.provider].price += event.price;
    wsAgg.byProvider[event.provider].tokens += event.inputTokens + event.outputTokens;
    wsAgg.byProvider[event.provider].requests += 1;
    
    // By model
    if (!wsAgg.byModel[event.model]) {
      wsAgg.byModel[event.model] = {
        cost: 0,
        price: 0,
        tokens: 0,
        requests: 0,
      };
    }
    wsAgg.byModel[event.model].cost += event.cost;
    wsAgg.byModel[event.model].price += event.price;
    wsAgg.byModel[event.model].tokens += event.inputTokens + event.outputTokens;
    wsAgg.byModel[event.model].requests += 1;
    
    // Provider aggregation
    if (!providerAggregates[event.provider]) {
      providerAggregates[event.provider] = {
        requests: 0,
        cost: 0,
        price: 0,
        errors: 0,
      };
    }
    
    providerAggregates[event.provider].requests += 1;
    providerAggregates[event.provider].cost += event.cost;
    providerAggregates[event.provider].price += event.price;
  }
  
  // Store workspace aggregates
  for (const [workspaceId, aggregate] of Object.entries(workspaceAggregates)) {
    const key = `workspace:usage:${workspaceId}`;
    await redis.setEx(key, 86400, JSON.stringify(aggregate)); // 24 hour TTL
  }
  
  // Store provider aggregates
  if (Object.keys(providerAggregates).length > 0) {
    const currentStats = await redis.get('provider:stats');
    const stats = currentStats ? JSON.parse(currentStats) : {
      totalRequests: 0,
      totalCost: 0,
      totalPrice: 0,
      byProvider: {},
    };
    
    for (const [provider, aggregate] of Object.entries(providerAggregates) as [string, any][]) {
      stats.totalRequests += aggregate.requests;
      stats.totalCost += aggregate.cost;
      stats.totalPrice += aggregate.price;
      
      if (!stats.byProvider[provider]) {
        stats.byProvider[provider] = {
          requests: 0,
          cost: 0,
          price: 0,
          avgLatency: 0,
          errors: 0,
        };
      }
      
      stats.byProvider[provider].requests += aggregate.requests;
      stats.byProvider[provider].cost += aggregate.cost;
      stats.byProvider[provider].price += aggregate.price;
    }
    
    await redis.setEx('provider:stats', 3600, JSON.stringify(stats)); // 1 hour TTL
  }
}

export async function recordProviderLatency(provider: string, latencyMs: number): Promise<void> {
  try {
    const redis = getRedis();
    const key = `provider:latency:${provider}`;
    
    // Store recent latencies (keep last 100)
    await redis.lPush(key, latencyMs.toString());
    await redis.lTrim(key, 0, 99);
    
    // Calculate average latency
    const latencies = await redis.lRange(key, 0, -1);
    const avgLatency = latencies.reduce((sum, lat) => sum + parseInt(lat, 10), 0) / latencies.length;
    
    // Update provider stats
    const statsKey = 'provider:stats';
    const currentStats = await redis.get(statsKey);
    
    if (currentStats) {
      const stats = JSON.parse(currentStats);
      if (stats.byProvider[provider]) {
        stats.byProvider[provider].avgLatency = avgLatency;
        await redis.setEx(statsKey, 3600, JSON.stringify(stats));
      }
    }
    
  } catch (error) {
    logger.error('Failed to record provider latency', { error, provider, latencyMs });
  }
}

export async function recordProviderError(provider: string, error: any): Promise<void> {
  try {
    const redis = getRedis();
    
    // Update error count in stats
    const statsKey = 'provider:stats';
    const currentStats = await redis.get(statsKey);
    
    if (currentStats) {
      const stats = JSON.parse(currentStats);
      if (!stats.byProvider[provider]) {
        stats.byProvider[provider] = {
          requests: 0,
          cost: 0,
          price: 0,
          avgLatency: 0,
          errors: 0,
        };
      }
      
      stats.byProvider[provider].errors += 1;
      await redis.setEx(statsKey, 3600, JSON.stringify(stats));
    }
    
  } catch (err) {
    logger.error('Failed to record provider error', { error: err, provider });
  }
}