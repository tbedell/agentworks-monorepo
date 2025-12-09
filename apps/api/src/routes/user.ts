import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import * as argon2 from 'argon2';
import { lucia } from '../lib/auth.js';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  desktopNotifications: z.boolean().optional(),
  agentStatusUpdates: z.boolean().optional(),
  projectsBasePath: z.string().optional(),
});

export const userRoutes: FastifyPluginAsync = async (app) => {
  // Auth middleware for all user routes
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

  // GET /api/user/profile - Get current user profile with preferences
  app.get('/profile', async (request) => {
    const user = (request as any).user;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        preferences: true,
        sessions: {
          where: {
            expiresAt: { gt: new Date() },
          },
        },
      },
    });

    if (!dbUser) {
      return { error: 'User not found' };
    }

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        avatarUrl: dbUser.avatarUrl,
        createdAt: dbUser.createdAt.toISOString(),
        lastLoginAt: dbUser.lastLoginAt?.toISOString() || null,
      },
      preferences: dbUser.preferences || {
        emailNotifications: true,
        desktopNotifications: true,
        agentStatusUpdates: true,
      },
      activeSessions: dbUser.sessions.length,
    };
  });

  // PATCH /api/user/profile - Update name, email, avatarUrl
  app.patch('/profile', async (request, reply) => {
    const user = (request as any).user;
    const body = updateProfileSchema.parse(request.body);

    // Check if email is being changed and if it's already in use
    if (body.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (existingUser && existingUser.id !== user.id) {
        return reply.status(400).send({ error: 'Email already in use' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.email && { email: body.email }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
      },
    });

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatarUrl: updatedUser.avatarUrl,
      },
    };
  });

  // PUT /api/user/password - Change password
  app.put('/password', async (request, reply) => {
    const user = (request as any).user;
    const body = changePasswordSchema.parse(request.body);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser || !dbUser.password) {
      return reply.status(400).send({ error: 'Cannot change password for this account' });
    }

    // Verify current password
    const validPassword = await argon2.verify(dbUser.password, body.currentPassword);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Current password is incorrect' });
    }

    // Hash and update new password
    const hashedPassword = await argon2.hash(body.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { success: true, message: 'Password updated successfully' };
  });

  // GET /api/user/preferences - Get notification preferences
  app.get('/preferences', async (request) => {
    const user = (request as any).user;

    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId: user.id,
          emailNotifications: true,
          desktopNotifications: true,
          agentStatusUpdates: true,
        },
      });
    }

    return {
      preferences: {
        emailNotifications: preferences.emailNotifications,
        desktopNotifications: preferences.desktopNotifications,
        agentStatusUpdates: preferences.agentStatusUpdates,
        projectsBasePath: preferences.projectsBasePath,
      },
    };
  });

  // PATCH /api/user/preferences - Update notification preferences
  app.patch('/preferences', async (request) => {
    const user = (request as any).user;
    const body = updatePreferencesSchema.parse(request.body);

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        emailNotifications: body.emailNotifications ?? true,
        desktopNotifications: body.desktopNotifications ?? true,
        agentStatusUpdates: body.agentStatusUpdates ?? true,
        projectsBasePath: body.projectsBasePath,
      },
      update: {
        ...(body.emailNotifications !== undefined && { emailNotifications: body.emailNotifications }),
        ...(body.desktopNotifications !== undefined && { desktopNotifications: body.desktopNotifications }),
        ...(body.agentStatusUpdates !== undefined && { agentStatusUpdates: body.agentStatusUpdates }),
        ...(body.projectsBasePath !== undefined && { projectsBasePath: body.projectsBasePath }),
      },
    });

    return {
      preferences: {
        emailNotifications: preferences.emailNotifications,
        desktopNotifications: preferences.desktopNotifications,
        agentStatusUpdates: preferences.agentStatusUpdates,
        projectsBasePath: preferences.projectsBasePath,
      },
    };
  });

  // GET /api/user/sessions - Get active sessions count
  app.get('/sessions', async (request) => {
    const user = (request as any).user;

    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      activeSessions: sessions.length,
      sessions: sessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
      })),
    };
  });

  // POST /api/user/photo - Upload profile photo
  app.post('/photo', async (request, reply) => {
    const user = (request as any).user;

    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' });
      }

      // Read file buffer
      const buffer = await data.toBuffer();

      // Convert to base64 data URL
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${data.mimetype};base64,${base64}`;

      // Update user's avatarUrl
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: dataUrl },
      });

      return {
        success: true,
        avatarUrl: updatedUser.avatarUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      return reply.status(500).send({ error: message });
    }
  });

  // DELETE /api/user/photo - Remove profile photo
  app.delete('/photo', async (request) => {
    const user = (request as any).user;

    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });

    return { success: true };
  });
};
