import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { adminAuthMiddleware } from './auth.js';

export const adminDashboardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  app.get('/stats', async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalTenants,
      activeTenants,
      lastMonthTenants,
      providers,
      monthlyRevenue,
      lastMonthRevenue,
      tokensThisMonth,
      lastMonthTokens,
    ] = await Promise.all([
      prisma.tenant.count({ where: { status: { not: 'deleted' } } }),
      prisma.tenant.count({ where: { status: 'active' } }),
      prisma.tenant.count({
        where: {
          status: { not: 'deleted' },
          createdAt: { gte: startOfLastMonth, lt: startOfMonth },
        },
      }),
      prisma.providerConfig.findMany({ select: { provider: true, enabled: true, apiKeyConfigured: true } }),
      prisma.usageRecord.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { billedAmount: true },
      }),
      prisma.usageRecord.aggregate({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
        _sum: { billedAmount: true },
      }),
      prisma.usageRecord.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      prisma.usageRecord.aggregate({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
        _sum: { inputTokens: true, outputTokens: true },
      }),
    ]);

    const currentTenants = totalTenants;
    const tenantChange = lastMonthTenants > 0 
      ? Math.round(((currentTenants - lastMonthTenants) / lastMonthTenants) * 100)
      : currentTenants > 0 ? 100 : 0;

    const currentRevenue = monthlyRevenue._sum.billedAmount || 0;
    const previousRevenue = lastMonthRevenue._sum.billedAmount || 0;
    const revenueChange = previousRevenue > 0
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : currentRevenue > 0 ? 100 : 0;

    const activeProviders = providers.filter(p => p.enabled && p.apiKeyConfigured).length;

    const currentTokens = (tokensThisMonth._sum.inputTokens || 0) + (tokensThisMonth._sum.outputTokens || 0);
    const previousTokens = (lastMonthTokens._sum.inputTokens || 0) + (lastMonthTokens._sum.outputTokens || 0);
    const tokenChange = previousTokens > 0
      ? Math.round(((currentTokens - previousTokens) / previousTokens) * 100)
      : currentTokens > 0 ? 100 : 0;

    return {
      totalTenants,
      tenantChange,
      monthlyRevenue: currentRevenue,
      revenueChange,
      activeProviders,
      totalProviders: providers.length,
      tokensThisMonth: currentTokens,
      tokenChange,
    };
  });

  app.get('/provider-status', async () => {
    const providers = await prisma.providerConfig.findMany({
      orderBy: { provider: 'asc' },
    });

    return providers.map(p => ({
      provider: p.provider,
      displayName: p.displayName || p.provider,
      enabled: p.enabled,
      apiKeyConfigured: p.apiKeyConfigured,
      status: p.enabled && p.apiKeyConfigured ? 'healthy' : 'not_configured',
    }));
  });

  app.get('/recent-activity', async () => {
    const logs = await prisma.adminAuditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: { admin: { select: { name: true } } },
    });

    const activities = logs.map(log => {
      let title = '';
      let description = '';

      switch (log.action) {
        case 'tenant.create':
          title = 'New tenant registered';
          description = (log.details as { name?: string })?.name || 'Unknown';
          break;
        case 'tenant.update':
          title = 'Tenant updated';
          description = log.resourceId;
          break;
        case 'tenant.suspend':
          title = 'Tenant suspended';
          description = log.resourceId;
          break;
        case 'tenant.activate':
          title = 'Tenant activated';
          description = log.resourceId;
          break;
        case 'subscription.update':
          title = 'Subscription upgraded';
          description = (log.details as { planName?: string })?.planName || 'Unknown';
          break;
        case 'subscription.cancel':
          title = 'Subscription cancelled';
          description = log.resourceId;
          break;
        case 'provider.rotate_key':
          title = 'API key rotated';
          description = (log.details as { provider?: string })?.provider || 'Unknown';
          break;
        case 'provider.update':
          title = 'Provider updated';
          description = log.resourceId;
          break;
        default:
          title = log.action.replace('.', ' ');
          description = log.resourceType;
      }

      return {
        id: log.id,
        title,
        description,
        timestamp: log.timestamp.toISOString(),
        adminName: log.admin.name,
      };
    });

    return activities;
  });

  app.get('/usage-by-provider', async () => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const usage = await prisma.usageRecord.groupBy({
      by: ['provider'],
      where: { createdAt: { gte: startOfMonth } },
      _sum: { inputTokens: true, outputTokens: true, billedAmount: true, providerCost: true },
      _count: true,
    });

    return usage.map(u => ({
      provider: u.provider,
      inputTokens: u._sum.inputTokens || 0,
      outputTokens: u._sum.outputTokens || 0,
      totalTokens: (u._sum.inputTokens || 0) + (u._sum.outputTokens || 0),
      providerCost: u._sum.providerCost || 0,
      billedAmount: u._sum.billedAmount || 0,
      requestCount: u._count,
    }));
  });
};
