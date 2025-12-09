import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { createWorkspaceSchema } from '@agentworks/shared';
import { lucia } from '../lib/auth.js';

export const workspaceRoutes: FastifyPluginAsync = async (app) => {
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

  app.get('/', async (request) => {
    const user = (request as any).user;

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: {
        workspace: {
          include: {
            _count: { select: { projects: true, members: true } },
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
      projectCount: m.workspace._count.projects,
      memberCount: m.workspace._count.members,
    }));
  });

  app.post('/', async (request) => {
    const user = (request as any).user;
    const body = createWorkspaceSchema.parse(request.body);

    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        description: body.description,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
      },
    });

    return workspace;
  });

  app.get('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: user.id } },
      include: {
        workspace: {
          include: {
            members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
            projects: true,
          },
        },
      },
    });

    if (!membership) {
      return reply.status(404).send({ error: 'Workspace not found' });
    }

    return { ...membership.workspace, role: membership.role };
  });

  app.delete('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const workspace = await prisma.workspace.findUnique({ where: { id } });

    if (!workspace || workspace.ownerId !== user.id) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    await prisma.workspace.delete({ where: { id } });

    return { success: true };
  });

  app.post('/:id/invite', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { email, role = 'member' } = request.body as { email: string; role?: string };

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: user.id } },
    });

    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized to invite' });
    }

    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const newMembership = await prisma.workspaceMember.create({
      data: {
        workspaceId: id,
        userId: invitedUser.id,
        role,
      },
    });

    return newMembership;
  });
};
