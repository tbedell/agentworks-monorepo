import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { lucia } from '../lib/auth.js';

export const boardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    (request as any).user = user;
  });

  app.get('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        project: { include: { workspace: { include: { members: true } } } },
        lanes: { orderBy: { laneNumber: 'asc' } },
        cards: {
          orderBy: { position: 'asc' },
          include: {
            assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
            agentRuns: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { agent: true },
            },
          },
        },
      },
    });

    if (!board) {
      return reply.status(404).send({ error: 'Board not found' });
    }

    const isMember = board.project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const lanes = board.lanes.map((lane) => ({
      ...lane,
      cards: board.cards.filter((c) => c.laneId === lane.id),
    }));

    return { ...board, lanes };
  });

  app.patch('/:id/lanes/:laneId', async (request, reply) => {
    const user = (request as any).user;
    const { id, laneId } = request.params as { id: string; laneId: string };
    const { wipLimit, requiresHumanReview, autoAdvance } = request.body as {
      wipLimit?: number;
      requiresHumanReview?: boolean;
      autoAdvance?: boolean;
    };

    const board = await prisma.board.findUnique({
      where: { id },
      include: { project: { include: { workspace: { include: { members: true } } } } },
    });

    if (!board) {
      return reply.status(404).send({ error: 'Board not found' });
    }

    const membership = board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    // Build update data with only provided fields
    const updateData: {
      wipLimit?: number;
      requiresHumanReview?: boolean;
      autoAdvance?: boolean;
    } = {};

    if (wipLimit !== undefined) updateData.wipLimit = wipLimit;
    if (requiresHumanReview !== undefined) updateData.requiresHumanReview = requiresHumanReview;
    if (autoAdvance !== undefined) {
      // Auto-advance cannot be true if human review is required
      if (autoAdvance) {
        // Check if human review is being disabled in this request OR was already disabled
        const existingLane = await prisma.lane.findUnique({ where: { id: laneId } });
        const willRequireReview = requiresHumanReview === undefined
          ? existingLane?.requiresHumanReview
          : requiresHumanReview;
        if (willRequireReview) {
          return reply.status(400).send({
            error: 'Cannot enable auto-advance while human review is required. Disable human review first.',
          });
        }
      }
      updateData.autoAdvance = autoAdvance;
    }

    const lane = await prisma.lane.update({
      where: { id: laneId },
      data: updateData,
    });

    return lane;
  });
};
