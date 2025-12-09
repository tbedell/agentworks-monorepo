import { createClient, RedisClientType } from 'redis';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('core-service:redis');

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

// Session management helpers
export async function setSession(sessionId: string, data: any, ttlSeconds = 86400): Promise<void> {
  const client = getRedis();
  await client.setEx(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
}

export async function getSession(sessionId: string): Promise<any | null> {
  const client = getRedis();
  const data = await client.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const client = getRedis();
  await client.del(`session:${sessionId}`);
}

// Caching helpers
export async function setCache(key: string, data: any, ttlSeconds = 3600): Promise<void> {
  const client = getRedis();
  await client.setEx(`cache:${key}`, ttlSeconds, JSON.stringify(data));
}

export async function getCache(key: string): Promise<any | null> {
  const client = getRedis();
  const data = await client.get(`cache:${key}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteCache(key: string): Promise<void> {
  const client = getRedis();
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