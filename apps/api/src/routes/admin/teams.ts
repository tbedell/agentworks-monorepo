import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { adminAuthMiddleware } from './auth.js';
import crypto from 'crypto';

// Zod Schemas
const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['meeting', 'standup', 'workshop']).default('meeting'),
  scheduledAt: z.string().datetime().optional().nullable(),
  maxParticipants: z.number().int().min(2).max(50).default(50),
  recordingEnabled: z.boolean().default(false),
  chatEnabled: z.boolean().default(true),
  whiteboardEnabled: z.boolean().default(false),
  screenShareEnabled: z.boolean().default(true),
});

const updateRoomSchema = createRoomSchema.partial();

const createWhiteboardSchema = z.object({
  name: z.string().min(1).max(100),
  roomId: z.string().uuid().optional().nullable(),
  isShared: z.boolean().default(false),
});

const updateWhiteboardSchema = z.object({
  name: z.string().optional(),
  canvasData: z.record(z.unknown()).optional(),
  isShared: z.boolean().optional(),
});

export const adminTeamsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  // ============================================
  // Rooms
  // ============================================

  // GET /rooms - List rooms
  app.get('/rooms', async (request) => {
    const query = request.query as {
      status?: string;
      type?: string;
      page?: string;
      limit?: string;
    };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    const [rooms, total] = await Promise.all([
      prisma.bosTeamRoom.findMany({
        where,
        include: {
          _count: { select: { participants: true, whiteboards: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bosTeamRoom.count({ where }),
    ]);

    return { rooms, total, page, limit };
  });

  // POST /rooms - Create room
  app.post('/rooms', async (request) => {
    const admin = (request as any).admin;
    const body = createRoomSchema.parse(request.body);

    const room = await prisma.bosTeamRoom.create({
      data: {
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        createdBy: admin.id,
        participants: {
          create: {
            participantId: admin.id,
            displayName: admin.name,
            role: 'host',
            status: 'invited',
          },
        },
      },
      include: {
        participants: true,
      },
    });

    return { room };
  });

  // GET /rooms/:id - Get room
  app.get('/rooms/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const room = await prisma.bosTeamRoom.findUnique({
      where: { id },
      include: {
        participants: true,
        whiteboards: true,
      },
    });

    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    return { room };
  });

  // PUT /rooms/:id - Update room
  app.put('/rooms/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateRoomSchema.parse(request.body);

    const existing = await prisma.bosTeamRoom.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    const room = await prisma.bosTeamRoom.update({
      where: { id },
      data: {
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      },
    });

    return { room };
  });

  // DELETE /rooms/:id - Delete room
  app.delete('/rooms/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.bosTeamRoom.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    await prisma.bosTeamRoom.delete({ where: { id } });
    return { success: true };
  });

  // ============================================
  // Room Actions
  // ============================================

  // POST /rooms/:id/start - Start room
  app.post('/rooms/:id/start', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const room = await prisma.bosTeamRoom.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    // Check if user is host
    const participant = room.participants.find((p) => p.participantId === admin.id);
    if (!participant || participant.role !== 'host') {
      return reply.status(403).send({ error: 'Only host can start the room' });
    }

    const updated = await prisma.bosTeamRoom.update({
      where: { id },
      data: {
        status: 'active',
        startedAt: new Date(),
      },
    });

    return { room: updated };
  });

  // POST /rooms/:id/end - End room
  app.post('/rooms/:id/end', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const room = await prisma.bosTeamRoom.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    const participant = room.participants.find((p) => p.participantId === admin.id);
    if (!participant || participant.role !== 'host') {
      return reply.status(403).send({ error: 'Only host can end the room' });
    }

    const updated = await prisma.bosTeamRoom.update({
      where: { id },
      data: {
        status: 'ended',
        endedAt: new Date(),
      },
    });

    // Mark all participants as left
    await prisma.bosRoomParticipant.updateMany({
      where: { roomId: id, status: 'joined' },
      data: { status: 'left', leftAt: new Date() },
    });

    return { room: updated };
  });

  // POST /rooms/:id/join - Join room
  app.post('/rooms/:id/join', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const room = await prisma.bosTeamRoom.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    if (room.status === 'ended') {
      return reply.status(400).send({ error: 'Room has ended' });
    }

    // Check participant limit
    const activeParticipants = room.participants.filter((p) => p.status === 'joined').length;
    if (activeParticipants >= room.maxParticipants) {
      return reply.status(400).send({ error: 'Room is full' });
    }

    // Update or create participant
    let participant = room.participants.find((p) => p.participantId === admin.id);
    if (participant) {
      participant = await prisma.bosRoomParticipant.update({
        where: { id: participant.id },
        data: {
          status: 'joined',
          joinedAt: new Date(),
          leftAt: null,
        },
      });
    } else {
      participant = await prisma.bosRoomParticipant.create({
        data: {
          roomId: id,
          participantId: admin.id,
          displayName: admin.name,
          role: 'participant',
          status: 'joined',
          joinedAt: new Date(),
        },
      });
    }

    // Generate a simple token for WebRTC signaling
    const token = crypto.randomBytes(32).toString('hex');

    return { participant, token };
  });

  // POST /rooms/:id/leave - Leave room
  app.post('/rooms/:id/leave', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const participant = await prisma.bosRoomParticipant.findFirst({
      where: { roomId: id, participantId: admin.id },
    });

    if (!participant) {
      return reply.status(404).send({ error: 'Not in room' });
    }

    await prisma.bosRoomParticipant.update({
      where: { id: participant.id },
      data: {
        status: 'left',
        leftAt: new Date(),
      },
    });

    return { success: true };
  });

  // PUT /rooms/:id/media - Update media state
  app.put('/rooms/:id/media', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;
    const body = z.object({
      audioEnabled: z.boolean().optional(),
      videoEnabled: z.boolean().optional(),
    }).parse(request.body);

    const participant = await prisma.bosRoomParticipant.findFirst({
      where: { roomId: id, participantId: admin.id },
    });

    if (!participant) {
      return reply.status(404).send({ error: 'Not in room' });
    }

    const updated = await prisma.bosRoomParticipant.update({
      where: { id: participant.id },
      data: body,
    });

    return { participant: updated };
  });

  // ============================================
  // Invitations
  // ============================================

  // POST /rooms/:id/invite - Invite participants
  app.post('/rooms/:id/invite', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      participantIds: z.array(z.string().uuid()),
    }).parse(request.body);

    const room = await prisma.bosTeamRoom.findUnique({ where: { id } });
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    // Get user names for display
    const users = await prisma.adminUser.findMany({
      where: { id: { in: body.participantIds } },
      select: { id: true, name: true },
    });

    const existing = await prisma.bosRoomParticipant.findMany({
      where: { roomId: id, participantId: { in: body.participantIds } },
      select: { participantId: true },
    });
    const existingIds = new Set(existing.map((e) => e.participantId));

    const toCreate = users.filter((u) => !existingIds.has(u.id));

    if (toCreate.length > 0) {
      await prisma.bosRoomParticipant.createMany({
        data: toCreate.map((u) => ({
          roomId: id,
          participantId: u.id,
          displayName: u.name,
          role: 'participant',
          status: 'invited',
        })),
      });
    }

    return { invited: toCreate.length };
  });

  // ============================================
  // Whiteboards
  // ============================================

  // GET /whiteboards - List whiteboards
  app.get('/whiteboards', async (request) => {
    const admin = (request as any).admin;
    const query = request.query as {
      roomId?: string;
      shared?: string;
    };

    const where: Record<string, unknown> = {};
    if (query.roomId) where.roomId = query.roomId;
    if (query.shared === 'true') {
      where.OR = [{ ownerId: admin.id }, { isShared: true }];
    } else {
      where.ownerId = admin.id;
    }

    const whiteboards = await prisma.bosWhiteboard.findMany({
      where,
      include: { room: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return { whiteboards };
  });

  // POST /whiteboards - Create whiteboard
  app.post('/whiteboards', async (request) => {
    const admin = (request as any).admin;
    const body = createWhiteboardSchema.parse(request.body);

    const whiteboard = await prisma.bosWhiteboard.create({
      data: {
        ...body,
        ownerId: admin.id,
      },
    });

    return { whiteboard };
  });

  // GET /whiteboards/:id - Get whiteboard
  app.get('/whiteboards/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const whiteboard = await prisma.bosWhiteboard.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!whiteboard) {
      return reply.status(404).send({ error: 'Whiteboard not found' });
    }

    // Check access
    if (whiteboard.ownerId !== admin.id && !whiteboard.isShared) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    return { whiteboard };
  });

  // PUT /whiteboards/:id - Update whiteboard
  app.put('/whiteboards/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateWhiteboardSchema.parse(request.body);
    const admin = (request as any).admin;

    const existing = await prisma.bosWhiteboard.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Whiteboard not found' });
    }

    if (existing.ownerId !== admin.id) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const whiteboard = await prisma.bosWhiteboard.update({
      where: { id },
      data: body,
    });

    return { whiteboard };
  });

  // DELETE /whiteboards/:id - Delete whiteboard
  app.delete('/whiteboards/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const existing = await prisma.bosWhiteboard.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Whiteboard not found' });
    }

    if (existing.ownerId !== admin.id) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    await prisma.bosWhiteboard.delete({ where: { id } });
    return { success: true };
  });

  // ============================================
  // Quick Actions
  // ============================================

  // POST /rooms/instant - Create instant room
  app.post('/rooms/instant', async (request) => {
    const admin = (request as any).admin;

    const room = await prisma.bosTeamRoom.create({
      data: {
        name: `Quick Meeting - ${new Date().toLocaleString()}`,
        type: 'meeting',
        status: 'active',
        startedAt: new Date(),
        createdBy: admin.id,
        participants: {
          create: {
            participantId: admin.id,
            displayName: admin.name,
            role: 'host',
            status: 'joined',
            joinedAt: new Date(),
          },
        },
      },
      include: { participants: true },
    });

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');

    return { room, token };
  });

  // ============================================
  // Stats
  // ============================================

  // GET /stats - Teams stats
  app.get('/stats', async () => {
    const [activeRooms, totalRooms, totalWhiteboards, recentRooms] = await Promise.all([
      prisma.bosTeamRoom.count({ where: { status: 'active' } }),
      prisma.bosTeamRoom.count(),
      prisma.bosWhiteboard.count(),
      prisma.bosTeamRoom.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { participants: true } } },
      }),
    ]);

    return {
      activeRooms,
      totalRooms,
      totalWhiteboards,
      recentRooms,
    };
  });
};
