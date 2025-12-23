import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { adminAuthMiddleware } from './auth.js';
import {
  getRotatorQueue,
  getRotatorStats,
  addFounderToRotator,
  removeFromRotator,
  toggleRotatorStatus,
  reorderRotator,
  getAffiliateAssignmentHistory,
} from '../../lib/rotator.js';

export const adminRotatorRoutes: FastifyPluginAsync = async (app) => {
  // Protect all routes
  app.addHook('preHandler', adminAuthMiddleware);

  // Get rotator queue and stats
  app.get('/', async (request, reply) => {
    try {
      const [queue, stats] = await Promise.all([
        getRotatorQueue(),
        getRotatorStats(),
      ]);

      return {
        queue,
        stats,
      };
    } catch (error) {
      console.error('Error getting rotator data:', error);
      return reply.status(500).send({ error: 'Failed to get rotator data' });
    }
  });

  // Get rotator stats only
  app.get('/stats', async (request, reply) => {
    try {
      const stats = await getRotatorStats();
      return stats;
    } catch (error) {
      console.error('Error getting rotator stats:', error);
      return reply.status(500).send({ error: 'Failed to get rotator stats' });
    }
  });

  // Get assignment history
  app.get('/history', async (request, reply) => {
    const { limit = '100' } = request.query as { limit?: string };

    try {
      const assignments = await prisma.organicLeadAssignment.findMany({
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      });

      // Get affiliate and lead details
      const affiliateIds = [...new Set(assignments.map(a => a.affiliateId))];
      const leadIds = [...new Set(assignments.map(a => a.leadId))];

      const [affiliates, leads] = await Promise.all([
        prisma.affiliate.findMany({
          where: { id: { in: affiliateIds } },
          select: { id: true, name: true, email: true, code: true },
        }),
        prisma.waitlistLead.findMany({
          where: { id: { in: leadIds } },
          select: { id: true, email: true, name: true },
        }),
      ]);

      const affiliateMap = Object.fromEntries(affiliates.map(a => [a.id, a]));
      const leadMap = Object.fromEntries(leads.map(l => [l.id, l]));

      return assignments.map(a => ({
        id: a.id,
        affiliate: affiliateMap[a.affiliateId] || { id: a.affiliateId, name: 'Unknown' },
        lead: leadMap[a.leadId] || { id: a.leadId, email: 'Unknown' },
        rotatorPosition: a.rotatorPosition,
        assignedAt: a.createdAt,
      }));
    } catch (error) {
      console.error('Error getting assignment history:', error);
      return reply.status(500).send({ error: 'Failed to get assignment history' });
    }
  });

  // Add affiliate to rotator
  app.post('/add/:affiliateId', async (request, reply) => {
    const { affiliateId } = request.params as { affiliateId: string };

    try {
      // Verify affiliate exists and is approved
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
        select: { id: true, name: true, status: true },
      });

      if (!affiliate) {
        return reply.status(404).send({ error: 'Affiliate not found' });
      }

      if (affiliate.status !== 'approved') {
        return reply.status(400).send({ error: 'Affiliate must be approved to join rotator' });
      }

      const entry = await addFounderToRotator(affiliateId);

      return {
        success: true,
        entry,
        message: `${affiliate.name} added to rotator`,
      };
    } catch (error) {
      console.error('Error adding to rotator:', error);
      return reply.status(500).send({ error: 'Failed to add to rotator' });
    }
  });

  // Remove affiliate from rotator
  app.delete('/:affiliateId', async (request, reply) => {
    const { affiliateId } = request.params as { affiliateId: string };

    try {
      await removeFromRotator(affiliateId);

      return {
        success: true,
        message: 'Removed from rotator',
      };
    } catch (error) {
      console.error('Error removing from rotator:', error);
      return reply.status(500).send({ error: 'Failed to remove from rotator' });
    }
  });

  // Toggle affiliate active status
  app.post('/:affiliateId/toggle', async (request, reply) => {
    const { affiliateId } = request.params as { affiliateId: string };
    const { isActive } = request.body as { isActive: boolean };

    try {
      const entry = await toggleRotatorStatus(affiliateId, isActive);

      if (!entry) {
        return reply.status(404).send({ error: 'Affiliate not found in rotator' });
      }

      return {
        success: true,
        entry,
        message: `Rotator status ${isActive ? 'activated' : 'deactivated'}`,
      };
    } catch (error) {
      console.error('Error toggling rotator status:', error);
      return reply.status(500).send({ error: 'Failed to toggle rotator status' });
    }
  });

  // Reorder rotator queue
  app.post('/reorder', async (request, reply) => {
    const { affiliateIds } = request.body as { affiliateIds: string[] };

    if (!Array.isArray(affiliateIds) || affiliateIds.length === 0) {
      return reply.status(400).send({ error: 'affiliateIds array required' });
    }

    try {
      await reorderRotator(affiliateIds);

      return {
        success: true,
        message: 'Rotator queue reordered',
      };
    } catch (error) {
      console.error('Error reordering rotator:', error);
      return reply.status(500).send({ error: 'Failed to reorder rotator' });
    }
  });

  // Get affiliate's assignment history
  app.get('/:affiliateId/history', async (request, reply) => {
    const { affiliateId } = request.params as { affiliateId: string };
    const { limit = '50' } = request.query as { limit?: string };

    try {
      const history = await getAffiliateAssignmentHistory(affiliateId, parseInt(limit));

      // Get lead details
      const leadIds = history.map(h => h.leadId);
      const leads = await prisma.waitlistLead.findMany({
        where: { id: { in: leadIds } },
        select: { id: true, email: true, name: true },
      });
      const leadMap = Object.fromEntries(leads.map(l => [l.id, l]));

      return history.map(h => ({
        ...h,
        lead: leadMap[h.leadId] || { id: h.leadId, email: 'Unknown' },
      }));
    } catch (error) {
      console.error('Error getting affiliate history:', error);
      return reply.status(500).send({ error: 'Failed to get affiliate history' });
    }
  });

  // Bulk add founding members to rotator
  app.post('/bulk-add', async (request, reply) => {
    const { affiliateIds } = request.body as { affiliateIds: string[] };

    if (!Array.isArray(affiliateIds) || affiliateIds.length === 0) {
      return reply.status(400).send({ error: 'affiliateIds array required' });
    }

    try {
      const results = await Promise.all(
        affiliateIds.map(async (affiliateId) => {
          try {
            await addFounderToRotator(affiliateId);
            return { affiliateId, success: true };
          } catch (error) {
            return { affiliateId, success: false, error: String(error) };
          }
        })
      );

      const added = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        success: true,
        message: `Added ${added} affiliates, ${failed} failed`,
        results,
      };
    } catch (error) {
      console.error('Error bulk adding to rotator:', error);
      return reply.status(500).send({ error: 'Failed to bulk add to rotator' });
    }
  });
};
