import { createLogger, calculateBilling, PRICING_INCREMENT } from '@agentworks/shared';
import type { BillingUsageEvent } from '@agentworks/shared';
import { getDatabase } from './database.js';
import { getUsageEvents, trackDailyUsage, invalidateBillingCache } from './redis.js';

const logger = createLogger('billing-service:processor');

let isProcessing = false;
let shouldStop = false;

export async function initializeBillingProcessor(): Promise<void> {
  try {
    if (!isProcessing) {
      startBillingProcessor();
      logger.info('Billing processor initialized');
    }
  } catch (error) {
    logger.error('Failed to initialize billing processor', { error });
    throw error;
  }
}

export async function stopBillingProcessor(): Promise<void> {
  shouldStop = true;
  logger.info('Stopping billing processor...');
  
  while (isProcessing) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  logger.info('Billing processor stopped');
}

async function startBillingProcessor(): Promise<void> {
  if (isProcessing) {
    return;
  }
  
  isProcessing = true;
  logger.info('Starting billing processor');
  
  while (!shouldStop) {
    try {
      // Process usage events in batches
      const events = await getUsageEvents(50);
      
      if (events.length === 0) {
        // No events to process, wait before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      await processBillingEvents(events);
      
    } catch (error) {
      logger.error('Error in billing processor', { error });
      
      // Brief pause before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  isProcessing = false;
  logger.info('Billing processor stopped');
}

async function processBillingEvents(events: BillingUsageEvent[]): Promise<void> {
  const db = getDatabase();
  
  try {
    // Group events by workspace for batch processing
    const eventsByWorkspace = new Map<string, BillingUsageEvent[]>();
    
    for (const event of events) {
      if (!eventsByWorkspace.has(event.workspaceId)) {
        eventsByWorkspace.set(event.workspaceId, []);
      }
      eventsByWorkspace.get(event.workspaceId)!.push(event);
    }
    
    // Process each workspace's events
    for (const [workspaceId, workspaceEvents] of eventsByWorkspace) {
      await processWorkspaceEvents(workspaceId, workspaceEvents);
    }
    
    logger.info('Billing events processed successfully', {
      totalEvents: events.length,
      workspaces: eventsByWorkspace.size,
    });
    
  } catch (error) {
    logger.error('Failed to process billing events', { error });
    throw error;
  }
}

async function processWorkspaceEvents(workspaceId: string, events: BillingUsageEvent[]): Promise<void> {
  const db = getDatabase();
  
  try {
    // Create usage events in database
    const usageEvents = events.map(event => ({
      workspaceId: event.workspaceId,
      projectId: event.projectId,
      cardId: event.cardId,
      agentId: event.agentId,
      runId: event.runId,
      provider: event.provider,
      model: event.model,
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      cost: event.cost,
      price: event.price,
      createdAt: new Date(event.timestamp),
    }));
    
    // Batch insert usage events
    await db.usageEvent.createMany({
      data: usageEvents,
      skipDuplicates: true, // In case of duplicate processing
    });
    
    // Update daily usage aggregates in Redis
    const dailyAggregates = new Map<string, any>();
    
    for (const event of events) {
      const dateKey = new Date(event.timestamp).toISOString().split('T')[0];
      
      if (!dailyAggregates.has(dateKey)) {
        dailyAggregates.set(dateKey, {
          cost: 0,
          price: 0,
          inputTokens: 0,
          outputTokens: 0,
          provider: event.provider,
          model: event.model,
        });
      }
      
      const aggregate = dailyAggregates.get(dateKey)!;
      aggregate.cost += event.cost;
      aggregate.price += event.price;
      aggregate.inputTokens += event.inputTokens;
      aggregate.outputTokens += event.outputTokens;
    }
    
    // Update Redis aggregates
    for (const [date, aggregate] of dailyAggregates) {
      await trackDailyUsage(workspaceId, date, aggregate);
    }
    
    // Invalidate billing cache for this workspace
    await invalidateBillingCache(workspaceId);
    
    logger.debug('Workspace events processed', {
      workspaceId,
      eventCount: events.length,
      dailyAggregates: dailyAggregates.size,
    });
    
  } catch (error) {
    logger.error('Failed to process workspace events', { workspaceId, error });
    throw error;
  }
}

export async function calculateWorkspaceBilling(
  workspaceId: string,
  period: { start: Date; end: Date }
): Promise<{
  totalCost: number;
  totalPrice: number;
  roundedPrice: number;
  totalTokens: number;
  totalRequests: number;
  byProvider: Record<string, any>;
  byProject: Record<string, any>;
  byDay: Record<string, any>;
}> {
  try {
    const db = getDatabase();
    
    // Get usage events for the period
    const usageEvents = await db.usageEvent.findMany({
      where: {
        workspaceId,
        createdAt: {
          gte: period.start,
          lte: period.end,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // Calculate totals
    let totalCost = 0;
    let totalPrice = 0;
    let totalTokens = 0;
    const totalRequests = usageEvents.length;
    
    const byProvider: Record<string, any> = {};
    const byProject: Record<string, any> = {};
    const byDay: Record<string, any> = {};
    
    for (const event of usageEvents) {
      totalCost += event.cost;
      totalPrice += event.price;
      totalTokens += event.inputTokens + event.outputTokens;
      
      // Aggregate by provider
      if (!byProvider[event.provider]) {
        byProvider[event.provider] = {
          cost: 0,
          price: 0,
          tokens: 0,
          requests: 0,
        };
      }
      byProvider[event.provider].cost += event.cost;
      byProvider[event.provider].price += event.price;
      byProvider[event.provider].tokens += event.inputTokens + event.outputTokens;
      byProvider[event.provider].requests += 1;
      
      // Aggregate by project
      if (!byProject[event.projectId]) {
        byProject[event.projectId] = {
          projectId: event.projectId,
          projectName: event.project?.name || 'Unknown',
          cost: 0,
          price: 0,
          tokens: 0,
          requests: 0,
        };
      }
      byProject[event.projectId].cost += event.cost;
      byProject[event.projectId].price += event.price;
      byProject[event.projectId].tokens += event.inputTokens + event.outputTokens;
      byProject[event.projectId].requests += 1;
      
      // Aggregate by day
      const day = event.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) {
        byDay[day] = {
          cost: 0,
          price: 0,
          tokens: 0,
          requests: 0,
        };
      }
      byDay[day].cost += event.cost;
      byDay[day].price += event.price;
      byDay[day].tokens += event.inputTokens + event.outputTokens;
      byDay[day].requests += 1;
    }
    
    // Round total price to nearest $0.25
    const roundedPrice = Math.ceil(totalPrice / PRICING_INCREMENT) * PRICING_INCREMENT;
    
    return {
      totalCost,
      totalPrice,
      roundedPrice,
      totalTokens,
      totalRequests,
      byProvider,
      byProject: Object.values(byProject),
      byDay,
    };
    
  } catch (error) {
    logger.error('Failed to calculate workspace billing', { workspaceId, error });
    throw error;
  }
}

export async function generateBillingReport(
  workspaceId: string,
  period: { start: Date; end: Date }
): Promise<any> {
  try {
    const billing = await calculateWorkspaceBilling(workspaceId, period);
    
    // Get workspace details
    const db = getDatabase();
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            projects: true,
            members: true,
          },
        },
      },
    });
    
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    
    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        owner: workspace.owner,
        projectCount: workspace._count.projects,
        memberCount: workspace._count.members + 1, // +1 for owner
      },
      period: {
        start: period.start,
        end: period.end,
        days: Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24)),
      },
      billing,
      generatedAt: new Date(),
      currency: 'USD',
    };
    
  } catch (error) {
    logger.error('Failed to generate billing report', { workspaceId, error });
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, stopping billing processor...');
  await stopBillingProcessor();
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, stopping billing processor...');
  await stopBillingProcessor();
});