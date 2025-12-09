import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { StyleGuideService } from '@agentworks/style-guide';
import { lucia } from '../lib/auth.js';

const styleGuideService = new StyleGuideService();

export const styleGuideRoutes: FastifyPluginAsync = async (app) => {
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

  // Helper to verify project access
  async function verifyProjectAccess(projectId: string, userId: string, requireWrite = false): Promise<
    | { error: string; status: number }
    | { project: NonNullable<Awaited<ReturnType<typeof prisma.project.findUnique>>>; membership: any }
  > {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return { error: 'Project not found', status: 404 };
    }

    const membership = project.workspace.members.find((m) => m.userId === userId);
    if (!membership) {
      return { error: 'Not authorized', status: 403 };
    }

    if (requireWrite && membership.role === 'viewer') {
      return { error: 'Write access required', status: 403 };
    }

    return { project, membership };
  }

  // Get style guide for project
  app.get('/:projectId/style-guide', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const styleGuide = await styleGuideService.getStyleGuide(projectId);
    if (!styleGuide) {
      return { configured: false, message: 'No style guide configured for this project' };
    }

    return {
      configured: true,
      styleGuide,
      formatted: styleGuideService.formatStyleGuideForPrompt(styleGuide),
    };
  });

  // Create or update style guide
  app.put('/:projectId/style-guide', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const config = request.body as any;

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const styleGuide = await styleGuideService.createStyleGuide(projectId, config);
    return styleGuide;
  });

  // Validate code against style guide
  app.post('/:projectId/style-guide/validate', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { code, language } = request.body as { code: string; language: string };

    if (!code) {
      return reply.status(400).send({ error: 'Code is required' });
    }

    if (!language) {
      return reply.status(400).send({ error: 'Language is required' });
    }

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const styleGuide = await styleGuideService.getStyleGuide(projectId);
    if (!styleGuide) {
      return {
        valid: true,
        message: 'No style guide configured, skipping validation',
        errors: [],
        warnings: [],
        suggestions: [],
      };
    }

    const validation = styleGuideService.validateCode(styleGuide, code, language);
    return validation;
  });

  // Generate config files from style guide
  app.post('/:projectId/style-guide/generate-configs', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const styleGuide = await styleGuideService.getStyleGuide(projectId);
    if (!styleGuide) {
      return reply.status(400).send({ error: 'No style guide configured for this project' });
    }

    const configs = styleGuideService.generateConfigs(styleGuide);
    return {
      configs: {
        eslint: configs.eslintrc,
        prettier: configs.prettierrc,
        editorconfig: configs.editorconfig,
      },
    };
  });

  // Get default style guide template
  app.get('/templates/default', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    return {
      naming: {
        variableCase: 'camelCase',
        functionCase: 'camelCase',
        classCase: 'PascalCase',
        constantCase: 'UPPER_SNAKE',
        fileCase: 'kebab-case',
      },
      formatting: {
        indentStyle: 'spaces',
        indentSize: 2,
        maxLineLength: 100,
        semicolons: true,
        singleQuotes: true,
      },
      codeStandards: {
        maxFunctionLength: 50,
        maxFileLength: 500,
        requireDocstrings: true,
        testNamingPattern: '*.test.ts',
      },
      dataFormats: {
        dateFormat: 'ISO8601',
        currencyFormat: 'USD',
        phoneFormat: 'E164',
        zipCodeFormat: 'US',
        numberFormat: '1,234.56',
      },
    };
  });

  // Delete style guide
  app.delete('/:projectId/style-guide', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    await prisma.styleGuide.delete({
      where: { projectId },
    }).catch(() => {
      // Ignore if doesn't exist
    });

    return { success: true };
  });
};
