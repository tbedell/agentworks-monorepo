import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { adminAuthMiddleware, requireRole } from './auth.js';

const updateSettingSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
});

const bulkUpdateSettingsSchema = z.record(z.string(), z.string());

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

export const adminSettingsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  app.get('/', async () => {
    const settings = await prisma.platformSettings.findMany({
      orderBy: { key: 'asc' },
    });

    const result: Record<string, { value: string; description: string | null }> = {};
    for (const s of settings) {
      result[s.key] = { value: s.value, description: s.description };
    }
    return result;
  });

  app.get('/:key', async (request, reply) => {
    const { key } = request.params as { key: string };

    const setting = await prisma.platformSettings.findUnique({
      where: { key },
    });

    if (!setting) {
      return reply.status(404).send({ error: 'Setting not found' });
    }

    return setting;
  });

  app.put('/:key', { preHandler: [requireRole('super_admin')] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const body = updateSettingSchema.parse(request.body);
    const ip = request.ip;

    const existing = await prisma.platformSettings.findUnique({ where: { key } });

    const setting = await prisma.platformSettings.upsert({
      where: { key },
      update: { value: body.value, description: body.description },
      create: { key, value: body.value, description: body.description },
    });

    await logAdminAction(
      request.adminUser!.id,
      'settings.update',
      'platform_settings',
      key,
      ip,
      { oldValue: existing?.value, newValue: body.value }
    );

    return setting;
  });

  app.post('/bulk', { preHandler: [requireRole('super_admin')] }, async (request) => {
    const updates = bulkUpdateSettingsSchema.parse(request.body);
    const ip = request.ip;

    const results: Record<string, string> = {};

    for (const [key, value] of Object.entries(updates)) {
      await prisma.platformSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      results[key] = value;
    }

    await logAdminAction(
      request.adminUser!.id,
      'settings.bulk_update',
      'platform_settings',
      'bulk',
      ip,
      { keys: Object.keys(updates) }
    );

    return { success: true, updated: results };
  });

  app.get('/payment-providers', async () => {
    const providers = await prisma.paymentProvider.findMany({
      orderBy: { name: 'asc' },
    });
    return providers;
  });

  app.patch('/payment-providers/:id', { preHandler: [requireRole('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { enabled?: boolean; testMode?: boolean };
    const ip = request.ip;

    const provider = await prisma.paymentProvider.update({
      where: { id },
      data: body,
    });

    await logAdminAction(
      request.adminUser!.id,
      'payment_provider.update',
      'payment_provider',
      id,
      ip,
      body
    );

    return provider;
  });

  app.get('/crypto-wallets', async () => {
    const wallets = await prisma.cryptoWallet.findMany({
      orderBy: { currency: 'asc' },
    });
    return wallets;
  });

  app.patch('/crypto-wallets/:id', { preHandler: [requireRole('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { walletAddress?: string; qrCodeUrl?: string; enabled?: boolean };
    const ip = request.ip;

    const wallet = await prisma.cryptoWallet.update({
      where: { id },
      data: body,
    });

    await logAdminAction(
      request.adminUser!.id,
      'crypto_wallet.update',
      'crypto_wallet',
      id,
      ip,
      { currency: wallet.currency }
    );

    return wallet;
  });

  app.get('/plans', async () => {
    const plans = await prisma.plan.findMany({
      orderBy: { monthlyPrice: 'asc' },
    });
    return plans;
  });

  app.patch('/plans/:id', { preHandler: [requireRole('super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { 
      name?: string; 
      monthlyPrice?: number; 
      tokenLimit?: number; 
      features?: string[];
      stripePriceId?: string;
    };
    const ip = request.ip;

    const plan = await prisma.plan.update({
      where: { id },
      data: body,
    });

    await logAdminAction(
      request.adminUser!.id,
      'plan.update',
      'plan',
      id,
      ip,
      { planName: plan.name }
    );

    return plan;
  });
};
