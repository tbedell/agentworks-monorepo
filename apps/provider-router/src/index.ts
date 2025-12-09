import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createLogger, createHealthResponse } from '@agentworks/shared';
import { providerRoutes } from './routes/providers.js';
import { executionRoutes } from './routes/execution.js';
import { costRoutes } from './routes/cost.js';
import { initializeRedis } from './lib/redis.js';
import { initializeProviders } from './lib/providers.js';
import { initializeUsageTracker } from './lib/usage-tracker.js';

const logger = createLogger('provider-router');
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

// Rate limiting - more restrictive for LLM requests
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    // Rate limit per workspace
    const workspaceId = (request.body as any)?.workspaceId || 'unknown';
    return `workspace:${workspaceId}`;
  },
});

// CORS
await app.register(cors, {
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'http://localhost:8001']
    : [process.env.FRONTEND_URL!],
  credentials: true,
});

// Initialize external dependencies
let redisHealthy = false;
let providersHealthy = false;
let usageTrackerHealthy = false;

try {
  await initializeRedis();
  redisHealthy = true;
  logger.info('Redis initialized successfully');
} catch (error) {
  logger.error('Failed to initialize Redis', { error });
}

try {
  await initializeProviders();
  providersHealthy = true;
  logger.info('Providers initialized successfully');
} catch (error) {
  logger.error('Failed to initialize providers', { error });
}

try {
  await initializeUsageTracker();
  usageTrackerHealthy = true;
  logger.info('Usage tracker initialized successfully');
} catch (error) {
  logger.error('Failed to initialize usage tracker', { error });
}

// Health check endpoint
app.get('/health', async () => {
  const uptime = Date.now() - startTime;
  const status = redisHealthy && providersHealthy && usageTrackerHealthy ? 'healthy' : 'unhealthy';
  
  return createHealthResponse(
    status,
    '1.0.0',
    uptime,
    {
      redis: redisHealthy ? 'healthy' : 'unhealthy',
      providers: providersHealthy ? 'healthy' : 'unhealthy',
      usageTracker: usageTrackerHealthy ? 'healthy' : 'unhealthy',
      openai: process.env.OPENAI_API_KEY ? 'healthy' : 'unhealthy',
      anthropic: process.env.ANTHROPIC_API_KEY ? 'healthy' : 'unhealthy',
      google: process.env.GOOGLE_AI_API_KEY ? 'healthy' : 'unhealthy',
      nanobanana: process.env.NANOBANANA_API_KEY ? 'healthy' : 'unhealthy',
    } satisfies Record<string, 'healthy' | 'unhealthy'>
  );
});

// Routes
await app.register(providerRoutes, { prefix: '/providers' });
await app.register(executionRoutes, { prefix: '/execute' });
await app.register(costRoutes, { prefix: '/cost' });

// Execution routes are now at /execute via prefix registration

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

const port = parseInt(process.env.PORT || '8002', 10);
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  logger.info(`Provider Router running on http://${host}:${port}`);
} catch (err) {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
}