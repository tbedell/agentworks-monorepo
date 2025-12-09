import { WebSocket } from 'ws';
import { createLogger, generateCorrelationId } from '@agentworks/shared';
import type { LogStreamEvent } from '@agentworks/shared';
import { 
  publishLogEvent, 
  subscribeToLogEvents, 
  addActiveConnection, 
  removeActiveConnection, 
  updateSessionActivity 
} from './redis.js';
import { storeLogEvent } from './log-storage.js';

const logger = createLogger('log-streaming:stream-manager');

// Active WebSocket connections by run ID
const connectionsByRunId = new Map<string, Set<WebSocketConnection>>();

// All connections by connection ID
const allConnections = new Map<string, WebSocketConnection>();

interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  runId: string;
  sessionId?: string;
  subscriptionChannels: string[];
  lastActivity: number;
  metadata?: any;
}

export async function initializeStreamManager(): Promise<void> {
  try {
    // Start connection cleanup worker
    startConnectionCleanup();
    
    logger.info('Stream manager initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize stream manager', { error });
    throw error;
  }
}

export async function addWebSocketConnection(
  socket: WebSocket,
  runId: string,
  sessionId?: string,
  metadata?: any
): Promise<string> {
  const connectionId = generateCorrelationId();
  
  const connection: WebSocketConnection = {
    id: connectionId,
    socket,
    runId,
    sessionId,
    subscriptionChannels: [],
    lastActivity: Date.now(),
    metadata,
  };
  
  // Add to connection maps
  allConnections.set(connectionId, connection);
  
  if (!connectionsByRunId.has(runId)) {
    connectionsByRunId.set(runId, new Set());
  }
  connectionsByRunId.get(runId)!.add(connection);
  
  // Track in Redis
  await addActiveConnection(connectionId, {
    runId,
    sessionId,
    metadata,
  });
  
  // Subscribe to log events for this run
  const channel = `logs:${runId}`;
  connection.subscriptionChannels.push(channel);
  
  // Set up socket event handlers
  setupSocketHandlers(connection);
  
  logger.info('WebSocket connection added', {
    connectionId,
    runId,
    sessionId,
    totalConnections: allConnections.size,
  });
  
  return connectionId;
}

export async function removeWebSocketConnection(connectionId: string): Promise<void> {
  const connection = allConnections.get(connectionId);
  
  if (!connection) {
    logger.warn('Attempted to remove non-existent connection', { connectionId });
    return;
  }
  
  // Remove from maps
  allConnections.delete(connectionId);
  
  const runConnections = connectionsByRunId.get(connection.runId);
  if (runConnections) {
    runConnections.delete(connection);
    if (runConnections.size === 0) {
      connectionsByRunId.delete(connection.runId);
    }
  }
  
  // Remove from Redis
  await removeActiveConnection(connectionId);
  
  // Close socket if still open
  if (connection.socket.readyState === WebSocket.OPEN) {
    connection.socket.close();
  }
  
  logger.info('WebSocket connection removed', {
    connectionId,
    runId: connection.runId,
    remainingConnections: allConnections.size,
  });
}

export async function broadcastLogEvent(runId: string, event: LogStreamEvent): Promise<void> {
  try {
    // Store event
    await storeLogEvent(runId, event);
    
    // Publish to Redis for other service instances
    await publishLogEvent(`logs:${runId}`, event);
    
    // Broadcast to local connections
    const connections = connectionsByRunId.get(runId);
    if (connections && connections.size > 0) {
      const message = JSON.stringify({
        type: 'log_event',
        data: event,
        timestamp: Date.now(),
      });
      
      let successCount = 0;
      let failCount = 0;
      
      for (const connection of connections) {
        try {
          if (connection.socket.readyState === WebSocket.OPEN) {
            connection.socket.send(message);
            connection.lastActivity = Date.now();
            successCount++;
          } else {
            // Clean up dead connections
            await removeWebSocketConnection(connection.id);
            failCount++;
          }
        } catch (error) {
          logger.error('Failed to send to connection', {
            connectionId: connection.id,
            error,
          });
          failCount++;
        }
      }
      
      logger.debug('Log event broadcasted', {
        runId,
        eventType: event.type,
        successCount,
        failCount,
      });
    }
    
  } catch (error) {
    logger.error('Failed to broadcast log event', { error, runId });
  }
}

export function getConnectionStats(): {
  totalConnections: number;
  connectionsByRun: Record<string, number>;
  oldestConnection: number | null;
} {
  const connectionsByRun: Record<string, number> = {};
  let oldestConnection: number | null = null;
  
  for (const [runId, connections] of connectionsByRunId) {
    connectionsByRun[runId] = connections.size;
  }
  
  for (const connection of allConnections.values()) {
    if (oldestConnection === null || connection.lastActivity < oldestConnection) {
      oldestConnection = connection.lastActivity;
    }
  }
  
  return {
    totalConnections: allConnections.size,
    connectionsByRun,
    oldestConnection,
  };
}

export async function sendDirectMessage(
  connectionId: string,
  message: any
): Promise<boolean> {
  const connection = allConnections.get(connectionId);
  
  if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
    return false;
  }
  
  try {
    connection.socket.send(JSON.stringify({
      type: 'direct_message',
      data: message,
      timestamp: Date.now(),
    }));
    
    connection.lastActivity = Date.now();
    return true;
  } catch (error) {
    logger.error('Failed to send direct message', { connectionId, error });
    return false;
  }
}

export async function getRunConnections(runId: string): Promise<string[]> {
  const connections = connectionsByRunId.get(runId);
  return connections ? Array.from(connections).map(conn => conn.id) : [];
}

function setupSocketHandlers(connection: WebSocketConnection): void {
  const { socket, id: connectionId } = connection;
  
  socket.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      connection.lastActivity = Date.now();
      
      // Update session activity if session ID is present
      if (connection.sessionId) {
        await updateSessionActivity(connection.sessionId);
      }
      
      logger.debug('Received WebSocket message', {
        connectionId,
        messageType: message.type,
      });
      
      // Handle different message types
      switch (message.type) {
        case 'ping':
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now(),
          }));
          break;
          
        case 'subscribe':
          // Handle subscription to additional channels
          if (message.channel) {
            connection.subscriptionChannels.push(message.channel);
          }
          break;
          
        default:
          logger.warn('Unknown message type', {
            connectionId,
            messageType: message.type,
          });
      }
      
    } catch (error) {
      logger.error('Error handling WebSocket message', {
        connectionId,
        error,
      });
    }
  });
  
  socket.on('close', async () => {
    logger.info('WebSocket connection closed', { connectionId });
    await removeWebSocketConnection(connectionId);
  });
  
  socket.on('error', async (error) => {
    logger.error('WebSocket connection error', { connectionId, error });
    await removeWebSocketConnection(connectionId);
  });
  
  // Send welcome message
  try {
    socket.send(JSON.stringify({
      type: 'connected',
      data: {
        connectionId,
        runId: connection.runId,
        sessionId: connection.sessionId,
      },
      timestamp: Date.now(),
    }));
  } catch (error) {
    logger.error('Failed to send welcome message', { connectionId, error });
  }
}

function startConnectionCleanup(): void {
  const cleanup = () => {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const staleConnections: string[] = [];
    
    for (const connection of allConnections.values()) {
      if (now - connection.lastActivity > maxAge) {
        staleConnections.push(connection.id);
      }
    }
    
    if (staleConnections.length > 0) {
      logger.info(`Cleaning up ${staleConnections.length} stale connections`);
      
      for (const connectionId of staleConnections) {
        removeWebSocketConnection(connectionId);
      }
    }
  };
  
  // Run cleanup every minute
  setInterval(cleanup, 60 * 1000);
  
  logger.info('Connection cleanup worker started');
}

// Subscribe to Redis pub/sub for log events from other service instances
subscribeToLogEvents(['logs:*'], (channel, message) => {
  try {
    const event = JSON.parse(message);
    const runId = channel.replace('logs:', '');
    
    // Broadcast to local connections (don't store again)
    const connections = connectionsByRunId.get(runId);
    if (connections && connections.size > 0) {
      const socketMessage = JSON.stringify({
        type: 'log_event',
        data: event,
        timestamp: Date.now(),
      });
      
      for (const connection of connections) {
        if (connection.socket.readyState === WebSocket.OPEN) {
          try {
            connection.socket.send(socketMessage);
            connection.lastActivity = Date.now();
          } catch (error) {
            logger.error('Failed to relay Redis message to connection', {
              connectionId: connection.id,
              error,
            });
          }
        }
      }
    }
    
  } catch (error) {
    logger.error('Error processing Redis log event', { error, channel });
  }
});