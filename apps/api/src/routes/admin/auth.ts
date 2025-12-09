import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { prisma, Prisma } from '@agentworks/db';
import * as argon2 from 'argon2';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

declare module 'fastify' {
  interface FastifyRequest {
    adminUser?: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }
}

export async function adminAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (process.env.NODE_ENV === 'development') {
    const devAdmin = await prisma.adminUser.findFirst();
    if (devAdmin) {
      request.adminUser = {
        id: devAdmin.id,
        email: devAdmin.email,
        name: devAdmin.name,
        role: devAdmin.role,
      };
      return;
    }
  }

  const sessionId = request.cookies['admin_session'];
  if (!sessionId) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const session = await prisma.adminSession.findUnique({
    where: { id: sessionId },
    include: { admin: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return reply.status(401).send({ error: 'Session expired' });
  }

  request.adminUser = {
    id: session.admin.id,
    email: session.admin.email,
    name: session.admin.name,
    role: session.admin.role,
  };
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await adminAuthMiddleware(request, reply);
    if (reply.sent) return;

    if (!request.adminUser || !roles.includes(request.adminUser.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }
  };
}

export async function logAdminAction(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  tenantId: string | null,
  metadata?: Record<string, unknown>,
  ipAddress?: string
) {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      resourceType,
      resourceId,
      tenantId,
      ipAddress: ipAddress || 'unknown',
      details: metadata as Prisma.InputJsonValue,
    },
  });
}

export const adminAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const admin = await prisma.adminUser.findUnique({
      where: { email: body.email },
    });

    if (!admin) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const validPassword = await argon2.verify(admin.password, body.password);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const session = await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    reply.setCookie('admin_session', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    return {
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  });

  app.post('/logout', async (request, reply) => {
    const sessionId = request.cookies['admin_session'];
    if (sessionId) {
      await prisma.adminSession.delete({
        where: { id: sessionId },
      }).catch(() => {});
    }

    reply.clearCookie('admin_session', { path: '/' });
    return { success: true };
  });

  app.get('/me', { preHandler: [adminAuthMiddleware] }, async (request) => {
    return { user: request.adminUser };
  });
};
