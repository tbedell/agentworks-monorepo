import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { createCardSchema, updateCardSchema, moveCardSchema } from '@agentworks/shared';
import { lucia } from '../lib/auth.js';
import { transitionCard } from '../lib/card-state-machine.js';

export const cardRoutes: FastifyPluginAsync = async (app) => {
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

  app.post('/', async (request, reply) => {
    const user = (request as any).user;
    const body = createCardSchema.parse(request.body);

    const board = await prisma.board.findUnique({
      where: { id: body.boardId },
      include: { project: { include: { workspace: { include: { members: true } } } } },
    });

    if (!board) {
      return reply.status(404).send({ error: 'Board not found' });
    }

    const membership = board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const maxPosition = await prisma.card.aggregate({
      where: { laneId: body.laneId },
      _max: { position: true },
    });

    // Get lane info for history tracking
    const lane = await prisma.lane.findUnique({
      where: { id: body.laneId },
      select: { name: true, laneNumber: true },
    });

    const card = await prisma.card.create({
      data: {
        boardId: body.boardId,
        laneId: body.laneId,
        title: body.title,
        description: body.description,
        type: body.type,
        priority: body.priority,
        assigneeId: body.assigneeId,
        parentId: body.parentId,
        position: (maxPosition._max.position ?? -1) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Create CardHistory entry for card creation
    await prisma.cardHistory.create({
      data: {
        cardId: card.id,
        action: 'created',
        previousValue: null,
        newValue: lane?.name || 'Unknown Lane',
        performedBy: user.id,
        details: `Card "${card.title}" created`,
        metadata: {
          source: 'cards-api',
          laneNumber: lane?.laneNumber,
          type: card.type,
          priority: card.priority,
        },
      },
    });

    return card;
  });

  app.get('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
        lane: true,
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        parent: true,
        children: true,
        agentRuns: {
          orderBy: { createdAt: 'desc' },
          include: { agent: true, logs: { orderBy: { timestamp: 'asc' } } },
        },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const isMember = card.board.project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    return card;
  });

  app.patch('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const body = updateCardSchema.parse(request.body);

    const card = await prisma.card.findUnique({
      where: { id },
      include: { board: { include: { project: { include: { workspace: { include: { members: true } } } } } } },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const membership = card.board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const updated = await prisma.card.update({
      where: { id },
      data: body,
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return updated;
  });

  app.post('/:id/move', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const body = moveCardSchema.parse(request.body);

    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        lane: true,
        board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const membership = card.board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const laneChanged = body.laneId !== card.laneId;

    await prisma.$transaction(async (tx) => {
      if (laneChanged) {
        await tx.card.updateMany({
          where: { laneId: card.laneId, position: { gt: card.position } },
          data: { position: { decrement: 1 } },
        });
      }

      await tx.card.updateMany({
        where: { laneId: body.laneId, position: { gte: body.position } },
        data: { position: { increment: 1 } },
      });

      await tx.card.update({
        where: { id },
        data: { laneId: body.laneId, position: body.position },
      });
    });

    const updated = await prisma.card.findUnique({
      where: { id },
      include: {
        lane: true,
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Log lane change to CardHistory if lane changed
    if (laneChanged && updated) {
      await prisma.cardHistory.create({
        data: {
          cardId: id,
          action: 'lane_change',
          previousValue: card.lane.name,
          newValue: updated.lane.name,
          performedBy: user.id,
          metadata: { fromLaneId: card.laneId, toLaneId: body.laneId },
        },
      });
    }

    return updated;
  });

  app.delete('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const card = await prisma.card.findUnique({
      where: { id },
      include: { board: { include: { project: { include: { workspace: { include: { members: true } } } } } } },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const membership = card.board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    await prisma.card.delete({ where: { id } });

    await prisma.card.updateMany({
      where: { laneId: card.laneId, position: { gt: card.position } },
      data: { position: { decrement: 1 } },
    });

    return { success: true };
  });

  // Approve a card and optionally advance to next lane
  app.post('/:id/approve', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { notes, advance } = request.body as { notes?: string; advance?: boolean };

    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        lane: true,
        board: {
          include: {
            lanes: { orderBy: { laneNumber: 'asc' } },
            project: { include: { workspace: { include: { members: true } } } },
          },
        },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const membership = card.board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    // Find next lane
    const currentLaneNumber = card.lane.laneNumber;
    const nextLane = card.board.lanes.find((l) => l.laneNumber === currentLaneNumber + 1);

    const updateData: any = {
      reviewStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: user.id,
      reviewNotes: notes,
      rejectedAt: null,
      rejectedBy: null,
    };

    // If advancing and next lane exists
    if (advance && nextLane) {
      // Get max position in next lane
      const maxPosition = await prisma.card.aggregate({
        where: { laneId: nextLane.id },
        _max: { position: true },
      });

      updateData.laneId = nextLane.id;
      updateData.position = (maxPosition._max.position ?? -1) + 1;
      updateData.reviewStatus = null; // Reset review status for new lane
    }

    const updated = await prisma.card.update({
      where: { id },
      data: updateData,
      include: {
        lane: true,
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Log approval to CardHistory
    await prisma.cardHistory.create({
      data: {
        cardId: id,
        action: 'approved',
        previousValue: card.lane.name,
        newValue: advance && nextLane ? nextLane.name : card.lane.name,
        performedBy: user.id,
        details: notes || null,
        metadata: advance && nextLane ? { laneChange: true, fromLaneId: card.laneId, toLaneId: nextLane.id } : undefined,
      },
    });

    return {
      card: updated,
      advanced: advance && !!nextLane,
      nextLane: nextLane ? { id: nextLane.id, name: nextLane.name, laneNumber: nextLane.laneNumber } : null,
    };
  });

  // Reject a card and optionally return to previous lane
  app.post('/:id/reject', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { notes, returnToPrevious } = request.body as { notes?: string; returnToPrevious?: boolean };

    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        lane: true,
        board: {
          include: {
            lanes: { orderBy: { laneNumber: 'asc' } },
            project: { include: { workspace: { include: { members: true } } } },
          },
        },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const membership = card.board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    // Find previous lane
    const currentLaneNumber = card.lane.laneNumber;
    const prevLane = card.board.lanes.find((l) => l.laneNumber === currentLaneNumber - 1);

    const updateData: any = {
      reviewStatus: 'rejected',
      rejectedAt: new Date(),
      rejectedBy: user.id,
      reviewNotes: notes,
      approvedAt: null,
      approvedBy: null,
    };

    // If returning to previous lane and it exists
    if (returnToPrevious && prevLane) {
      const maxPosition = await prisma.card.aggregate({
        where: { laneId: prevLane.id },
        _max: { position: true },
      });

      updateData.laneId = prevLane.id;
      updateData.position = (maxPosition._max.position ?? -1) + 1;
      updateData.reviewStatus = 'needs_revision';
    }

    const updated = await prisma.card.update({
      where: { id },
      data: updateData,
      include: {
        lane: true,
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Log rejection to CardHistory
    await prisma.cardHistory.create({
      data: {
        cardId: id,
        action: 'rejected',
        previousValue: card.lane.name,
        newValue: returnToPrevious && prevLane ? prevLane.name : card.lane.name,
        performedBy: user.id,
        details: notes || null,
        metadata: returnToPrevious && prevLane ? { laneChange: true, fromLaneId: card.laneId, toLaneId: prevLane.id } : undefined,
      },
    });

    return {
      card: updated,
      returnedToPrevious: returnToPrevious && !!prevLane,
      previousLane: prevLane ? { id: prevLane.id, name: prevLane.name, laneNumber: prevLane.laneNumber } : null,
    };
  });

  // Request review for a card (mark as pending review)
  app.post('/:id/request-review', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const membership = card.board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const updated = await prisma.card.update({
      where: { id },
      data: {
        reviewStatus: 'pending',
        approvedAt: null,
        approvedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        reviewNotes: null,
      },
      include: {
        lane: true,
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return updated;
  });

  // Mark a card as complete and move to completed lane
  app.post('/:id/complete', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        lane: true,
        board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const membership = card.board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    // Find the completed lane (usually lane 6 or the highest numbered lane)
    const completedLane = await prisma.lane.findFirst({
      where: {
        boardId: card.boardId,
        OR: [
          { laneNumber: 6 }, // Default completed lane
          { name: { contains: 'Complete', mode: 'insensitive' } },
          { name: { contains: 'Done', mode: 'insensitive' } },
        ],
      },
      orderBy: { laneNumber: 'desc' },
    });

    const completedAt = new Date();

    // Update the card
    const updated = await prisma.card.update({
      where: { id },
      data: {
        status: 'Done',
        completedAt,
        laneId: completedLane?.id || card.laneId, // Move to completed lane if found
        reviewStatus: null, // Clear review status
      },
      include: {
        lane: true,
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Log to card history
    await prisma.cardHistory.create({
      data: {
        cardId: id,
        action: 'completed',
        previousValue: card.status,
        newValue: 'Done',
        performedBy: user.id,
        details: `Card marked as complete by ${user.name || user.email}`,
        metadata: completedLane && completedLane.id !== card.laneId
          ? { laneChange: true, fromLaneId: card.laneId, toLaneId: completedLane.id }
          : undefined,
      },
    });

    return {
      card: updated,
      completedAt: completedAt.toISOString(),
    };
  });

  // ============================================
  // Card Todo Routes for Claude Code Agent
  // ============================================

  // GET /api/cards/:cardId/todos - List all todos for a card
  app.get('/:cardId/todos', async (request, reply) => {
    const user = (request as any).user;
    const { cardId } = request.params as { cardId: string };

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const isMember = card.board.project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const todos = await prisma.cardTodo.findMany({
      where: { cardId },
      orderBy: [{ completed: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
    });

    return { todos };
  });

  // POST /api/cards/:cardId/todos - Add a new todo to a card
  app.post('/:cardId/todos', async (request, reply) => {
    const user = (request as any).user;
    const { cardId } = request.params as { cardId: string };
    const { content, priority, agentSource } = request.body as {
      content: string;
      priority?: number;
      agentSource?: string;
    };

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return reply.status(400).send({ error: 'Todo content is required' });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const membership = card.board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const todo = await prisma.cardTodo.create({
      data: {
        cardId,
        content: content.trim(),
        priority: priority ?? 0,
        agentSource: agentSource ?? null,
      },
    });

    return { todo };
  });

  // PATCH /api/cards/:cardId/todos/:todoId - Update a todo (complete/uncomplete, update content)
  app.patch('/:cardId/todos/:todoId', async (request, reply) => {
    const user = (request as any).user;
    const { cardId, todoId } = request.params as { cardId: string; todoId: string };
    const { completed, content, priority } = request.body as {
      completed?: boolean;
      content?: string;
      priority?: number;
    };

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const membership = card.board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const existingTodo = await prisma.cardTodo.findFirst({
      where: { id: todoId, cardId },
    });

    if (!existingTodo) {
      return reply.status(404).send({ error: 'Todo not found' });
    }

    const updateData: any = {};
    if (typeof completed === 'boolean') {
      updateData.completed = completed;
      updateData.completedAt = completed ? new Date() : null;
      updateData.completedBy = completed ? user.id : null;
    }
    if (typeof content === 'string' && content.trim().length > 0) {
      updateData.content = content.trim();
    }
    if (typeof priority === 'number') {
      updateData.priority = priority;
    }

    const todo = await prisma.cardTodo.update({
      where: { id: todoId },
      data: updateData,
    });

    return { todo };
  });

  // DELETE /api/cards/:cardId/todos/:todoId - Remove a todo from a card
  app.delete('/:cardId/todos/:todoId', async (request, reply) => {
    const user = (request as any).user;
    const { cardId, todoId } = request.params as { cardId: string; todoId: string };

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const membership = card.board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const existingTodo = await prisma.cardTodo.findFirst({
      where: { id: todoId, cardId },
    });

    if (!existingTodo) {
      return reply.status(404).send({ error: 'Todo not found' });
    }

    await prisma.cardTodo.delete({ where: { id: todoId } });

    return { success: true };
  });

  // GET /api/cards/:cardId/history - Get history entries for a card
  app.get('/:cardId/history', async (request, reply) => {
    const user = (request as any).user;
    const { cardId } = request.params as { cardId: string };

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const isMember = card.board.project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const history = await prisma.cardHistory.findMany({
      where: { cardId },
      orderBy: { timestamp: 'desc' },
    });

    return { history };
  });

  // POST /api/cards/:cardId/history - Add a history entry to a card
  app.post('/:cardId/history', async (request, reply) => {
    const user = (request as any).user;
    const { cardId } = request.params as { cardId: string };
    const { action, previousValue, newValue, details, metadata } = request.body as {
      action: string;
      previousValue?: string;
      newValue?: string;
      details?: string;
      metadata?: Record<string, any>;
    };

    if (!action || typeof action !== 'string') {
      return reply.status(400).send({ error: 'Action is required' });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const membership = card.board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const historyEntry = await prisma.cardHistory.create({
      data: {
        cardId,
        action,
        previousValue: previousValue ?? null,
        newValue: newValue ?? null,
        performedBy: user.id,
        details: details ?? null,
        metadata: metadata ?? undefined,
      },
    });

    return { history: historyEntry };
  });

  // Transition card state (for agent orchestration)
  // This endpoint can be called by internal services with the internal service token
  app.post('/:cardId/transition', async (request, reply) => {
    const { cardId } = request.params as { cardId: string };
    const { trigger, performedBy, targetLaneNumber, details, metadata } = request.body as {
      trigger: 'agent_start' | 'agent_complete' | 'human_approve' | 'human_reject' | 'document_generated';
      performedBy: string;
      targetLaneNumber?: number;
      details?: string;
      metadata?: Record<string, any>;
    };

    if (!trigger || !performedBy) {
      return reply.status(400).send({ error: 'Trigger and performedBy are required' });
    }

    // Check for internal service token (service-to-service calls)
    const authHeader = request.headers.authorization;
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN || 'internal-service-token-dev';
    const isInternalCall = authHeader === `Bearer ${internalToken}`;

    if (!isInternalCall) {
      // For non-internal calls, validate user session
      const user = (request as any).user;
      if (!user) {
        return reply.status(401).send({ error: 'Not authenticated' });
      }

      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
        },
      });

      if (!card) {
        return reply.status(404).send({ error: 'Card not found' });
      }

      const membership = card.board.project.workspace.members.find((m) => m.userId === user.id);
      if (!membership || membership.role === 'viewer') {
        return reply.status(403).send({ error: 'Not authorized' });
      }
    }

    try {
      const updatedCard = await transitionCard({
        cardId,
        trigger,
        performedBy,
        targetLaneNumber,
        details,
        metadata,
      });

      return { card: updatedCard };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to transition card';
      return reply.status(500).send({ error: message });
    }
  });
};
