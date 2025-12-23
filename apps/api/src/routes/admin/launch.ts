import type { FastifyPluginAsync } from 'fastify';
import { prisma, Prisma } from '@agentworks/db';
import { adminAuthMiddleware } from './auth.js';

interface LaunchSettings {
  fomoThresholds?: number[]; // e.g., [25, 50, 75, 90, 95]
  autoCloseWhenSoldOut?: boolean;
  showCountdown?: boolean;
  showSpotsRemaining?: boolean;
  urgencyMessages?: Record<string, string>;
  [key: string]: unknown; // Index signature for Prisma JSON compatibility
}

export const adminLaunchRoutes: FastifyPluginAsync = async (app) => {
  // Protect all routes
  app.addHook('preHandler', adminAuthMiddleware);

  // Get launch configuration
  app.get('/config', async (request, reply) => {
    try {
      let config = await prisma.launchConfig.findFirst({
        where: { name: 'founding_member_launch' },
      });

      // Create default config if none exists
      if (!config) {
        config = await prisma.launchConfig.create({
          data: {
            name: 'founding_member_launch',
            launchDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
            countdownEnabled: false,
            doorsOpen: false,
            totalSpots: 1000,
            spotsSold: 0,
            phase: 'pre_launch',
            settings: {
              fomoThresholds: [25, 50, 75, 90, 95],
              autoCloseWhenSoldOut: true,
              showCountdown: true,
              showSpotsRemaining: true,
              urgencyMessages: {
                '25': '25% of spots are gone!',
                '50': 'Half the spots have sold!',
                '75': 'Only 25% of spots remaining!',
                '90': 'Almost sold out! Only 10% left!',
                '95': 'FINAL SPOTS! Less than 5% remaining!',
              },
            } as Prisma.InputJsonValue,
          },
        });
      }

      // Get founder plan stats
      const founderPlans = await prisma.founderPlan.findMany({
        where: { active: true },
        select: {
          id: true,
          tier: true,
          name: true,
          price: true,
          totalSpots: true,
          remainingSpots: true,
        },
      });

      const totalSpots = founderPlans.reduce((sum, p) => sum + p.totalSpots, 0);
      const remainingSpots = founderPlans.reduce((sum, p) => sum + p.remainingSpots, 0);
      const soldSpots = totalSpots - remainingSpots;

      return {
        ...config,
        founderPlans,
        computed: {
          totalSpots,
          remainingSpots,
          soldSpots,
          percentSold: totalSpots > 0 ? Math.round((soldSpots / totalSpots) * 100) : 0,
          timeToLaunch: config.launchDate.getTime() - Date.now(),
          isLive: config.doorsOpen && config.phase === 'live',
        },
      };
    } catch (error) {
      console.error('Error getting launch config:', error);
      return reply.status(500).send({ error: 'Failed to get launch configuration' });
    }
  });

  // Update launch configuration
  app.put('/config', async (request, reply) => {
    const updates = request.body as Partial<{
      launchDate: string;
      countdownEnabled: boolean;
      totalSpots: number;
      phase: string;
      settings: LaunchSettings;
    }>;

    try {
      const config = await prisma.launchConfig.update({
        where: { name: 'founding_member_launch' },
        data: {
          ...(updates.launchDate && { launchDate: new Date(updates.launchDate) }),
          ...(updates.countdownEnabled !== undefined && { countdownEnabled: updates.countdownEnabled }),
          ...(updates.totalSpots && { totalSpots: updates.totalSpots }),
          ...(updates.phase && { phase: updates.phase }),
          ...(updates.settings && { settings: updates.settings as Prisma.InputJsonValue }),
        },
      });

      return { success: true, config };
    } catch (error) {
      console.error('Error updating launch config:', error);
      return reply.status(500).send({ error: 'Failed to update launch configuration' });
    }
  });

  // Open doors (start launch)
  app.post('/open-doors', async (request, reply) => {
    try {
      const config = await prisma.launchConfig.update({
        where: { name: 'founding_member_launch' },
        data: {
          doorsOpen: true,
          phase: 'live',
        },
      });

      // Log the action
      const admin = (request as any).adminUser;
      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'launch_doors_opened',
          resourceType: 'launch',
          resourceId: config.id,
          ipAddress: request.ip || 'unknown',
          details: { phase: 'live', openedAt: new Date().toISOString() },
        },
      });

      return {
        success: true,
        message: 'Doors are now OPEN! Launch is live.',
        config,
      };
    } catch (error) {
      console.error('Error opening doors:', error);
      return reply.status(500).send({ error: 'Failed to open doors' });
    }
  });

  // Close doors (end launch)
  app.post('/close-doors', async (request, reply) => {
    try {
      const config = await prisma.launchConfig.update({
        where: { name: 'founding_member_launch' },
        data: {
          doorsOpen: false,
          phase: 'closed',
        },
      });

      // Log the action
      const admin = (request as any).adminUser;
      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'launch_doors_closed',
          resourceType: 'launch',
          resourceId: config.id,
          ipAddress: request.ip || 'unknown',
          details: { phase: 'closed', closedAt: new Date().toISOString() },
        },
      });

      return {
        success: true,
        message: 'Doors are now CLOSED. Launch has ended.',
        config,
      };
    } catch (error) {
      console.error('Error closing doors:', error);
      return reply.status(500).send({ error: 'Failed to close doors' });
    }
  });

  // Get real-time launch stats
  app.get('/stats', async (request, reply) => {
    try {
      const [config, founderPlans, recentPurchases, waitlistStats] = await Promise.all([
        prisma.launchConfig.findFirst({ where: { name: 'founding_member_launch' } }),
        prisma.founderPlan.findMany({
          where: { active: true },
          select: {
            tier: true,
            name: true,
            totalSpots: true,
            remainingSpots: true,
            price: true,
          },
        }),
        // Recent conversions (last 24 hours)
        prisma.affiliateConversion.findMany({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            founderPlan: { select: { tier: true, name: true } },
            affiliate: { select: { name: true, code: true } },
          },
        }),
        prisma.waitlistLead.aggregate({
          _count: true,
        }),
      ]);

      const totalSpots = founderPlans.reduce((sum, p) => sum + p.totalSpots, 0);
      const remainingSpots = founderPlans.reduce((sum, p) => sum + p.remainingSpots, 0);
      const soldSpots = totalSpots - remainingSpots;
      const revenue = founderPlans.reduce(
        (sum, p) => sum + (p.totalSpots - p.remainingSpots) * p.price,
        0
      );

      // Calculate sales velocity (purchases per hour in last 24h)
      const recentCount = recentPurchases.length;
      const salesVelocity = recentCount / 24;

      // FOMO milestone check
      const percentSold = totalSpots > 0 ? Math.round((soldSpots / totalSpots) * 100) : 0;
      const settings = (config?.settings as LaunchSettings) || {};
      const fomoThresholds = settings.fomoThresholds || [25, 50, 75, 90, 95];
      const currentMilestone = fomoThresholds.filter(t => percentSold >= t).pop() || 0;
      const nextMilestone = fomoThresholds.find(t => percentSold < t);

      return {
        isLive: config?.doorsOpen && config?.phase === 'live',
        phase: config?.phase || 'pre_launch',
        launchDate: config?.launchDate,
        timeToLaunch: config?.launchDate ? config.launchDate.getTime() - Date.now() : 0,
        spots: {
          total: totalSpots,
          remaining: remainingSpots,
          sold: soldSpots,
          percentSold,
        },
        revenue: {
          total: revenue,
          formatted: `$${revenue.toLocaleString()}`,
        },
        byTier: founderPlans.map(p => ({
          tier: p.tier,
          name: p.name,
          sold: p.totalSpots - p.remainingSpots,
          remaining: p.remainingSpots,
          total: p.totalSpots,
          revenue: (p.totalSpots - p.remainingSpots) * p.price,
        })),
        velocity: {
          salesPerHour: salesVelocity.toFixed(2),
          last24hPurchases: recentCount,
        },
        fomo: {
          currentMilestone,
          nextMilestone,
          message: settings.urgencyMessages?.[currentMilestone] || null,
        },
        waitlist: {
          total: waitlistStats._count,
        },
        recentPurchases: recentPurchases.map(p => ({
          id: p.id,
          tier: p.founderPlan?.tier,
          planName: p.founderPlan?.name,
          amount: p.amount,
          affiliate: p.affiliate?.name,
          affiliateCode: p.affiliate?.code,
          createdAt: p.createdAt,
        })),
      };
    } catch (error) {
      console.error('Error getting launch stats:', error);
      return reply.status(500).send({ error: 'Failed to get launch stats' });
    }
  });

  // Get FOMO milestones
  app.get('/milestones', async (request, reply) => {
    try {
      const config = await prisma.launchConfig.findFirst({
        where: { name: 'founding_member_launch' },
      });

      const founderPlans = await prisma.founderPlan.findMany({
        where: { active: true },
      });

      const totalSpots = founderPlans.reduce((sum, p) => sum + p.totalSpots, 0);
      const remainingSpots = founderPlans.reduce((sum, p) => sum + p.remainingSpots, 0);
      const soldSpots = totalSpots - remainingSpots;
      const percentSold = totalSpots > 0 ? Math.round((soldSpots / totalSpots) * 100) : 0;

      const settings = (config?.settings as LaunchSettings) || {};
      const thresholds = settings.fomoThresholds || [25, 50, 75, 90, 95];
      const messages = settings.urgencyMessages || {};

      return {
        currentPercent: percentSold,
        milestones: thresholds.map(threshold => ({
          threshold,
          reached: percentSold >= threshold,
          message: messages[threshold] || `${threshold}% sold!`,
          spotsAtThreshold: Math.floor(totalSpots * (threshold / 100)),
        })),
      };
    } catch (error) {
      console.error('Error getting milestones:', error);
      return reply.status(500).send({ error: 'Failed to get milestones' });
    }
  });

  // Update milestone messages
  app.put('/milestones', async (request, reply) => {
    const { thresholds, messages } = request.body as {
      thresholds?: number[];
      messages?: Record<number, string>;
    };

    try {
      const config = await prisma.launchConfig.findFirst({
        where: { name: 'founding_member_launch' },
      });

      const currentSettings = (config?.settings as LaunchSettings) || {};
      const newSettings: LaunchSettings = {
        ...currentSettings,
        ...(thresholds && { fomoThresholds: thresholds }),
        ...(messages && { urgencyMessages: messages }),
      };

      await prisma.launchConfig.update({
        where: { name: 'founding_member_launch' },
        data: { settings: newSettings as Prisma.InputJsonValue },
      });

      return { success: true, settings: newSettings };
    } catch (error) {
      console.error('Error updating milestones:', error);
      return reply.status(500).send({ error: 'Failed to update milestones' });
    }
  });
};
