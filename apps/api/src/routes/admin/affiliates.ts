import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { adminAuthMiddleware, requireRole, logAdminAction } from './auth.js';

const AFFILIATE_TIERS = {
  standard: { rate: 0.30, name: 'Standard', minReferrals: 0 },
  silver: { rate: 0.35, name: 'Silver', minReferrals: 10 },
  gold: { rate: 0.40, name: 'Gold', minReferrals: 25 },
  platinum: { rate: 0.50, name: 'Platinum', minReferrals: 50 },
};

const listQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
  tier: z.enum(['standard', 'silver', 'gold', 'platinum']).optional(),
  search: z.string().optional(),
  hasEarnings: z.enum(['true', 'false']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'lifetimeEarnings', 'totalReferrals', 'totalConversions']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const updateAffiliateSchema = z.object({
  tier: z.enum(['standard', 'silver', 'gold', 'platinum']).optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  paypalEmail: z.string().email().optional().nullable(),
  stripeAccountId: z.string().optional().nullable(),
});

const rejectSchema = z.object({
  reason: z.string().min(1),
});

const suspendSchema = z.object({
  reason: z.string().min(1),
});

const commissionOverrideSchema = z.object({
  rate: z.number().min(0).max(1),
  reason: z.string().min(1),
});

const createPayoutSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['paypal', 'stripe', 'manual']),
  transactionId: z.string().optional(),
});

const processPayoutsSchema = z.object({
  ids: z.array(z.string()).min(1),
  transactionIds: z.record(z.string()).optional(),
});

export const adminAffiliatesRoutes: FastifyPluginAsync = async (app) => {
  // Apply auth middleware to all routes
  app.addHook('onRequest', adminAuthMiddleware);

  // GET /api/admin/affiliates/stats - Get affiliate program statistics
  app.get('/stats', async () => {
    const [
      totalAffiliates,
      byStatus,
      byTier,
      pendingPayouts,
      totalPaid,
      recentConversions,
    ] = await Promise.all([
      prisma.affiliate.count(),
      prisma.affiliate.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.affiliate.groupBy({
        by: ['tier'],
        where: { status: 'approved' },
        _count: true,
        _sum: { lifetimeEarnings: true },
      }),
      prisma.affiliate.aggregate({
        _sum: { pendingEarnings: true },
        where: { pendingEarnings: { gt: 0 } },
      }),
      prisma.affiliatePayout.aggregate({
        _sum: { amount: true },
        where: { status: 'completed' },
      }).catch(() => ({ _sum: { amount: 0 } })), // Handle if table doesn't exist
      prisma.affiliateConversion.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          affiliate: {
            select: { name: true, code: true },
          },
          founderPlan: {
            select: { tier: true, name: true },
          },
        },
      }),
    ]);

    // Top performers
    const topPerformers = await prisma.affiliate.findMany({
      where: { status: 'approved' },
      orderBy: { lifetimeEarnings: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        code: true,
        tier: true,
        lifetimeEarnings: true,
        totalConversions: true,
        totalReferrals: true,
      },
    });

    return {
      summary: {
        totalAffiliates,
        approvedAffiliates: byStatus.find((s: { status: string; _count: number }) => s.status === 'approved')?._count || 0,
        pendingApplications: byStatus.find((s: { status: string; _count: number }) => s.status === 'pending')?._count || 0,
        totalPendingPayouts: pendingPayouts._sum.pendingEarnings || 0,
        totalPaidOut: totalPaid._sum?.amount || 0,
      },
      byStatus: byStatus.reduce((acc: Record<string, number>, item: { status: string; _count: number }) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byTier: byTier.map((t: { tier: string; _count: number; _sum: { lifetimeEarnings: number | null } }) => ({
        tier: t.tier,
        name: AFFILIATE_TIERS[t.tier as keyof typeof AFFILIATE_TIERS]?.name || t.tier,
        count: t._count,
        totalEarnings: t._sum.lifetimeEarnings || 0,
      })),
      topPerformers,
      recentConversions: recentConversions.map((c) => ({
        id: c.id,
        affiliateName: c.affiliate.name,
        affiliateCode: c.affiliate.code,
        founderTier: c.founderPlan?.tier,
        amount: c.amount,
        commission: c.commission,
        bonus: c.bonus,
        status: c.status,
        createdAt: c.createdAt,
      })),
    };
  });

  // GET /api/admin/affiliates - List all affiliates
  app.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const { page, limit, sortBy, sortOrder, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.tier) {
      where.tier = filters.tier;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.hasEarnings === 'true') {
      where.lifetimeEarnings = { gt: 0 };
    } else if (filters.hasEarnings === 'false') {
      where.lifetimeEarnings = 0;
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

    const [affiliates, total] = await Promise.all([
      prisma.affiliate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              leads: true,
              conversions: true,
              payouts: true,
            },
          },
        },
      }),
      prisma.affiliate.count({ where }),
    ]);

    return {
      affiliates: affiliates.map((a) => ({
        id: a.id,
        email: a.email,
        name: a.name,
        code: a.code,
        status: a.status,
        tier: a.tier,
        tierName: AFFILIATE_TIERS[a.tier as keyof typeof AFFILIATE_TIERS]?.name || a.tier,
        commissionRate: a.commissionRate,
        lifetimeEarnings: a.lifetimeEarnings,
        pendingEarnings: a.pendingEarnings,
        paidEarnings: a.paidEarnings,
        totalReferrals: a.totalReferrals,
        totalConversions: a.totalConversions,
        website: a.website,
        leadCount: a._count.leads,
        conversionCount: a._count.conversions,
        payoutCount: a._count.payouts,
        approvedAt: a.approvedAt,
        createdAt: a.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });

  // GET /api/admin/affiliates/:id - Get single affiliate details
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const affiliate = await prisma.affiliate.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        leads: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            founderPlanId: true,
            createdAt: true,
          },
        },
        conversions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            founderPlan: {
              select: { tier: true, name: true },
            },
          },
        },
        payouts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!affiliate) {
      return reply.status(404).send({ error: 'Affiliate not found' });
    }

    // Get conversion rate
    const conversionRate = affiliate.totalReferrals > 0
      ? ((affiliate.totalConversions / affiliate.totalReferrals) * 100).toFixed(2)
      : '0.00';

    return {
      id: affiliate.id,
      email: affiliate.email,
      name: affiliate.name,
      code: affiliate.code,
      status: affiliate.status,
      tier: affiliate.tier,
      tierName: AFFILIATE_TIERS[affiliate.tier as keyof typeof AFFILIATE_TIERS]?.name || affiliate.tier,
      commissionRate: affiliate.commissionRate,
      lifetimeEarnings: affiliate.lifetimeEarnings,
      pendingEarnings: affiliate.pendingEarnings,
      paidEarnings: affiliate.paidEarnings,
      totalReferrals: affiliate.totalReferrals,
      totalConversions: affiliate.totalConversions,
      conversionRate,
      website: affiliate.website,
      socialLinks: affiliate.socialLinks,
      paypalEmail: affiliate.paypalEmail,
      stripeAccountId: affiliate.stripeAccountId,
      notes: affiliate.notes,
      user: affiliate.user,
      approvedAt: affiliate.approvedAt,
      createdAt: affiliate.createdAt,
      leads: affiliate.leads.map((l) => ({
        ...l,
        email: l.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      })),
      conversions: affiliate.conversions.map((c) => ({
        id: c.id,
        leadEmail: c.leadEmail.replace(/(.{2}).*(@.*)/, '$1***$2'),
        founderTier: c.founderPlan?.tier,
        founderPlanName: c.founderPlan?.name,
        amount: c.amount,
        commission: c.commission,
        bonus: c.bonus,
        status: c.status,
        paidAt: c.paidAt,
        createdAt: c.createdAt,
      })),
      payouts: affiliate.payouts,
    };
  });

  // PATCH /api/admin/affiliates/:id - Update affiliate
  app.patch('/:id', { preHandler: requireRole('super_admin', 'billing_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateAffiliateSchema.parse(request.body);
    const admin = (request as any).admin;

    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate) {
      return reply.status(404).send({ error: 'Affiliate not found' });
    }

    // If changing tier, update commission rate to tier default
    const updateData: any = { ...body };
    if (body.tier && !body.commissionRate) {
      updateData.commissionRate = AFFILIATE_TIERS[body.tier]?.rate || 0.30;
    }

    const updated = await prisma.affiliate.update({
      where: { id },
      data: updateData,
    });

    await logAdminAction(admin.id, 'affiliate.update', 'affiliate', id, null, {
      changes: body,
      previousTier: affiliate.tier,
      previousRate: affiliate.commissionRate,
    }, request.ip);

    return updated;
  });

  // POST /api/admin/affiliates/:id/approve - Approve affiliate application
  app.post('/:id/approve', { preHandler: requireRole('super_admin', 'billing_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate) {
      return reply.status(404).send({ error: 'Affiliate not found' });
    }

    if (affiliate.status !== 'pending') {
      return reply.status(400).send({ error: `Affiliate is already ${affiliate.status}` });
    }

    const updated = await prisma.affiliate.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
      },
    });

    await logAdminAction(admin.id, 'affiliate.approve', 'affiliate', id, null, {
      email: affiliate.email,
      name: affiliate.name,
    }, request.ip);

    return {
      success: true,
      affiliate: updated,
    };
  });

  // POST /api/admin/affiliates/:id/reject - Reject affiliate application
  app.post('/:id/reject', { preHandler: requireRole('super_admin', 'billing_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = rejectSchema.parse(request.body);
    const admin = (request as any).admin;

    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate) {
      return reply.status(404).send({ error: 'Affiliate not found' });
    }

    if (affiliate.status !== 'pending') {
      return reply.status(400).send({ error: `Cannot reject - affiliate is ${affiliate.status}` });
    }

    const updated = await prisma.affiliate.update({
      where: { id },
      data: {
        status: 'rejected',
        notes: body.reason,
      },
    });

    await logAdminAction(admin.id, 'affiliate.reject', 'affiliate', id, null, {
      email: affiliate.email,
      reason: body.reason,
    }, request.ip);

    return {
      success: true,
      affiliate: updated,
    };
  });

  // POST /api/admin/affiliates/:id/suspend - Suspend affiliate
  app.post('/:id/suspend', { preHandler: requireRole('super_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = suspendSchema.parse(request.body);
    const admin = (request as any).admin;

    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate) {
      return reply.status(404).send({ error: 'Affiliate not found' });
    }

    if (affiliate.status === 'suspended') {
      return reply.status(400).send({ error: 'Affiliate is already suspended' });
    }

    const updated = await prisma.affiliate.update({
      where: { id },
      data: {
        status: 'suspended',
        notes: `Suspended: ${body.reason}`,
      },
    });

    await logAdminAction(admin.id, 'affiliate.suspend', 'affiliate', id, null, {
      email: affiliate.email,
      previousStatus: affiliate.status,
      reason: body.reason,
    }, request.ip);

    return {
      success: true,
      affiliate: updated,
    };
  });

  // POST /api/admin/affiliates/:id/reinstate - Reinstate suspended affiliate
  app.post('/:id/reinstate', { preHandler: requireRole('super_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate) {
      return reply.status(404).send({ error: 'Affiliate not found' });
    }

    if (affiliate.status !== 'suspended') {
      return reply.status(400).send({ error: 'Affiliate is not suspended' });
    }

    const updated = await prisma.affiliate.update({
      where: { id },
      data: {
        status: 'approved',
        notes: null,
      },
    });

    await logAdminAction(admin.id, 'affiliate.reinstate', 'affiliate', id, null, {
      email: affiliate.email,
    }, request.ip);

    return {
      success: true,
      affiliate: updated,
    };
  });

  // GET /api/admin/affiliates/:id/conversions - Get affiliate conversions
  app.get('/:id/conversions', async (request, reply) => {
    const { id } = request.params as { id: string };

    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate) {
      return reply.status(404).send({ error: 'Affiliate not found' });
    }

    const conversions = await prisma.affiliateConversion.findMany({
      where: { affiliateId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        founderPlan: {
          select: { tier: true, name: true, price: true },
        },
      },
    });

    return conversions.map((c) => ({
      id: c.id,
      leadEmail: c.leadEmail.replace(/(.{2}).*(@.*)/, '$1***$2'),
      founderTier: c.founderPlan?.tier,
      founderPlanName: c.founderPlan?.name,
      amount: c.amount,
      commission: c.commission,
      bonus: c.bonus,
      total: c.commission + c.bonus,
      status: c.status,
      stripePaymentId: c.stripePaymentId,
      paidAt: c.paidAt,
      createdAt: c.createdAt,
    }));
  });

  // GET /api/admin/affiliates/:id/payouts - Get affiliate payouts
  app.get('/:id/payouts', async (request, reply) => {
    const { id } = request.params as { id: string };

    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate) {
      return reply.status(404).send({ error: 'Affiliate not found' });
    }

    const payouts = await prisma.affiliatePayout.findMany({
      where: { affiliateId: id },
      orderBy: { createdAt: 'desc' },
    });

    return payouts;
  });

  // POST /api/admin/affiliates/:id/payout - Create payout for affiliate
  app.post('/:id/payout', { preHandler: requireRole('super_admin', 'billing_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = createPayoutSchema.parse(request.body);
    const admin = (request as any).admin;

    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate) {
      return reply.status(404).send({ error: 'Affiliate not found' });
    }

    if (affiliate.status !== 'approved') {
      return reply.status(400).send({ error: 'Can only create payouts for approved affiliates' });
    }

    if (body.amount > affiliate.pendingEarnings) {
      return reply.status(400).send({
        error: `Payout amount exceeds pending earnings ($${affiliate.pendingEarnings.toFixed(2)})`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payout = await tx.affiliatePayout.create({
        data: {
          affiliateId: id,
          amount: body.amount,
          method: body.method,
          status: body.transactionId ? 'completed' : 'pending',
          transactionId: body.transactionId,
          processedAt: body.transactionId ? new Date() : null,
        },
      });

      // Update affiliate earnings
      await tx.affiliate.update({
        where: { id },
        data: {
          pendingEarnings: { decrement: body.amount },
          paidEarnings: body.transactionId ? { increment: body.amount } : undefined,
        },
      });

      // Mark related conversions as paid if we're processing immediately
      if (body.transactionId) {
        await tx.affiliateConversion.updateMany({
          where: {
            affiliateId: id,
            status: 'pending',
          },
          data: {
            status: 'paid',
            paidAt: new Date(),
          },
        });
      }

      return payout;
    });

    await logAdminAction(admin.id, 'affiliate.payout_create', 'affiliate_payout', result.id, null, {
      affiliateId: id,
      affiliateName: affiliate.name,
      amount: body.amount,
      method: body.method,
      transactionId: body.transactionId,
    }, request.ip);

    return {
      success: true,
      payout: result,
    };
  });

  // POST /api/admin/affiliates/payouts/process - Batch process pending payouts
  app.post('/payouts/process', { preHandler: requireRole('super_admin', 'billing_admin') }, async (request, reply) => {
    const body = processPayoutsSchema.parse(request.body);
    const admin = (request as any).admin;

    let processed = 0;
    const errors: string[] = [];

    for (const payoutId of body.ids) {
      try {
        const payout = await prisma.affiliatePayout.findUnique({
          where: { id: payoutId },
          include: { affiliate: true },
        });

        if (!payout || payout.status !== 'pending') {
          errors.push(`Payout ${payoutId} not found or not pending`);
          continue;
        }

        const transactionId = body.transactionIds?.[payoutId] || `TXN-${Date.now()}-${payoutId.slice(0, 8)}`;

        await prisma.$transaction(async (tx) => {
          await tx.affiliatePayout.update({
            where: { id: payoutId },
            data: {
              status: 'completed',
              transactionId,
              processedAt: new Date(),
            },
          });

          await tx.affiliate.update({
            where: { id: payout.affiliateId },
            data: {
              paidEarnings: { increment: payout.amount },
            },
          });

          await tx.affiliateConversion.updateMany({
            where: {
              affiliateId: payout.affiliateId,
              status: 'pending',
            },
            data: {
              status: 'paid',
              paidAt: new Date(),
            },
          });
        });

        processed++;
      } catch (error) {
        errors.push(`Failed to process ${payoutId}: ${(error as Error).message}`);
      }
    }

    await logAdminAction(admin.id, 'affiliate.payout_batch_process', 'affiliate_payout', body.ids.join(','), null, {
      processed,
      total: body.ids.length,
      errors,
    }, request.ip);

    return {
      success: true,
      processed,
      total: body.ids.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  });

  // PATCH /api/admin/affiliates/:id/commission - Override commission rate
  app.patch('/:id/commission', { preHandler: requireRole('super_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = commissionOverrideSchema.parse(request.body);
    const admin = (request as any).admin;

    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate) {
      return reply.status(404).send({ error: 'Affiliate not found' });
    }

    const previousRate = affiliate.commissionRate;

    const updated = await prisma.affiliate.update({
      where: { id },
      data: {
        commissionRate: body.rate,
        notes: `Commission override: ${(body.rate * 100).toFixed(0)}% - ${body.reason}`,
      },
    });

    await logAdminAction(admin.id, 'affiliate.commission_override', 'affiliate', id, null, {
      previousRate,
      newRate: body.rate,
      reason: body.reason,
      affiliateName: affiliate.name,
    }, request.ip);

    return {
      success: true,
      affiliate: updated,
    };
  });

  // GET /api/admin/affiliates/fraud-alerts - Get fraud detection alerts
  app.get('/fraud-alerts', async () => {
    // Detect potential fraud patterns
    const alerts: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      affiliateId: string;
      affiliateName: string;
      affiliateCode: string;
      details: string;
      createdAt: Date;
    }> = [];

    // 1. High conversion rate with low total referrals (potential self-referral)
    const suspiciousConversionRate = await prisma.affiliate.findMany({
      where: {
        status: 'approved',
        totalReferrals: { gt: 0, lt: 5 },
        totalConversions: { gt: 0 },
      },
    });

    for (const a of suspiciousConversionRate) {
      const rate = a.totalConversions / a.totalReferrals;
      if (rate > 0.8) {
        alerts.push({
          type: 'high_conversion_rate',
          severity: 'medium',
          affiliateId: a.id,
          affiliateName: a.name,
          affiliateCode: a.code,
          details: `${(rate * 100).toFixed(0)}% conversion rate with only ${a.totalReferrals} referrals`,
          createdAt: new Date(),
        });
      }
    }

    // 2. Multiple signups from same IP (check waitlist leads)
    const ipGroups = await prisma.waitlistLead.groupBy({
      by: ['ipAddress', 'affiliateId'],
      where: {
        affiliateId: { not: null },
        ipAddress: { not: null },
      },
      _count: true,
      having: {
        ipAddress: { _count: { gt: 3 } },
      },
    });

    for (const group of ipGroups) {
      if (group.affiliateId && group._count > 3) {
        const affiliate = await prisma.affiliate.findUnique({
          where: { id: group.affiliateId },
          select: { id: true, name: true, code: true },
        });
        if (affiliate) {
          alerts.push({
            type: 'multiple_same_ip',
            severity: 'high',
            affiliateId: affiliate.id,
            affiliateName: affiliate.name,
            affiliateCode: affiliate.code,
            details: `${group._count} signups from same IP address`,
            createdAt: new Date(),
          });
        }
      }
    }

    // 3. Rapid signups in short timeframe
    const recentLeads = await prisma.waitlistLead.findMany({
      where: {
        affiliateId: { not: null },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: {
        affiliateId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const leadsByAffiliate = recentLeads.reduce((acc, lead) => {
      if (lead.affiliateId) {
        acc[lead.affiliateId] = (acc[lead.affiliateId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    for (const [affiliateId, count] of Object.entries(leadsByAffiliate)) {
      if (count > 20) {
        const affiliate = await prisma.affiliate.findUnique({
          where: { id: affiliateId },
          select: { id: true, name: true, code: true },
        });
        if (affiliate) {
          alerts.push({
            type: 'rapid_signups',
            severity: 'medium',
            affiliateId: affiliate.id,
            affiliateName: affiliate.name,
            affiliateCode: affiliate.code,
            details: `${count} signups in last 24 hours`,
            createdAt: new Date(),
          });
        }
      }
    }

    // 4. Commission rate higher than tier default
    const overriddenRates = await prisma.affiliate.findMany({
      where: {
        status: 'approved',
      },
      select: {
        id: true,
        name: true,
        code: true,
        tier: true,
        commissionRate: true,
      },
    });

    for (const a of overriddenRates) {
      const tierRate = AFFILIATE_TIERS[a.tier as keyof typeof AFFILIATE_TIERS]?.rate || 0.30;
      if (a.commissionRate > tierRate + 0.05) {
        alerts.push({
          type: 'elevated_commission',
          severity: 'low',
          affiliateId: a.id,
          affiliateName: a.name,
          affiliateCode: a.code,
          details: `Commission rate ${(a.commissionRate * 100).toFixed(0)}% exceeds ${a.tier} tier default of ${(tierRate * 100).toFixed(0)}%`,
          createdAt: new Date(),
        });
      }
    }

    return {
      alerts: alerts.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      summary: {
        total: alerts.length,
        high: alerts.filter((a) => a.severity === 'high').length,
        medium: alerts.filter((a) => a.severity === 'medium').length,
        low: alerts.filter((a) => a.severity === 'low').length,
      },
    };
  });

  // GET /api/admin/affiliates/pending-payouts - Get all pending payouts
  app.get('/pending-payouts', async () => {
    const pendingPayouts = await prisma.affiliatePayout.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: {
        affiliate: {
          select: {
            id: true,
            name: true,
            email: true,
            code: true,
            paypalEmail: true,
            stripeAccountId: true,
          },
        },
      },
    });

    // Also get affiliates with pending earnings but no payout created
    const affiliatesWithPending = await prisma.affiliate.findMany({
      where: {
        status: 'approved',
        pendingEarnings: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        email: true,
        code: true,
        pendingEarnings: true,
        paypalEmail: true,
        stripeAccountId: true,
      },
    });

    return {
      pendingPayouts,
      affiliatesWithPendingEarnings: affiliatesWithPending.filter(
        (a) => !pendingPayouts.some((p) => p.affiliateId === a.id)
      ),
      totalPendingAmount: pendingPayouts.reduce((sum, p) => sum + p.amount, 0),
      totalPendingEarnings: affiliatesWithPending.reduce((sum, a) => sum + a.pendingEarnings, 0),
    };
  });
};
