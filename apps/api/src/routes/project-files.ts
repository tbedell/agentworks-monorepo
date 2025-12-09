import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { projectFs } from '@agentworks/project-files';
import { lucia } from '../lib/auth.js';

export const projectFilesRoutes: FastifyPluginAsync = async (app) => {
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

  // List files in project
  app.get('/:projectId/files', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { directory, type } = request.query as { directory?: string; type?: string };

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const files = await projectFs.listFiles(projectId, { directory, type: type as any });
    return files;
  });

  // Read file content
  app.get('/:projectId/files/*', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const filePath = (request.params as any)['*'];

    if (!filePath) {
      return reply.status(400).send({ error: 'File path required' });
    }

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    try {
      const content = await projectFs.readFile(projectId, filePath);
      return { path: filePath, content };
    } catch (error) {
      return reply.status(404).send({ error: 'File not found' });
    }
  });

  // Create or update file
  app.put('/:projectId/files/*', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const filePath = (request.params as any)['*'];
    const { content, agentId } = request.body as { content: string; agentId?: string };

    if (!filePath) {
      return reply.status(400).send({ error: 'File path required' });
    }

    if (content === undefined) {
      return reply.status(400).send({ error: 'Content required' });
    }

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    // Check if file exists
    const existingFile = await projectFs.fileExists(projectId, filePath);

    let result;
    if (existingFile) {
      result = await projectFs.updateFile(projectId, filePath, content, { agentId });
    } else {
      result = await projectFs.createFile(projectId, filePath, content, { agentId });
    }

    return result;
  });

  // Delete file
  app.delete('/:projectId/files/*', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const filePath = (request.params as any)['*'];

    if (!filePath) {
      return reply.status(400).send({ error: 'File path required' });
    }

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    await projectFs.deleteFile(projectId, filePath);
    return { success: true };
  });

  // Initialize project directory structure
  app.post('/:projectId/files/init', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    // Get tenant/project slugs for path generation
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { workspace: true },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const tenantSlug = project.workspace.id;
    const projectSlug = project.slug || project.id;

    await projectFs.initializeProject({
      projectId: project.id,
      projectName: project.name,
      tenantSlug,
      projectSlug,
    });

    return { success: true, message: 'Project directory initialized' };
  });

  // Get file info
  app.get('/:projectId/file-info/*', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const filePath = (request.params as any)['*'];

    if (!filePath) {
      return reply.status(400).send({ error: 'File path required' });
    }

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const info = await projectFs.getFileInfo(projectId, filePath);
    if (!info) {
      return reply.status(404).send({ error: 'File not found' });
    }

    return info;
  });
};
