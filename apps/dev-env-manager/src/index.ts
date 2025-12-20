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
import { createLogger, createHealthResponse } from '@agentworks/shared';
import { environmentRoutes } from './routes/environments.js';

const logger = createLogger('dev-env-manager');
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
  max: 100,
  timeWindow: '1 minute',
});

// CORS
await app.register(cors, {
  origin:
    process.env.NODE_ENV === 'development'
      ? [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:8080',
          'http://localhost:3010',
          'http://localhost:3011',
          'http://localhost:3020',
        ]
      : [process.env.FRONTEND_URL!],
  credentials: true,
});

// Health check endpoint
app.get('/health', async () => {
  const uptime = Date.now() - startTime;

  // Check Docker availability
  let dockerStatus: 'healthy' | 'unhealthy' = 'unhealthy';
  try {
    const Docker = (await import('dockerode')).default;
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    await docker.ping();
    dockerStatus = 'healthy';
  } catch {
    // Docker not available - running in simulation mode
    dockerStatus = 'unhealthy';
  }

  return createHealthResponse(
    'healthy', // Service is healthy even without Docker
    '1.0.0',
    uptime,
    {
      docker: dockerStatus,
    }
  );
});

// Routes
await app.register(environmentRoutes, { prefix: '/api' });

// Global error handler
app.setErrorHandler(async (error, request, reply) => {
  const err = error as { message: string; stack?: string; validation?: unknown; statusCode?: number };
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

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  await app.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

const port = parseInt(process.env.DEV_ENV_MANAGER_PORT || '8006', 10);
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  logger.info(`Dev Environment Manager running on http://${host}:${port}`);
} catch (err) {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
}
