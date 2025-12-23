import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createLogger, createHealthResponse } from '@agentworks/shared';
import { agentRoutes } from './routes/agents.js';
import { executionRoutes } from './routes/execution.js';
import { runRoutes } from './routes/runs.js';
import { terminalCommandRoutes } from './routes/terminal-commands.js';
import { initializeRedis } from './lib/redis.js';
import { initializeAgentRegistry } from './lib/agent-registry.js';
import { initializeExecutor } from './lib/executor.js';

const logger = createLogger('agent-orchestrator');
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
  max: 500,
  timeWindow: '1 minute',
});

// CORS
await app.register(cors, {
  origin: process.env.NODE_ENV === 'development'
    ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080']
    : [process.env.FRONTEND_URL!],
  credentials: true,
});

// Initialize external dependencies
let redisHealthy = false;
let agentRegistryHealthy = false;
let executorHealthy = false;

try {
  const redis = await initializeRedis();
  redisHealthy = redis !== null;
  if (redisHealthy) {
    logger.info('Redis initialized successfully');
  } else {
    logger.info('Running without Redis (optional)');
  }
} catch (error) {
  logger.warn('Redis unavailable (optional)', { error });
}

try {
  await initializeAgentRegistry();
  agentRegistryHealthy = true;
  logger.info('Agent registry initialized successfully');
} catch (error) {
  logger.error('Failed to initialize agent registry', { error });
}

try {
  await initializeExecutor();
  executorHealthy = true;
  logger.info('Agent executor initialized successfully');
} catch (error) {
  logger.error('Failed to initialize agent executor', { error });
}

// Health check endpoint
// Redis is optional - service is healthy if executor and registry are working
app.get('/health', async () => {
  const uptime = Date.now() - startTime;
  const status = agentRegistryHealthy && executorHealthy ? 'healthy' : 'unhealthy';

  return createHealthResponse(
    status,
    '1.0.0',
    uptime,
    {
      redis: redisHealthy ? 'healthy' : 'unhealthy',
      agentRegistry: agentRegistryHealthy ? 'healthy' : 'unhealthy',
      executor: executorHealthy ? 'healthy' : 'unhealthy',
      coreService: 'unknown' as 'healthy' | 'unhealthy', // Will be checked when needed
      providerRouter: 'unknown' as 'healthy' | 'unhealthy', // Will be checked when needed
    }
  );
});

// Routes
logger.info('Registering routes...');

logger.info('Registering agent routes...');
await app.register(agentRoutes, { prefix: '/agents' });
logger.info('Agent routes registered');

logger.info('Registering execution routes...');
await app.register(executionRoutes, { prefix: '/execution' });
logger.info('Execution routes registered');

logger.info('Registering run routes...');
await app.register(runRoutes, { prefix: '/runs' });
logger.info('Run routes registered');

logger.info('Registering terminal command routes...');
await app.register(terminalCommandRoutes, { prefix: '/terminal-commands' });
logger.info('All routes registered');

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

const port = parseInt(process.env.PORT || '8001', 10);
const host = process.env.HOST || '0.0.0.0';

logger.info('Starting server...', { port, host });

try {
  await app.listen({ port, host });
  logger.info(`Agent Orchestrator running on http://${host}:${port}`);
} catch (err) {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
}