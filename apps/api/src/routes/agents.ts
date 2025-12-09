import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { runAgentSchema, agentConfigSchema, AGENT_NAMES } from '@agentworks/shared';
import { lucia } from '../lib/auth.js';
import { getOrchestratorClient } from '../lib/orchestrator-client.js';

export const agentRoutes: FastifyPluginAsync = async (app) => {
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

  app.get('/', async () => {
    const agents = await prisma.agent.findMany({
      orderBy: { name: 'asc' },
    });
    return agents;
  });

  app.get('/:name', async (request, reply) => {
    const { name } = request.params as { name: string };

    const agent = await prisma.agent.findUnique({
      where: { name },
    });

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return agent;
  });

  app.post('/run', async (request, reply) => {
    const user = (request as any).user;
    const body = runAgentSchema.parse(request.body);

    const card = await prisma.card.findUnique({
      where: { id: body.cardId },
      include: {
        board: {
          include: {
            project: {
              include: {
                workspace: { include: { members: true } },
                agentConfigs: { include: { agent: true } },
              },
            },
          },
        },
        lane: true,
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const membership = card.board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const agent = await prisma.agent.findUnique({ where: { name: body.agentName } });
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    if (!agent.allowedLanes.includes(card.lane.laneNumber)) {
      return reply.status(400).send({ error: `Agent ${agent.displayName} cannot run in lane ${card.lane.name}` });
    }

    const config = card.board.project.agentConfigs.find((c) => c.agentId === agent.id);
    const provider = body.provider || config?.provider || agent.defaultProvider;
    const model = body.model || config?.model || agent.defaultModel;

    const run = await prisma.agentRun.create({
      data: {
        cardId: body.cardId,
        agentId: agent.id,
        status: 'pending',
        provider,
        model,
      },
      include: { agent: true },
    });

    // Forward execution to agent-orchestrator
    try {
      const orchestrator = getOrchestratorClient();
      const executionResult = await orchestrator.executeAgent({
        cardId: body.cardId,
        agentId: agent.name,
        workspaceId: card.board.project.workspace.id,
        projectId: card.board.project.id,
        userId: user.id,
      });

      // Update run status to running
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'running',
          startedAt: new Date(),
        },
      });

      return { ...run, status: 'running', orchestratorRunId: executionResult.runId };
    } catch (error) {
      // Log the error but don't fail - the run was created, orchestrator might be temporarily unavailable
      console.error('Failed to forward to orchestrator:', error);

      return { ...run, orchestratorError: 'Agent orchestrator temporarily unavailable' };
    }
  });

  app.get('/runs/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const run = await prisma.agentRun.findUnique({
      where: { id },
      include: {
        agent: true,
        card: {
          include: {
            board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
          },
        },
        logs: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!run) {
      return reply.status(404).send({ error: 'Run not found' });
    }

    const isMember = run.card.board.project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    return run;
  });

  app.get('/runs/card/:cardId', async (request, reply) => {
    const user = (request as any).user;
    const { cardId } = request.params as { cardId: string };

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { board: { include: { project: { include: { workspace: { include: { members: true } } } } } } },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const isMember = card.board.project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const runs = await prisma.agentRun.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
      include: { agent: true },
    });

    return runs;
  });

  app.post('/config/:projectId', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const body = agentConfigSchema.parse(request.body);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const agent = await prisma.agent.findUnique({ where: { name: body.agentName } });
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    const config = await prisma.agentConfig.upsert({
      where: { projectId_agentId: { projectId, agentId: agent.id } },
      update: { provider: body.provider, model: body.model },
      create: { projectId, agentId: agent.id, provider: body.provider, model: body.model },
    });

    return config;
  });

  app.get('/config/:projectId', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const configs = await prisma.agentConfig.findMany({
      where: { projectId },
      include: { agent: true },
    });

    return configs;
  });

  // ============================================
  // Agent Run Summary Routes for Claude Code Agent
  // ============================================

  // POST /api/agents/runs/:runId/summary - Log a structured run summary
  app.post('/runs/:runId/summary', async (request, reply) => {
    const user = (request as any).user;
    const { runId } = request.params as { runId: string };
    const {
      filesRead,
      filesWritten,
      commandsRun,
      docsUpdated,
      cardUpdates,
      todoChanges,
      builderChanges,
      followUpItems,
      summary,
    } = request.body as {
      filesRead?: string[];
      filesWritten?: string[];
      commandsRun?: string[];
      docsUpdated?: string[];
      cardUpdates?: Record<string, any>;
      todoChanges?: Record<string, any>;
      builderChanges?: Record<string, any>;
      followUpItems?: string[];
      summary?: string;
    };

    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      include: {
        card: {
          include: {
            board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
          },
        },
      },
    });

    if (!run) {
      return reply.status(404).send({ error: 'Agent run not found' });
    }

    const membership = run.card.board.project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    // Check if a summary already exists for this run
    const existingSummary = await prisma.agentRunSummary.findUnique({
      where: { agentRunId: runId },
    });

    let runSummary;
    if (existingSummary) {
      // Update existing summary
      runSummary = await prisma.agentRunSummary.update({
        where: { agentRunId: runId },
        data: {
          filesRead: filesRead ?? existingSummary.filesRead,
          filesWritten: filesWritten ?? existingSummary.filesWritten,
          commandsRun: commandsRun ?? existingSummary.commandsRun,
          docsUpdated: docsUpdated ?? existingSummary.docsUpdated,
          cardUpdates: cardUpdates ?? existingSummary.cardUpdates,
          todoChanges: todoChanges ?? existingSummary.todoChanges,
          builderChanges: builderChanges ?? existingSummary.builderChanges,
          followUpItems: followUpItems ?? existingSummary.followUpItems,
          summary: summary ?? existingSummary.summary,
        },
      });
    } else {
      // Create new summary
      runSummary = await prisma.agentRunSummary.create({
        data: {
          agentRunId: runId,
          filesRead: filesRead ?? [],
          filesWritten: filesWritten ?? [],
          commandsRun: commandsRun ?? [],
          docsUpdated: docsUpdated ?? [],
          cardUpdates: cardUpdates ?? {},
          todoChanges: todoChanges ?? {},
          builderChanges: builderChanges ?? {},
          followUpItems: followUpItems ?? [],
          summary: summary ?? null,
        },
      });
    }

    return { runSummary };
  });

  // GET /api/agents/runs/:runId/summary - Get the run summary for a specific run
  app.get('/runs/:runId/summary', async (request, reply) => {
    const user = (request as any).user;
    const { runId } = request.params as { runId: string };

    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      include: {
        card: {
          include: {
            board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
          },
        },
        runSummary: true,
      },
    });

    if (!run) {
      return reply.status(404).send({ error: 'Agent run not found' });
    }

    const isMember = run.card.board.project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    if (!run.runSummary) {
      return reply.status(404).send({ error: 'Run summary not found' });
    }

    return { runSummary: run.runSummary };
  });

  // GET /api/agents/runs/card/:cardId/summaries - List all run summaries for a card
  app.get('/runs/card/:cardId/summaries', async (request, reply) => {
    const user = (request as any).user;
    const { cardId } = request.params as { cardId: string };

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        board: { include: { project: { include: { workspace: { include: { members: true } } } } } },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const isMember = card.board.project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const runs = await prisma.agentRun.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
      include: {
        agent: true,
        runSummary: true,
      },
    });

    // Filter to only runs that have summaries
    const runsWithSummaries = runs.filter((run) => run.runSummary !== null);

    return {
      summaries: runsWithSummaries.map((run) => ({
        runId: run.id,
        agentName: run.agent.name,
        agentDisplayName: run.agent.displayName,
        createdAt: run.createdAt,
        completedAt: run.completedAt,
        status: run.status,
        summary: run.runSummary,
      })),
    };
  });
};
