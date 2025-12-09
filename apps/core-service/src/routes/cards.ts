import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger, CARD_TYPES, CARD_PRIORITIES, CARD_STATUSES } from '@agentworks/shared';
import { getDatabase } from '../lib/database.js';
import { authenticateRequest, requireWorkspaceAccess, type AuthenticatedRequest } from '../lib/auth.js';

const logger = createLogger('core-service:cards');

const createCardSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(CARD_TYPES),
  priority: z.enum(CARD_PRIORITIES).default('Medium'),
  assigneeId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
});

const updateCardSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(CARD_TYPES).optional(),
  priority: z.enum(CARD_PRIORITIES).optional(),
  status: z.enum(CARD_STATUSES).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
});

const moveCardSchema = z.object({
  laneId: z.string().uuid(),
  position: z.number().int().min(0),
});

const reorderCardsSchema = z.object({
  cardIds: z.array(z.string().uuid()),
});

export async function cardRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Add authentication hook
  app.addHook('preHandler', authenticateRequest);

  // Get cards for board
  app.get('/board/:boardId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { boardId } = request.params as { boardId: string };
    
    const db = getDatabase();
    
    // Check board exists and get workspace
    const board = await db.board.findUnique({
      where: { id: boardId },
      include: {
        project: {
          include: {
            workspace: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
    
    if (!board) {
      return reply.status(404).send({
        error: 'BOARD_NOT_FOUND',
        message: 'Board not found',
      });
    }
    
    if (!await requireWorkspaceAccess(authRequest, reply, board.project.workspace.id)) {
      return;
    }
    
    const { status, type, assigneeId } = request.query as {
      status?: string;
      type?: string;
      assigneeId?: string;
    };
    
    const cards = await db.card.findMany({
      where: {
        boardId,
        ...(status && { status }),
        ...(type && { type }),
        ...(assigneeId && { assigneeId }),
      },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        parent: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
        children: {
          select: {
            id: true,
            title: true,
            status: true,
            type: true,
            priority: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
        agentRuns: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            completedAt: true,
            agent: {
              select: {
                name: true,
                displayName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 3,
        },
        lane: {
          select: {
            id: true,
            name: true,
            laneNumber: true,
          },
        },
        _count: {
          select: {
            children: true,
            agentRuns: true,
          },
        },
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
    });
    
    return reply.send(cards);
  });

  // Create card
  app.post('/board/:boardId/lane/:laneId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { boardId, laneId } = request.params as { boardId: string; laneId: string };
    
    try {
      const cardData = createCardSchema.parse(request.body);
      
      const db = getDatabase();
      
      // Check board and lane exist and get workspace
      const [board, lane] = await Promise.all([
        db.board.findUnique({
          where: { id: boardId },
          include: {
            project: {
              include: {
                workspace: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        }),
        db.lane.findUnique({
          where: { id: laneId },
          include: {
            _count: {
              select: {
                cards: true,
              },
            },
          },
        }),
      ]);
      
      if (!board) {
        return reply.status(404).send({
          error: 'BOARD_NOT_FOUND',
          message: 'Board not found',
        });
      }
      
      if (!lane || lane.boardId !== boardId) {
        return reply.status(404).send({
          error: 'LANE_NOT_FOUND',
          message: 'Lane not found',
        });
      }
      
      if (!await requireWorkspaceAccess(authRequest, reply, board.project.workspace.id, 'member')) {
        return;
      }
      
      // Validate assignee if provided
      if (cardData.assigneeId) {
        const assignee = await db.user.findUnique({
          where: { id: cardData.assigneeId },
        });
        
        if (!assignee) {
          return reply.status(404).send({
            error: 'ASSIGNEE_NOT_FOUND',
            message: 'Assignee not found',
          });
        }
        
        // Check if assignee has access to workspace
        const hasAccess = await db.workspaceMember.findFirst({
          where: {
            userId: cardData.assigneeId,
            workspaceId: board.project.workspace.id,
          },
        });
        
        const isOwner = await db.workspace.findFirst({
          where: {
            id: board.project.workspace.id,
            ownerId: cardData.assigneeId,
          },
        });
        
        if (!hasAccess && !isOwner) {
          return reply.status(400).send({
            error: 'ASSIGNEE_NO_ACCESS',
            message: 'Assignee does not have access to this workspace',
          });
        }
      }
      
      // Validate parent if provided
      if (cardData.parentId) {
        const parent = await db.card.findUnique({
          where: { id: cardData.parentId },
        });
        
        if (!parent || parent.boardId !== boardId) {
          return reply.status(404).send({
            error: 'PARENT_NOT_FOUND',
            message: 'Parent card not found in this board',
          });
        }
      }
      
      const card = await db.card.create({
        data: {
          ...cardData,
          boardId,
          laneId,
          position: lane._count.cards, // Add to end
          status: 'Draft',
        },
        include: {
          assignee: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
          parent: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
          lane: {
            select: {
              id: true,
              name: true,
              laneNumber: true,
            },
          },
        },
      });
      
      logger.info('Card created', {
        cardId: card.id,
        boardId,
        laneId,
        userId: authRequest.user?.id,
        title: card.title,
      });
      
      return reply.send(card);
      
    } catch (error) {
      logger.error('Failed to create card', { error, boardId, laneId });
      
      return reply.status(500).send({
        error: 'CREATE_FAILED',
        message: 'Failed to create card',
      });
    }
  });

  // Get card by ID
  app.get('/:cardId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { cardId } = request.params as { cardId: string };
    
    const db = getDatabase();
    const card = await db.card.findUnique({
      where: { id: cardId },
      include: {
        board: {
          include: {
            project: {
              include: {
                workspace: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        parent: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
          },
        },
        children: {
          include: {
            assignee: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
            lane: {
              select: {
                id: true,
                name: true,
                laneNumber: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
        agentRuns: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
              },
            },
            logs: {
              orderBy: {
                timestamp: 'desc',
              },
              take: 10,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        lane: {
          select: {
            id: true,
            name: true,
            laneNumber: true,
          },
        },
      },
    });
    
    if (!card) {
      return reply.status(404).send({
        error: 'CARD_NOT_FOUND',
        message: 'Card not found',
      });
    }
    
    if (!await requireWorkspaceAccess(authRequest, reply, card.board.project.workspace.id)) {
      return;
    }
    
    return reply.send(card);
  });

  // Update card
  app.patch('/:cardId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { cardId } = request.params as { cardId: string };
    
    try {
      const updates = updateCardSchema.parse(request.body);
      
      const db = getDatabase();
      
      // Check card exists and get workspace
      const existingCard = await db.card.findUnique({
        where: { id: cardId },
        include: {
          board: {
            include: {
              project: {
                include: {
                  workspace: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      
      if (!existingCard) {
        return reply.status(404).send({
          error: 'CARD_NOT_FOUND',
          message: 'Card not found',
        });
      }
      
      if (!await requireWorkspaceAccess(authRequest, reply, existingCard.board.project.workspace.id, 'member')) {
        return;
      }
      
      // Validate assignee if provided
      if (updates.assigneeId) {
        const assignee = await db.user.findUnique({
          where: { id: updates.assigneeId },
        });
        
        if (!assignee) {
          return reply.status(404).send({
            error: 'ASSIGNEE_NOT_FOUND',
            message: 'Assignee not found',
          });
        }
      }
      
      // Validate parent if provided
      if (updates.parentId) {
        const parent = await db.card.findUnique({
          where: { id: updates.parentId },
        });
        
        if (!parent || parent.boardId !== existingCard.boardId) {
          return reply.status(404).send({
            error: 'PARENT_NOT_FOUND',
            message: 'Parent card not found in this board',
          });
        }
        
        if (parent.id === cardId) {
          return reply.status(400).send({
            error: 'INVALID_PARENT',
            message: 'Card cannot be its own parent',
          });
        }
      }
      
      const card = await db.card.update({
        where: { id: cardId },
        data: updates,
        include: {
          assignee: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
          parent: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
          lane: {
            select: {
              id: true,
              name: true,
              laneNumber: true,
            },
          },
        },
      });
      
      logger.info('Card updated', {
        cardId,
        userId: authRequest.user?.id,
        updates,
      });
      
      return reply.send(card);
      
    } catch (error) {
      logger.error('Failed to update card', { error, cardId });
      
      return reply.status(500).send({
        error: 'UPDATE_FAILED',
        message: 'Failed to update card',
      });
    }
  });

  // Move card to different lane
  app.patch('/:cardId/move', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { cardId } = request.params as { cardId: string };
    
    try {
      const { laneId, position } = moveCardSchema.parse(request.body);
      
      const db = getDatabase();
      
      // Get card and validate access
      const card = await db.card.findUnique({
        where: { id: cardId },
        include: {
          board: {
            include: {
              project: {
                include: {
                  workspace: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
          lane: true,
        },
      });
      
      if (!card) {
        return reply.status(404).send({
          error: 'CARD_NOT_FOUND',
          message: 'Card not found',
        });
      }
      
      if (!await requireWorkspaceAccess(authRequest, reply, card.board.project.workspace.id, 'member')) {
        return;
      }
      
      // Validate target lane
      const targetLane = await db.lane.findUnique({
        where: { id: laneId },
      });
      
      if (!targetLane || targetLane.boardId !== card.boardId) {
        return reply.status(404).send({
          error: 'LANE_NOT_FOUND',
          message: 'Target lane not found in this board',
        });
      }
      
      // Update card position in transaction
      await db.$transaction(async (tx) => {
        if (card.laneId === laneId) {
          // Moving within same lane - reorder
          if (position < card.position) {
            // Moving up - increment positions of cards between new position and old position
            await tx.card.updateMany({
              where: {
                laneId,
                position: {
                  gte: position,
                  lt: card.position,
                },
              },
              data: {
                position: {
                  increment: 1,
                },
              },
            });
          } else {
            // Moving down - decrement positions of cards between old position and new position
            await tx.card.updateMany({
              where: {
                laneId,
                position: {
                  gt: card.position,
                  lte: position,
                },
              },
              data: {
                position: {
                  decrement: 1,
                },
              },
            });
          }
        } else {
          // Moving to different lane
          // Decrement positions of cards after old position in old lane
          await tx.card.updateMany({
            where: {
              laneId: card.laneId,
              position: {
                gt: card.position,
              },
            },
            data: {
              position: {
                decrement: 1,
              },
            },
          });
          
          // Increment positions of cards at or after new position in new lane
          await tx.card.updateMany({
            where: {
              laneId,
              position: {
                gte: position,
              },
            },
            data: {
              position: {
                increment: 1,
              },
            },
          });
        }
        
        // Update the card itself
        await tx.card.update({
          where: { id: cardId },
          data: {
            laneId,
            position,
          },
        });
      });
      
      logger.info('Card moved', {
        cardId,
        fromLaneId: card.laneId,
        toLaneId: laneId,
        position,
        userId: authRequest.user?.id,
      });
      
      // Return updated card
      const updatedCard = await db.card.findUnique({
        where: { id: cardId },
        include: {
          lane: {
            select: {
              id: true,
              name: true,
              laneNumber: true,
            },
          },
        },
      });
      
      return reply.send(updatedCard);
      
    } catch (error) {
      logger.error('Failed to move card', { error, cardId });
      
      return reply.status(500).send({
        error: 'MOVE_FAILED',
        message: 'Failed to move card',
      });
    }
  });

  // Delete card
  app.delete('/:cardId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { cardId } = request.params as { cardId: string };
    
    try {
      const db = getDatabase();
      
      // Check card exists and get workspace
      const card = await db.card.findUnique({
        where: { id: cardId },
        include: {
          board: {
            include: {
              project: {
                include: {
                  workspace: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      
      if (!card) {
        return reply.status(404).send({
          error: 'CARD_NOT_FOUND',
          message: 'Card not found',
        });
      }
      
      if (!await requireWorkspaceAccess(authRequest, reply, card.board.project.workspace.id, 'member')) {
        return;
      }
      
      // Delete card and reorder remaining cards
      await db.$transaction(async (tx) => {
        // Delete card (cascade will handle children and runs)
        await tx.card.delete({
          where: { id: cardId },
        });
        
        // Reorder remaining cards in the lane
        await tx.card.updateMany({
          where: {
            laneId: card.laneId,
            position: {
              gt: card.position,
            },
          },
          data: {
            position: {
              decrement: 1,
            },
          },
        });
      });
      
      logger.info('Card deleted', {
        cardId,
        userId: authRequest.user?.id,
      });
      
      return reply.send({ message: 'Card deleted successfully' });
      
    } catch (error) {
      logger.error('Failed to delete card', { error, cardId });
      
      return reply.status(500).send({
        error: 'DELETE_FAILED',
        message: 'Failed to delete card',
      });
    }
  });

  // Reorder cards in lane
  app.patch('/lane/:laneId/reorder', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { laneId } = request.params as { laneId: string };
    
    try {
      const { cardIds } = reorderCardsSchema.parse(request.body);
      
      const db = getDatabase();
      
      // Check lane exists and get workspace
      const lane = await db.lane.findUnique({
        where: { id: laneId },
        include: {
          board: {
            include: {
              project: {
                include: {
                  workspace: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
          cards: {
            select: {
              id: true,
            },
          },
        },
      });
      
      if (!lane) {
        return reply.status(404).send({
          error: 'LANE_NOT_FOUND',
          message: 'Lane not found',
        });
      }
      
      if (!await requireWorkspaceAccess(authRequest, reply, lane.board.project.workspace.id, 'member')) {
        return;
      }
      
      // Validate all card IDs belong to this lane
      const laneCardIds = lane.cards.map(card => card.id);
      const invalidCards = cardIds.filter(id => !laneCardIds.includes(id));
      
      if (invalidCards.length > 0) {
        return reply.status(400).send({
          error: 'INVALID_CARDS',
          message: 'Some cards do not belong to this lane',
          details: { invalidCards },
        });
      }
      
      // Update card positions
      await db.$transaction(async (tx) => {
        for (let i = 0; i < cardIds.length; i++) {
          await tx.card.update({
            where: { id: cardIds[i] },
            data: { position: i },
          });
        }
      });
      
      logger.info('Cards reordered', {
        laneId,
        cardIds,
        userId: authRequest.user?.id,
      });
      
      return reply.send({ message: 'Cards reordered successfully' });
      
    } catch (error) {
      logger.error('Failed to reorder cards', { error, laneId });
      
      return reply.status(500).send({
        error: 'REORDER_FAILED',
        message: 'Failed to reorder cards',
      });
    }
  });
}