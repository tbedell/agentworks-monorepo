import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { createProjectSchema, LANES } from '@agentworks/shared';
import { lucia } from '../lib/auth.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export const projectRoutes: FastifyPluginAsync = async (app) => {
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

  app.post('/', async (request, reply) => {
    const user = (request as any).user;
    const body = createProjectSchema.parse(request.body);

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: body.workspaceId, userId: user.id } },
    });

    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    // Create project with board and lanes
    const project = await prisma.project.create({
      data: {
        workspaceId: body.workspaceId,
        name: body.name,
        description: body.description,
        localPath: body.localPath,
        phase: 'planning', // Start in planning phase
        boards: {
          create: {
            name: 'Development Board',
            lanes: {
              create: LANES.map((lane) => ({
                laneNumber: lane.id,
                name: lane.name,
              })),
            },
          },
        },
        docs: {
          create: [
            { type: 'blueprint', content: '# Project Blueprint\n\n' },
            { type: 'prd', content: '# Product Requirements Document\n\n' },
            { type: 'mvp', content: '# MVP Definition\n\n' },
            { type: 'plan', content: '# Project Plan\n\n' },
            { type: 'playbook', content: '# Agent Playbook\n\n' },
          ],
        },
      },
      include: {
        boards: { include: { lanes: { orderBy: { laneNumber: 'asc' } } } },
        docs: true,
      },
    });

    // Get Lane 0 (Planning/Vision) for the default cards
    const board = project.boards[0];
    const lane0 = board.lanes.find(l => l.laneNumber === 0);

    if (lane0) {
      // Create the 5 essential planning cards in Lane 0
      const defaultPlanningCards = [
        {
          title: 'Project Planning',
          description: `## Planning Session\n\nWork with CoPilot to define the project vision, target audience, and core value proposition.\n\n**Status:** Ready for CoPilot Q&A\n\n**Deliverables:**\n- Project vision statement\n- Target audience definition\n- Core problem being solved`,
          type: 'planning',
          priority: 'Critical',
          position: 0,
          assignedAgent: 'ceo-copilot',
        },
        {
          title: 'Blueprint',
          description: `## Project Blueprint\n\nStrategic document outlining the complete project vision.\n\n**Includes:**\n- Vision & Goals\n- Target Users\n- Feature Overview\n- Success Metrics\n- Technical Approach\n\n**Status:** Pending Planning completion`,
          type: 'document',
          priority: 'Critical',
          position: 1,
          assignedAgent: 'ceo-copilot',
        },
        {
          title: 'PRD (Product Requirements)',
          description: `## Product Requirements Document\n\nDetailed specification of what will be built.\n\n**Includes:**\n- User Stories\n- Feature Specifications\n- Acceptance Criteria\n- API Requirements\n- Data Model Overview\n\n**Status:** Pending Blueprint completion`,
          type: 'document',
          priority: 'Critical',
          position: 2,
          assignedAgent: 'ceo-copilot',
        },
        {
          title: 'MVP Definition',
          description: `## Minimum Viable Product\n\nDefines the smallest version that delivers value.\n\n**Includes:**\n- Core Features (Must Have)\n- Deferred Features (Nice to Have)\n- Launch Criteria\n- Timeline Estimate\n\n**Status:** Pending PRD completion`,
          type: 'document',
          priority: 'Critical',
          position: 3,
          assignedAgent: 'ceo-copilot',
        },
        {
          title: 'Agent Playbook',
          description: `## Agent Playbook\n\nDefines which agents handle which tasks.\n\n**Agent Assignments:**\n- **CEO CoPilot** - Project oversight, planning, card management\n- **Frontend Agent** - UI components, styling, user interactions\n- **Backend Agent** - APIs, business logic, data processing\n- **Database Agent** - Schema design, queries, migrations\n- **QA Agent** - Testing, quality assurance, bug tracking\n- **DevOps Agent** - Deployment, CI/CD, infrastructure\n\n**Status:** Pending MVP completion`,
          type: 'document',
          priority: 'High',
          position: 4,
          assignedAgent: 'ceo-copilot',
        },
      ];

      // Create all planning cards
      await prisma.card.createMany({
        data: defaultPlanningCards.map(card => ({
          boardId: board.id,
          laneId: lane0.id,
          title: card.title,
          description: card.description,
          type: card.type,
          priority: card.priority,
          position: card.position,
          assignedAgent: card.assignedAgent,
          status: card.position === 0 ? 'in-progress' : 'pending',
        })),
      });
    }

    // Initialize local file system if localPath is provided
    console.log('[Projects] Creating project with localPath:', body.localPath);
    if (body.localPath) {
      try {
        console.log('[Projects] Creating directory structure at:', body.localPath);
        // Create project directory structure
        await fs.mkdir(body.localPath, { recursive: true });
        await fs.mkdir(path.join(body.localPath, 'docs'), { recursive: true });
        await fs.mkdir(path.join(body.localPath, 'src'), { recursive: true });
        await fs.mkdir(path.join(body.localPath, 'tests'), { recursive: true });
        await fs.mkdir(path.join(body.localPath, 'context'), { recursive: true }); // For card context files
        await fs.mkdir(path.join(body.localPath, '.agentworks'), { recursive: true });

        // Create minimal project configuration (no template docs - agents will generate those)
        const projectJson = JSON.stringify({
          name: body.name,
          description: body.description,
          projectId: project.id,
          workspaceId: body.workspaceId,
          createdAt: new Date().toISOString(),
        }, null, 2);

        const gitignore = `# Dependencies
node_modules/

# Build outputs
dist/
build/
.next/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# AgentWorks
.agentworks/cache/
`;

        const readmeTemplate = `# ${body.name}

${body.description || '_Project description goes here._'}

## Getting Started
_Instructions for setting up the project._

## Documentation
Documentation will be generated by agents in the \`docs/\` folder.

## Built with AgentWorks
This project was created and managed by [AgentWorks](https://agentworks.dev).
`;

        // Write minimal files (docs/ will be populated by agents working on cards)
        await Promise.all([
          fs.writeFile(path.join(body.localPath, 'README.md'), readmeTemplate),
          fs.writeFile(path.join(body.localPath, '.agentworks', 'project.json'), projectJson),
          fs.writeFile(path.join(body.localPath, '.gitignore'), gitignore),
        ]);

        console.log(`[Projects] Successfully initialized local project files at: ${body.localPath}`);
      } catch (fsError: any) {
        // Log full error details
        console.error('[Projects] Failed to create local project files:', {
          error: fsError.message,
          code: fsError.code,
          path: body.localPath,
          stack: fsError.stack,
        });
      }
    } else {
      console.log('[Projects] No localPath provided, skipping local file creation');
    }

    // Fetch the complete project with cards
    const completeProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        boards: {
          include: {
            lanes: {
              orderBy: { laneNumber: 'asc' },
              include: { cards: { orderBy: { position: 'asc' } } }
            }
          }
        },
        docs: true,
      },
    });

    return completeProject;
  });

  // GET /api/projects - List projects for a workspace
  app.get('/', async (request, reply) => {
    const user = (request as any).user;
    const { workspaceId } = request.query as { workspaceId?: string };

    if (!workspaceId) {
      return reply.status(400).send({ error: 'workspaceId query parameter is required' });
    }

    // Verify user is member of workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });

    if (!membership) {
      return reply.status(403).send({ error: 'Not a workspace member' });
    }

    const projects = await prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        boards: {
          include: {
            lanes: { orderBy: { laneNumber: 'asc' } },
          },
        },
      },
    });

    return projects;
  });

  app.get('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        workspace: { include: { members: true } },
        boards: { include: { lanes: { orderBy: { laneNumber: 'asc' } } } },
        docs: true,
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    return project;
  });

  app.patch('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { name, description, status, phase } = request.body as any;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { 
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(phase !== undefined && { phase }),
      },
    });

    return updated;
  });

  app.delete('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    // Allow owners, admins, and members to delete projects (viewers cannot)
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized to delete projects' });
    }

    // Delete related records that don't have onDelete: Cascade
    // These records reference the project but won't auto-delete
    await prisma.$transaction([
      // Delete usage events (no cascade)
      prisma.usageEvent.deleteMany({ where: { projectId: id } }),
      // Delete usage records (no cascade)
      prisma.usageRecord.deleteMany({ where: { projectId: id } }),
      // Delete media jobs (no cascade)
      prisma.mediaJob.deleteMany({ where: { projectId: id } }),
      // Delete git operation requests (no cascade)
      prisma.gitOperationRequest.deleteMany({ where: { projectId: id } }),
      // Now delete the project (cascades to boards, lanes, cards, docs, etc.)
      prisma.project.delete({ where: { id } }),
    ]);

    return { success: true };
  });

  app.get('/:id/docs/:type', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const doc = await prisma.projectDoc.findUnique({
      where: { projectId_type: { projectId: id, type } },
    });

    return doc || { projectId: id, type, content: '', version: 0 };
  });

  app.put('/:id/docs/:type', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };
    const { content } = request.body as { content: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const doc = await prisma.projectDoc.upsert({
      where: { projectId_type: { projectId: id, type } },
      update: { content, version: { increment: 1 } },
      create: { projectId: id, type, content },
    });

    return doc;
  });

  app.get('/:id/components', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const components = await prisma.projectComponent.findMany({
      where: { projectId: id },
      orderBy: { updatedAt: 'desc' },
    });

    return components;
  });

  app.get('/:id/components/:type', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };
    const { name } = request.query as { name?: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    if (name) {
      const component = await prisma.projectComponent.findUnique({
        where: { projectId_type_name: { projectId: id, type, name } },
      });
      return component || null;
    }

    const components = await prisma.projectComponent.findMany({
      where: { projectId: id, type },
      orderBy: { updatedAt: 'desc' },
    });

    return components;
  });

  app.post('/:id/components', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { type, name, data } = request.body as { type: string; name: string; data: any };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const component = await prisma.projectComponent.upsert({
      where: { projectId_type_name: { projectId: id, type, name } },
      update: { 
        data, 
        version: { increment: 1 },
        lastSavedAt: new Date(),
      },
      create: { 
        projectId: id, 
        type, 
        name, 
        data,
        lastSavedAt: new Date(),
      },
    });

    return component;
  });

  app.delete('/:id/components/:componentId', async (request, reply) => {
    const user = (request as any).user;
    const { id, componentId } = request.params as { id: string; componentId: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const component = await prisma.projectComponent.findFirst({
      where: { id: componentId, projectId: id },
    });

    if (!component) {
      return reply.status(404).send({ error: 'Component not found' });
    }

    await prisma.projectComponent.delete({ where: { id: componentId } });

    return { success: true };
  });

  app.get('/:id/todos', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const todos = await prisma.projectTodo.findMany({
      where: { projectId: id },
      orderBy: [{ completed: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });

    return todos;
  });

  app.post('/:id/todos', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { content, cardId, category, priority } = request.body as {
      content: string;
      cardId?: string;
      category?: string;
      priority?: number;
    };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const todo = await prisma.projectTodo.create({
      data: {
        projectId: id,
        content,
        cardId,
        category: category || 'general',
        priority: priority || 0,
      },
    });

    return todo;
  });

  app.patch('/:id/todos/:todoId', async (request, reply) => {
    const user = (request as any).user;
    const { id, todoId } = request.params as { id: string; todoId: string };
    const { completed, content, priority } = request.body as {
      completed?: boolean;
      content?: string;
      priority?: number;
    };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const todo = await prisma.projectTodo.update({
      where: { id: todoId },
      data: {
        ...(completed !== undefined && { 
          completed, 
          completedAt: completed ? new Date() : null 
        }),
        ...(content !== undefined && { content }),
        ...(priority !== undefined && { priority }),
      },
    });

    return todo;
  });

  app.delete('/:id/todos/:todoId', async (request, reply) => {
    const user = (request as any).user;
    const { id, todoId } = request.params as { id: string; todoId: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    await prisma.projectTodo.delete({ where: { id: todoId } });

    return { success: true };
  });

  app.get('/:id/sessions', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const sessions = await prisma.agentSession.findMany({
      where: { projectId: id },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    return sessions;
  });

  app.get('/:id/sessions/:sessionId', async (request, reply) => {
    const user = (request as any).user;
    const { id, sessionId } = request.params as { id: string; sessionId: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.projectId !== id) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return session;
  });

  app.post('/:id/sessions', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { cardId, context, phase } = request.body as {
      cardId?: string;
      context: string;
      phase?: string;
    };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const session = await prisma.agentSession.create({
      data: {
        projectId: id,
        cardId,
        context,
        phase,
        status: 'active',
      },
    });

    return session;
  });

  app.post('/:id/sessions/:sessionId/log', async (request, reply) => {
    const user = (request as any).user;
    const { id, sessionId } = request.params as { id: string; sessionId: string };
    const { entry } = request.body as { entry: any };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.projectId !== id) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const logData = (session.logData as any[]) || [];
    logData.push({ ...entry, timestamp: new Date().toISOString() });

    const updated = await prisma.agentSession.update({
      where: { id: sessionId },
      data: { logData },
    });

    return updated;
  });

  app.post('/:id/sessions/:sessionId/end', async (request, reply) => {
    const user = (request as any).user;
    const { id, sessionId } = request.params as { id: string; sessionId: string };
    const { summary } = request.body as { summary?: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const session = await prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        summary,
        endedAt: new Date(),
      },
    });

    return session;
  });

  // ============================================
  // Builder State Routes (UI, DB, Workflow)
  // ============================================

  // GET /api/projects/:id/builders/:type - Get builder state
  app.get('/:id/builders/:type', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };

    if (!['ui', 'db', 'workflow'].includes(type)) {
      return reply.status(400).send({ error: 'Invalid builder type. Must be: ui, db, or workflow' });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const builderState = await prisma.builderState.findUnique({
      where: { projectId_builderType: { projectId: id, builderType: type } },
    });

    return builderState || { projectId: id, builderType: type, state: {}, version: 0 };
  });

  // PUT /api/projects/:id/builders/:type - Update builder state
  app.put('/:id/builders/:type', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };
    const { state } = request.body as { state: any };

    if (!['ui', 'db', 'workflow'].includes(type)) {
      return reply.status(400).send({ error: 'Invalid builder type. Must be: ui, db, or workflow' });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const builderState = await prisma.builderState.upsert({
      where: { projectId_builderType: { projectId: id, builderType: type } },
      update: { state, version: { increment: 1 } },
      create: { projectId: id, builderType: type, state },
    });

    return builderState;
  });

  // DELETE /api/projects/:id/builders/:type - Reset builder state
  app.delete('/:id/builders/:type', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };

    if (!['ui', 'db', 'workflow'].includes(type)) {
      return reply.status(400).send({ error: 'Invalid builder type. Must be: ui, db, or workflow' });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    await prisma.builderState.deleteMany({
      where: { projectId: id, builderType: type },
    });

    return { success: true };
  });
};
