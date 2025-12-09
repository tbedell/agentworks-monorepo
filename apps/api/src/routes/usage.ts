import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { lucia } from '../lib/auth.js';

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

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

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

    const byProvider = await prisma.usageEvent.groupBy({
      by: ['provider'],
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

    const byProject = await prisma.usageEvent.groupBy({
      by: ['projectId'],
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

    const projects = await prisma.project.findMany({
      where: { id: { in: byProject.map((p) => p.projectId) } },
      select: { id: true, name: true },
    });

    const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

    return {
      total: {
        apiCalls: usage._count,
        inputTokens: usage._sum.inputTokens || 0,
        outputTokens: usage._sum.outputTokens || 0,
        cost: usage._sum.cost || 0,
        price: usage._sum.price || 0,
        margin: usage._sum.price && usage._sum.cost
          ? ((usage._sum.price - usage._sum.cost) / usage._sum.price) * 100
          : 0,
      },
      byProvider: byProvider.map((p) => ({
        provider: p.provider,
        apiCalls: p._count,
        inputTokens: p._sum.inputTokens || 0,
        outputTokens: p._sum.outputTokens || 0,
        cost: p._sum.cost || 0,
        price: p._sum.price || 0,
      })),
      byProject: byProject.map((p) => ({
        projectId: p.projectId,
        projectName: projectMap[p.projectId] || 'Unknown',
        apiCalls: p._count,
        inputTokens: p._sum.inputTokens || 0,
        outputTokens: p._sum.outputTokens || 0,
        cost: p._sum.cost || 0,
        price: p._sum.price || 0,
      })),
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
      select: { id: true, displayName: true },
    });

    const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.displayName]));

    return {
      total: {
        apiCalls: usage._count,
        inputTokens: usage._sum.inputTokens || 0,
        outputTokens: usage._sum.outputTokens || 0,
        cost: usage._sum.cost || 0,
        price: usage._sum.price || 0,
      },
      byAgent: byAgent.map((a) => ({
        agentId: a.agentId,
        agentName: a.agentId ? agentMap[a.agentId] || 'Unknown' : 'Direct',
        apiCalls: a._count,
        inputTokens: a._sum.inputTokens || 0,
        outputTokens: a._sum.outputTokens || 0,
        cost: a._sum.cost || 0,
        price: a._sum.price || 0,
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
      },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, { cost: number; price: number; count: number }>();

    for (const event of events) {
      const dateKey = event.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { cost: 0, price: 0, count: 0 };
      dailyMap.set(dateKey, {
        cost: existing.cost + event.cost,
        price: existing.price + event.price,
        count: existing.count + 1,
      });
    }

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  });
};
