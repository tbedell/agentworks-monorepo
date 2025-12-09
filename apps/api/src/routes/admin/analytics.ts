import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { adminAuthMiddleware } from './auth.js';

export const adminAnalyticsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  app.get('/usage', async (request) => {
    const { startDate, endDate, tenantId } = request.query as {
      startDate?: string;
      endDate?: string;
      tenantId?: string;
    };

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const where: Record<string, unknown> = {
      createdAt: { gte: start, lte: end },
    };

    if (tenantId) {
      where.workspaceId = tenantId;
    }

    const records = await prisma.usageRecord.findMany({ where });

    const byProvider: Record<string, { tokens: number; cost: number; billed: number }> = {};
    const byTenant: Record<string, { tokens: number; cost: number; billed: number }> = {};

    let totalTokens = 0;
    let totalCost = 0;
    let totalBilled = 0;

    for (const record of records) {
      const tokens = record.inputTokens + record.outputTokens;
      totalTokens += tokens;
      totalCost += record.providerCost;
      totalBilled += record.billedAmount;

      if (!byProvider[record.provider]) {
        byProvider[record.provider] = { tokens: 0, cost: 0, billed: 0 };
      }
      byProvider[record.provider].tokens += tokens;
      byProvider[record.provider].cost += record.providerCost;
      byProvider[record.provider].billed += record.billedAmount;

      if (!byTenant[record.workspaceId]) {
        byTenant[record.workspaceId] = { tokens: 0, cost: 0, billed: 0 };
      }
      byTenant[record.workspaceId].tokens += tokens;
      byTenant[record.workspaceId].cost += record.providerCost;
      byTenant[record.workspaceId].billed += record.billedAmount;
    }

    return {
      totalTokens,
      totalCost,
      totalBilled,
      byProvider,
      byTenant,
    };
  });

  app.get('/revenue', async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthUsage = await prisma.usageRecord.aggregate({
      _sum: { billedAmount: true },
      where: { createdAt: { gte: startOfMonth } },
    });

    const lastMonthUsage = await prisma.usageRecord.aggregate({
      _sum: { billedAmount: true },
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    });

    const mrr = thisMonthUsage._sum.billedAmount || 0;
    const lastMrr = lastMonthUsage._sum.billedAmount || 0;
    const growth = lastMrr > 0 ? ((mrr - lastMrr) / lastMrr) * 100 : 0;

    return {
      mrr,
      arr: mrr * 12,
      growth: Math.round(growth * 10) / 10,
      churn: 2.5,
    };
  });

  app.get('/top-tenants', async (request) => {
    const { limit = 10 } = request.query as { limit?: number };

    const usage = await prisma.usageRecord.groupBy({
      by: ['workspaceId'],
      _sum: {
        inputTokens: true,
        outputTokens: true,
        billedAmount: true,
      },
      orderBy: {
        _sum: { billedAmount: 'desc' },
      },
      take: limit,
    });

    const workspaceIds = usage.map((u) => u.workspaceId);
    const workspaces = await prisma.workspace.findMany({
      where: { id: { in: workspaceIds } },
    });

    const workspaceMap = new Map(workspaces.map((w) => [w.id, w]));

    return {
      tenants: usage.map((u) => {
        const workspace = workspaceMap.get(u.workspaceId);
        return {
          id: u.workspaceId,
          name: workspace?.name || 'Unknown',
          slug: workspace?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
          status: 'active',
          usage: (u._sum.inputTokens || 0) + (u._sum.outputTokens || 0),
          revenue: u._sum.billedAmount || 0,
        };
      }),
    };
  });
};
