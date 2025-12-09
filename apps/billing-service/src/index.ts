import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createLogger, createHealthResponse } from '@agentworks/shared';
import { usageRoutes } from './routes/usage.js';
import { billingRoutes } from './routes/billing.js';
import { analyticsRoutes } from './routes/analytics.js';
import { initializeDatabase } from './lib/database.js';
import { initializeRedis } from './lib/redis.js';
import { initializeBillingProcessor } from './lib/billing-processor.js';
import { initializeUsageAggregator } from './lib/usage-aggregator.js';

const logger = createLogger('billing-service');
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
let dbHealthy = false;
let redisHealthy = false;
let billingProcessorHealthy = false;
let usageAggregatorHealthy = false;

try {
  await initializeDatabase();
  dbHealthy = true;
  logger.info('Database initialized successfully');
} catch (error) {
  logger.error('Failed to initialize database', { error });
}

try {
  await initializeRedis();
  redisHealthy = true;
  logger.info('Redis initialized successfully');
} catch (error) {
  logger.error('Failed to initialize Redis', { error });
}

try {
  await initializeBillingProcessor();
  billingProcessorHealthy = true;
  logger.info('Billing processor initialized successfully');
} catch (error) {
  logger.error('Failed to initialize billing processor', { error });
}

try {
  await initializeUsageAggregator();
  usageAggregatorHealthy = true;
  logger.info('Usage aggregator initialized successfully');
} catch (error) {
  logger.error('Failed to initialize usage aggregator', { error });
}

// Health check endpoint
app.get('/health', async () => {
  const uptime = Date.now() - startTime;
  const status = dbHealthy && redisHealthy && billingProcessorHealthy && usageAggregatorHealthy ? 'healthy' : 'unhealthy';
  
  return createHealthResponse(
    status,
    '1.0.0',
    uptime,
    {
      database: dbHealthy ? 'healthy' : 'unhealthy',
      redis: redisHealthy ? 'healthy' : 'unhealthy',
      billingProcessor: billingProcessorHealthy ? 'healthy' : 'unhealthy',
      usageAggregator: usageAggregatorHealthy ? 'healthy' : 'unhealthy',
    }
  );
});

// Routes
await app.register(usageRoutes, { prefix: '/usage' });
await app.register(billingRoutes, { prefix: '/billing' });
await app.register(analyticsRoutes, { prefix: '/analytics' });

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

const port = parseInt(process.env.PORT || '8004', 10);
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  logger.info(`Billing Service running on http://${host}:${port}`);
} catch (err) {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
}