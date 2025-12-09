import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import * as argon2 from 'argon2';
import { generateIdFromEntropySize } from 'lucia';
import { lucia } from '../lib/auth.js';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  companyName: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'Email already registered' });
    }

    const hashedPassword = await argon2.hash(body.password);
    const userId = generateIdFromEntropySize(10);

    const companyName = body.companyName || `${body.name}'s Workspace`;
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const trialPlan = await prisma.plan.findFirst({
      where: { name: 'Starter' },
    });

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug: `${slug}-${Date.now().toString(36)}`,
          status: 'trial',
          planId: trialPlan?.id,
          tokenLimit: trialPlan?.tokenLimit || 500000,
          tokenBalance: trialPlan?.tokenLimit || 500000,
        },
      });

      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          defaultAgentProvider: 'openai',
          defaultAgentModel: 'gpt-4-turbo',
          onboardingCompleted: false,
          onboardingStep: 0,
          tourCompleted: false,
          tourStep: 0,
        },
      });

      const user = await tx.user.create({
        data: {
          id: userId,
          email: body.email,
          name: body.name,
          password: hashedPassword,
          tenantId: tenant.id,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: companyName,
          ownerId: user.id,
          tenantId: tenant.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'owner',
        },
      });

      if (trialPlan) {
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: trialPlan.id,
            status: 'trialing',
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
          },
        });
      }

      return { user, tenant, workspace };
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    reply.setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    return {
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
      tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
      workspace: { id: result.workspace.id, name: result.workspace.name },
      tourRequired: true,
    };
  });

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: {
        tenant: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!user || !user.password) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const validPassword = await argon2.verify(user.password, body.password);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    reply.setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    const settings = user.tenant?.settings;
    return {
      user: { id: user.id, email: user.email, name: user.name },
      tourRequired: settings ? !settings.tourCompleted : false,
      tourStep: settings?.tourStep || 0,
    };
  });

  app.post('/logout', async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (sessionId) {
      await lucia.invalidateSession(sessionId);
    }

    const blankCookie = lucia.createBlankSessionCookie();
    reply.setCookie(blankCookie.name, blankCookie.value, blankCookie.attributes);

    return { success: true };
  });

  app.get('/me', async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        tenant: {
          include: { settings: true },
        },
        preferences: true,
        sessions: {
          where: {
            expiresAt: { gt: new Date() },
          },
        },
      },
    });

    const tenant = dbUser?.tenant ? {
      id: dbUser.tenant.id,
      name: dbUser.tenant.name,
      slug: dbUser.tenant.slug,
    } : null;

    const settings = dbUser?.tenant?.settings;

    return {
      user: {
        id: dbUser?.id || user.id,
        email: dbUser?.email || '',
        name: dbUser?.name || '',
        avatarUrl: dbUser?.avatarUrl || null,
        createdAt: dbUser?.createdAt?.toISOString() || null,
        lastLoginAt: dbUser?.lastLoginAt?.toISOString() || null,
      },
      tenant,
      preferences: dbUser?.preferences || {
        emailNotifications: true,
        desktopNotifications: true,
        agentStatusUpdates: true,
      },
      activeSessions: dbUser?.sessions?.length || 0,
      tourRequired: settings ? !settings.tourCompleted && !settings.tourDismissed : false,
      tourStep: settings?.tourStep || 0,
    };
  });

  app.post('/complete-onboarding', async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    await prisma.tenantSettings.update({
      where: { tenantId: dbUser.tenantId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 3,
      },
    });

    return { success: true };
  });

  app.post('/tour-progress', async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const { step } = request.body as { step: number };

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    await prisma.tenantSettings.update({
      where: { tenantId: dbUser.tenantId },
      data: {
        tourStep: step,
      },
    });

    return { success: true, step };
  });

  app.post('/complete-tour', async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    await prisma.tenantSettings.update({
      where: { tenantId: dbUser.tenantId },
      data: {
        tourCompleted: true,
        tourStep: 10,
      },
    });

    return { success: true };
  });

  app.post('/restart-tour', async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    await prisma.tenantSettings.update({
      where: { tenantId: dbUser.tenantId },
      data: {
        tourCompleted: false,
        tourStep: 0,
        tourDismissed: false,
        tourDismissedAt: null,
      },
    });

    return { success: true };
  });

  app.post('/tour-dismiss', async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    await prisma.tenantSettings.update({
      where: { tenantId: dbUser.tenantId },
      data: {
        tourDismissed: true,
        tourDismissedAt: new Date(),
      },
    });

    return { success: true };
  });

  app.get('/tour-status', async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        tenant: {
          include: { settings: true },
        },
      },
    });

    if (!dbUser?.tenantId || !dbUser.tenant?.settings) {
      return reply.status(400).send({ error: 'User has no tenant settings' });
    }

    const settings = dbUser.tenant.settings;

    return {
      tourCompleted: settings.tourCompleted,
      tourStep: settings.tourStep,
      tourDismissed: settings.tourDismissed,
      tourDismissedAt: settings.tourDismissedAt?.toISOString() || null,
      shouldShowTour: !settings.tourCompleted && !settings.tourDismissed,
    };
  });
};
