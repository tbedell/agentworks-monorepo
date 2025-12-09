import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';

/**
 * Public provider status endpoint for the web app
 * Returns which providers have API keys configured
 */
export const providersRoutes: FastifyPluginAsync = async (app) => {
  // Get provider configuration status (no auth required for status check)
  app.get('/status', async () => {
    const providers = await prisma.providerConfig.findMany({
      select: {
        provider: true,
        displayName: true,
        enabled: true,
        apiKeyConfigured: true,
      },
      orderBy: { provider: 'asc' },
    });

    return providers;
  });

  // Get detailed provider info (requires auth - checked at route level)
  app.get('/', async () => {
    const providers = await prisma.providerConfig.findMany({
      select: {
        id: true,
        provider: true,
        displayName: true,
        enabled: true,
        apiKeyConfigured: true,
        rateLimit: true,
        monthlyBudget: true,
        currentSpend: true,
      },
      orderBy: { provider: 'asc' },
    });

    return providers;
  });
};
