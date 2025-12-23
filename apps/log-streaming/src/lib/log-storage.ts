import { createLogger } from '@agentworks/shared';
import type { LogStreamEvent } from '@agentworks/shared';
import { getRedis } from './redis.js';

const logger = createLogger('log-streaming:storage');

export async function initializeLogStorage(): Promise<void> {
  try {
    // Initialize log storage cleanup worker
    startCleanupWorker();
    logger.info('Log storage initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize log storage', { error });
    throw error;
  }
}

export async function storeLogEvent(runId: string, event: LogStreamEvent): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;

    const eventData = {
      ...event,
      storedAt: Date.now(),
    };

    // Store in sorted set for time-based retrieval
    const score = new Date(event.timestamp).getTime();
    await redis.zAdd(`logs:${runId}`, {
      score,
      value: JSON.stringify(eventData),
    });

    // Set expiration for the logs (7 days)
    await redis.expire(`logs:${runId}`, 7 * 24 * 60 * 60);

    // Also store in recent logs list for quick access
    await redis.lPush(`recent:${runId}`, JSON.stringify(eventData));
    await redis.lTrim(`recent:${runId}`, 0, 99); // Keep last 100 logs
    await redis.expire(`recent:${runId}`, 24 * 60 * 60); // 24 hour expiration

    logger.debug('Log event stored', {
      runId,
      type: event.type,
      timestamp: event.timestamp,
    });

  } catch (error) {
    logger.error('Failed to store log event', { error, runId });
    // Don't throw - storage failures shouldn't break the system
  }
}

export async function getLogEvents(
  runId: string,
  options: {
    limit?: number;
    offset?: number;
    since?: Date;
    until?: Date;
    level?: string;
    type?: string;
  } = {}
): Promise<LogStreamEvent[]> {
  try {
    const redis = getRedis();
    if (!redis) return [];

    const { limit = 50, offset = 0, since, until, level, type } = options;

    // Get logs from sorted set
    const minScore = since ? new Date(since).getTime() : '-inf';
    const maxScore = until ? new Date(until).getTime() : '+inf';

    const logs = await redis.zRangeByScoreWithScores(
      `logs:${runId}`,
      minScore,
      maxScore,
      {
        LIMIT: {
          offset,
          count: limit,
        },
      }
    );

    let events = logs.map(log => JSON.parse(log.value));

    // Apply filters
    if (level) {
      events = events.filter(event => event.data?.level === level);
    }

    if (type) {
      events = events.filter(event => event.type === type);
    }

    return events;

  } catch (error) {
    logger.error('Failed to get log events', { error, runId });
    return [];
  }
}

export async function getRecentLogEvents(runId: string, limit = 20): Promise<LogStreamEvent[]> {
  try {
    const redis = getRedis();
    if (!redis) return [];

    const logs = await redis.lRange(`recent:${runId}`, 0, limit - 1);
    return logs.map(log => JSON.parse(log));

  } catch (error) {
    logger.error('Failed to get recent log events', { error, runId });
    return [];
  }
}

export async function deleteLogEvents(runId: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;

    await Promise.all([
      redis.del(`logs:${runId}`),
      redis.del(`recent:${runId}`),
    ]);

    logger.info('Log events deleted', { runId });

  } catch (error) {
    logger.error('Failed to delete log events', { error, runId });
    throw error;
  }
}

export async function getLogStatistics(runId: string): Promise<{
  totalEvents: number;
  eventTypes: Record<string, number>;
  logLevels: Record<string, number>;
  timeRange: {
    first: Date | null;
    last: Date | null;
  };
}> {
  try {
    const redis = getRedis();
    if (!redis) {
      return {
        totalEvents: 0,
        eventTypes: {},
        logLevels: {},
        timeRange: { first: null, last: null },
      };
    }

    // Get total count
    const totalEvents = await redis.zCard(`logs:${runId}`);

    if (totalEvents === 0) {
      return {
        totalEvents: 0,
        eventTypes: {},
        logLevels: {},
        timeRange: { first: null, last: null },
      };
    }

    // Get all events for analysis
    const logs = await redis.zRange(`logs:${runId}`, 0, -1);
    const events = logs.map(log => JSON.parse(log));

    // Analyze events
    const eventTypes: Record<string, number> = {};
    const logLevels: Record<string, number> = {};
    let firstTimestamp: number | null = null;
    let lastTimestamp: number | null = null;

    for (const event of events) {
      // Count event types
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;

      // Count log levels (if present)
      if (event.data?.level) {
        logLevels[event.data.level] = (logLevels[event.data.level] || 0) + 1;
      }

      // Track time range
      const timestamp = new Date(event.timestamp).getTime();
      if (firstTimestamp === null || timestamp < firstTimestamp) {
        firstTimestamp = timestamp;
      }
      if (lastTimestamp === null || timestamp > lastTimestamp) {
        lastTimestamp = timestamp;
      }
    }

    return {
      totalEvents,
      eventTypes,
      logLevels,
      timeRange: {
        first: firstTimestamp ? new Date(firstTimestamp) : null,
        last: lastTimestamp ? new Date(lastTimestamp) : null,
      },
    };

  } catch (error) {
    logger.error('Failed to get log statistics', { error, runId });
    return {
      totalEvents: 0,
      eventTypes: {},
      logLevels: {},
      timeRange: { first: null, last: null },
    };
  }
}

export async function searchLogEvents(
  runId: string,
  query: string,
  options: {
    limit?: number;
    caseSensitive?: boolean;
  } = {}
): Promise<LogStreamEvent[]> {
  try {
    const redis = getRedis();
    if (!redis) return [];

    const { limit = 50, caseSensitive = false } = options;

    // Get all logs and search in memory
    // In a production system, you'd use a search engine like Elasticsearch
    const logs = await redis.zRange(`logs:${runId}`, 0, -1);
    const events = logs.map(log => JSON.parse(log));

    const searchTerm = caseSensitive ? query : query.toLowerCase();

    const matches = events.filter(event => {
      const content = JSON.stringify(event);
      const searchContent = caseSensitive ? content : content.toLowerCase();
      return searchContent.includes(searchTerm);
    });

    return matches.slice(0, limit);

  } catch (error) {
    logger.error('Failed to search log events', { error, runId, query });
    return [];
  }
}

async function startCleanupWorker(): Promise<void> {
  // Clean up expired logs periodically
  const cleanup = async () => {
    try {
      const redis = getRedis();
      if (!redis) return;

      // Get all log keys
      const keys = await redis.keys('logs:*');

      for (const key of keys) {
        const ttl = await redis.ttl(key);

        // If TTL is -1 (no expiration set), set it
        if (ttl === -1) {
          await redis.expire(key, 7 * 24 * 60 * 60); // 7 days
        }
      }

      logger.debug(`Processed ${keys.length} log keys for cleanup`);

    } catch (error) {
      logger.error('Error in log cleanup worker', { error });
    }
  };

  // Run cleanup every hour
  setInterval(cleanup, 60 * 60 * 1000);

  // Run cleanup immediately on startup
  setTimeout(cleanup, 5000); // Wait 5 seconds after startup
}
