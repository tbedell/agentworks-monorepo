import { createClient, RedisClientType } from 'redis';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('billing-service:redis');

let redis: RedisClientType | null = null;

export async function initializeRedis(): Promise<RedisClientType | null> {
  if (redis) return redis;
  if (!process.env.REDIS_URL || process.env.DISABLE_REDIS === 'true') {
    logger.info('Redis disabled or not configured');
    return null;
  }
  try {
    redis = createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: 5000, reconnectStrategy: (r) => r > 3 ? false : Math.min(r * 100, 1000) }});
    redis.on('error', (e) => logger.error('Redis error', { error: e }));
    await redis.connect();
    await redis.ping();
    logger.info('Redis connected');
    return redis;
  } catch (e) {
    logger.warn('Redis unavailable', { error: e });
    redis = null;
    return null;
  }
}

export function getRedis(): RedisClientType | null {
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis disconnected');
  }
}

// Usage event queue management
export async function addUsageEvent(event: any): Promise<void> {
  const client = getRedis();
  if (!client) return;
  await client.lPush('usage-events', JSON.stringify({
    ...event,
    queuedAt: Date.now(),
  }));
}

export async function getUsageEvents(batchSize = 100): Promise<any[]> {
  const client = getRedis();
  if (!client) return [];
  const events = [];

  for (let i = 0; i < batchSize; i++) {
    const event = await client.rPop('usage-events');
    if (!event) break;
    events.push(JSON.parse(event));
  }

  return events;
}

// Billing cache management
export async function cacheBillingSummary(workspaceId: string, summary: any, ttl = 3600): Promise<void> {
  const client = getRedis();
  if (!client) return;
  await client.setEx(`billing:summary:${workspaceId}`, ttl, JSON.stringify({
    ...summary,
    cachedAt: Date.now(),
  }));
}

export async function getCachedBillingSummary(workspaceId: string): Promise<any | null> {
  const client = getRedis();
  if (!client) return null;
  const data = await client.get(`billing:summary:${workspaceId}`);
  return data ? JSON.parse(data) : null;
}

export async function invalidateBillingCache(workspaceId: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  await client.del(`billing:summary:${workspaceId}`);
}

// Usage aggregation tracking
export async function trackDailyUsage(workspaceId: string, date: string, usage: any): Promise<void> {
  const client = getRedis();
  if (!client) return;
  const key = `daily:usage:${workspaceId}:${date}`;

  const existingData = await client.get(key);
  const currentUsage = existingData ? JSON.parse(existingData) : {
    totalCost: 0,
    totalPrice: 0,
    totalTokens: 0,
    requestCount: 0,
    byProvider: {},
    byModel: {},
  };

  // Aggregate usage
  currentUsage.totalCost += usage.cost;
  currentUsage.totalPrice += usage.price;
  currentUsage.totalTokens += usage.inputTokens + usage.outputTokens;
  currentUsage.requestCount += 1;

  // By provider
  if (!currentUsage.byProvider[usage.provider]) {
    currentUsage.byProvider[usage.provider] = {
      cost: 0,
      price: 0,
      tokens: 0,
      requests: 0,
    };
  }
  currentUsage.byProvider[usage.provider].cost += usage.cost;
  currentUsage.byProvider[usage.provider].price += usage.price;
  currentUsage.byProvider[usage.provider].tokens += usage.inputTokens + usage.outputTokens;
  currentUsage.byProvider[usage.provider].requests += 1;

  // By model
  if (!currentUsage.byModel[usage.model]) {
    currentUsage.byModel[usage.model] = {
      cost: 0,
      price: 0,
      tokens: 0,
      requests: 0,
    };
  }
  currentUsage.byModel[usage.model].cost += usage.cost;
  currentUsage.byModel[usage.model].price += usage.price;
  currentUsage.byModel[usage.model].tokens += usage.inputTokens + usage.outputTokens;
  currentUsage.byModel[usage.model].requests += 1;

  currentUsage.lastUpdated = Date.now();

  // Store with 90 day TTL
  await client.setEx(key, 90 * 24 * 60 * 60, JSON.stringify(currentUsage));
}

export async function getDailyUsage(workspaceId: string, date: string): Promise<any | null> {
  const client = getRedis();
  if (!client) return null;
  const key = `daily:usage:${workspaceId}:${date}`;

  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

export async function getUsageRange(workspaceId: string, startDate: string, endDate: string): Promise<Record<string, any>> {
  const usage: Record<string, any> = {};

  // Generate date range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    const dateString = current.toISOString().split('T')[0];
    const dailyUsage = await getDailyUsage(workspaceId, dateString);

    if (dailyUsage) {
      usage[dateString] = dailyUsage;
    }

    current.setDate(current.getDate() + 1);
  }

  return usage;
}

// Rate limiting for billing operations
export async function checkBillingRateLimit(workspaceId: string, operation: string, maxOps = 10, windowSeconds = 60): Promise<boolean> {
  const client = getRedis();
  if (!client) return true; // Allow all if Redis not available
  const key = `billing:ratelimit:${workspaceId}:${operation}`;

  const current = await client.incr(key);

  if (current === 1) {
    await client.expire(key, windowSeconds);
  }

  return current <= maxOps;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, disconnecting Redis...');
  await disconnectRedis();
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, disconnecting Redis...');
  await disconnectRedis();
});