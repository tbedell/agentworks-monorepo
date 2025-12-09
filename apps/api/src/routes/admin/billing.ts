import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { adminAuthMiddleware, requireRole } from './auth.js';

async function logAdminAction(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  ipAddress: string,
  tenantId?: string
) {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      resourceType,
      resourceId,
      tenantId,
      ipAddress,
    },
  });
}

export const adminBillingRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  app.get('/subscriptions', async (request) => {
    const { tenantId, status } = request.query as {
      tenantId?: string;
      status?: string;
    };

    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: { plan: true, tenant: true },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      stripeSubscriptionId: s.stripeSubscriptionId,
      planId: s.planId,
      planName: s.plan.name,
      status: s.status,
      currentPeriodStart: s.currentPeriodStart.toISOString(),
      currentPeriodEnd: s.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    }));
  });

  app.get('/subscriptions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true, tenant: true },
    });

    if (!subscription) {
      return reply.status(404).send({ error: 'Subscription not found' });
    }

    return {
      id: subscription.id,
      tenantId: subscription.tenantId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      planId: subscription.planId,
      planName: subscription.plan.name,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  });

  app.post('/subscriptions/:id/cancel', { preHandler: [requireRole('super_admin', 'billing_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ip = request.ip;

    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) {
      return reply.status(404).send({ error: 'Subscription not found' });
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { cancelAtPeriodEnd: true },
      include: { plan: true },
    });

    await logAdminAction(
      request.adminUser!.id,
      'subscription.cancel',
      'subscription',
      id,
      ip,
      subscription.tenantId
    );

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      stripeSubscriptionId: updated.stripeSubscriptionId,
      planId: updated.planId,
      planName: updated.plan.name,
      status: updated.status,
      currentPeriodStart: updated.currentPeriodStart.toISOString(),
      currentPeriodEnd: updated.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
    };
  });

  app.get('/invoices', async (request) => {
    const { tenantId } = request.query as { tenantId?: string };

    return [];
  });

  app.post('/sync', { preHandler: [requireRole('super_admin', 'billing_admin')] }, async () => {
    return { synced: 0, message: 'Stripe sync would be implemented here' };
  });
};
