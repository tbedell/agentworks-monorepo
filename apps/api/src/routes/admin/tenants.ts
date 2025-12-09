import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { adminAuthMiddleware, requireRole } from './auth.js';

const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  planId: z.string().optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(['active', 'trial', 'suspended', 'deleted']).optional(),
  planId: z.string().nullable().optional(),
  tokenLimit: z.number().nullable().optional(),
});

async function logAdminAction(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  ipAddress: string,
  tenantId?: string,
  details?: Record<string, unknown>
) {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      resourceType,
      resourceId,
      tenantId,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      ipAddress,
    },
  });
}

export const adminTenantsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  app.get('/', async (request) => {
    const query = request.query as {
      status?: string;
      search?: string;
      page?: string;
      limit?: string;
    };
    const status = query.status;
    const search = query.search;
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: { plan: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tenant.count({ where }),
    ]);

    const workspaceCounts = await prisma.workspace.groupBy({
      by: ['ownerId'],
      _count: true,
    });

    return {
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        planId: t.planId,
        planName: t.plan?.name,
        stripeCustomerId: t.stripeCustomerId,
        tokenUsageThisMonth: t.tokenUsageThisMonth,
        tokenLimit: t.tokenLimit,
        memberCount: 0,
        projectCount: 0,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      total,
    };
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      planId: tenant.planId,
      planName: tenant.plan?.name,
      stripeCustomerId: tenant.stripeCustomerId,
      tokenUsageThisMonth: tenant.tokenUsageThisMonth,
      tokenLimit: tenant.tokenLimit,
      memberCount: 0,
      projectCount: 0,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  });

  app.post('/', { preHandler: [requireRole('super_admin', 'billing_admin')] }, async (request) => {
    const body = createTenantSchema.parse(request.body);
    const ip = request.ip;

    const tenant = await prisma.tenant.create({
      data: {
        name: body.name,
        slug: body.slug,
        planId: body.planId,
        status: 'trial',
      },
    });

    await logAdminAction(
      request.adminUser!.id,
      'tenant.create',
      'tenant',
      tenant.id,
      ip,
      tenant.id,
      { name: body.name, slug: body.slug }
    );

    return tenant;
  });

  app.patch('/:id', { preHandler: [requireRole('super_admin', 'billing_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateTenantSchema.parse(request.body);
    const ip = request.ip;

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: body,
    });

    await logAdminAction(
      request.adminUser!.id,
      'tenant.update',
      'tenant',
      id,
      ip,
      id,
      { changes: body }
    );

    return tenant;
  });

  app.post('/:id/suspend', { preHandler: [requireRole('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ip = request.ip;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { status: 'suspended' },
    });

    await logAdminAction(
      request.adminUser!.id,
      'tenant.suspend',
      'tenant',
      id,
      ip,
      id
    );

    return tenant;
  });

  app.post('/:id/activate', { preHandler: [requireRole('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ip = request.ip;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { status: 'active' },
    });

    await logAdminAction(
      request.adminUser!.id,
      'tenant.activate',
      'tenant',
      id,
      ip,
      id
    );

    return tenant;
  });

  app.delete('/:id', { preHandler: [requireRole('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ip = request.ip;

    await prisma.tenant.update({
      where: { id },
      data: { status: 'deleted' },
    });

    await logAdminAction(
      request.adminUser!.id,
      'tenant.delete',
      'tenant',
      id,
      ip,
      id
    );

    return { success: true };
  });

  app.post('/:id/admin-grant', { preHandler: [requireRole('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { planId: string; tokenBalance?: number };
    const ip = request.ip;

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    const plan = await prisma.plan.findUnique({ where: { id: body.planId } });
    if (!plan) {
      return reply.status(400).send({ error: 'Plan not found' });
    }

    const tokenBalance = body.tokenBalance ?? plan.tokenLimit ?? 0;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        status: 'active',
        planId: body.planId,
        tokenBalance,
        tokenLimit: plan.tokenLimit,
        adminGranted: true,
        adminGrantedBy: request.adminUser!.id,
        adminGrantedAt: new Date(),
      },
      include: { plan: true },
    });

    await logAdminAction(
      request.adminUser!.id,
      'tenant.admin_grant',
      'tenant',
      id,
      ip,
      id,
      { planId: body.planId, planName: plan.name, tokenBalance }
    );

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      planId: tenant.planId,
      planName: tenant.plan?.name,
      tokenBalance: tenant.tokenBalance,
      tokenLimit: tenant.tokenLimit,
      adminGranted: tenant.adminGranted,
      adminGrantedAt: tenant.adminGrantedAt?.toISOString(),
    };
  });

  app.post('/:id/add-tokens', { preHandler: [requireRole('super_admin', 'billing_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { tokens: number };
    const ip = request.ip;

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        tokenBalance: { increment: body.tokens },
      },
    });

    await logAdminAction(
      request.adminUser!.id,
      'tenant.add_tokens',
      'tenant',
      id,
      ip,
      id,
      { tokensAdded: body.tokens, newBalance: tenant.tokenBalance }
    );

    return {
      id: tenant.id,
      tokenBalance: tenant.tokenBalance,
      tokensAdded: body.tokens,
    };
  });
};
