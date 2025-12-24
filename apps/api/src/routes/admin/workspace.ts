import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { adminAuthMiddleware } from './auth.js';

// Zod Schemas
const updateKanbanSchema = z.object({
  name: z.string().optional(),
  lanes: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  laneId: z.string().default('todo'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  dueDate: z.string().datetime().optional().nullable(),
  relatedType: z.enum(['ticket', 'deal', 'lead', 'contact']).optional().nullable(),
  relatedId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).default([]),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  completed: z.boolean().optional(),
  position: z.number().int().optional(),
});

const reorderTasksSchema = z.object({
  updates: z.array(z.object({
    id: z.string().uuid(),
    laneId: z.string(),
    position: z.number().int(),
  })),
});

const createNoteSchema = z.object({
  title: z.string().optional().nullable(),
  content: z.string().min(1),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  isPinned: z.boolean().default(false),
  relatedType: z.enum(['ticket', 'deal', 'lead', 'contact', 'company']).optional().nullable(),
  relatedId: z.string().uuid().optional().nullable(),
});

const updateNoteSchema = createNoteSchema.partial();

export const adminWorkspaceRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  // ============================================
  // Kanban Board
  // ============================================

  // GET /kanban - Get user's kanban board (auto-create if needed)
  app.get('/kanban', async (request) => {
    const admin = (request as any).admin;

    let kanban = await prisma.personalKanban.findUnique({
      where: { adminId: admin.id },
      include: {
        tasks: {
          orderBy: [{ laneId: 'asc' }, { position: 'asc' }],
        },
      },
    });

    // Auto-create if doesn't exist
    if (!kanban) {
      kanban = await prisma.personalKanban.create({
        data: {
          adminId: admin.id,
          name: 'My Tasks',
          lanes: [
            { id: 'todo', name: 'To Do' },
            { id: 'doing', name: 'In Progress' },
            { id: 'done', name: 'Done' },
          ],
        },
        include: { tasks: true },
      });
    }

    // Group tasks by lane
    const lanes = (kanban.lanes as { id: string; name: string }[]).map((lane) => ({
      ...lane,
      tasks: kanban!.tasks.filter((t) => t.laneId === lane.id),
    }));

    return { kanban: { ...kanban, lanes } };
  });

  // PUT /kanban - Update kanban settings
  app.put('/kanban', async (request) => {
    const admin = (request as any).admin;
    const body = updateKanbanSchema.parse(request.body);

    const kanban = await prisma.personalKanban.update({
      where: { adminId: admin.id },
      data: body,
    });

    return { kanban };
  });

  // ============================================
  // Tasks
  // ============================================

  // GET /tasks - Get all user's tasks
  app.get('/tasks', async (request) => {
    const admin = (request as any).admin;
    const query = request.query as {
      laneId?: string;
      priority?: string;
      completed?: string;
      dueDate?: string;
    };

    const kanban = await prisma.personalKanban.findUnique({
      where: { adminId: admin.id },
    });

    if (!kanban) {
      return { tasks: [] };
    }

    const where: Record<string, unknown> = { kanbanId: kanban.id };
    if (query.laneId) where.laneId = query.laneId;
    if (query.priority) where.priority = query.priority;
    if (query.completed !== undefined) where.completed = query.completed === 'true';
    if (query.dueDate) {
      where.dueDate = { lte: new Date(query.dueDate) };
    }

    const tasks = await prisma.personalTask.findMany({
      where,
      orderBy: [{ laneId: 'asc' }, { position: 'asc' }],
    });

    return { tasks };
  });

  // POST /tasks - Create task
  app.post('/tasks', async (request) => {
    const admin = (request as any).admin;
    const body = createTaskSchema.parse(request.body);

    // Get or create kanban
    let kanban = await prisma.personalKanban.findUnique({
      where: { adminId: admin.id },
    });

    if (!kanban) {
      kanban = await prisma.personalKanban.create({
        data: {
          adminId: admin.id,
          name: 'My Tasks',
        },
      });
    }

    // Get max position in lane
    const maxPosition = await prisma.personalTask.aggregate({
      where: { kanbanId: kanban.id, laneId: body.laneId },
      _max: { position: true },
    });

    const task = await prisma.personalTask.create({
      data: {
        ...body,
        kanbanId: kanban.id,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        position: (maxPosition._max.position ?? -1) + 1,
      },
    });

    return { task };
  });

  // GET /tasks/:id - Get task
  app.get('/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const task = await prisma.personalTask.findFirst({
      where: { id },
      include: { kanban: true },
    });

    if (!task || task.kanban.adminId !== admin.id) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return { task };
  });

  // PUT /tasks/:id - Update task
  app.put('/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateTaskSchema.parse(request.body);
    const admin = (request as any).admin;

    const existing = await prisma.personalTask.findFirst({
      where: { id },
      include: { kanban: true },
    });

    if (!existing || existing.kanban.adminId !== admin.id) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const updates: Record<string, unknown> = {
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    };

    // Mark completed timestamp
    if (body.completed === true && !existing.completed) {
      updates.completedAt = new Date();
    } else if (body.completed === false) {
      updates.completedAt = null;
    }

    const task = await prisma.personalTask.update({
      where: { id },
      data: updates,
    });

    return { task };
  });

  // DELETE /tasks/:id - Delete task
  app.delete('/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const existing = await prisma.personalTask.findFirst({
      where: { id },
      include: { kanban: true },
    });

    if (!existing || existing.kanban.adminId !== admin.id) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    await prisma.personalTask.delete({ where: { id } });
    return { success: true };
  });

  // PUT /tasks/reorder - Bulk reorder tasks
  app.put('/tasks/reorder', async (request) => {
    const admin = (request as any).admin;
    const { updates } = reorderTasksSchema.parse(request.body);

    const kanban = await prisma.personalKanban.findUnique({
      where: { adminId: admin.id },
    });

    if (!kanban) {
      return { success: false, error: 'Kanban not found' };
    }

    // Update all tasks in transaction
    await prisma.$transaction(
      updates.map((update) =>
        prisma.personalTask.updateMany({
          where: { id: update.id, kanbanId: kanban.id },
          data: { laneId: update.laneId, position: update.position },
        })
      )
    );

    return { success: true };
  });

  // ============================================
  // Notes
  // ============================================

  // GET /notes - Get user's notes
  app.get('/notes', async (request) => {
    const admin = (request as any).admin;
    const query = request.query as {
      category?: string;
      search?: string;
      pinned?: string;
    };

    const where: Record<string, unknown> = { adminId: admin.id };
    if (query.category) where.category = query.category;
    if (query.pinned !== undefined) where.isPinned = query.pinned === 'true';
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const notes = await prisma.personalNote.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });

    return { notes };
  });

  // POST /notes - Create note
  app.post('/notes', async (request) => {
    const admin = (request as any).admin;
    const body = createNoteSchema.parse(request.body);

    const note = await prisma.personalNote.create({
      data: {
        ...body,
        adminId: admin.id,
      },
    });

    return { note };
  });

  // GET /notes/:id - Get note
  app.get('/notes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const note = await prisma.personalNote.findFirst({
      where: { id, adminId: admin.id },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    return { note };
  });

  // PUT /notes/:id - Update note
  app.put('/notes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateNoteSchema.parse(request.body);
    const admin = (request as any).admin;

    const existing = await prisma.personalNote.findFirst({
      where: { id, adminId: admin.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const note = await prisma.personalNote.update({
      where: { id },
      data: body,
    });

    return { note };
  });

  // DELETE /notes/:id - Delete note
  app.delete('/notes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const existing = await prisma.personalNote.findFirst({
      where: { id, adminId: admin.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    await prisma.personalNote.delete({ where: { id } });
    return { success: true };
  });

  // PUT /notes/:id/pin - Toggle pin status
  app.put('/notes/:id/pin', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const existing = await prisma.personalNote.findFirst({
      where: { id, adminId: admin.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const note = await prisma.personalNote.update({
      where: { id },
      data: { isPinned: !existing.isPinned },
    });

    return { note };
  });

  // ============================================
  // Stats
  // ============================================

  // GET /stats - Workspace stats
  app.get('/stats', async (request) => {
    const admin = (request as any).admin;

    const kanban = await prisma.personalKanban.findUnique({
      where: { adminId: admin.id },
    });

    if (!kanban) {
      return {
        tasksByLane: [],
        completedToday: 0,
        overdueTasks: 0,
        notesCount: 0,
      };
    }

    const [tasksByLane, completedToday, overdueTasks, notesCount] = await Promise.all([
      prisma.personalTask.groupBy({
        by: ['laneId'],
        where: { kanbanId: kanban.id },
        _count: true,
      }),
      prisma.personalTask.count({
        where: {
          kanbanId: kanban.id,
          completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.personalTask.count({
        where: {
          kanbanId: kanban.id,
          completed: false,
          dueDate: { lt: new Date() },
        },
      }),
      prisma.personalNote.count({ where: { adminId: admin.id } }),
    ]);

    return {
      tasksByLane,
      completedToday,
      overdueTasks,
      notesCount,
    };
  });
};
