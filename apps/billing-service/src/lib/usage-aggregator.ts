import { createLogger } from '@agentworks/shared';
import { getDatabase } from './database.js';
import { getUsageRange, cacheBillingSummary } from './redis.js';

const logger = createLogger('billing-service:usage-aggregator');

let isRunning = false;
let shouldStop = false;

export async function initializeUsageAggregator(): Promise<void> {
  try {
    if (!isRunning) {
      startUsageAggregator();
      logger.info('Usage aggregator initialized');
    }
  } catch (error) {
    logger.error('Failed to initialize usage aggregator', { error });
    throw error;
  }
}

export async function stopUsageAggregator(): Promise<void> {
  shouldStop = true;
  logger.info('Stopping usage aggregator...');
  
  while (isRunning) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  logger.info('Usage aggregator stopped');
}

async function startUsageAggregator(): Promise<void> {
  if (isRunning) {
    return;
  }
  
  isRunning = true;
  logger.info('Starting usage aggregator');
  
  // Run aggregation every 5 minutes
  const interval = setInterval(async () => {
    if (shouldStop) {
      clearInterval(interval);
      isRunning = false;
      return;
    }
    
    try {
      await aggregateUsage();
    } catch (error) {
      logger.error('Error in usage aggregator', { error });
    }
  }, 5 * 60 * 1000);
  
  // Run immediately on startup
  try {
    await aggregateUsage();
  } catch (error) {
    logger.error('Initial usage aggregation failed', { error });
  }
}

async function aggregateUsage(): Promise<void> {
  try {
    const db = getDatabase();
    
    // Get all workspaces
    const workspaces = await db.workspace.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    for (const workspace of workspaces) {
      try {
        await aggregateWorkspaceUsage(workspace.id, thirtyDaysAgo, today);
      } catch (error) {
        logger.error('Failed to aggregate usage for workspace', {
          workspaceId: workspace.id,
          error,
        });
      }
    }
    
    logger.debug(`Usage aggregation completed for ${workspaces.length} workspaces`);
    
  } catch (error) {
    logger.error('Failed to aggregate usage', { error });
  }
}

async function aggregateWorkspaceUsage(workspaceId: string, startDate: string, endDate: string): Promise<void> {
  try {
    // Get usage data from Redis cache
    const usageRange = await getUsageRange(workspaceId, startDate, endDate);
    
    if (Object.keys(usageRange).length === 0) {
      // No cached data, need to aggregate from database
      await aggregateFromDatabase(workspaceId, startDate, endDate);
      return;
    }
    
    // Aggregate cached data
    const summary = {
      totalCost: 0,
      totalPrice: 0,
      totalTokens: 0,
      totalRequests: 0,
      byProvider: {} as Record<string, any>,
      byModel: {} as Record<string, any>,
      dailyBreakdown: usageRange,
      period: {
        start: startDate,
        end: endDate,
        days: Object.keys(usageRange).length,
      },
      lastUpdated: new Date(),
    };
    
    // Aggregate daily data
    for (const [date, dailyData] of Object.entries(usageRange)) {
      summary.totalCost += dailyData.totalCost || 0;
      summary.totalPrice += dailyData.totalPrice || 0;
      summary.totalTokens += dailyData.totalTokens || 0;
      summary.totalRequests += dailyData.requestCount || 0;
      
      // Aggregate by provider
      for (const [provider, providerData] of Object.entries(dailyData.byProvider || {})) {
        if (!summary.byProvider[provider]) {
          summary.byProvider[provider] = {
            cost: 0,
            price: 0,
            tokens: 0,
            requests: 0,
          };
        }
        const pData = providerData as any;
        summary.byProvider[provider].cost += pData.cost || 0;
        summary.byProvider[provider].price += pData.price || 0;
        summary.byProvider[provider].tokens += pData.tokens || 0;
        summary.byProvider[provider].requests += pData.requests || 0;
      }
      
      // Aggregate by model
      for (const [model, modelData] of Object.entries(dailyData.byModel || {})) {
        if (!summary.byModel[model]) {
          summary.byModel[model] = {
            cost: 0,
            price: 0,
            tokens: 0,
            requests: 0,
          };
        }
        const mData = modelData as any;
        summary.byModel[model].cost += mData.cost || 0;
        summary.byModel[model].price += mData.price || 0;
        summary.byModel[model].tokens += mData.tokens || 0;
        summary.byModel[model].requests += mData.requests || 0;
      }
    }
    
    // Cache the aggregated summary
    await cacheBillingSummary(workspaceId, summary, 1800); // 30 minute cache
    
    logger.debug('Workspace usage aggregated', {
      workspaceId,
      totalCost: summary.totalCost,
      totalRequests: summary.totalRequests,
      days: summary.period.days,
    });
    
  } catch (error) {
    logger.error('Failed to aggregate workspace usage', { workspaceId, error });
    throw error;
  }
}

async function aggregateFromDatabase(workspaceId: string, startDate: string, endDate: string): Promise<void> {
  try {
    const db = getDatabase();
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day
    
    // Get usage events from database
    const usageEvents = await db.usageEvent.findMany({
      where: {
        workspaceId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        provider: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        cost: true,
        price: true,
        createdAt: true,
      },
    });
    
    if (usageEvents.length === 0) {
      return;
    }
    
    // Group by day
    const dailyUsage: Record<string, any> = {};
    
    for (const event of usageEvents) {
      const day = event.createdAt.toISOString().split('T')[0];
      
      if (!dailyUsage[day]) {
        dailyUsage[day] = {
          totalCost: 0,
          totalPrice: 0,
          totalTokens: 0,
          requestCount: 0,
          byProvider: {},
          byModel: {},
        };
      }
      
      const dayData = dailyUsage[day];
      dayData.totalCost += event.cost;
      dayData.totalPrice += event.price;
      dayData.totalTokens += event.inputTokens + event.outputTokens;
      dayData.requestCount += 1;
      
      // By provider
      if (!dayData.byProvider[event.provider]) {
        dayData.byProvider[event.provider] = {
          cost: 0,
          price: 0,
          tokens: 0,
          requests: 0,
        };
      }
      dayData.byProvider[event.provider].cost += event.cost;
      dayData.byProvider[event.provider].price += event.price;
      dayData.byProvider[event.provider].tokens += event.inputTokens + event.outputTokens;
      dayData.byProvider[event.provider].requests += 1;
      
      // By model
      if (!dayData.byModel[event.model]) {
        dayData.byModel[event.model] = {
          cost: 0,
          price: 0,
          tokens: 0,
          requests: 0,
        };
      }
      dayData.byModel[event.model].cost += event.cost;
      dayData.byModel[event.model].price += event.price;
      dayData.byModel[event.model].tokens += event.inputTokens + event.outputTokens;
      dayData.byModel[event.model].requests += 1;
    }
    
    // Store daily usage data in Redis for future use
    for (const [day, data] of Object.entries(dailyUsage)) {
      // This would typically use trackDailyUsage, but we need to store the full structure
      // For now, just aggregate the summary
    }
    
    // Create summary
    const summary = {
      totalCost: 0,
      totalPrice: 0,
      totalTokens: 0,
      totalRequests: usageEvents.length,
      byProvider: {} as Record<string, any>,
      byModel: {} as Record<string, any>,
      dailyBreakdown: dailyUsage,
      period: {
        start: startDate,
        end: endDate,
        days: Object.keys(dailyUsage).length,
      },
      lastUpdated: new Date(),
    };
    
    // Aggregate totals
    for (const dayData of Object.values(dailyUsage) as any[]) {
      summary.totalCost += dayData.totalCost;
      summary.totalPrice += dayData.totalPrice;
      summary.totalTokens += dayData.totalTokens;
      
      // Aggregate providers
      for (const [provider, providerData] of Object.entries(dayData.byProvider)) {
        if (!summary.byProvider[provider]) {
          summary.byProvider[provider] = {
            cost: 0,
            price: 0,
            tokens: 0,
            requests: 0,
          };
        }
        summary.byProvider[provider].cost += (providerData as any).cost;
        summary.byProvider[provider].price += (providerData as any).price;
        summary.byProvider[provider].tokens += (providerData as any).tokens;
        summary.byProvider[provider].requests += (providerData as any).requests;
      }
      
      // Aggregate models
      for (const [model, modelData] of Object.entries(dayData.byModel)) {
        if (!summary.byModel[model]) {
          summary.byModel[model] = {
            cost: 0,
            price: 0,
            tokens: 0,
            requests: 0,
          };
        }
        summary.byModel[model].cost += (modelData as any).cost;
        summary.byModel[model].price += (modelData as any).price;
        summary.byModel[model].tokens += (modelData as any).tokens;
        summary.byModel[model].requests += (modelData as any).requests;
      }
    }
    
    // Cache the summary
    await cacheBillingSummary(workspaceId, summary, 1800); // 30 minute cache
    
    logger.debug('Database usage aggregated', {
      workspaceId,
      eventCount: usageEvents.length,
      totalCost: summary.totalCost,
      days: summary.period.days,
    });
    
  } catch (error) {
    logger.error('Failed to aggregate from database', { workspaceId, error });
    throw error;
  }
}

export async function getWorkspaceUsageSummary(workspaceId: string): Promise<any | null> {
  try {
    // Try to get from cache first
    const cached = await getCachedBillingSummary(workspaceId);
    
    if (cached && Date.now() - cached.cachedAt < 30 * 60 * 1000) { // 30 minutes
      return cached;
    }
    
    // If not cached or expired, trigger aggregation
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    await aggregateWorkspaceUsage(workspaceId, thirtyDaysAgo, today);
    
    // Return the newly cached data
    return await getCachedBillingSummary(workspaceId);
    
  } catch (error) {
    logger.error('Failed to get workspace usage summary', { workspaceId, error });
    return null;
  }
}

// Import the function we need
import { getCachedBillingSummary } from './redis.js';

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, stopping usage aggregator...');
  await stopUsageAggregator();
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, stopping usage aggregator...');
  await stopUsageAggregator();
});