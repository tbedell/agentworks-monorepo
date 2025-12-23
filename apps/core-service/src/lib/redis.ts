import { createClient, RedisClientType } from 'redis';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('core-service:redis');

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
        connectTimeout: 5000, // 5 second timeout
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.warn('Redis connection failed after 3 retries, continuing without Redis');
            return false; // Stop retrying
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

// Session management helpers - gracefully handle missing Redis
export async function setSession(sessionId: string, data: any, ttlSeconds = 86400): Promise<void> {
  const client = getRedis();
  if (!client) {
    logger.debug('Redis not available, skipping session storage');
    return;
  }
  await client.setEx(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
}

export async function getSession(sessionId: string): Promise<any | null> {
  const client = getRedis();
  if (!client) {
    return null;
  }
  const data = await client.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const client = getRedis();
  if (!client) {
    return;
  }
  await client.del(`session:${sessionId}`);
}

// Caching helpers - gracefully handle missing Redis
export async function setCache(key: string, data: any, ttlSeconds = 3600): Promise<void> {
  const client = getRedis();
  if (!client) {
    logger.debug('Redis not available, skipping cache storage');
    return;
  }
  await client.setEx(`cache:${key}`, ttlSeconds, JSON.stringify(data));
}

export async function getCache(key: string): Promise<any | null> {
  const client = getRedis();
  if (!client) {
    return null;
  }
  const data = await client.get(`cache:${key}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteCache(key: string): Promise<void> {
  const client = getRedis();
  if (!client) {
    return;
  }
  await client.del(`cache:${key}`);
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