import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from repo root
config({ path: resolve(__dirname, '..', '..', '..', '.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { createLogger, createHealthResponse } from '@agentworks/shared';
import { terminalRoutes } from './routes/terminal.js';
import { initializeSessionStore, closeSessionStore, cleanupInactiveSessions } from './lib/session-store.js';
import { ptyManager } from './lib/pty-manager.js';

const logger = createLogger('terminal-gateway');
const startTime = Date.now();

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
            },
          }
        : undefined,
  },
});

// Security
await app.register(helmet, {
  contentSecurityPolicy: false,
});

// Rate limiting
await app.register(rateLimit, {
  max: 1000,
  timeWindow: '1 minute',
});

// CORS - allow all origins in development for local network access
await app.register(cors, {
  origin: process.env.NODE_ENV === 'development' ? true : [process.env.FRONTEND_URL!],
  credentials: true,
});

// WebSocket support
await app.register(websocket, {
  options: {
    maxPayload: 1024 * 1024, // 1MB max message size
  },
});

// Initialize external dependencies
let redisHealthy = false;

try {
  await initializeSessionStore();
  redisHealthy = true;
  logger.info('Session store initialized');
} catch (error) {
  logger.warn('Failed to initialize Redis - running without session persistence', { error });
  // Continue without Redis - sessions will be local only
}

// Health check endpoint
app.get('/health', async () => {
  const uptime = Date.now() - startTime;
  // stats available for future use: ptyManager.getStats()

  return createHealthResponse(
    redisHealthy ? 'healthy' : 'unhealthy',
    '1.0.0',
    uptime,
    {
      redis: redisHealthy ? 'healthy' : 'unhealthy',
    }
  );
});

// Routes
await app.register(terminalRoutes, { prefix: '/api/terminal' });

// Global error handler
app.setErrorHandler(async (error, request, reply) => {
  const err = error as any;
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: request.url,
    method: request.method,
  });

  if (err.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: err.message,
      details: err.validation,
    });
  }

  const statusCode = err.statusCode || 500;
  return reply.status(statusCode).send({
    error: 'Internal Server Error',
    message: statusCode === 500 ? 'Something went wrong' : err.message,
  });
});

// Periodic cleanup of inactive sessions
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_IDLE_TIME = 30 * 60 * 1000; // 30 minutes

const cleanupInterval = setInterval(async () => {
  try {
    await cleanupInactiveSessions(MAX_IDLE_TIME);
  } catch (error) {
    logger.error('Session cleanup failed', { error });
  }
}, CLEANUP_INTERVAL);

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);

  clearInterval(cleanupInterval);
  ptyManager.destroyAllSessions();
  await closeSessionStore();

  await app.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

const port = parseInt(process.env.PORT || '8005', 10);
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  logger.info(`Terminal Gateway running on http://${host}:${port}`);
} catch (err) {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
}
