import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@agentworks/shared';
import { getDatabase } from '../lib/database.js';
import { authenticateRequest, requireWorkspaceAccess, type AuthenticatedRequest } from '../lib/auth.js';

const logger = createLogger('core-service:workspaces');

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['member', 'viewer']),
});

export async function workspaceRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Add authentication hook
  app.addHook('preHandler', authenticateRequest);

  // Get current workspace
  app.get('/:workspaceId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { workspaceId } = request.params as { workspaceId: string };
    
    if (!await requireWorkspaceAccess(authRequest, reply, workspaceId)) {
      return;
    }
    
    const db = getDatabase();
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
        _count: {
          select: {
            projects: true,
            members: true,
            usageEvents: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                },
              },
            },
          },
        },
      },
    });
    
    if (!workspace) {
      return reply.status(404).send({
        error: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }
    
    return reply.send(workspace);
  });

  // Update workspace
  app.patch('/:workspaceId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { workspaceId } = request.params as { workspaceId: string };
    
    if (!await requireWorkspaceAccess(authRequest, reply, workspaceId, 'owner')) {
      return;
    }
    
    try {
      const updates = updateWorkspaceSchema.parse(request.body);
      
      const db = getDatabase();
      const workspace = await db.workspace.update({
        where: { id: workspaceId },
        data: updates,
      });
      
      logger.info('Workspace updated', {
        workspaceId,
        userId: authRequest.user?.id,
        updates,
      });
      
      return reply.send(workspace);
      
    } catch (error) {
      logger.error('Failed to update workspace', { error, workspaceId });
      
      return reply.status(500).send({
        error: 'UPDATE_FAILED',
        message: 'Failed to update workspace',
      });
    }
  });

  // Get workspace members
  app.get('/:workspaceId/members', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { workspaceId } = request.params as { workspaceId: string };
    
    if (!await requireWorkspaceAccess(authRequest, reply, workspaceId)) {
      return;
    }
    
    const db = getDatabase();
    const members = await db.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    // Also include the owner
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
    
    const allMembers = [
      {
        id: `owner-${workspace!.owner.id}`,
        workspaceId,
        userId: workspace!.owner.id,
        role: 'owner',
        createdAt: workspace!.createdAt,
        user: workspace!.owner,
      },
      ...members,
    ];
    
    return reply.send(allMembers);
  });

  // Invite member to workspace
  app.post('/:workspaceId/members', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { workspaceId } = request.params as { workspaceId: string };
    
    if (!await requireWorkspaceAccess(authRequest, reply, workspaceId, 'owner')) {
      return;
    }
    
    try {
      const { email, role } = inviteMemberSchema.parse(request.body);
      
      const db = getDatabase();
      
      // Check if user exists
      const user = await db.user.findUnique({
        where: { email },
      });
      
      if (!user) {
        return reply.status(404).send({
          error: 'USER_NOT_FOUND',
          message: 'User with this email does not exist',
        });
      }
      
      // Check if user is already a member
      const existingMembership = await db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: user.id,
          },
        },
      });
      
      if (existingMembership) {
        return reply.status(400).send({
          error: 'ALREADY_MEMBER',
          message: 'User is already a member of this workspace',
        });
      }
      
      // Check if user is the owner
      const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
      });
      
      if (workspace?.ownerId === user.id) {
        return reply.status(400).send({
          error: 'OWNER_CANNOT_BE_MEMBER',
          message: 'Workspace owner cannot be added as a member',
        });
      }
      
      // Create membership
      const member = await db.workspaceMember.create({
        data: {
          workspaceId,
          userId: user.id,
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });
      
      logger.info('Member invited to workspace', {
        workspaceId,
        invitedUserId: user.id,
        invitedBy: authRequest.user?.id,
        role,
      });
      
      return reply.send(member);
      
    } catch (error) {
      logger.error('Failed to invite member', { error, workspaceId });
      
      return reply.status(500).send({
        error: 'INVITE_FAILED',
        message: 'Failed to invite member',
      });
    }
  });

  // Remove member from workspace
  app.delete('/:workspaceId/members/:userId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { workspaceId, userId } = request.params as { workspaceId: string; userId: string };
    
    if (!await requireWorkspaceAccess(authRequest, reply, workspaceId, 'owner')) {
      return;
    }
    
    try {
      const db = getDatabase();
      
      // Cannot remove workspace owner
      const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
      });
      
      if (workspace?.ownerId === userId) {
        return reply.status(400).send({
          error: 'CANNOT_REMOVE_OWNER',
          message: 'Cannot remove workspace owner',
        });
      }
      
      await db.workspaceMember.delete({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      });
      
      logger.info('Member removed from workspace', {
        workspaceId,
        removedUserId: userId,
        removedBy: authRequest.user?.id,
      });
      
      return reply.send({ message: 'Member removed successfully' });
      
    } catch (error) {
      logger.error('Failed to remove member', { error, workspaceId, userId });
      
      return reply.status(500).send({
        error: 'REMOVE_FAILED',
        message: 'Failed to remove member',
      });
    }
  });

  // Get workspace usage statistics
  app.get('/:workspaceId/usage', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { workspaceId } = request.params as { workspaceId: string };
    
    if (!await requireWorkspaceAccess(authRequest, reply, workspaceId)) {
      return;
    }
    
    const db = getDatabase();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const [
      totalUsage,
      monthlyUsage,
      weeklyUsage,
      usageByProvider,
      usageByProject,
    ] = await Promise.all([
      // Total usage
      db.usageEvent.aggregate({
        where: { workspaceId },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          cost: true,
          price: true,
        },
        _count: true,
      }),
      
      // Monthly usage
      db.usageEvent.aggregate({
        where: {
          workspaceId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          cost: true,
          price: true,
        },
        _count: true,
      }),
      
      // Weekly usage
      db.usageEvent.aggregate({
        where: {
          workspaceId,
          createdAt: { gte: sevenDaysAgo },
        },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          cost: true,
          price: true,
        },
        _count: true,
      }),
      
      // Usage by provider
      db.usageEvent.groupBy({
        by: ['provider'],
        where: {
          workspaceId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          cost: true,
          price: true,
        },
        _count: true,
      }),
      
      // Usage by project
      db.usageEvent.groupBy({
        by: ['projectId'],
        where: {
          workspaceId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          cost: true,
          price: true,
        },
        _count: true,
      }),
    ]);
    
    return reply.send({
      total: totalUsage,
      monthly: monthlyUsage,
      weekly: weeklyUsage,
      byProvider: usageByProvider,
      byProject: usageByProject,
    });
  });
}