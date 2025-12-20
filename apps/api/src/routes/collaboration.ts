import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { lucia } from '../lib/auth.js';

export const collaborationRoutes: FastifyPluginAsync = async (app) => {
  // Auth middleware for all collaboration routes
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

  // Get all active sessions for a workspace
  app.get('/sessions', async (request, reply) => {
    const { workspaceId } = request.query as { workspaceId?: string };
    const user = (request as any).user;

    if (!workspaceId) {
      return reply.status(400).send({ error: 'workspaceId is required' });
    }

    // Verify user has access to this workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });

    if (!membership) {
      return reply.status(403).send({ error: 'Not a member of this workspace' });
    }

    const sessions = await prisma.collaborationSession.findMany({
      where: {
        workspaceId,
        status: 'active',
      },
      include: {
        hostUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participants: {
          where: { leftAt: null },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions;
  });

  // Create a new collaboration session
  app.post('/sessions', async (request, reply) => {
    const { name, workspaceId } = request.body as { name: string; workspaceId: string };
    const user = (request as any).user;

    if (!name || !workspaceId) {
      return reply.status(400).send({ error: 'name and workspaceId are required' });
    }

    // Verify user has access to this workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });

    if (!membership) {
      return reply.status(403).send({ error: 'Not a member of this workspace' });
    }

    // Get Neko configuration from environment
    const hostIp = process.env.HOST_IP || '192.168.12.46';
    const nekoPassword = process.env.NEKO_PASSWORD || 'neko-session-password';

    const session = await prisma.collaborationSession.create({
      data: {
        name,
        workspaceId,
        hostUserId: user.id,
        nekoUrl: `http://${hostIp}:8090`, // HTTP URL for Neko v3 (auth happens via /api/login)
        nekoPassword,
        participants: {
          create: {
            userId: user.id,
            role: 'host',
            hasControl: true,
          },
        },
      },
      include: {
        hostUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participants: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    return session;
  });

  // Get a specific session
  app.get('/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const session = await prisma.collaborationSession.findUnique({
      where: { id },
      include: {
        hostUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participants: {
          where: { leftAt: null },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        workspace: { select: { id: true, name: true } },
      },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    // Verify user has access to the workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: session.workspaceId, userId: user.id } },
    });

    if (!membership) {
      return reply.status(403).send({ error: 'Not a member of this workspace' });
    }

    return session;
  });

  // Join a session
  app.post('/sessions/:id/join', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const session = await prisma.collaborationSession.findUnique({
      where: { id },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return reply.status(400).send({ error: 'Session has ended' });
    }

    // Verify user has access to the workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: session.workspaceId, userId: user.id } },
    });

    if (!membership) {
      return reply.status(403).send({ error: 'Not a member of this workspace' });
    }

    // Upsert participant (in case they left and are rejoining)
    const participant = await prisma.collaborationParticipant.upsert({
      where: { sessionId_userId: { sessionId: id, userId: user.id } },
      update: { leftAt: null },
      create: {
        sessionId: id,
        userId: user.id,
        role: 'viewer',
        hasControl: false,
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return participant;
  });

  // Leave a session
  app.post('/sessions/:id/leave', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const participant = await prisma.collaborationParticipant.findUnique({
      where: { sessionId_userId: { sessionId: id, userId: user.id } },
    });

    if (!participant) {
      return reply.status(404).send({ error: 'Not a participant of this session' });
    }

    await prisma.collaborationParticipant.update({
      where: { id: participant.id },
      data: { leftAt: new Date() },
    });

    return { success: true };
  });

  // End a session (host only)
  app.delete('/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const session = await prisma.collaborationSession.findUnique({
      where: { id },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    if (session.hostUserId !== user.id) {
      return reply.status(403).send({ error: 'Only the host can end this session' });
    }

    await prisma.collaborationSession.update({
      where: { id },
      data: {
        status: 'ended',
        endedAt: new Date(),
      },
    });

    return { success: true };
  });

  // Transfer control to another participant
  app.post('/sessions/:id/control', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { targetUserId, grant } = request.body as { targetUserId: string; grant: boolean };
    const user = (request as any).user;

    const session = await prisma.collaborationSession.findUnique({
      where: { id },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    // Only host can grant/revoke control
    if (session.hostUserId !== user.id) {
      return reply.status(403).send({ error: 'Only the host can manage control' });
    }

    const targetParticipant = await prisma.collaborationParticipant.findUnique({
      where: { sessionId_userId: { sessionId: id, userId: targetUserId } },
    });

    if (!targetParticipant || targetParticipant.leftAt) {
      return reply.status(404).send({ error: 'Participant not found or has left' });
    }

    await prisma.collaborationParticipant.update({
      where: { id: targetParticipant.id },
      data: {
        hasControl: grant,
        role: grant ? 'controller' : 'viewer',
      },
    });

    return { success: true };
  });

  // Get Neko connection info (for UI Builder preview mode)
  app.get('/neko-config', async (request) => {
    const user = (request as any).user;

    // Return the Neko connection configuration
    const hostIp = process.env.HOST_IP || '192.168.12.46';
    const nekoPassword = process.env.NEKO_PASSWORD || 'neko-session-password';

    return {
      nekoUrl: `http://${hostIp}:8090`, // HTTP URL for Neko v3 (auth via /api/login)
      password: nekoPassword,
      userId: user.id,
    };
  });
};
