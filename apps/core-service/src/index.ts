import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createLogger, createHealthResponse } from '@agentworks/shared';
import { authRoutes } from './routes/auth.js';
import { workspaceRoutes } from './routes/workspaces.js';
import { projectRoutes } from './routes/projects.js';
import { boardRoutes } from './routes/boards.js';
import { cardRoutes } from './routes/cards.js';
import { runRoutes } from './routes/runs.js';
import { initializeDatabase } from './lib/database.js';
import { initializeRedis } from './lib/redis.js';

const logger = createLogger('core-service');
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
  redis: undefined, // Will be set up later with redis connection
});

// CORS
await app.register(cors, {
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080']
    : [process.env.FRONTEND_URL!],
  credentials: true,
});

// Initialize external dependencies
let dbHealthy = false;
let redisHealthy = false;

try {
  await initializeDatabase();
  dbHealthy = true;
  logger.info('Database initialized successfully');
} catch (error) {
  logger.error('Failed to initialize database', { error });
}

try {
  const redisClient = await initializeRedis();
  redisHealthy = redisClient !== null;
  if (redisHealthy) {
    logger.info('Redis initialized successfully');
  } else {
    logger.info('Running without Redis - session and cache features will be limited');
  }
} catch (error) {
  logger.error('Failed to initialize Redis', { error });
  redisHealthy = false;
}

// Health check endpoint
// Redis is optional for production - service is healthy if database is connected
app.get('/health', async () => {
  const uptime = Date.now() - startTime;
  // Service is healthy if database is connected (Redis is optional)
  const status = dbHealthy ? 'healthy' : 'unhealthy';

  return createHealthResponse(
    status,
    '1.0.0',
    uptime,
    {
      database: dbHealthy ? 'healthy' : 'unhealthy',
      redis: redisHealthy ? 'healthy' : 'unhealthy',
    }
  );
});

// Routes
await app.register(authRoutes, { prefix: '/auth' });
await app.register(workspaceRoutes, { prefix: '/workspaces' });
await app.register(projectRoutes, { prefix: '/projects' });
await app.register(boardRoutes, { prefix: '/boards' });
await app.register(cardRoutes, { prefix: '/cards' });
await app.register(runRoutes, { prefix: '/runs' });

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

const port = parseInt(process.env.PORT || '8000', 10);
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  logger.info(`Core Service running on http://${host}:${port}`);
} catch (err) {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
}