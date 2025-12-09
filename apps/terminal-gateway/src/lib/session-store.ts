import { Redis } from 'ioredis';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('session-store');

export interface StoredSession {
  id: string;
  projectId: string;
  userId: string;
  devEnvId?: string;
  status: 'active' | 'disconnected' | 'terminated';
  cols: number;
  rows: number;
  gatewayId: string;
  createdAt: string;
  lastActivityAt: string;
}

const SESSION_PREFIX = 'terminal:session:';
const PROJECT_SESSIONS_PREFIX = 'terminal:project:';
const USER_SESSIONS_PREFIX = 'terminal:user:';
const SESSION_TTL = 60 * 60 * 24; // 24 hours

let redis: Redis | null = null;

export async function initializeSessionStore(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redis = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        if (times > 10) {
          logger.error('Redis connection failed after 10 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      maxRetriesPerRequest: 3,
    });

    redis.on('error', (error: Error) => {
      logger.error('Redis error', { error: error.message });
    });

    redis.on('connect', () => {
      logger.info('Connected to Redis');
    });

    // Test connection
    await redis.ping();
    logger.info('Session store initialized');
  } catch (error) {
    logger.error('Failed to initialize Redis', { error });
    throw error;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  if (!redis) {
    logger.warn('Redis not initialized, skipping session save');
    return;
  }

  const key = `${SESSION_PREFIX}${session.id}`;
  const projectKey = `${PROJECT_SESSIONS_PREFIX}${session.projectId}`;
  const userKey = `${USER_SESSIONS_PREFIX}${session.userId}`;

  try {
    const pipeline = redis.pipeline();

    // Store session data
    pipeline.setex(key, SESSION_TTL, JSON.stringify(session));

    // Add to project sessions set
    pipeline.sadd(projectKey, session.id);
    pipeline.expire(projectKey, SESSION_TTL);

    // Add to user sessions set
    pipeline.sadd(userKey, session.id);
    pipeline.expire(userKey, SESSION_TTL);

    await pipeline.exec();
    logger.debug('Session saved', { sessionId: session.id });
  } catch (error) {
    logger.error('Failed to save session', { sessionId: session.id, error });
    throw error;
  }
}

export async function getSession(sessionId: string): Promise<StoredSession | null> {
  if (!redis) {
    return null;
  }

  const key = `${SESSION_PREFIX}${sessionId}`;

  try {
    const data = await redis.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data);
  } catch (error) {
    logger.error('Failed to get session', { sessionId, error });
    return null;
  }
}

export async function updateSession(
  sessionId: string,
  updates: Partial<StoredSession>
): Promise<void> {
  if (!redis) {
    return;
  }

  const session = await getSession(sessionId);
  if (!session) {
    logger.warn('Cannot update non-existent session', { sessionId });
    return;
  }

  const updatedSession = { ...session, ...updates };
  await saveSession(updatedSession);
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (!redis) {
    return;
  }

  const session = await getSession(sessionId);
  if (!session) {
    return;
  }

  const key = `${SESSION_PREFIX}${sessionId}`;
  const projectKey = `${PROJECT_SESSIONS_PREFIX}${session.projectId}`;
  const userKey = `${USER_SESSIONS_PREFIX}${session.userId}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.del(key);
    pipeline.srem(projectKey, sessionId);
    pipeline.srem(userKey, sessionId);
    await pipeline.exec();
    logger.debug('Session deleted', { sessionId });
  } catch (error) {
    logger.error('Failed to delete session', { sessionId, error });
  }
}

export async function getSessionsByProject(projectId: string): Promise<StoredSession[]> {
  if (!redis) {
    return [];
  }

  const projectKey = `${PROJECT_SESSIONS_PREFIX}${projectId}`;

  try {
    const sessionIds = await redis.smembers(projectKey);
    const sessions: StoredSession[] = [];

    for (const sessionId of sessionIds) {
      const session = await getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  } catch (error) {
    logger.error('Failed to get sessions by project', { projectId, error });
    return [];
  }
}

export async function getSessionsByUser(userId: string): Promise<StoredSession[]> {
  if (!redis) {
    return [];
  }

  const userKey = `${USER_SESSIONS_PREFIX}${userId}`;

  try {
    const sessionIds = await redis.smembers(userKey);
    const sessions: StoredSession[] = [];

    for (const sessionId of sessionIds) {
      const session = await getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  } catch (error) {
    logger.error('Failed to get sessions by user', { userId, error });
    return [];
  }
}

export async function cleanupInactiveSessions(maxIdleMs: number): Promise<number> {
  if (!redis) {
    return 0;
  }

  const now = Date.now();
  let cleanedCount = 0;

  try {
    const keys = await redis.keys(`${SESSION_PREFIX}*`);

    for (const key of keys) {
      const data = await redis.get(key);
      if (!data) continue;

      const session: StoredSession = JSON.parse(data);
      const lastActivity = new Date(session.lastActivityAt).getTime();

      if (now - lastActivity > maxIdleMs) {
        await deleteSession(session.id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up inactive sessions', { count: cleanedCount });
    }
  } catch (error) {
    logger.error('Failed to cleanup inactive sessions', { error });
  }

  return cleanedCount;
}

export function getRedisClient(): Redis | null {
  return redis;
}

export async function closeSessionStore(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Session store closed');
  }
}
