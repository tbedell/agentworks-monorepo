import { createClient, RedisClientType } from 'redis';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('agent-orchestrator:redis');

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

// Queue management helpers
export async function addToQueue(queueName: string, data: any, priority = 0): Promise<void> {
  const client = getRedis();
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
    data,
    priority,
    timestamp: Date.now(),
  };
  
  await client.lPush(`queue:${queueName}`, JSON.stringify(item));
}

export async function getFromQueue(queueName: string, timeout = 0): Promise<any | null> {
  const client = getRedis();
  
  const result = timeout > 0 
    ? await client.brPop(`queue:${queueName}`, timeout)
    : await client.rPop(`queue:${queueName}`);
  
  if (!result) return null;
  
  const item = typeof result === 'string' ? result : result.element;
  return JSON.parse(item);
}

// Agent state management
export async function setAgentState(runId: string, state: any, ttlSeconds = 3600): Promise<void> {
  const client = getRedis();
  await client.setEx(`agent:state:${runId}`, ttlSeconds, JSON.stringify(state));
}

export async function getAgentState(runId: string): Promise<any | null> {
  const client = getRedis();
  const data = await client.get(`agent:state:${runId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteAgentState(runId: string): Promise<void> {
  const client = getRedis();
  await client.del(`agent:state:${runId}`);
}

// Run status tracking
export async function setRunStatus(runId: string, status: string, metadata?: any): Promise<void> {
  const client = getRedis();
  const data = {
    status,
    timestamp: Date.now(),
    ...(metadata && { metadata }),
  };
  
  await client.setEx(`run:status:${runId}`, 86400, JSON.stringify(data)); // 24 hour TTL
}

export async function getRunStatus(runId: string): Promise<any | null> {
  const client = getRedis();
  const data = await client.get(`run:status:${runId}`);
  return data ? JSON.parse(data) : null;
}

// Active runs tracking
export async function addActiveRun(runId: string, agentId: string, cardId: string): Promise<void> {
  const client = getRedis();
  const data = {
    runId,
    agentId,
    cardId,
    startTime: Date.now(),
  };
  
  await client.hSet('active:runs', runId, JSON.stringify(data));
}

export async function removeActiveRun(runId: string): Promise<void> {
  const client = getRedis();
  await client.hDel('active:runs', runId);
}

export async function getActiveRuns(): Promise<any[]> {
  const client = getRedis();
  const runs = await client.hGetAll('active:runs');
  
  return Object.values(runs).map(runData => JSON.parse(runData));
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