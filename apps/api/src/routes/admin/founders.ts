import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { adminAuthMiddleware, requireRole, logAdminAction } from './auth.js';

const listQuerySchema = z.object({
  tier: z.enum(['diamond', 'gold', 'silver']).optional(),
  status: z.enum(['waiting', 'invited', 'converted', 'expired']).optional(),
  search: z.string().optional(),
  hasAffiliate: z.enum(['true', 'false']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'position', 'tier']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const updateFounderSchema = z.object({
  status: z.enum(['waiting', 'invited', 'converted', 'expired']).optional(),
  notes: z.string().optional(),
});

const updatePlanSchema = z.object({
  name: z.string().optional(),
  price: z.number().positive().optional(),
  totalSpots: z.number().positive().optional(),
  remainingSpots: z.number().min(0).optional(),
  features: z.array(z.string()).optional(),
  affiliateBonus: z.number().min(0).optional(),
  active: z.boolean().optional(),
});

const refundSchema = z.object({
  reason: z.string().min(1),
  refundAmount: z.number().positive().optional(),
});

export const adminFoundersRoutes: FastifyPluginAsync = async (app) => {
  // Apply auth middleware to all routes
  app.addHook('onRequest', adminAuthMiddleware);

  // GET /api/admin/founders/stats - Get founder statistics
  app.get('/stats', async () => {
    const [founderPlans, totalFounders, recentPurchases, revenueByTier] = await Promise.all([
      prisma.founderPlan.findMany({
        where: { active: true },
        orderBy: { price: 'desc' },
      }),
      prisma.waitlistLead.count({
        where: { founderPlanId: { not: null } },
      }),
      prisma.waitlistLead.findMany({
        where: { founderPlanId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          founderPlan: {
            select: { tier: true, name: true, price: true },
          },
          affiliate: {
            select: { name: true, code: true },
          },
        },
      }),
      prisma.waitlistLead.groupBy({
        by: ['founderPlanId'],
        where: { founderPlanId: { not: null } },
        _count: true,
      }),
    ]);

    // Calculate revenue per tier
    const tierStats = founderPlans.map((plan) => {
      const count = revenueByTier.find((r) => r.founderPlanId === plan.id)?._count || 0;
      return {
        tier: plan.tier,
        name: plan.name,
        price: plan.price,
        totalSpots: plan.totalSpots,
        remainingSpots: plan.remainingSpots,
        soldSpots: plan.totalSpots - plan.remainingSpots,
        revenue: count * plan.price,
        affiliateBonus: plan.affiliateBonus,
        features: plan.features,
      };
    });

    const totalRevenue = tierStats.reduce((sum, tier) => sum + tier.revenue, 0);
    const totalSold = tierStats.reduce((sum, tier) => sum + tier.soldSpots, 0);
    const totalSpots = tierStats.reduce((sum, tier) => sum + tier.totalSpots, 0);

    // Conversion stats
    const convertedCount = await prisma.waitlistLead.count({
      where: {
        founderPlanId: { not: null },
        status: 'converted',
      },
    });

    return {
      summary: {
        totalFounders,
        totalRevenue,
        totalSold,
        totalSpots,
        remainingSpots: totalSpots - totalSold,
        conversionRate: totalFounders > 0 ? ((convertedCount / totalFounders) * 100).toFixed(2) : '0.00',
        averageOrderValue: totalSold > 0 ? (totalRevenue / totalSold).toFixed(2) : '0.00',
      },
      tierStats,
      recentPurchases: recentPurchases.map((p) => ({
        id: p.id,
        email: p.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        name: p.name,
        tier: p.founderPlan?.tier,
        tierName: p.founderPlan?.name,
        price: p.founderPlan?.price,
        status: p.status,
        affiliate: p.affiliate ? {
          name: p.affiliate.name,
          code: p.affiliate.code,
        } : null,
        createdAt: p.createdAt,
      })),
    };
  });

  // GET /api/admin/founders/plans - Get all founder plan configurations
  app.get('/plans', async () => {
    const plans = await prisma.founderPlan.findMany({
      orderBy: { price: 'desc' },
    });

    return plans.map((plan) => ({
      id: plan.id,
      tier: plan.tier,
      name: plan.name,
      price: plan.price,
      totalSpots: plan.totalSpots,
      remainingSpots: plan.remainingSpots,
      soldSpots: plan.totalSpots - plan.remainingSpots,
      features: plan.features,
      affiliateBonus: plan.affiliateBonus,
      active: plan.active,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }));
  });

  // PATCH /api/admin/founders/plans/:tier - Update founder plan
  app.patch('/plans/:tier', { preHandler: requireRole('super_admin') }, async (request, reply) => {
    const { tier } = request.params as { tier: string };
    const body = updatePlanSchema.parse(request.body);
    const admin = (request as any).admin;

    const plan = await prisma.founderPlan.findUnique({ where: { tier } });
    if (!plan) {
      return reply.status(404).send({ error: 'Founder plan not found' });
    }

    const updatedPlan = await prisma.founderPlan.update({
      where: { tier },
      data: body,
    });

    await logAdminAction(admin.id, 'founder.plan_update', 'founder_plan', plan.id, null, {
      tier,
      changes: body,
      previous: {
        price: plan.price,
        totalSpots: plan.totalSpots,
        remainingSpots: plan.remainingSpots,
        affiliateBonus: plan.affiliateBonus,
      },
    }, request.ip);

    return updatedPlan;
  });

  // GET /api/admin/founders - List all founder purchases
  app.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const { page, limit, sortBy, sortOrder, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      founderPlanId: { not: null },
    };

    if (filters.tier) {
      const plan = await prisma.founderPlan.findUnique({ where: { tier: filters.tier } });
      if (plan) {
        where.founderPlanId = plan.id;
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.hasAffiliate === 'true') {
      where.affiliateId = { not: null };
    } else if (filters.hasAffiliate === 'false') {
      where.affiliateId = null;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const orderBy: any = {};
    if (sortBy === 'tier') {
      // Sort by price (proxy for tier)
      orderBy.founderPlan = { price: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [founders, total] = await Promise.all([
      prisma.waitlistLead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          founderPlan: true,
          affiliate: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      prisma.waitlistLead.count({ where }),
    ]);

    return {
      founders: founders.map((f) => ({
        id: f.id,
        email: f.email,
        name: f.name,
        tier: f.founderPlan?.tier,
        tierName: f.founderPlan?.name,
        price: f.founderPlan?.price,
        status: f.status,
        position: f.position,
        referralCode: f.referralCode,
        referralCount: f.referralCount,
        affiliate: f.affiliate,
        tenantId: f.reservedTenantId,
        convertedAt: f.convertedAt,
        createdAt: f.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });

  // GET /api/admin/founders/:id - Get single founder details
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const founder = await prisma.waitlistLead.findFirst({
      where: {
        id,
        founderPlanId: { not: null },
      },
      include: {
        founderPlan: true,
        affiliate: true,
      },
    });

    if (!founder) {
      return reply.status(404).send({ error: 'Founder not found' });
    }

    // Get tenant if converted
    let tenant = null;
    if (founder.reservedTenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: founder.reservedTenantId },
        include: {
          users: {
            select: { id: true, email: true, name: true },
            take: 5,
          },
          workspaces: {
            select: { id: true, name: true },
            take: 5,
          },
          _count: {
            select: { users: true, workspaces: true },
          },
        },
      });
    }

    // Get affiliate conversion if exists
    let affiliateConversion = null;
    if (founder.affiliateId) {
      affiliateConversion = await prisma.affiliateConversion.findFirst({
        where: {
          affiliateId: founder.affiliateId,
          leadEmail: founder.email,
        },
      });
    }

    return {
      id: founder.id,
      email: founder.email,
      name: founder.name,
      tier: founder.founderPlan?.tier,
      tierName: founder.founderPlan?.name,
      price: founder.founderPlan?.price,
      features: founder.founderPlan?.features,
      affiliateBonus: founder.founderPlan?.affiliateBonus,
      status: founder.status,
      position: founder.position,
      referralCode: founder.referralCode,
      referralCount: founder.referralCount,
      affiliate: founder.affiliate ? {
        id: founder.affiliate.id,
        name: founder.affiliate.name,
        email: founder.affiliate.email,
        code: founder.affiliate.code,
        tier: founder.affiliate.tier,
      } : null,
      affiliateConversion: affiliateConversion ? {
        id: affiliateConversion.id,
        commission: affiliateConversion.commission,
        bonus: affiliateConversion.bonus,
        status: affiliateConversion.status,
        createdAt: affiliateConversion.createdAt,
      } : null,
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        userCount: tenant._count.users,
        workspaceCount: tenant._count.workspaces,
        createdAt: tenant.createdAt,
      } : null,
      utmSource: founder.utmSource,
      utmMedium: founder.utmMedium,
      utmCampaign: founder.utmCampaign,
      convertedAt: founder.convertedAt,
      createdAt: founder.createdAt,
    };
  });

  // PATCH /api/admin/founders/:id - Update founder
  app.patch('/:id', { preHandler: requireRole('super_admin', 'billing_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateFounderSchema.parse(request.body);
    const admin = (request as any).admin;

    const founder = await prisma.waitlistLead.findFirst({
      where: { id, founderPlanId: { not: null } },
    });

    if (!founder) {
      return reply.status(404).send({ error: 'Founder not found' });
    }

    const updated = await prisma.waitlistLead.update({
      where: { id },
      data: body,
      include: {
        founderPlan: {
          select: { tier: true, name: true },
        },
      },
    });

    await logAdminAction(admin.id, 'founder.update', 'waitlist_lead', id, null, {
      changes: body,
      tier: updated.founderPlan?.tier,
    }, request.ip);

    return updated;
  });

  // POST /api/admin/founders/:id/activate - Activate founder account
  app.post('/:id/activate', { preHandler: requireRole('super_admin', 'billing_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const founder = await prisma.waitlistLead.findFirst({
      where: { id, founderPlanId: { not: null } },
      include: { founderPlan: true },
    });

    if (!founder) {
      return reply.status(404).send({ error: 'Founder not found' });
    }

    if (founder.status === 'converted') {
      return reply.status(400).send({ error: 'Founder is already activated' });
    }

    // Create tenant and user
    const result = await prisma.$transaction(async (tx) => {
      const tenantName = founder.name || founder.email.split('@')[0];

      const tenant = await tx.tenant.create({
        data: {
          name: `${tenantName}'s Workspace`,
          slug: tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36),
          status: 'active',
          planId: founder.founderPlanId,
          tokenBalance: founder.founderPlan?.tier === 'diamond' ? 20000 :
                        founder.founderPlan?.tier === 'gold' ? 15000 : 10000,
          adminGranted: true,
          adminGrantedBy: admin.id,
          adminGrantedAt: new Date(),
        },
      });

      const user = await tx.user.create({
        data: {
          email: founder.email,
          name: founder.name || founder.email.split('@')[0],
          tenantId: tenant.id,
        },
      });

      await tx.workspace.create({
        data: {
          name: 'My Workspace',
          ownerId: user.id,
          tenantId: tenant.id,
        },
      });

      await tx.tenantSettings.create({
        data: { tenantId: tenant.id },
      });

      const updatedFounder = await tx.waitlistLead.update({
        where: { id },
        data: {
          status: 'converted',
          convertedAt: new Date(),
          reservedTenantId: tenant.id,
        },
      });

      // Decrement remaining spots
      await tx.founderPlan.update({
        where: { id: founder.founderPlanId! },
        data: { remainingSpots: { decrement: 1 } },
      });

      // Create affiliate conversion if applicable
      if (founder.affiliateId) {
        await tx.affiliateConversion.create({
          data: {
            affiliateId: founder.affiliateId,
            leadEmail: founder.email,
            founderPlanId: founder.founderPlanId,
            amount: founder.founderPlan!.price,
            commission: founder.founderPlan!.price * 0.30,
            bonus: founder.founderPlan!.affiliateBonus,
            status: 'pending',
          },
        });

        await tx.affiliate.update({
          where: { id: founder.affiliateId },
          data: {
            totalConversions: { increment: 1 },
            pendingEarnings: {
              increment: founder.founderPlan!.price * 0.30 + founder.founderPlan!.affiliateBonus,
            },
          },
        });
      }

      return { tenant, user, founder: updatedFounder };
    });

    await logAdminAction(admin.id, 'founder.activate', 'waitlist_lead', id, result.tenant.id, {
      tier: founder.founderPlan?.tier,
      tenantId: result.tenant.id,
      userId: result.user.id,
    }, request.ip);

    return {
      success: true,
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
      },
    };
  });

  // POST /api/admin/founders/:id/refund - Process refund
  app.post('/:id/refund', { preHandler: requireRole('super_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = refundSchema.parse(request.body);
    const admin = (request as any).admin;

    const founder = await prisma.waitlistLead.findFirst({
      where: { id, founderPlanId: { not: null } },
      include: { founderPlan: true },
    });

    if (!founder) {
      return reply.status(404).send({ error: 'Founder not found' });
    }

    const refundAmount = body.refundAmount || founder.founderPlan?.price || 0;

    // Process refund
    await prisma.$transaction(async (tx) => {
      // Update lead status
      await tx.waitlistLead.update({
        where: { id },
        data: { status: 'expired' },
      });

      // Increment remaining spots back
      if (founder.founderPlanId) {
        await tx.founderPlan.update({
          where: { id: founder.founderPlanId },
          data: { remainingSpots: { increment: 1 } },
        });
      }

      // If tenant was created, mark as suspended
      if (founder.reservedTenantId) {
        await tx.tenant.update({
          where: { id: founder.reservedTenantId },
          data: { status: 'suspended' },
        });
      }

      // Reverse affiliate conversion if exists
      if (founder.affiliateId) {
        const conversion = await tx.affiliateConversion.findFirst({
          where: {
            affiliateId: founder.affiliateId,
            leadEmail: founder.email,
            founderPlanId: founder.founderPlanId,
          },
        });

        if (conversion && conversion.status === 'pending') {
          await tx.affiliateConversion.update({
            where: { id: conversion.id },
            data: { status: 'refunded' },
          });

          await tx.affiliate.update({
            where: { id: founder.affiliateId },
            data: {
              pendingEarnings: {
                decrement: conversion.commission + conversion.bonus,
              },
              totalConversions: { decrement: 1 },
            },
          });
        }
      }
    });

    await logAdminAction(admin.id, 'founder.refund', 'waitlist_lead', id, founder.reservedTenantId, {
      tier: founder.founderPlan?.tier,
      reason: body.reason,
      refundAmount,
      originalPrice: founder.founderPlan?.price,
    }, request.ip);

    return {
      success: true,
      refundAmount,
      message: `Refund of $${refundAmount} processed successfully`,
    };
  });
};
