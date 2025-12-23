import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { lucia } from '../lib/auth.js';
import { PRICING_MULTIPLIER } from '@agentworks/shared';

// Helper to calculate previous period dates
function getPreviousPeriodDates(startDate: Date, endDate: Date): { prevStart: Date; prevEnd: Date } {
  const periodMs = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 1); // 1ms before current start
  const prevStart = new Date(prevEnd.getTime() - periodMs);
  return { prevStart, prevEnd };
}

// Helper to get usage stats for a period
async function getUsageStats(workspaceId: string, startDate?: Date, endDate?: Date) {
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  const usage = await prisma.usageEvent.aggregate({
    where: {
      workspaceId,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      cost: true,
      price: true,
    },
    _count: true,
  });

  return {
    totalRequests: usage._count,
    inputTokens: usage._sum.inputTokens || 0,
    outputTokens: usage._sum.outputTokens || 0,
    totalTokens: (usage._sum.inputTokens || 0) + (usage._sum.outputTokens || 0),
    totalCost: usage._sum.cost || 0,
    totalBilled: usage._sum.price || 0,
  };
}

// Helper to get average response time from AgentRun
async function getAvgResponseTime(workspaceId: string, startDate?: Date, endDate?: Date): Promise<number> {
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  const runs = await prisma.agentRun.findMany({
    where: {
      status: 'completed',
      startedAt: { not: null },
      completedAt: { not: null },
      card: {
        board: {
          project: {
            workspace: { id: workspaceId }
          }
        }
      },
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    },
    select: {
      startedAt: true,
      completedAt: true,
    },
  });

  if (runs.length === 0) return 0;

  const totalMs = runs.reduce((sum, run) => {
    if (run.startedAt && run.completedAt) {
      return sum + (run.completedAt.getTime() - run.startedAt.getTime());
    }
    return sum;
  }, 0);

  return totalMs / runs.length / 1000; // Convert to seconds
}

// Helper to get success rate
async function getSuccessRate(workspaceId: string, startDate?: Date, endDate?: Date): Promise<{ total: number; successful: number; rate: number }> {
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  const total = await prisma.agentRun.count({
    where: {
      card: {
        board: {
          project: {
            workspace: { id: workspaceId }
          }
        }
      },
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    },
  });

  const successful = await prisma.agentRun.count({
    where: {
      status: 'completed',
      card: {
        board: {
          project: {
            workspace: { id: workspaceId }
          }
        }
      },
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    },
  });

  return {
    total,
    successful,
    rate: total > 0 ? (successful / total) * 100 : 100,
  };
}

export const usageRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    (request as any).user = user;
  });

  // Enhanced workspace usage with all analytics data
  app.get('/workspace/:workspaceId', async (request, reply) => {
    const user = (request as any).user;
    const { workspaceId } = request.params as { workspaceId: string };
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });

    if (!membership) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get current period stats
    const current = await getUsageStats(workspaceId, start, end);
    const avgResponseTime = await getAvgResponseTime(workspaceId, start, end);
    const successStats = await getSuccessRate(workspaceId, start, end);

    // Get previous period stats for comparison
    const { prevStart, prevEnd } = getPreviousPeriodDates(start, end);
    const previous = await getUsageStats(workspaceId, prevStart, prevEnd);

    // Get by provider breakdown
    const byProviderRaw = await prisma.usageEvent.groupBy({
      by: ['provider'],
      where: {
        workspaceId,
        createdAt: { gte: start, lte: end },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        cost: true,
        price: true,
      },
      _count: true,
    });

    // Get by project breakdown
    const byProjectRaw = await prisma.usageEvent.groupBy({
      by: ['projectId'],
      where: {
        workspaceId,
        createdAt: { gte: start, lte: end },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        cost: true,
        price: true,
      },
      _count: true,
    });

    // Get by agent breakdown
    const byAgentRaw = await prisma.usageEvent.groupBy({
      by: ['agentId'],
      where: {
        workspaceId,
        createdAt: { gte: start, lte: end },
        agentId: { not: null },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        cost: true,
        price: true,
      },
      _count: true,
    });

    // Fetch related names
    const projects = await prisma.project.findMany({
      where: { id: { in: byProjectRaw.map((p) => p.projectId) } },
      select: { id: true, name: true },
    });
    const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

    const agents = await prisma.agent.findMany({
      where: { id: { in: byAgentRaw.map((a) => a.agentId).filter(Boolean) as string[] } },
      select: { id: true, name: true, displayName: true },
    });
    const agentMap = Object.fromEntries(agents.map((a) => [a.id, { name: a.name, displayName: a.displayName }]));

    // Get daily trend data
    const events = await prisma.usageEvent.findMany({
      where: {
        workspaceId,
        createdAt: { gte: start, lte: end },
      },
      select: {
        createdAt: true,
        cost: true,
        price: true,
        inputTokens: true,
        outputTokens: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, { cost: number; price: number; requests: number; tokens: number }>();
    for (const event of events) {
      const dateKey = event.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { cost: 0, price: 0, requests: 0, tokens: 0 };
      dailyMap.set(dateKey, {
        cost: existing.cost + event.cost,
        price: existing.price + event.price,
        requests: existing.requests + 1,
        tokens: existing.tokens + (event.inputTokens || 0) + (event.outputTokens || 0),
      });
    }

    return {
      current: {
        ...current,
        avgResponseTime,
        successRate: successStats.rate,
        successfulRequests: successStats.successful,
      },
      previous: {
        ...previous,
      },
      byProvider: byProviderRaw.map((p) => ({
        name: p.provider,
        requests: p._count,
        inputTokens: p._sum.inputTokens || 0,
        outputTokens: p._sum.outputTokens || 0,
        tokens: (p._sum.inputTokens || 0) + (p._sum.outputTokens || 0),
        cost: p._sum.cost || 0,
        billed: p._sum.price || 0,
      })).sort((a, b) => b.requests - a.requests),
      byProject: byProjectRaw.map((p) => ({
        id: p.projectId,
        name: projectMap[p.projectId] || 'Unknown',
        requests: p._count,
        tokens: (p._sum.inputTokens || 0) + (p._sum.outputTokens || 0),
        cost: p._sum.cost || 0,
        billed: p._sum.price || 0,
      })).sort((a, b) => b.requests - a.requests),
      byAgent: byAgentRaw.map((a) => ({
        id: a.agentId,
        name: a.agentId ? agentMap[a.agentId]?.name || 'Unknown' : 'Direct',
        displayName: a.agentId ? agentMap[a.agentId]?.displayName || 'Unknown' : 'Direct API Call',
        requests: a._count,
        tokens: (a._sum.inputTokens || 0) + (a._sum.outputTokens || 0),
        cost: a._sum.cost || 0,
        billed: a._sum.price || 0,
      })).sort((a, b) => b.requests - a.requests),
      dailyTrend: Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        ...data,
      })),
    };
  });

  // Billing information endpoint
  app.get('/billing/:workspaceId', async (request, reply) => {
    const user = (request as any).user;
    const { workspaceId } = request.params as { workspaceId: string };

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        tenant: {
          include: {
            plan: true,
            subscriptions: {
              where: { status: { in: ['active', 'trialing'] } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        members: true,
      },
    });

    if (!workspace) {
      return reply.status(404).send({ error: 'Workspace not found' });
    }

    const isMember = workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const tenant = workspace.tenant;
    const subscription = tenant?.subscriptions[0];
    const plan = tenant?.plan;

    // Get current month usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyUsage = await prisma.usageEvent.aggregate({
      where: {
        workspaceId,
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        cost: true,
        price: true,
      },
      _count: true,
    });

    const tokensUsed = (monthlyUsage._sum.inputTokens || 0) + (monthlyUsage._sum.outputTokens || 0);
    const tokenLimit = tenant?.tokenLimit || plan?.tokenLimit || 500000;
    const usagePercent = (tokensUsed / tokenLimit) * 100;

    return {
      plan: {
        name: plan?.name || 'Free',
        monthlyPrice: plan?.monthlyPrice || 0,
        tokenLimit,
        features: plan?.features || [],
      },
      subscription: subscription ? {
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      } : null,
      usage: {
        tokensUsed,
        tokenLimit,
        usagePercent: Math.min(usagePercent, 100),
        totalCost: monthlyUsage._sum.cost || 0,
        totalBilled: monthlyUsage._sum.price || 0,
        requestCount: monthlyUsage._count,
      },
      alerts: usagePercent >= 80 ? [{
        type: 'warning',
        message: `You've used ${usagePercent.toFixed(0)}% of your monthly token limit`,
      }] : [],
    };
  });

  app.get('/project/:projectId', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const usage = await prisma.usageEvent.aggregate({
      where: {
        projectId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        cost: true,
        price: true,
      },
      _count: true,
    });

    const byAgent = await prisma.usageEvent.groupBy({
      by: ['agentId'],
      where: {
        projectId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        cost: true,
        price: true,
      },
      _count: true,
    });

    const agents = await prisma.agent.findMany({
      where: { id: { in: byAgent.map((a) => a.agentId).filter(Boolean) as string[] } },
      select: { id: true, name: true, displayName: true },
    });

    const agentMap = Object.fromEntries(agents.map((a) => [a.id, { name: a.name, displayName: a.displayName }]));

    return {
      total: {
        requests: usage._count,
        inputTokens: usage._sum.inputTokens || 0,
        outputTokens: usage._sum.outputTokens || 0,
        totalTokens: (usage._sum.inputTokens || 0) + (usage._sum.outputTokens || 0),
        cost: usage._sum.cost || 0,
        billed: usage._sum.price || 0,
      },
      byAgent: byAgent.map((a) => ({
        id: a.agentId,
        name: a.agentId ? agentMap[a.agentId]?.name || 'Unknown' : 'Direct',
        displayName: a.agentId ? agentMap[a.agentId]?.displayName || 'Unknown' : 'Direct API Call',
        requests: a._count,
        tokens: (a._sum.inputTokens || 0) + (a._sum.outputTokens || 0),
        cost: a._sum.cost || 0,
        billed: a._sum.price || 0,
      })),
    };
  });

  app.get('/daily/:workspaceId', async (request, reply) => {
    const user = (request as any).user;
    const { workspaceId } = request.params as { workspaceId: string };
    const { days = '7' } = request.query as { days?: string };

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });

    if (!membership) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days, 10));

    const events = await prisma.usageEvent.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        cost: true,
        price: true,
        inputTokens: true,
        outputTokens: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, { cost: number; price: number; requests: number; tokens: number }>();

    for (const event of events) {
      const dateKey = event.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { cost: 0, price: 0, requests: 0, tokens: 0 };
      dailyMap.set(dateKey, {
        cost: existing.cost + event.cost,
        price: existing.price + event.price,
        requests: existing.requests + 1,
        tokens: existing.tokens + (event.inputTokens || 0) + (event.outputTokens || 0),
      });
    }

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  });
};
