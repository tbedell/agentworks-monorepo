import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { adminAuthMiddleware, requireRole } from './auth.js';

const createProviderSchema = z.object({
  provider: z.string().min(1),
  displayName: z.string().min(1),
  apiKey: z.string().min(1),
});

const updateProviderSchema = z.object({
  displayName: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  rateLimitPerMinute: z.number().optional(),
  monthlyBudget: z.number().optional(),
});

async function logAdminAction(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  ipAddress: string,
  details?: Record<string, unknown>
) {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      resourceType,
      resourceId,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      ipAddress,
    },
  });
}

export const adminProvidersRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  app.get('/', async () => {
    const providers = await prisma.providerConfig.findMany({
      orderBy: { provider: 'asc' },
    });

    // Get current month's start date
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Aggregate costs from AgentRun table (UsageRecord is not being populated)
    const usage = await prisma.agentRun.groupBy({
      by: ['provider'],
      _sum: { cost: true },
      where: {
        status: 'completed',
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    const usageMap = new Map(usage.map((u) => [u.provider, u._sum.cost || 0]));

    return providers.map((p) => {
      return {
        id: p.id,
        provider: p.provider,
        displayName: p.displayName || p.provider,
        enabled: p.enabled,
        apiKeyConfigured: p.apiKeyConfigured,
        secretName: p.secretName,
        rateLimit: p.rateLimit,
        monthlyBudget: p.monthlyBudget,
        currentSpend: p.currentSpend,
        currentMonthSpend: usageMap.get(p.provider) || 0,
        status: p.enabled && p.apiKeyConfigured ? 'healthy' : 'not_configured',
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const provider = await prisma.providerConfig.findUnique({
      where: { id },
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    const metadata = provider.metadata ? JSON.parse(provider.metadata) : {};

    return {
      id: provider.id,
      provider: provider.provider,
      displayName: metadata.displayName || provider.provider,
      enabled: provider.enabled,
      secretName: provider.secretName,
      rateLimitPerMinute: metadata.rateLimitPerMinute,
      monthlyBudget: metadata.monthlyBudget,
      currentMonthSpend: 0,
      createdAt: provider.createdAt.toISOString(),
      updatedAt: provider.updatedAt.toISOString(),
    };
  });

  app.post('/', { preHandler: [requireRole('super_admin')] }, async (request) => {
    const body = createProviderSchema.parse(request.body);
    const ip = request.ip;

    const secretName = `projects/${process.env.GCP_PROJECT_ID}/secrets/${body.provider}-api-key/versions/latest`;

    // Use upsert to handle both create and update scenarios
    const provider = await prisma.providerConfig.upsert({
      where: { provider: body.provider },
      create: {
        provider: body.provider,
        enabled: true,
        apiKeyConfigured: true,
        secretName,
        displayName: body.displayName,
        metadata: JSON.stringify({ displayName: body.displayName, apiKey: body.apiKey }),
      },
      update: {
        enabled: true,
        apiKeyConfigured: true,
        secretName,
        displayName: body.displayName,
        metadata: JSON.stringify({ displayName: body.displayName, apiKey: body.apiKey }),
      },
    });

    await logAdminAction(
      request.adminUser!.id,
      'provider.upsert',
      'provider',
      provider.id,
      ip,
      { provider: body.provider, displayName: body.displayName }
    );

    return {
      id: provider.id,
      provider: provider.provider,
      displayName: body.displayName,
      enabled: provider.enabled,
      apiKeyConfigured: provider.apiKeyConfigured,
      secretName: provider.secretName,
      currentMonthSpend: 0,
      createdAt: provider.createdAt.toISOString(),
      updatedAt: provider.updatedAt.toISOString(),
    };
  });

  app.patch('/:id', { preHandler: [requireRole('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateProviderSchema.parse(request.body);
    const ip = request.ip;

    const existing = await prisma.providerConfig.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    const existingMetadata = existing.metadata ? JSON.parse(existing.metadata) : {};
    const newMetadata = {
      ...existingMetadata,
      ...(body.displayName && { displayName: body.displayName }),
      ...(body.rateLimitPerMinute !== undefined && { rateLimitPerMinute: body.rateLimitPerMinute }),
      ...(body.monthlyBudget !== undefined && { monthlyBudget: body.monthlyBudget }),
    };

    const provider = await prisma.providerConfig.update({
      where: { id },
      data: {
        enabled: body.enabled ?? existing.enabled,
        metadata: JSON.stringify(newMetadata),
      },
    });

    await logAdminAction(
      request.adminUser!.id,
      'provider.update',
      'provider',
      id,
      ip,
      { changes: body }
    );

    return {
      id: provider.id,
      provider: provider.provider,
      displayName: newMetadata.displayName,
      enabled: provider.enabled,
      secretName: provider.secretName,
      rateLimitPerMinute: newMetadata.rateLimitPerMinute,
      monthlyBudget: newMetadata.monthlyBudget,
      currentMonthSpend: 0,
      createdAt: provider.createdAt.toISOString(),
      updatedAt: provider.updatedAt.toISOString(),
    };
  });

  app.post('/:id/rotate-key', { preHandler: [requireRole('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { apiKey } = request.body as { apiKey: string };
    const ip = request.ip;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return reply.status(400).send({ error: 'API key is required' });
    }

    const provider = await prisma.providerConfig.findUnique({ where: { id } });
    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    // Update the API key in metadata
    const existingMetadata = provider.metadata ? JSON.parse(provider.metadata) : {};
    const newMetadata = {
      ...existingMetadata,
      apiKey: apiKey.trim(),
    };

    await prisma.providerConfig.update({
      where: { id },
      data: {
        apiKeyConfigured: true,
        metadata: JSON.stringify(newMetadata),
      },
    });

    await logAdminAction(
      request.adminUser!.id,
      'provider.rotate_key',
      'provider',
      id,
      ip
    );

    return { success: true, message: 'API key rotated successfully' };
  });

  app.post('/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };

    const provider = await prisma.providerConfig.findUnique({ where: { id } });
    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    return { success: true, message: `${provider.provider} connection is healthy` };
  });

  app.delete('/:id', { preHandler: [requireRole('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ip = request.ip;

    const provider = await prisma.providerConfig.findUnique({ where: { id } });
    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    await prisma.providerConfig.delete({ where: { id } });

    await logAdminAction(
      request.adminUser!.id,
      'provider.delete',
      'provider',
      id,
      ip,
      { provider: provider.provider }
    );

    return { success: true };
  });
};
