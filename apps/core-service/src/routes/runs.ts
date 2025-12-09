import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@agentworks/shared';
import { getDatabase } from '../lib/database.js';
import { authenticateRequest, requireWorkspaceAccess, type AuthenticatedRequest } from '../lib/auth.js';

const logger = createLogger('core-service:runs');

const createRunSchema = z.object({
  cardId: z.string().uuid(),
  agentId: z.string(),
  provider: z.string(),
  model: z.string(),
  userId: z.string(),
});

const updateRunSchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  cost: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export async function runRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Add authentication hook
  app.addHook('preHandler', authenticateRequest);

  // Create a new agent run
  app.post('/', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;

    try {
      const body = createRunSchema.parse(request.body);
      const db = getDatabase();

      // Verify card exists and get workspace for access check
      const card = await db.card.findUnique({
        where: { id: body.cardId },
        include: {
          lane: {
            include: {
              board: {
                include: {
                  project: {
                    include: {
                      workspace: true,
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

      const workspaceId = card.lane.board.project.workspace.id;

      // System-service can bypass workspace access check
      if (authRequest.user?.id !== 'system-service') {
        if (!await requireWorkspaceAccess(authRequest, reply, workspaceId)) {
          return;
        }
      }

      // Find the agent by name (agents are global, not project-specific)
      const agent = await db.agent.findUnique({
        where: {
          name: body.agentId,
        },
      });

      if (!agent) {
        return reply.status(404).send({
          error: 'AGENT_NOT_FOUND',
          message: `Agent '${body.agentId}' not found`,
        });
      }

      // Create the agent run
      const run = await db.agentRun.create({
        data: {
          cardId: body.cardId,
          agentId: agent.id,
          provider: body.provider,
          model: body.model,
          status: 'pending',
          startedAt: new Date(),
        },
        include: {
          card: {
            select: {
              id: true,
              title: true,
            },
          },
          agent: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      });

      logger.info('Agent run created', {
        runId: run.id,
        cardId: body.cardId,
        agentId: body.agentId,
      });

      return reply.status(201).send(run);

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: error.errors,
        });
      }

      logger.error('Failed to create agent run', { error });
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to create agent run',
      });
    }
  });

  // Update an agent run
  app.patch('/:runId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { runId } = request.params as { runId: string };

    try {
      const body = updateRunSchema.parse(request.body);
      const db = getDatabase();

      // Get the run with workspace info
      const existingRun = await db.agentRun.findUnique({
        where: { id: runId },
        include: {
          card: {
            include: {
              lane: {
                include: {
                  board: {
                    include: {
                      project: {
                        include: {
                          workspace: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!existingRun) {
        return reply.status(404).send({
          error: 'RUN_NOT_FOUND',
          message: 'Agent run not found',
        });
      }

      const workspaceId = existingRun.card.lane.board.project.workspace.id;

      // System-service can bypass workspace access check
      if (authRequest.user?.id !== 'system-service') {
        if (!await requireWorkspaceAccess(authRequest, reply, workspaceId)) {
          return;
        }
      }

      // Update the run
      const updateData: any = {};
      if (body.status !== undefined) updateData.status = body.status;
      if (body.inputTokens !== undefined) updateData.inputTokens = body.inputTokens;
      if (body.outputTokens !== undefined) updateData.outputTokens = body.outputTokens;
      if (body.cost !== undefined) updateData.cost = body.cost;
      if (body.price !== undefined) updateData.price = body.price;
      if (body.startedAt !== undefined) updateData.startedAt = new Date(body.startedAt);
      if (body.completedAt !== undefined) updateData.completedAt = new Date(body.completedAt);

      const run = await db.agentRun.update({
        where: { id: runId },
        data: updateData,
        include: {
          card: {
            select: {
              id: true,
              title: true,
            },
          },
          agent: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      });

      logger.info('Agent run updated', {
        runId: run.id,
        status: run.status,
      });

      return reply.send(run);

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: error.errors,
        });
      }

      logger.error('Failed to update agent run', { error });
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update agent run',
      });
    }
  });

  // Get an agent run by ID
  app.get('/:runId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { runId } = request.params as { runId: string };

    const db = getDatabase();

    const run = await db.agentRun.findUnique({
      where: { id: runId },
      include: {
        card: {
          include: {
            lane: {
              include: {
                board: {
                  include: {
                    project: {
                      include: {
                        workspace: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        logs: {
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
    });

    if (!run) {
      return reply.status(404).send({
        error: 'RUN_NOT_FOUND',
        message: 'Agent run not found',
      });
    }

    const workspaceId = run.card.lane.board.project.workspace.id;

    // System-service can bypass workspace access check
    if (authRequest.user?.id !== 'system-service') {
      if (!await requireWorkspaceAccess(authRequest, reply, workspaceId)) {
        return;
      }
    }

    return reply.send(run);
  });

  // Get runs for a card
  app.get('/card/:cardId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { cardId } = request.params as { cardId: string };

    const db = getDatabase();

    // Check card exists and get workspace
    const card = await db.card.findUnique({
      where: { id: cardId },
      include: {
        lane: {
          include: {
            board: {
              include: {
                project: {
                  include: {
                    workspace: true,
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

    const workspaceId = card.lane.board.project.workspace.id;

    // System-service can bypass workspace access check
    if (authRequest.user?.id !== 'system-service') {
      if (!await requireWorkspaceAccess(authRequest, reply, workspaceId)) {
        return;
      }
    }

    const runs = await db.agentRun.findMany({
      where: { cardId },
      include: {
        agent: {
          select: {
            id: true,
            agentId: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reply.send(runs);
  });
}
