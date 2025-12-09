import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@agentworks/shared';
import { prisma } from '@agentworks/db';
import { containerOrchestrator } from '../lib/container-orchestrator.js';
import { mcpServerManager } from '../lib/mcp-server-manager.js';

const logger = createLogger('environments-routes');

// Request schemas
const CreateEnvironmentSchema = z.object({
  projectId: z.string().uuid(),
  tenantId: z.string().uuid(),
  resourceTier: z.enum(['basic', 'standard', 'performance']).default('standard'),
  containerImage: z.string().optional(),
});

const EnvironmentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function environmentRoutes(app: FastifyInstance): Promise<void> {
  // Create a new dev environment
  app.post(
    '/environments',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof CreateEnvironmentSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const body = CreateEnvironmentSchema.parse(request.body);

        // Verify project exists
        const project = await prisma.project.findUnique({
          where: { id: body.projectId },
        });

        if (!project) {
          return reply.status(404).send({ error: 'Project not found' });
        }

        // Create the environment
        const containerInfo = await containerOrchestrator.createEnvironment({
          projectId: body.projectId,
          tenantId: body.tenantId,
          image: body.containerImage || 'gcr.io/agentworks/devenv:latest',
          cpuLimit: '2',
          memoryLimit: '4Gi',
          storageLimit: '10Gi',
          resourceTier: body.resourceTier,
          workspaceDir: '/workspace',
        });

        // Get the created environment
        const devEnv = await prisma.devEnvironment.findFirst({
          where: { projectId: body.projectId },
          orderBy: { createdAt: 'desc' },
        });

        if (devEnv) {
          // Provision MCP servers
          await mcpServerManager.provisionDefaultServers(devEnv.id);
        }

        logger.info('Dev environment created', {
          projectId: body.projectId,
          containerId: containerInfo.containerId,
        });

        return reply.status(201).send({
          ...containerInfo,
          devEnvironment: devEnv,
        });
      } catch (error) {
        logger.error('Failed to create environment', { error });
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation error', details: error.errors });
        }
        return reply.status(500).send({ error: 'Failed to create environment' });
      }
    }
  );

  // List environments for a tenant
  app.get(
    '/environments',
    async (
      request: FastifyRequest<{ Querystring: { tenantId?: string; projectId?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { tenantId, projectId } = request.query;

        const where: { tenantId?: string; projectId?: string } = {};
        if (tenantId) where.tenantId = tenantId;
        if (projectId) where.projectId = projectId;

        const environments = await prisma.devEnvironment.findMany({
          where,
          include: {
            project: { select: { name: true, slug: true } },
            mcpServers: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        return reply.send(environments);
      } catch (error) {
        logger.error('Failed to list environments', { error });
        return reply.status(500).send({ error: 'Failed to list environments' });
      }
    }
  );

  // Get environment details
  app.get(
    '/environments/:id',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof EnvironmentIdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = EnvironmentIdParamsSchema.parse(request.params);

        const environment = await prisma.devEnvironment.findUnique({
          where: { id },
          include: {
            project: { select: { name: true, slug: true } },
            mcpServers: true,
            terminalSessions: {
              where: { status: 'active' },
            },
          },
        });

        if (!environment) {
          return reply.status(404).send({ error: 'Environment not found' });
        }

        // Get actual container status
        const status = await containerOrchestrator.getEnvironmentStatus(id);

        return reply.send({
          ...environment,
          actualStatus: status,
        });
      } catch (error) {
        logger.error('Failed to get environment', { error });
        return reply.status(500).send({ error: 'Failed to get environment' });
      }
    }
  );

  // Suspend environment
  app.post(
    '/environments/:id/suspend',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof EnvironmentIdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = EnvironmentIdParamsSchema.parse(request.params);

        // Stop MCP servers first
        await mcpServerManager.stopAllServers(id);

        // Suspend container
        await containerOrchestrator.suspendEnvironment(id);

        const environment = await prisma.devEnvironment.findUnique({
          where: { id },
        });

        logger.info('Environment suspended', { id });
        return reply.send(environment);
      } catch (error) {
        logger.error('Failed to suspend environment', { error });
        return reply.status(500).send({ error: 'Failed to suspend environment' });
      }
    }
  );

  // Resume environment
  app.post(
    '/environments/:id/resume',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof EnvironmentIdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = EnvironmentIdParamsSchema.parse(request.params);

        // Resume container
        const containerInfo = await containerOrchestrator.resumeEnvironment(id);

        // Restart MCP servers
        const servers = await mcpServerManager.listServers(id);
        for (const server of servers) {
          await mcpServerManager.startServer(server.id);
        }

        const environment = await prisma.devEnvironment.findUnique({
          where: { id },
          include: { mcpServers: true },
        });

        logger.info('Environment resumed', { id });
        return reply.send({ ...containerInfo, environment });
      } catch (error) {
        logger.error('Failed to resume environment', { error });
        return reply.status(500).send({ error: 'Failed to resume environment' });
      }
    }
  );

  // Terminate environment
  app.delete(
    '/environments/:id',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof EnvironmentIdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = EnvironmentIdParamsSchema.parse(request.params);

        // Terminate all terminal sessions
        await prisma.terminalSession.updateMany({
          where: { devEnvId: id },
          data: { status: 'terminated' },
        });

        // Stop MCP servers
        await mcpServerManager.stopAllServers(id);

        // Delete MCP servers from DB
        await prisma.mcpServer.deleteMany({
          where: { devEnvId: id },
        });

        // Terminate container
        await containerOrchestrator.terminateEnvironment(id);

        logger.info('Environment terminated', { id });
        return reply.status(204).send();
      } catch (error) {
        logger.error('Failed to terminate environment', { error });
        return reply.status(500).send({ error: 'Failed to terminate environment' });
      }
    }
  );

  // Get MCP configuration for an environment
  app.get(
    '/environments/:id/mcp-config',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof EnvironmentIdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = EnvironmentIdParamsSchema.parse(request.params);

        const config = await mcpServerManager.getMcpConfig(id);
        return reply.send(config);
      } catch (error) {
        logger.error('Failed to get MCP config', { error });
        return reply.status(500).send({ error: 'Failed to get MCP config' });
      }
    }
  );

  // List MCP servers for an environment
  app.get(
    '/environments/:id/mcp-servers',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof EnvironmentIdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = EnvironmentIdParamsSchema.parse(request.params);

        const servers = await mcpServerManager.listServers(id);
        return reply.send(servers);
      } catch (error) {
        logger.error('Failed to list MCP servers', { error });
        return reply.status(500).send({ error: 'Failed to list MCP servers' });
      }
    }
  );
}
