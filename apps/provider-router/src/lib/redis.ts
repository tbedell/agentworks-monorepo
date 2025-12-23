import { createClient, RedisClientType } from 'redis';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('provider-router:redis');

let redis: RedisClientType | null = null;

export async function initializeRedis(): Promise<RedisClientType | null> {
  if (redis) {
    return redis;
  }

  // Skip Redis initialization if REDIS_URL is not set or explicitly disabled
  if (!process.env.REDIS_URL || process.env.DISABLE_REDIS === 'true') {
    logger.info('Redis disabled or REDIS_URL not set - running without Redis');
    return null;
  }

  try {
    redis = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.warn('Redis connection failed after 3 retries, continuing without Redis');
            return false;
          }
          return Math.min(retries * 100, 1000);
        }
      }
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
    logger.warn('Failed to initialize Redis - continuing without Redis', { error });
    redis = null;
    return null;
  }
}

export function getRedis(): RedisClientType | null {
  return redis;
}

export function isRedisAvailable(): boolean {
  return redis !== null && redis.isReady;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis disconnected');
  }
}

// Provider usage caching - gracefully handle missing Redis
export async function cacheProviderUsage(
  workspaceId: string,
  provider: string,
  model: string,
  usage: { inputTokens: number; outputTokens: number; cost: number; price: number }
): Promise<void> {
  const client = getRedis();
  if (!client) return;
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
  if (!client) return null;
  const key = `usage:${workspaceId}:${provider}:${model}`;

  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

// Provider health caching - gracefully handle missing Redis
export async function cacheProviderHealth(provider: string, isHealthy: boolean): Promise<void> {
  const client = getRedis();
  if (!client) return;
  const key = `provider:health:${provider}`;

  await client.setEx(key, 300, JSON.stringify({
    healthy: isHealthy,
    timestamp: Date.now(),
  }));
}

export async function getProviderHealth(provider: string): Promise<boolean | null> {
  const client = getRedis();
  if (!client) return null;
  const key = `provider:health:${provider}`;

  const data = await client.get(key);
  if (!data) return null;

  const health = JSON.parse(data);
  return health.healthy;
}

// Provider failover tracking - gracefully handle missing Redis
export async function incrementProviderFailure(provider: string): Promise<number> {
  const client = getRedis();
  if (!client) return 0;
  const key = `provider:failures:${provider}`;

  const failures = await client.incr(key);
  await client.expire(key, 3600); // Reset after 1 hour

  return failures;
}

export async function getProviderFailures(provider: string): Promise<number> {
  const client = getRedis();
  if (!client) return 0;
  const key = `provider:failures:${provider}`;

  const failures = await client.get(key);
  return failures ? parseInt(failures, 10) : 0;
}

export async function resetProviderFailures(provider: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  const key = `provider:failures:${provider}`;

  await client.del(key);
}

// Request rate limiting per workspace - gracefully handle missing Redis
export async function checkRateLimit(
  workspaceId: string,
  maxRequests = 100,
  windowSeconds = 3600
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const client = getRedis();
  // If Redis is not available, allow all requests (no rate limiting)
  if (!client) {
    return {
      allowed: true,
      remaining: maxRequests,
      resetTime: Date.now() + (windowSeconds * 1000),
    };
  }
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