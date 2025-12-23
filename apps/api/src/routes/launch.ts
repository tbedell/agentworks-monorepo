import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';

interface LaunchSettings {
  fomoThresholds?: number[];
  showCountdown?: boolean;
  showSpotsRemaining?: boolean;
  urgencyMessages?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Public launch routes - no authentication required
 * Used by marketing site to display launch countdown and stats
 */
export const launchRoutes: FastifyPluginAsync = async (app) => {
  // Get public launch stats
  app.get('/stats', async () => {
    try {
      const [config, founderPlans] = await Promise.all([
        prisma.launchConfig.findFirst({
          where: { name: 'founding_member_launch' },
        }),
        prisma.founderPlan.findMany({
          where: { active: true },
          select: {
            tier: true,
            name: true,
            price: true,
            totalSpots: true,
            remainingSpots: true,
          },
        }),
      ]);

      // Calculate spots
      const totalSpots = founderPlans.reduce((sum, p) => sum + p.totalSpots, 0);
      const remainingSpots = founderPlans.reduce((sum, p) => sum + p.remainingSpots, 0);
      const soldSpots = totalSpots - remainingSpots;
      const percentSold = totalSpots > 0 ? Math.round((soldSpots / totalSpots) * 100) : 0;

      // Get settings
      const settings = (config?.settings as LaunchSettings) || {};
      const fomoThresholds = settings.fomoThresholds || [25, 50, 75, 90, 95];
      const currentMilestone = fomoThresholds.filter(t => percentSold >= t).pop() || 0;

      // Only return if enabled
      const showCountdown = settings.showCountdown !== false;
      const showSpotsRemaining = settings.showSpotsRemaining !== false;

      return {
        isLive: config?.doorsOpen && config?.phase === 'live',
        phase: config?.phase || 'pre_launch',
        launchDate: config?.countdownEnabled ? config.launchDate : null,
        showCountdown: showCountdown && config?.countdownEnabled,
        showSpotsRemaining,
        spots: showSpotsRemaining ? {
          total: totalSpots,
          remaining: remainingSpots,
          sold: soldSpots,
          percentSold,
        } : null,
        fomo: currentMilestone > 0 ? {
          milestone: currentMilestone,
          message: settings.urgencyMessages?.[currentMilestone] || `${currentMilestone}% sold!`,
        } : null,
        tiers: founderPlans.map(plan => ({
          tier: plan.tier,
          name: plan.name,
          price: plan.price,
          available: plan.remainingSpots > 0,
          remainingSpots: showSpotsRemaining ? plan.remainingSpots : undefined,
          soldOut: plan.remainingSpots === 0,
        })),
      };
    } catch (error) {
      console.error('Error getting public launch stats:', error);
      return {
        isLive: false,
        phase: 'pre_launch',
        launchDate: null,
        showCountdown: false,
        showSpotsRemaining: false,
        spots: null,
        fomo: null,
        tiers: [],
      };
    }
  });

  // Get countdown info only
  app.get('/countdown', async () => {
    try {
      const config = await prisma.launchConfig.findFirst({
        where: { name: 'founding_member_launch' },
      });

      const settings = (config?.settings as LaunchSettings) || {};
      const showCountdown = settings.showCountdown !== false;

      if (!config?.countdownEnabled || !showCountdown) {
        return { enabled: false };
      }

      const timeToLaunch = config.launchDate.getTime() - Date.now();

      return {
        enabled: true,
        launchDate: config.launchDate,
        timeToLaunch: Math.max(0, timeToLaunch),
        isLive: config.doorsOpen && config.phase === 'live',
      };
    } catch (error) {
      console.error('Error getting countdown:', error);
      return { enabled: false };
    }
  });
};
