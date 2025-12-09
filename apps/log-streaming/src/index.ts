import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { createLogger, createHealthResponse } from '@agentworks/shared';
import { logRoutes } from './routes/logs.js';
import { sessionRoutes } from './routes/sessions.js';
import { streamRoutes } from './routes/stream.js';
import { initializeRedis } from './lib/redis.js';
import { initializeLogStorage } from './lib/log-storage.js';
import { initializeStreamManager } from './lib/stream-manager.js';

const logger = createLogger('log-streaming');
const startTime = Date.now();

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
      }
    } : undefined,
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

// CORS
await app.register(cors, {
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'http://localhost:8001']
    : [process.env.FRONTEND_URL!],
  credentials: true,
});

// WebSocket support
await app.register(websocket);

// Initialize external dependencies
let redisHealthy = false;
let storageHealthy = false;
let streamManagerHealthy = false;

try {
  await initializeRedis();
  redisHealthy = true;
  logger.info('Redis initialized successfully');
} catch (error) {
  logger.error('Failed to initialize Redis', { error });
}

try {
  await initializeLogStorage();
  storageHealthy = true;
  logger.info('Log storage initialized successfully');
} catch (error) {
  logger.error('Failed to initialize log storage', { error });
}

try {
  await initializeStreamManager();
  streamManagerHealthy = true;
  logger.info('Stream manager initialized successfully');
} catch (error) {
  logger.error('Failed to initialize stream manager', { error });
}

// Health check endpoint
app.get('/health', async () => {
  const uptime = Date.now() - startTime;
  const status = redisHealthy && storageHealthy && streamManagerHealthy ? 'healthy' : 'unhealthy';
  
  return createHealthResponse(
    status,
    '1.0.0',
    uptime,
    {
      redis: redisHealthy ? 'healthy' : 'unhealthy',
      storage: storageHealthy ? 'healthy' : 'unhealthy',
      streamManager: streamManagerHealthy ? 'healthy' : 'unhealthy',
    }
  );
});

// Routes
await app.register(logRoutes, { prefix: '/logs' });
await app.register(sessionRoutes, { prefix: '/sessions' });
await app.register(streamRoutes, { prefix: '/stream' });

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

const port = parseInt(process.env.PORT || '8003', 10);
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  logger.info(`Log Streaming Service running on http://${host}:${port}`);
} catch (err) {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
}