import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@agentworks/shared';
import { getDatabase } from '../lib/database.js';
import { authenticateRequest, requireWorkspaceAccess, type AuthenticatedRequest } from '../lib/auth.js';

const logger = createLogger('core-service:boards');

const createBoardSchema = z.object({
  name: z.string().min(2).max(100),
});

const updateBoardSchema = z.object({
  name: z.string().min(2).max(100).optional(),
});

const updateLaneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  wipLimit: z.number().int().min(1).optional().nullable(),
});

export async function boardRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Add authentication hook
  app.addHook('preHandler', authenticateRequest);

  // Get boards for project
  app.get('/project/:projectId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { projectId } = request.params as { projectId: string };
    
    const db = getDatabase();
    
    // Check project exists and get workspace
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          select: {
            id: true,
          },
        },
      },
    });
    
    if (!project) {
      return reply.status(404).send({
        error: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      });
    }
    
    if (!await requireWorkspaceAccess(authRequest, reply, project.workspace.id)) {
      return;
    }
    
    const boards = await db.board.findMany({
      where: { projectId },
      include: {
        lanes: {
          orderBy: {
            laneNumber: 'asc',
          },
          include: {
            _count: {
              select: {
                cards: true,
              },
            },
          },
        },
        _count: {
          select: {
            cards: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    return reply.send(boards);
  });

  // Create board
  app.post('/project/:projectId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { projectId } = request.params as { projectId: string };
    
    try {
      const { name } = createBoardSchema.parse(request.body);
      
      const db = getDatabase();
      
      // Check project exists and get workspace
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          workspace: {
            select: {
              id: true,
            },
          },
        },
      });
      
      if (!project) {
        return reply.status(404).send({
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }
      
      if (!await requireWorkspaceAccess(authRequest, reply, project.workspace.id, 'member')) {
        return;
      }
      
      const result = await db.$transaction(async (tx) => {
        // Create board
        const board = await tx.board.create({
          data: {
            name,
            projectId,
          },
        });
        
        // Create default lanes
        const lanes = [
          { laneNumber: 0, name: 'Vision & CoPilot Planning' },
          { laneNumber: 1, name: 'PRD / MVP Definition' },
          { laneNumber: 2, name: 'Research' },
          { laneNumber: 3, name: 'Architecture & Stack' },
          { laneNumber: 4, name: 'Planning & Task Breakdown' },
          { laneNumber: 5, name: 'Scaffolding / Setup' },
          { laneNumber: 6, name: 'Build' },
          { laneNumber: 7, name: 'Test & QA' },
          { laneNumber: 8, name: 'Deploy' },
          { laneNumber: 9, name: 'Docs & Training' },
          { laneNumber: 10, name: 'Learn & Optimize' },
        ];
        
        for (const lane of lanes) {
          await tx.lane.create({
            data: {
              ...lane,
              boardId: board.id,
            },
          });
        }
        
        return board;
      });
      
      logger.info('Board created', {
        boardId: result.id,
        projectId,
        userId: authRequest.user?.id,
        name,
      });
      
      return reply.send(result);
      
    } catch (error) {
      logger.error('Failed to create board', { error, projectId });
      
      return reply.status(500).send({
        error: 'CREATE_FAILED',
        message: 'Failed to create board',
      });
    }
  });

  // Get board by ID
  app.get('/:boardId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { boardId } = request.params as { boardId: string };
    
    const db = getDatabase();
    const board = await db.board.findUnique({
      where: { id: boardId },
      include: {
        project: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        lanes: {
          orderBy: {
            laneNumber: 'asc',
          },
          include: {
            cards: {
              orderBy: {
                position: 'asc',
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
                agentRuns: {
                  select: {
                    id: true,
                    status: true,
                    createdAt: true,
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
                  take: 1,
                },
                children: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                  },
                },
                _count: {
                  select: {
                    children: true,
                  },
                },
              },
            },
            _count: {
              select: {
                cards: true,
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
    
    return reply.send(board);
  });

  // Update board
  app.patch('/:boardId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { boardId } = request.params as { boardId: string };
    
    try {
      const updates = updateBoardSchema.parse(request.body);
      
      const db = getDatabase();
      
      // Check board exists and get workspace
      const existingBoard = await db.board.findUnique({
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
      
      if (!existingBoard) {
        return reply.status(404).send({
          error: 'BOARD_NOT_FOUND',
          message: 'Board not found',
        });
      }
      
      if (!await requireWorkspaceAccess(authRequest, reply, existingBoard.project.workspace.id, 'member')) {
        return;
      }
      
      const board = await db.board.update({
        where: { id: boardId },
        data: updates,
      });
      
      logger.info('Board updated', {
        boardId,
        userId: authRequest.user?.id,
        updates,
      });
      
      return reply.send(board);
      
    } catch (error) {
      logger.error('Failed to update board', { error, boardId });
      
      return reply.status(500).send({
        error: 'UPDATE_FAILED',
        message: 'Failed to update board',
      });
    }
  });

  // Delete board
  app.delete('/:boardId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { boardId } = request.params as { boardId: string };
    
    try {
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
      
      if (!await requireWorkspaceAccess(authRequest, reply, board.project.workspace.id, 'member')) {
        return;
      }
      
      // Delete board (cascade will handle related data)
      await db.board.delete({
        where: { id: boardId },
      });
      
      logger.info('Board deleted', {
        boardId,
        userId: authRequest.user?.id,
      });
      
      return reply.send({ message: 'Board deleted successfully' });
      
    } catch (error) {
      logger.error('Failed to delete board', { error, boardId });
      
      return reply.status(500).send({
        error: 'DELETE_FAILED',
        message: 'Failed to delete board',
      });
    }
  });

  // Update lane
  app.patch('/lanes/:laneId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { laneId } = request.params as { laneId: string };
    
    try {
      const updates = updateLaneSchema.parse(request.body);
      
      const db = getDatabase();
      
      // Check lane exists and get workspace
      const existingLane = await db.lane.findUnique({
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
        },
      });
      
      if (!existingLane) {
        return reply.status(404).send({
          error: 'LANE_NOT_FOUND',
          message: 'Lane not found',
        });
      }
      
      if (!await requireWorkspaceAccess(authRequest, reply, existingLane.board.project.workspace.id, 'member')) {
        return;
      }
      
      const lane = await db.lane.update({
        where: { id: laneId },
        data: updates,
      });
      
      logger.info('Lane updated', {
        laneId,
        boardId: existingLane.board.id,
        userId: authRequest.user?.id,
        updates,
      });
      
      return reply.send(lane);
      
    } catch (error) {
      logger.error('Failed to update lane', { error, laneId });
      
      return reply.status(500).send({
        error: 'UPDATE_FAILED',
        message: 'Failed to update lane',
      });
    }
  });
}