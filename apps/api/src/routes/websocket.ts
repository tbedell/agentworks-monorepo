import { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import WebSocketClient from 'ws';

const LOG_STREAMING_URL = process.env.LOG_STREAMING_URL || 'http://localhost:8003';
const LOG_STREAMING_WS_URL = LOG_STREAMING_URL.replace('http://', 'ws://').replace('https://', 'wss://');

// Track active log stream connections per client
interface ClientConnection {
  socket: WebSocket;
  subscriptions: Map<string, WebSocketClient>; // runId -> upstream WS
  cardSubscriptions: Map<string, Set<string>>; // cardId -> Set<runId>
}

const activeClients = new Map<WebSocket, ClientConnection>();

export async function websocketRoutes(fastify: FastifyInstance) {
  await fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket: WebSocket, req: any) => {
      console.log('[WebSocket] Client connection established');

      // Initialize client connection state
      const clientState: ClientConnection = {
        socket,
        subscriptions: new Map(),
        cardSubscriptions: new Map(),
      };
      activeClients.set(socket, clientState);

      socket.on('message', async (message: any) => {
        try {
          const data = JSON.parse(message.toString());

          switch (data.type) {
            case 'subscribe':
              await handleSubscribe(clientState, data.payload);
              break;

            case 'unsubscribe':
              handleUnsubscribe(clientState, data.payload);
              break;

            case 'ping':
              socket.send(JSON.stringify({ type: 'pong' }));
              break;

            default:
              console.log('[WebSocket] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      });

      socket.on('close', () => {
        console.log('[WebSocket] Client connection closed');
        cleanupClient(clientState);
        activeClients.delete(socket);
      });

      socket.on('error', (error: any) => {
        console.error('[WebSocket] Client error:', error);
        cleanupClient(clientState);
        activeClients.delete(socket);
      });

      // Send connected confirmation
      socket.send(JSON.stringify({
        type: 'connected',
        payload: {
          status: 'Connected to AgentWorks API',
          logStreamingAvailable: true,
        }
      }));
    });
  });
}

/**
 * Handle client subscription to agent runs
 */
async function handleSubscribe(
  client: ClientConnection,
  payload: { runId?: string; cardId?: string; projectId?: string }
) {
  const { runId, cardId } = payload;

  if (runId) {
    // Direct subscription to a specific agent run
    await subscribeToLogStream(client, runId);
    console.log(`[WebSocket] Client subscribed to runId: ${runId}`);
  }

  if (cardId) {
    // Track card subscription (runs will be subscribed when they start)
    if (!client.cardSubscriptions.has(cardId)) {
      client.cardSubscriptions.set(cardId, new Set());
    }
    console.log(`[WebSocket] Client subscribed to cardId: ${cardId}`);

    // Notify client of subscription
    client.socket.send(JSON.stringify({
      type: 'subscribed',
      payload: { cardId, status: 'listening' }
    }));
  }
}

/**
 * Handle client unsubscription
 */
function handleUnsubscribe(
  client: ClientConnection,
  payload: { runId?: string; cardId?: string }
) {
  const { runId, cardId } = payload;

  if (runId && client.subscriptions.has(runId)) {
    const upstreamWs = client.subscriptions.get(runId);
    if (upstreamWs) {
      upstreamWs.close();
    }
    client.subscriptions.delete(runId);
    console.log(`[WebSocket] Client unsubscribed from runId: ${runId}`);
  }

  if (cardId) {
    // Close all run subscriptions for this card
    const runIds = client.cardSubscriptions.get(cardId);
    if (runIds) {
      for (const rid of runIds) {
        const upstreamWs = client.subscriptions.get(rid);
        if (upstreamWs) {
          upstreamWs.close();
        }
        client.subscriptions.delete(rid);
      }
    }
    client.cardSubscriptions.delete(cardId);
    console.log(`[WebSocket] Client unsubscribed from cardId: ${cardId}`);
  }
}

/**
 * Subscribe to log-streaming service for a specific run
 */
async function subscribeToLogStream(client: ClientConnection, runId: string): Promise<void> {
  // Don't create duplicate subscriptions
  if (client.subscriptions.has(runId)) {
    return;
  }

  try {
    const wsUrl = `${LOG_STREAMING_WS_URL}/stream/ws/${runId}`;
    const upstreamWs = new WebSocketClient(wsUrl);

    upstreamWs.on('open', () => {
      console.log(`[WebSocket] Connected to log-streaming for runId: ${runId}`);
      client.subscriptions.set(runId, upstreamWs);
    });

    upstreamWs.on('message', (data: WebSocketClient.Data) => {
      try {
        const event = JSON.parse(data.toString());

        // Forward log events to client
        if (client.socket.readyState === 1) {
          client.socket.send(JSON.stringify({
            type: 'agent-log',
            runId,
            payload: event,
          }));
        }
      } catch (error) {
        console.error(`[WebSocket] Failed to forward log for runId ${runId}:`, error);
      }
    });

    upstreamWs.on('close', () => {
      console.log(`[WebSocket] Log-streaming connection closed for runId: ${runId}`);
      client.subscriptions.delete(runId);

      // Notify client
      if (client.socket.readyState === 1) {
        client.socket.send(JSON.stringify({
          type: 'stream-closed',
          runId,
        }));
      }
    });

    upstreamWs.on('error', (error: Error) => {
      console.error(`[WebSocket] Log-streaming error for runId ${runId}:`, error.message);
      client.subscriptions.delete(runId);
    });

  } catch (error) {
    console.error(`[WebSocket] Failed to connect to log-streaming for runId ${runId}:`, error);
  }
}

/**
 * Cleanup client connections on disconnect
 */
function cleanupClient(client: ClientConnection): void {
  // Close all upstream log-streaming connections
  for (const [runId, upstreamWs] of client.subscriptions) {
    try {
      upstreamWs.close();
    } catch (error) {
      console.error(`[WebSocket] Failed to close upstream for runId ${runId}:`, error);
    }
  }
  client.subscriptions.clear();
  client.cardSubscriptions.clear();
}

/**
 * Broadcast a log event to all clients subscribed to a card
 * Called by other parts of the API when agent runs are created
 */
export async function notifyCardSubscribers(
  cardId: string,
  runId: string,
  event: { type: string; data: any }
): Promise<void> {
  for (const [socket, client] of activeClients) {
    if (client.cardSubscriptions.has(cardId)) {
      // Auto-subscribe to this run
      client.cardSubscriptions.get(cardId)?.add(runId);
      await subscribeToLogStream(client, runId);

      // Send initial notification
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({
          type: 'run-started',
          cardId,
          runId,
          payload: event.data,
        }));
      }
    }
  }
}
