import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { adminAuthMiddleware, requireRole, logAdminAction } from './auth.js';
import { sendWaitlistInvite } from '../../lib/email.js';

const listQuerySchema = z.object({
  status: z.enum(['waiting', 'invited', 'converted', 'expired']).optional(),
  search: z.string().optional(),
  founderTier: z.enum(['diamond', 'gold', 'silver']).optional(),
  affiliateId: z.string().optional(),
  hasReferrals: z.enum(['true', 'false']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['position', 'createdAt', 'referralCount', 'email']).default('position'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const updateLeadSchema = z.object({
  status: z.enum(['waiting', 'invited', 'converted', 'expired']).optional(),
  position: z.number().positive().optional(),
  name: z.string().optional(),
  founderPlanId: z.string().optional(),
});

const convertLeadSchema = z.object({
  tenantName: z.string().min(1),
  planId: z.string().optional(),
  grantTokens: z.number().optional(),
});

const bulkActionSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(['invite', 'updateStatus', 'delete']),
  status: z.enum(['waiting', 'invited', 'converted', 'expired']).optional(),
});

export const adminWaitlistRoutes: FastifyPluginAsync = async (app) => {
  // Apply auth middleware to all routes
  app.addHook('onRequest', adminAuthMiddleware);

  // GET /api/admin/waitlist/stats - Get waitlist statistics
  app.get('/stats', async (request) => {
    const [
      totalLeads,
      byStatus,
      byFounderTier,
      recentSignups,
      topReferrers,
    ] = await Promise.all([
      prisma.waitlistLead.count(),
      prisma.waitlistLead.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.waitlistLead.groupBy({
        by: ['founderPlanId'],
        _count: true,
        where: { founderPlanId: { not: null } },
      }),
      prisma.waitlistLead.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      prisma.waitlistLead.findMany({
        where: { referralCount: { gt: 0 } },
        orderBy: { referralCount: 'desc' },
        take: 10,
        select: {
          id: true,
          email: true,
          name: true,
          referralCode: true,
          referralCount: true,
        },
      }),
    ]);

    // Get founder plan details for tier breakdown
    const founderPlans = await prisma.founderPlan.findMany({
      where: { active: true },
    });

    const tierBreakdown = founderPlans.map((plan) => {
      const count = byFounderTier.find((t) => t.founderPlanId === plan.id)?._count || 0;
      return {
        tier: plan.tier,
        name: plan.name,
        count,
        totalSpots: plan.totalSpots,
        remainingSpots: plan.remainingSpots,
      };
    });

    return {
      total: totalLeads,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      tierBreakdown,
      recentSignups,
      topReferrers: topReferrers.map((r) => ({
        ...r,
        email: r.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      })),
      conversionRate: totalLeads > 0
        ? ((byStatus.find((s) => s.status === 'converted')?._count || 0) / totalLeads * 100).toFixed(2)
        : '0.00',
    };
  });

  // GET /api/admin/waitlist - List all waitlist leads
  app.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const { page, limit, sortBy, sortOrder, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { referralCode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.founderTier) {
      const plan = await prisma.founderPlan.findUnique({
        where: { tier: filters.founderTier },
      });
      if (plan) {
        where.founderPlanId = plan.id;
      }
    }

    if (filters.affiliateId) {
      where.affiliateId = filters.affiliateId;
    }

    if (filters.hasReferrals === 'true') {
      where.referralCount = { gt: 0 };
    } else if (filters.hasReferrals === 'false') {
      where.referralCount = 0;
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

    const [leads, total] = await Promise.all([
      prisma.waitlistLead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          founderPlan: {
            select: { tier: true, name: true },
          },
          affiliate: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      prisma.waitlistLead.count({ where }),
    ]);

    return {
      leads: leads.map((lead) => ({
        id: lead.id,
        email: lead.email,
        name: lead.name,
        referralCode: lead.referralCode,
        referredByCode: lead.referredByCode,
        referralCount: lead.referralCount,
        position: lead.position,
        status: lead.status,
        founderTier: lead.founderPlan?.tier,
        founderPlanName: lead.founderPlan?.name,
        affiliate: lead.affiliate ? {
          id: lead.affiliate.id,
          name: lead.affiliate.name,
          code: lead.affiliate.code,
        } : null,
        utmSource: lead.utmSource,
        utmMedium: lead.utmMedium,
        utmCampaign: lead.utmCampaign,
        convertedAt: lead.convertedAt,
        createdAt: lead.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });

  // GET /api/admin/waitlist/:id - Get single lead details
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const lead = await prisma.waitlistLead.findUnique({
      where: { id },
      include: {
        founderPlan: true,
        affiliate: {
          select: {
            id: true,
            name: true,
            email: true,
            code: true,
            tier: true,
          },
        },
      },
    });

    if (!lead) {
      return reply.status(404).send({ error: 'Waitlist lead not found' });
    }

    // Get referral chain (who referred this person)
    let referrer = null;
    if (lead.referredByCode) {
      referrer = await prisma.waitlistLead.findUnique({
        where: { referralCode: lead.referredByCode },
        select: {
          id: true,
          email: true,
          name: true,
          referralCode: true,
        },
      });
    }

    // Get people this lead referred
    const referrals = await prisma.waitlistLead.findMany({
      where: { referredByCode: lead.referralCode },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Check if converted to tenant
    let tenant = null;
    if (lead.reservedTenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: lead.reservedTenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
        },
      });
    }

    return {
      ...lead,
      referrer: referrer ? {
        ...referrer,
        email: referrer.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      } : null,
      referrals: referrals.map((r) => ({
        ...r,
        email: r.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      })),
      tenant,
    };
  });

  // PATCH /api/admin/waitlist/:id - Update lead
  app.patch('/:id', { preHandler: requireRole('super_admin', 'billing_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateLeadSchema.parse(request.body);
    const admin = (request as any).admin;

    const lead = await prisma.waitlistLead.findUnique({ where: { id } });
    if (!lead) {
      return reply.status(404).send({ error: 'Waitlist lead not found' });
    }

    const updatedLead = await prisma.waitlistLead.update({
      where: { id },
      data: body,
      include: {
        founderPlan: {
          select: { tier: true, name: true },
        },
      },
    });

    await logAdminAction(admin.id, 'waitlist.update', 'waitlist_lead', id, null, {
      changes: body,
      previousStatus: lead.status,
    }, request.ip);

    return updatedLead;
  });

  // POST /api/admin/waitlist/:id/invite - Send invite email
  app.post('/:id/invite', { preHandler: requireRole('super_admin', 'billing_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const lead = await prisma.waitlistLead.findUnique({ where: { id } });
    if (!lead) {
      return reply.status(404).send({ error: 'Waitlist lead not found' });
    }

    if (lead.status === 'converted') {
      return reply.status(400).send({ error: 'Lead has already been converted' });
    }

    // Update status to invited
    await prisma.waitlistLead.update({
      where: { id },
      data: { status: 'invited' },
    });

    // Send invite email
    await sendWaitlistInvite(lead.email, lead.name || 'there', lead.referralCode).catch(console.error);

    await logAdminAction(admin.id, 'waitlist.invite', 'waitlist_lead', id, null, {
      email: lead.email,
    }, request.ip);

    return { success: true, message: 'Invite sent successfully' };
  });

  // POST /api/admin/waitlist/:id/convert - Convert lead to tenant
  app.post('/:id/convert', { preHandler: requireRole('super_admin', 'billing_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = convertLeadSchema.parse(request.body);
    const admin = (request as any).admin;

    const lead = await prisma.waitlistLead.findUnique({
      where: { id },
      include: { founderPlan: true },
    });

    if (!lead) {
      return reply.status(404).send({ error: 'Waitlist lead not found' });
    }

    if (lead.status === 'converted') {
      return reply.status(400).send({ error: 'Lead has already been converted' });
    }

    // Create tenant with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: body.tenantName,
          slug: body.tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          status: lead.founderPlan ? 'active' : 'trial',
          planId: body.planId || lead.founderPlan?.id,
          tokenBalance: body.grantTokens || (lead.founderPlan ? 10000 : 1000),
          adminGranted: true,
          adminGrantedBy: admin.id,
          adminGrantedAt: new Date(),
        },
      });

      // Create user for the lead
      const user = await tx.user.create({
        data: {
          email: lead.email,
          name: lead.name || lead.email.split('@')[0],
          tenantId: tenant.id,
        },
      });

      // Create default workspace
      await tx.workspace.create({
        data: {
          name: 'My Workspace',
          ownerId: user.id,
          tenantId: tenant.id,
        },
      });

      // Create tenant settings
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
        },
      });

      // Update lead status
      const updatedLead = await tx.waitlistLead.update({
        where: { id },
        data: {
          status: 'converted',
          convertedAt: new Date(),
          reservedTenantId: tenant.id,
        },
      });

      // If founder purchase, update remaining spots
      if (lead.founderPlan) {
        await tx.founderPlan.update({
          where: { id: lead.founderPlan.id },
          data: {
            remainingSpots: { decrement: 1 },
          },
        });
      }

      // If affiliate referral, track conversion
      if (lead.affiliateId && lead.founderPlan) {
        await tx.affiliateConversion.create({
          data: {
            affiliateId: lead.affiliateId,
            leadEmail: lead.email,
            founderPlanId: lead.founderPlan.id,
            amount: lead.founderPlan.price,
            commission: lead.founderPlan.price * 0.30, // Base 30%
            bonus: lead.founderPlan.affiliateBonus,
            status: 'pending',
          },
        });

        await tx.affiliate.update({
          where: { id: lead.affiliateId },
          data: {
            totalConversions: { increment: 1 },
            pendingEarnings: {
              increment: lead.founderPlan.price * 0.30 + lead.founderPlan.affiliateBonus,
            },
          },
        });
      }

      return { tenant, user, lead: updatedLead };
    });

    await logAdminAction(admin.id, 'waitlist.convert', 'waitlist_lead', id, result.tenant.id, {
      tenantName: body.tenantName,
      tenantId: result.tenant.id,
      userId: result.user.id,
      founderTier: lead.founderPlan?.tier,
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

  // DELETE /api/admin/waitlist/:id - Remove lead
  app.delete('/:id', { preHandler: requireRole('super_admin') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const lead = await prisma.waitlistLead.findUnique({ where: { id } });
    if (!lead) {
      return reply.status(404).send({ error: 'Waitlist lead not found' });
    }

    await prisma.waitlistLead.delete({ where: { id } });

    await logAdminAction(admin.id, 'waitlist.delete', 'waitlist_lead', id, null, {
      email: lead.email,
      status: lead.status,
    }, request.ip);

    return { success: true };
  });

  // POST /api/admin/waitlist/bulk - Bulk actions
  app.post('/bulk', { preHandler: requireRole('super_admin', 'billing_admin') }, async (request, reply) => {
    const body = bulkActionSchema.parse(request.body);
    const admin = (request as any).admin;

    let processed = 0;
    const errors: string[] = [];

    for (const id of body.ids) {
      try {
        switch (body.action) {
          case 'invite':
            const leadToInvite = await prisma.waitlistLead.findUnique({ where: { id } });
            if (leadToInvite && leadToInvite.status !== 'converted') {
              await prisma.waitlistLead.update({
                where: { id },
                data: { status: 'invited' },
              });
              await sendWaitlistInvite(
                leadToInvite.email,
                leadToInvite.name || 'there',
                leadToInvite.referralCode
              ).catch(console.error);
              processed++;
            }
            break;

          case 'updateStatus':
            if (body.status) {
              await prisma.waitlistLead.update({
                where: { id },
                data: { status: body.status },
              });
              processed++;
            }
            break;

          case 'delete':
            await prisma.waitlistLead.delete({ where: { id } });
            processed++;
            break;
        }
      } catch (error) {
        errors.push(`Failed to process ${id}: ${(error as Error).message}`);
      }
    }

    await logAdminAction(admin.id, 'waitlist.bulk_action', 'waitlist_lead', body.ids.join(','), null, {
      action: body.action,
      status: body.status,
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

  // GET /api/admin/waitlist/export - Export to CSV
  app.get('/export', { preHandler: requireRole('super_admin', 'billing_admin') }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const { sortBy, sortOrder, ...filters } = query;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const leads = await prisma.waitlistLead.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        founderPlan: {
          select: { tier: true, name: true },
        },
        affiliate: {
          select: { name: true, code: true },
        },
      },
    });

    // Generate CSV
    const headers = [
      'Email',
      'Name',
      'Position',
      'Status',
      'Referral Code',
      'Referral Count',
      'Founder Tier',
      'Affiliate',
      'UTM Source',
      'UTM Medium',
      'UTM Campaign',
      'Created At',
      'Converted At',
    ];

    const rows = leads.map((lead) => [
      lead.email,
      lead.name || '',
      lead.position.toString(),
      lead.status,
      lead.referralCode,
      lead.referralCount.toString(),
      lead.founderPlan?.tier || '',
      lead.affiliate?.name || '',
      lead.utmSource || '',
      lead.utmMedium || '',
      lead.utmCampaign || '',
      lead.createdAt.toISOString(),
      lead.convertedAt?.toISOString() || '',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename=waitlist-export.csv');
    return csv;
  });
};
