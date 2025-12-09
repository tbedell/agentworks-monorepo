import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@agentworks/shared';
import { getDatabase } from '../lib/database.js';
import { authenticateRequest, requireWorkspaceAccess, type AuthenticatedRequest } from '../lib/auth.js';

const logger = createLogger('core-service:projects');

const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['Active', 'Archived']).optional(),
});

export async function projectRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Add authentication hook
  app.addHook('preHandler', authenticateRequest);

  // Get projects for workspace
  app.get('/workspace/:workspaceId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { workspaceId } = request.params as { workspaceId: string };
    
    if (!await requireWorkspaceAccess(authRequest, reply, workspaceId)) {
      return;
    }
    
    const { status } = request.query as { status?: 'Active' | 'Archived' };
    
    const db = getDatabase();
    const projects = await db.project.findMany({
      where: {
        workspaceId,
        ...(status && { status }),
      },
      include: {
        boards: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: {
              select: {
                cards: true,
              },
            },
          },
        },
        _count: {
          select: {
            boards: true,
            usageEvents: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    return reply.send(projects);
  });

  // Create project
  app.post('/workspace/:workspaceId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { workspaceId } = request.params as { workspaceId: string };
    
    if (!await requireWorkspaceAccess(authRequest, reply, workspaceId, 'member')) {
      return;
    }
    
    try {
      const { name, description } = createProjectSchema.parse(request.body);
      
      const db = getDatabase();
      
      const result = await db.$transaction(async (tx) => {
        // Create project
        const project = await tx.project.create({
          data: {
            name,
            description,
            workspaceId,
          },
        });
        
        // Create default board
        const board = await tx.board.create({
          data: {
            name: 'Development Board',
            projectId: project.id,
          },
        });
        
        // Create default lanes
        const lanes = [
          { laneNumber: 0, name: 'Vision & CoPilot Planning' },
          { laneNumber: 1, name: 'PRD / MVP Definition' },
          { laneNumber: 2, name: 'Research' },
          { laneNumber: 3, name: 'Architecture & Stack' },
          { laneNumber: 4, name: 'Planning & Task Breakdown' },
          { laneNumber: 5, name: 'Scaffolding / Setup' },
          { laneNumber: 6, name: 'Build' },
          { laneNumber: 7, name: 'Test & QA' },
          { laneNumber: 8, name: 'Deploy' },
          { laneNumber: 9, name: 'Docs & Training' },
          { laneNumber: 10, name: 'Learn & Optimize' },
        ];
        
        for (const lane of lanes) {
          await tx.lane.create({
            data: {
              ...lane,
              boardId: board.id,
            },
          });
        }
        
        return project;
      });
      
      logger.info('Project created', {
        projectId: result.id,
        workspaceId,
        userId: authRequest.user?.id,
        name,
      });
      
      return reply.send(result);
      
    } catch (error) {
      logger.error('Failed to create project', { error, workspaceId });
      
      return reply.status(500).send({
        error: 'CREATE_FAILED',
        message: 'Failed to create project',
      });
    }
  });

  // Get project by ID
  app.get('/:projectId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { projectId } = request.params as { projectId: string };
    
    const db = getDatabase();
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        boards: {
          include: {
            lanes: {
              orderBy: {
                laneNumber: 'asc',
              },
            },
            _count: {
              select: {
                cards: true,
              },
            },
          },
        },
        docs: {
          orderBy: {
            updatedAt: 'desc',
          },
        },
        agentConfigs: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            usageEvents: true,
          },
        },
      },
    });
    
    if (!project) {
      return reply.status(404).send({
        error: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      });
    }
    
    if (!await requireWorkspaceAccess(authRequest, reply, project.workspace.id)) {
      return;
    }
    
    return reply.send(project);
  });

  // Update project
  app.patch('/:projectId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { projectId } = request.params as { projectId: string };
    
    try {
      const updates = updateProjectSchema.parse(request.body);
      
      const db = getDatabase();
      
      // Check project exists and get workspace
      const existingProject = await db.project.findUnique({
        where: { id: projectId },
        include: {
          workspace: {
            select: {
              id: true,
            },
          },
        },
      });
      
      if (!existingProject) {
        return reply.status(404).send({
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }
      
      if (!await requireWorkspaceAccess(authRequest, reply, existingProject.workspace.id, 'member')) {
        return;
      }
      
      const project = await db.project.update({
        where: { id: projectId },
        data: updates,
      });
      
      logger.info('Project updated', {
        projectId,
        userId: authRequest.user?.id,
        updates,
      });
      
      return reply.send(project);
      
    } catch (error) {
      logger.error('Failed to update project', { error, projectId });
      
      return reply.status(500).send({
        error: 'UPDATE_FAILED',
        message: 'Failed to update project',
      });
    }
  });

  // Delete project
  app.delete('/:projectId', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { projectId } = request.params as { projectId: string };
    
    try {
      const db = getDatabase();
      
      // Check project exists and get workspace
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          workspace: {
            select: {
              id: true,
            },
          },
        },
      });
      
      if (!project) {
        return reply.status(404).send({
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }
      
      if (!await requireWorkspaceAccess(authRequest, reply, project.workspace.id, 'member')) {
        return;
      }
      
      // Delete project (cascade will handle related data)
      await db.project.delete({
        where: { id: projectId },
      });
      
      logger.info('Project deleted', {
        projectId,
        userId: authRequest.user?.id,
      });
      
      return reply.send({ message: 'Project deleted successfully' });
      
    } catch (error) {
      logger.error('Failed to delete project', { error, projectId });
      
      return reply.status(500).send({
        error: 'DELETE_FAILED',
        message: 'Failed to delete project',
      });
    }
  });

  // Get project documents
  app.get('/:projectId/docs', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { projectId } = request.params as { projectId: string };
    
    const db = getDatabase();
    
    // Check project exists and get workspace
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          select: {
            id: true,
          },
        },
      },
    });
    
    if (!project) {
      return reply.status(404).send({
        error: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      });
    }
    
    if (!await requireWorkspaceAccess(authRequest, reply, project.workspace.id)) {
      return;
    }
    
    const docs = await db.projectDoc.findMany({
      where: { projectId },
      orderBy: {
        type: 'asc',
      },
    });
    
    return reply.send(docs);
  });

  // Create or update project document
  app.put('/:projectId/docs/:type', async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { projectId, type } = request.params as { projectId: string; type: string };
    const { content } = request.body as { content: string };
    
    const validTypes = ['blueprint', 'prd', 'mvp', 'plan', 'playbook', 'infra'];
    if (!validTypes.includes(type)) {
      return reply.status(400).send({
        error: 'INVALID_DOC_TYPE',
        message: 'Invalid document type',
      });
    }
    
    const db = getDatabase();
    
    // Check project exists and get workspace
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          select: {
            id: true,
          },
        },
      },
    });
    
    if (!project) {
      return reply.status(404).send({
        error: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      });
    }
    
    if (!await requireWorkspaceAccess(authRequest, reply, project.workspace.id, 'member')) {
      return;
    }
    
    try {
      const doc = await db.projectDoc.upsert({
        where: {
          projectId_type: {
            projectId,
            type,
          },
        },
        update: {
          content,
          version: {
            increment: 1,
          },
        },
        create: {
          projectId,
          type,
          content,
        },
      });
      
      logger.info('Project document updated', {
        projectId,
        type,
        userId: authRequest.user?.id,
      });
      
      return reply.send(doc);
      
    } catch (error) {
      logger.error('Failed to update project document', { error, projectId, type });
      
      return reply.status(500).send({
        error: 'UPDATE_DOC_FAILED',
        message: 'Failed to update document',
      });
    }
  });
}