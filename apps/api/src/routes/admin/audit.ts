import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { adminAuthMiddleware } from './auth.js';

export const adminAuditRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  app.get('/', async (request) => {
    const { adminId, action, page = 1, limit = 50 } = request.query as {
      adminId?: string;
      action?: string;
      page?: number;
      limit?: number;
    };

    const where: Record<string, unknown> = {};
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: { admin: { select: { email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        adminId: log.adminId,
        adminEmail: log.admin.email,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        tenantId: log.tenantId,
        details: log.details,
        ipAddress: log.ipAddress,
        timestamp: log.timestamp.toISOString(),
      })),
      total,
    };
  });
};
