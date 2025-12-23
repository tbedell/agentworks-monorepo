import { createClient, RedisClientType } from 'redis';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('log-streaming:redis');

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

// Log streaming helpers
export async function publishLogEvent(channel: string, event: any): Promise<void> {
  const client = getRedis();
  if (!client) return;
  await client.publish(channel, JSON.stringify(event));
}

export async function subscribeToLogEvents(
  channels: string[],
  callback: (channel: string, message: string) => void
): Promise<RedisClientType | null> {
  if (!redis) return null;
  const subscriber = redis.duplicate();
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
  if (!client) return;
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
  if (!client) return;
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
  if (!client) return;
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
  if (!client) return null;
  const sessionData = await client.get(`session:${sessionId}`);
  return sessionData ? JSON.parse(sessionData) : null;
}

// Active connections tracking
export async function addActiveConnection(connectionId: string, metadata: any): Promise<void> {
  const client = getRedis();
  if (!client) return;
  const connectionData = {
    connectionId,
    metadata,
    connectedAt: Date.now(),
  };

  await client.hSet('active:connections', connectionId, JSON.stringify(connectionData));
}

export async function removeActiveConnection(connectionId: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  await client.hDel('active:connections', connectionId);
}

export async function getActiveConnections(): Promise<any[]> {
  const client = getRedis();
  if (!client) return [];
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