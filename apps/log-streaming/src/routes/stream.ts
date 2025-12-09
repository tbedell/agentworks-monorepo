import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { createLogger } from '@agentworks/shared';
import { 
  addWebSocketConnection, 
  removeWebSocketConnection, 
  getConnectionStats, 
  sendDirectMessage, 
  getRunConnections 
} from '../lib/stream-manager.js';
import { getRecentLogEvents } from '../lib/log-storage.js';

const logger = createLogger('log-streaming:stream');

export async function streamRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // WebSocket endpoint for real-time log streaming
  app.register(async function (app) {
    app.get('/ws/:runId', { websocket: true }, async (connection, request) => {
      const { runId } = request.params as { runId: string };
      const { sessionId } = request.query as { sessionId?: string };
      
      try {
        logger.info('WebSocket connection established', { runId, sessionId });
        
        const connectionId = await addWebSocketConnection(
          connection,
          runId,
          sessionId,
          {
            userAgent: request.headers['user-agent'],
            remoteAddress: request.ip,
          }
        );
        
        // Send recent logs to new connection
        try {
          const recentLogs = await getRecentLogEvents(runId, 20);
          
          if (recentLogs.length > 0) {
            connection.send(JSON.stringify({
              type: 'history',
              data: {
                logs: recentLogs,
                count: recentLogs.length,
              },
              timestamp: Date.now(),
            }));
          }
        } catch (error) {
          logger.error('Failed to send recent logs to new connection', {
            connectionId,
            error,
          });
        }
        
        // Handle connection close
        connection.on('close', async () => {
          logger.info('WebSocket connection closed', { connectionId, runId });
          await removeWebSocketConnection(connectionId);
        });
        
        connection.on('error', async (error: any) => {
          logger.error('WebSocket connection error', { connectionId, runId, error });
          await removeWebSocketConnection(connectionId);
        });
        
      } catch (error) {
        logger.error('Failed to establish WebSocket connection', { runId, error });
        connection.close();
      }
    });
  });

  // Get connection statistics
  app.get('/stats', async (request, reply) => {
    try {
      const stats = getConnectionStats();
      
      return reply.send({
        ...stats,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get connection stats', { error });
      
      return reply.status(500).send({
        error: 'STATS_FETCH_FAILED',
        message: 'Failed to fetch connection statistics',
      });
    }
  });

  // Get connections for a specific run
  app.get('/runs/:runId/connections', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      
      const connections = await getRunConnections(runId);
      
      return reply.send({
        runId,
        connections,
        total: connections.length,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get run connections', { error });
      
      return reply.status(500).send({
        error: 'CONNECTIONS_FETCH_FAILED',
        message: 'Failed to fetch run connections',
      });
    }
  });

  // Send direct message to specific connection
  app.post('/connections/:connectionId/message', async (request, reply) => {
    try {
      const { connectionId } = request.params as { connectionId: string };
      const { message } = request.body as { message: any };
      
      if (!message) {
        return reply.status(400).send({
          error: 'MESSAGE_REQUIRED',
          message: 'Message is required',
        });
      }
      
      const sent = await sendDirectMessage(connectionId, message);
      
      if (!sent) {
        return reply.status(404).send({
          error: 'CONNECTION_NOT_FOUND',
          message: 'Connection not found or not active',
        });
      }
      
      return reply.send({
        connectionId,
        sent: true,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to send direct message', { error });
      
      return reply.status(500).send({
        error: 'MESSAGE_SEND_FAILED',
        message: 'Failed to send direct message',
      });
    }
  });

  // Broadcast message to all connections for a run
  app.post('/runs/:runId/broadcast', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      const { message, type = 'broadcast' } = request.body as { message: any; type?: string };
      
      if (!message) {
        return reply.status(400).send({
          error: 'MESSAGE_REQUIRED',
          message: 'Message is required',
        });
      }
      
      const connections = await getRunConnections(runId);
      
      if (connections.length === 0) {
        return reply.send({
          runId,
          sent: 0,
          message: 'No active connections for this run',
        });
      }
      
      let sentCount = 0;
      
      for (const connectionId of connections) {
        try {
          const sent = await sendDirectMessage(connectionId, {
            type,
            data: message,
            broadcastId: `broadcast-${Date.now()}`,
          });
          
          if (sent) {
            sentCount++;
          }
        } catch (error) {
          logger.error('Failed to send broadcast message to connection', {
            connectionId,
            error,
          });
        }
      }
      
      return reply.send({
        runId,
        totalConnections: connections.length,
        sent: sentCount,
        failed: connections.length - sentCount,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to broadcast message', { error });
      
      return reply.status(500).send({
        error: 'BROADCAST_FAILED',
        message: 'Failed to broadcast message',
      });
    }
  });

  // Test WebSocket connectivity
  app.get('/test/:runId', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      
      // Return WebSocket connection info for testing
      const wsUrl = `ws://localhost:${process.env.PORT || 8003}/stream/ws/${runId}`;
      
      return reply.send({
        runId,
        websocketUrl: wsUrl,
        testInstructions: {
          connect: `Connect to ${wsUrl}`,
          messages: [
            'Send {"type":"ping"} to test connection',
            'Receive log events in real-time',
            'Connection automatically closes on inactivity',
          ],
        },
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get test info', { error });
      
      return reply.status(500).send({
        error: 'TEST_INFO_FAILED',
        message: 'Failed to get test information',
      });
    }
  });

  // Health check for streaming service
  app.get('/health', async (request, reply) => {
    try {
      const stats = getConnectionStats();
      
      return reply.send({
        status: 'healthy',
        connections: {
          total: stats.totalConnections,
          byRun: Object.keys(stats.connectionsByRun).length,
        },
        uptime: stats.oldestConnection ? Date.now() - stats.oldestConnection : 0,
        timestamp: new Date(),
      });
      
    } catch (error) {
      const err = error as any;
      logger.error('Failed to get streaming health', { error });
      
      return reply.status(500).send({
        status: 'unhealthy',
        error: err.message,
        timestamp: new Date(),
      });
    }
  });
}