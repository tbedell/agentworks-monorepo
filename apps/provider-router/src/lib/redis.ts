import { createClient, RedisClientType } from 'redis';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('provider-router:redis');

let redis: RedisClientType | null = null;

export async function initializeRedis(): Promise<RedisClientType> {
  if (redis) {
    return redis;
  }

  try {
    redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redis.on('error', (err) => {
      logger.error('Redis client error', { error: err });
    });

    redis.on('connect', () => {
      logger.info('Redis client connected');
    });

    redis.on('ready', () => {
      logger.info('Redis client ready');
    });

    redis.on('end', () => {
      logger.info('Redis client disconnected');
    });

    await redis.connect();
    
    // Test the connection
    await redis.ping();
    
    logger.info('Redis connection established');
    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis', { error });
    throw error;
  }
}

export function getRedis(): RedisClientType {
  if (!redis) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis disconnected');
  }
}

// Provider usage caching
export async function cacheProviderUsage(
  workspaceId: string,
  provider: string,
  model: string,
  usage: { inputTokens: number; outputTokens: number; cost: number; price: number }
): Promise<void> {
  const client = getRedis();
  const key = `usage:${workspaceId}:${provider}:${model}`;
  
  // Store usage data with 1 hour TTL
  await client.setEx(key, 3600, JSON.stringify({
    ...usage,
    timestamp: Date.now(),
  }));
}

export async function getProviderUsage(
  workspaceId: string,
  provider: string,
  model: string
): Promise<any | null> {
  const client = getRedis();
  const key = `usage:${workspaceId}:${provider}:${model}`;
  
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

// Provider health caching
export async function cacheProviderHealth(provider: string, isHealthy: boolean): Promise<void> {
  const client = getRedis();
  const key = `provider:health:${provider}`;
  
  await client.setEx(key, 300, JSON.stringify({
    healthy: isHealthy,
    timestamp: Date.now(),
  }));
}

export async function getProviderHealth(provider: string): Promise<boolean | null> {
  const client = getRedis();
  const key = `provider:health:${provider}`;
  
  const data = await client.get(key);
  if (!data) return null;
  
  const health = JSON.parse(data);
  return health.healthy;
}

// Provider failover tracking
export async function incrementProviderFailure(provider: string): Promise<number> {
  const client = getRedis();
  const key = `provider:failures:${provider}`;
  
  const failures = await client.incr(key);
  await client.expire(key, 3600); // Reset after 1 hour
  
  return failures;
}

export async function getProviderFailures(provider: string): Promise<number> {
  const client = getRedis();
  const key = `provider:failures:${provider}`;
  
  const failures = await client.get(key);
  return failures ? parseInt(failures, 10) : 0;
}

export async function resetProviderFailures(provider: string): Promise<void> {
  const client = getRedis();
  const key = `provider:failures:${provider}`;
  
  await client.del(key);
}

// Request rate limiting per workspace
export async function checkRateLimit(
  workspaceId: string,
  maxRequests = 100,
  windowSeconds = 3600
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const client = getRedis();
  const key = `ratelimit:${workspaceId}`;
  
  const current = await client.incr(key);
  
  if (current === 1) {
    await client.expire(key, windowSeconds);
  }
  
  const ttl = await client.ttl(key);
  const resetTime = Date.now() + (ttl * 1000);
  
  return {
    allowed: current <= maxRequests,
    remaining: Math.max(0, maxRequests - current),
    resetTime,
  };
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