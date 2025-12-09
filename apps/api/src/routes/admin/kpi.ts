import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { adminAuthMiddleware } from './auth.js';
import { kpiCalculator } from '../../services/kpi-calculator.js';
import { gcpBillingService } from '../../services/gcp-billing.js';

export const adminKPIRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  app.get('/summary', async (request) => {
    const { startDate, endDate } = request.query as {
      startDate?: string;
      endDate?: string;
    };

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return kpiCalculator.getSummary(start, end);
  });

  app.get('/tenants', async () => {
    return kpiCalculator.getTenantProfitability();
  });

  app.get('/anomalies', async () => {
    return kpiCalculator.getAnomalies();
  });

  app.get('/gcp', async (request) => {
    const { period = 'current' } = request.query as { period?: string };

    if (period === 'last') {
      return gcpBillingService.getLastMonthCosts();
    }

    return gcpBillingService.getCurrentMonthCosts();
  });

  app.get('/costs', async (request) => {
    const { startDate, endDate } = request.query as {
      startDate?: string;
      endDate?: string;
    };

    const start = startDate 
      ? new Date(startDate) 
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const [gcpCosts, summary] = await Promise.all([
      gcpBillingService.getInfrastructureCosts(start, end),
      kpiCalculator.getSummary(start, end),
    ]);

    return {
      period: { start, end },
      infrastructure: gcpCosts,
      llm: {
        total: summary.costs.llm,
        byProvider: {},
      },
      total: summary.costs.total,
      breakdown: {
        llm: summary.costs.llm,
        infrastructure: gcpCosts.totalCost,
        affiliate: summary.costs.affiliate,
        operations: summary.costs.operations,
      },
    };
  });

  app.post('/estimate', async (request) => {
    const params = request.body as {
      tenants: number;
      apiCallsPerTenant: number;
      modelMix: { economy: number; standard: number; premium: number };
      planMix: { starter: number; pro: number; enterprise: number };
      utilization: number;
    };

    if (!params.tenants || params.tenants < 1) {
      throw new Error('tenants must be at least 1');
    }

    if (!params.modelMix || 
        params.modelMix.economy + params.modelMix.standard + params.modelMix.premium !== 100) {
      throw new Error('modelMix must sum to 100');
    }

    if (!params.planMix ||
        params.planMix.starter + params.planMix.pro + params.planMix.enterprise !== 100) {
      throw new Error('planMix must sum to 100');
    }

    return kpiCalculator.estimate(params);
  });

  app.get('/pricing', async () => {
    return {
      providers: gcpBillingService.getProviderPricing(),
      plans: {
        starter: { price: 0, calls: 100 },
        pro: { price: 79, calls: 1500 },
        enterprise: { price: 349, calls: 8000 },
      },
      founder: {
        diamond: { price: 299, calls: 2000, overageRate: 0.10 },
        gold: { price: 249, calls: 1500, overageRate: 0.12 },
        silver: { price: 199, calls: 1000, overageRate: 0.15 },
      },
      thresholds: {
        marginTarget: 50,
        marginWarning: 40,
        marginCritical: 20,
      },
    };
  });

  app.get('/realtime', async () => {
    const [summary, anomalies, gcpCosts] = await Promise.all([
      kpiCalculator.getSummary(),
      kpiCalculator.getAnomalies(),
      gcpBillingService.getCurrentMonthCosts(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      summary,
      anomalies: anomalies.slice(0, 5),
      gcpCosts: {
        total: gcpCosts.totalCost,
        lastUpdated: gcpCosts.lastUpdated,
      },
      health: {
        marginStatus: summary.margins.gross >= 50 ? 'healthy' :
                      summary.margins.gross >= 40 ? 'warning' : 'critical',
        runwayStatus: summary.runway.months >= 12 ? 'healthy' :
                      summary.runway.months >= 6 ? 'warning' : 'critical',
        anomalyCount: anomalies.filter(a => a.severity === 'high').length,
      },
    };
  });

  // GET /api/admin/kpi/funnel - Pipeline funnel data (Waitlist -> Founder -> Tenant -> Active)
  app.get('/funnel', async () => {
    const [
      waitlistTotal,
      waitlistByStatus,
      foundersTotal,
      foundersByStatus,
      tenantsTotal,
      tenantsByStatus,
      activeUsers,
    ] = await Promise.all([
      // Total waitlist
      prisma.waitlistLead.count(),
      // Waitlist by status
      prisma.waitlistLead.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Total founders (leads with founder plan)
      prisma.waitlistLead.count({
        where: { founderPlanId: { not: null } },
      }),
      // Founders by status
      prisma.waitlistLead.groupBy({
        by: ['status'],
        where: { founderPlanId: { not: null } },
        _count: true,
      }),
      // Total tenants
      prisma.tenant.count(),
      // Tenants by status
      prisma.tenant.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Active users (users who logged in within last 30 days)
      prisma.user.count({
        where: {
          sessions: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      }),
    ]);

    // Calculate conversions
    const waitlistConverted = waitlistByStatus.find((s) => s.status === 'converted')?._count || 0;
    const foundersConverted = foundersByStatus.find((s) => s.status === 'converted')?._count || 0;
    const activeTenants = tenantsByStatus.find((s) => s.status === 'active')?._count || 0;

    // Build funnel stages
    const stages = [
      {
        name: 'Waitlist Signups',
        count: waitlistTotal,
        value: 0, // No revenue yet
        breakdown: {
          waiting: waitlistByStatus.find((s) => s.status === 'waiting')?._count || 0,
          invited: waitlistByStatus.find((s) => s.status === 'invited')?._count || 0,
          converted: waitlistConverted,
          expired: waitlistByStatus.find((s) => s.status === 'expired')?._count || 0,
        },
      },
      {
        name: 'Founder Purchases',
        count: foundersTotal,
        conversionRate: waitlistTotal > 0 ? ((foundersTotal / waitlistTotal) * 100).toFixed(2) : '0.00',
        value: 0, // Will calculate below
        breakdown: {
          waiting: foundersByStatus.find((s) => s.status === 'waiting')?._count || 0,
          invited: foundersByStatus.find((s) => s.status === 'invited')?._count || 0,
          converted: foundersConverted,
        },
      },
      {
        name: 'Tenants Created',
        count: tenantsTotal,
        conversionRate: waitlistTotal > 0 ? ((tenantsTotal / waitlistTotal) * 100).toFixed(2) : '0.00',
        value: 0, // Will calculate below
        breakdown: {
          trial: tenantsByStatus.find((s) => s.status === 'trial')?._count || 0,
          active: activeTenants,
          suspended: tenantsByStatus.find((s) => s.status === 'suspended')?._count || 0,
          deleted: tenantsByStatus.find((s) => s.status === 'deleted')?._count || 0,
        },
      },
      {
        name: 'Active Users',
        count: activeUsers,
        conversionRate: tenantsTotal > 0 ? ((activeUsers / tenantsTotal) * 100).toFixed(2) : '0.00',
        value: 0,
      },
    ];

    // Calculate founder revenue
    const founderPlans = await prisma.founderPlan.findMany({ where: { active: true } });
    const founderRevenue = await prisma.waitlistLead.groupBy({
      by: ['founderPlanId'],
      where: { founderPlanId: { not: null }, status: 'converted' },
      _count: true,
    });

    let totalFounderRevenue = 0;
    for (const group of founderRevenue) {
      const plan = founderPlans.find((p) => p.id === group.founderPlanId);
      if (plan) {
        totalFounderRevenue += plan.price * group._count;
      }
    }
    stages[1].value = totalFounderRevenue;

    // Calculate subscription revenue (MRR)
    const subscriptions = await prisma.subscription.findMany({
      where: { status: 'active' },
      include: { plan: true },
    });
    const mrr = subscriptions.reduce((sum, sub) => sum + (sub.plan?.monthlyPrice || 0), 0);
    stages[2].value = mrr;

    // Overall conversion
    const totalConversionRate = waitlistTotal > 0
      ? ((activeUsers / waitlistTotal) * 100).toFixed(2)
      : '0.00';

    return {
      stages,
      summary: {
        totalWaitlist: waitlistTotal,
        totalFounders: foundersTotal,
        totalTenants: tenantsTotal,
        activeUsers,
        totalConversionRate,
        founderRevenue: totalFounderRevenue,
        monthlyRecurringRevenue: mrr,
      },
      trends: {
        // Last 7 days comparison
        waitlistGrowth: 0, // Would need historical data
        founderGrowth: 0,
        tenantGrowth: 0,
        userGrowth: 0,
      },
    };
  });

  // GET /api/admin/kpi/revenue-breakdown - MRR by user type
  app.get('/revenue-breakdown', async () => {
    const [founderPlans, subscriptions, affiliatePayouts] = await Promise.all([
      prisma.founderPlan.findMany({ where: { active: true } }),
      prisma.subscription.findMany({
        where: { status: 'active' },
        include: {
          plan: true,
          tenant: {
            include: {
              users: {
                take: 1,
                include: {
                  affiliate: true,
                },
              },
            },
          },
        },
      }),
      prisma.affiliatePayout.aggregate({
        _sum: { amount: true },
        where: { status: 'completed' },
      }),
    ]);

    // Calculate founder revenue by tier
    const founderRevenue = await prisma.waitlistLead.groupBy({
      by: ['founderPlanId'],
      where: { founderPlanId: { not: null }, status: 'converted' },
      _count: true,
    });

    const founderRevenueByTier = founderPlans.map((plan) => {
      const group = founderRevenue.find((r) => r.founderPlanId === plan.id);
      const count = group?._count || 0;
      return {
        tier: plan.tier,
        name: plan.name,
        price: plan.price,
        count,
        revenue: plan.price * count,
      };
    });

    const totalFounderRevenue = founderRevenueByTier.reduce((sum, t) => sum + t.revenue, 0);

    // Calculate subscription revenue by plan
    const planGroups: Record<string, { name: string; price: number; count: number; revenue: number }> = {};
    for (const sub of subscriptions) {
      const planName = sub.plan?.name || 'Unknown';
      if (!planGroups[planName]) {
        planGroups[planName] = {
          name: planName,
          price: sub.plan?.monthlyPrice || 0,
          count: 0,
          revenue: 0,
        };
      }
      planGroups[planName].count++;
      planGroups[planName].revenue += sub.plan?.monthlyPrice || 0;
    }

    const subscriptionRevenueByPlan = Object.values(planGroups);
    const totalSubscriptionMRR = subscriptionRevenueByPlan.reduce((sum, p) => sum + p.revenue, 0);

    // Affiliate costs
    const affiliateCosts = affiliatePayouts._sum.amount || 0;

    // Calculate percentages
    const totalRevenue = totalFounderRevenue + totalSubscriptionMRR;

    return {
      founder: {
        total: totalFounderRevenue,
        percentage: totalRevenue > 0 ? ((totalFounderRevenue / totalRevenue) * 100).toFixed(2) : '0.00',
        byTier: founderRevenueByTier,
      },
      subscription: {
        mrr: totalSubscriptionMRR,
        arr: totalSubscriptionMRR * 12,
        percentage: totalRevenue > 0 ? ((totalSubscriptionMRR / totalRevenue) * 100).toFixed(2) : '0.00',
        byPlan: subscriptionRevenueByPlan,
        totalSubscribers: subscriptions.length,
      },
      total: {
        revenue: totalRevenue,
        arr: totalSubscriptionMRR * 12 + totalFounderRevenue,
      },
      costs: {
        affiliatePayouts: affiliateCosts,
        netRevenue: totalRevenue - affiliateCosts,
      },
    };
  });

  // GET /api/admin/kpi/affiliate-revenue - Affiliate revenue attribution
  app.get('/affiliate-revenue', async () => {
    const [
      affiliateStats,
      conversions,
      pendingPayouts,
      completedPayouts,
      topAffiliates,
    ] = await Promise.all([
      prisma.affiliate.aggregate({
        _sum: {
          lifetimeEarnings: true,
          pendingEarnings: true,
          paidEarnings: true,
        },
        _count: true,
        where: { status: 'approved' },
      }),
      prisma.affiliateConversion.findMany({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        include: {
          affiliate: {
            select: { name: true, code: true },
          },
          founderPlan: {
            select: { tier: true, name: true },
          },
        },
      }),
      prisma.affiliatePayout.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { status: 'pending' },
      }),
      prisma.affiliatePayout.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { status: 'completed' },
      }),
      prisma.affiliate.findMany({
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
      }),
    ]);

    // This month's conversions
    const thisMonthCommissions = conversions.reduce((sum, c) => sum + c.commission + c.bonus, 0);
    const thisMonthSales = conversions.reduce((sum, c) => sum + c.amount, 0);

    // By founder tier
    const conversionsByTier = conversions.reduce((acc, c) => {
      const tier = c.founderPlan?.tier || 'subscription';
      if (!acc[tier]) {
        acc[tier] = { count: 0, revenue: 0, commissions: 0 };
      }
      acc[tier].count++;
      acc[tier].revenue += c.amount;
      acc[tier].commissions += c.commission + c.bonus;
      return acc;
    }, {} as Record<string, { count: number; revenue: number; commissions: number }>);

    return {
      summary: {
        totalAffiliates: affiliateStats._count,
        lifetimeEarnings: affiliateStats._sum.lifetimeEarnings || 0,
        pendingEarnings: affiliateStats._sum.pendingEarnings || 0,
        paidEarnings: affiliateStats._sum.paidEarnings || 0,
      },
      thisMonth: {
        conversions: conversions.length,
        sales: thisMonthSales,
        commissions: thisMonthCommissions,
      },
      byTier: conversionsByTier,
      payouts: {
        pending: {
          count: pendingPayouts._count,
          amount: pendingPayouts._sum.amount || 0,
        },
        completed: {
          count: completedPayouts._count,
          amount: completedPayouts._sum.amount || 0,
        },
      },
      topAffiliates,
      recentConversions: conversions.slice(0, 10).map((c) => ({
        id: c.id,
        affiliateName: c.affiliate.name,
        affiliateCode: c.affiliate.code,
        tier: c.founderPlan?.tier || 'subscription',
        amount: c.amount,
        commission: c.commission,
        bonus: c.bonus,
        status: c.status,
        createdAt: c.createdAt,
      })),
    };
  });

  // GET /api/admin/kpi/founder-metrics - Founder-specific metrics
  app.get('/founder-metrics', async () => {
    const [founderPlans, foundersData, conversions] = await Promise.all([
      prisma.founderPlan.findMany({
        where: { active: true },
        orderBy: { price: 'desc' },
      }),
      prisma.waitlistLead.groupBy({
        by: ['founderPlanId', 'status'],
        where: { founderPlanId: { not: null } },
        _count: true,
      }),
      prisma.waitlistLead.findMany({
        where: {
          founderPlanId: { not: null },
          status: 'converted',
        },
        orderBy: { convertedAt: 'desc' },
        take: 30,
        include: {
          founderPlan: {
            select: { tier: true, name: true, price: true },
          },
        },
      }),
    ]);

    // Build tier metrics
    const tierMetrics = founderPlans.map((plan) => {
      const tierData = foundersData.filter((d) => d.founderPlanId === plan.id);
      const total = tierData.reduce((sum, d) => sum + d._count, 0);
      const converted = tierData.find((d) => d.status === 'converted')?._count || 0;
      const pending = tierData.find((d) => d.status === 'waiting')?._count || 0;
      const invited = tierData.find((d) => d.status === 'invited')?._count || 0;

      return {
        tier: plan.tier,
        name: plan.name,
        price: plan.price,
        totalSpots: plan.totalSpots,
        remainingSpots: plan.remainingSpots,
        soldSpots: plan.totalSpots - plan.remainingSpots,
        fillRate: ((plan.totalSpots - plan.remainingSpots) / plan.totalSpots * 100).toFixed(2),
        revenue: converted * plan.price,
        potentialRevenue: plan.totalSpots * plan.price,
        affiliateBonus: plan.affiliateBonus,
        breakdown: {
          total,
          converted,
          pending,
          invited,
        },
      };
    });

    const totalRevenue = tierMetrics.reduce((sum, t) => sum + t.revenue, 0);
    const totalSold = tierMetrics.reduce((sum, t) => sum + t.soldSpots, 0);
    const totalSpots = tierMetrics.reduce((sum, t) => sum + t.totalSpots, 0);
    const totalRemaining = tierMetrics.reduce((sum, t) => sum + t.remainingSpots, 0);

    // Sales velocity (conversions per day over last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentConversions = conversions.filter(
      (c) => c.convertedAt && c.convertedAt >= thirtyDaysAgo
    );
    const salesVelocity = recentConversions.length / 30;

    // Days to sellout projection
    const daysToSellout = salesVelocity > 0
      ? Math.ceil(totalRemaining / salesVelocity)
      : null;

    return {
      summary: {
        totalRevenue,
        totalSold,
        totalSpots,
        remainingSpots: totalRemaining,
        overallFillRate: ((totalSold / totalSpots) * 100).toFixed(2),
        averageOrderValue: totalSold > 0 ? (totalRevenue / totalSold).toFixed(2) : '0.00',
      },
      velocity: {
        salesPerDay: salesVelocity.toFixed(2),
        projectedDaysToSellout: daysToSellout,
        recentSales: recentConversions.length,
      },
      byTier: tierMetrics,
      recentConversions: conversions.slice(0, 10).map((c) => ({
        id: c.id,
        email: c.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        name: c.name,
        tier: c.founderPlan?.tier,
        price: c.founderPlan?.price,
        convertedAt: c.convertedAt,
      })),
    };
  });
};
