import { createClient, RedisClientType } from 'redis';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('log-streaming:redis');

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

// Log streaming helpers
export async function publishLogEvent(channel: string, event: any): Promise<void> {
  const client = getRedis();
  await client.publish(channel, JSON.stringify(event));
}

export async function subscribeToLogEvents(
  channels: string[],
  callback: (channel: string, message: string) => void
): Promise<RedisClientType> {
  const subscriber = redis!.duplicate();
  await subscriber.connect();
  
  subscriber.on('message', callback);
  
  for (const channel of channels) {
    await subscriber.subscribe(channel, callback);
  }
  
  return subscriber;
}

// Session management
export async function createStreamSession(sessionId: string, metadata: any): Promise<void> {
  const client = getRedis();
  const sessionData = {
    sessionId,
    metadata,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    status: 'active',
  };
  
  await client.setEx(`session:${sessionId}`, 86400, JSON.stringify(sessionData)); // 24 hour TTL
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  const client = getRedis();
  const sessionKey = `session:${sessionId}`;
  
  const sessionData = await client.get(sessionKey);
  if (sessionData) {
    const session = JSON.parse(sessionData);
    session.lastActivity = Date.now();
    await client.setEx(sessionKey, 86400, JSON.stringify(session));
  }
}

export async function endStreamSession(sessionId: string): Promise<void> {
  const client = getRedis();
  const sessionKey = `session:${sessionId}`;
  
  const sessionData = await client.get(sessionKey);
  if (sessionData) {
    const session = JSON.parse(sessionData);
    session.status = 'ended';
    session.endedAt = Date.now();
    await client.setEx(sessionKey, 86400, JSON.stringify(session));
  }
}

export async function getStreamSession(sessionId: string): Promise<any | null> {
  const client = getRedis();
  const sessionData = await client.get(`session:${sessionId}`);
  return sessionData ? JSON.parse(sessionData) : null;
}

// Active connections tracking
export async function addActiveConnection(connectionId: string, metadata: any): Promise<void> {
  const client = getRedis();
  const connectionData = {
    connectionId,
    metadata,
    connectedAt: Date.now(),
  };
  
  await client.hSet('active:connections', connectionId, JSON.stringify(connectionData));
}

export async function removeActiveConnection(connectionId: string): Promise<void> {
  const client = getRedis();
  await client.hDel('active:connections', connectionId);
}

export async function getActiveConnections(): Promise<any[]> {
  const client = getRedis();
  const connections = await client.hGetAll('active:connections');
  
  return Object.values(connections).map(connectionData => JSON.parse(connectionData));
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