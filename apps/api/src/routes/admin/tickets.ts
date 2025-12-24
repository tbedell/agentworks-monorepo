import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { adminAuthMiddleware } from './auth.js';

// Zod Schemas
const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  categoryId: z.string().uuid().optional().nullable(),
  queueId: z.string().uuid().optional().nullable(),
  slaId: z.string().uuid().optional().nullable(),
  tenantId: z.string().uuid().optional().nullable(),
  reporterEmail: z.string().email().optional().nullable(),
  reporterName: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  source: z.string().optional().nullable(),
});

const updateTicketSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['new', 'open', 'pending', 'resolved', 'closed']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  queueId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

const createCommentSchema = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().default(false),
});

const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  defaultPriority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  sortOrder: z.number().int().default(0),
});

const createQueueSchema = z.object({
  name: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  groupId: z.string().uuid().optional().nullable(),
  autoAssign: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const createSlaSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional().nullable(),
  criticalResponseMins: z.number().int().default(15),
  highResponseMins: z.number().int().default(60),
  mediumResponseMins: z.number().int().default(240),
  lowResponseMins: z.number().int().default(1440),
  criticalResolveMins: z.number().int().default(120),
  highResolveMins: z.number().int().default(480),
  mediumResolveMins: z.number().int().default(1440),
  lowResolveMins: z.number().int().default(4320),
  useBusinessHours: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

// Generate ticket number
async function generateTicketNumber(): Promise<string> {
  const count = await prisma.supportTicket.count();
  return `TKT-${String(count + 1).padStart(5, '0')}`;
}

// Calculate SLA due dates
function calculateSlaDates(priority: string, sla: { criticalResponseMins: number; highResponseMins: number; mediumResponseMins: number; lowResponseMins: number; criticalResolveMins: number; highResolveMins: number; mediumResolveMins: number; lowResolveMins: number }) {
  const now = new Date();
  let responseMins: number;
  let resolveMins: number;

  switch (priority) {
    case 'critical':
      responseMins = sla.criticalResponseMins;
      resolveMins = sla.criticalResolveMins;
      break;
    case 'high':
      responseMins = sla.highResponseMins;
      resolveMins = sla.highResolveMins;
      break;
    case 'medium':
      responseMins = sla.mediumResponseMins;
      resolveMins = sla.mediumResolveMins;
      break;
    default:
      responseMins = sla.lowResponseMins;
      resolveMins = sla.lowResolveMins;
  }

  return {
    firstResponseDue: new Date(now.getTime() + responseMins * 60 * 1000),
    resolutionDue: new Date(now.getTime() + resolveMins * 60 * 1000),
  };
}

export const adminTicketsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  // ============================================
  // Tickets
  // ============================================

  // GET /tickets - List tickets
  app.get('/tickets', async (request) => {
    const query = request.query as {
      search?: string;
      status?: string;
      priority?: string;
      categoryId?: string;
      queueId?: string;
      assigneeId?: string;
      tenantId?: string;
      slaStatus?: string;
      page?: string;
      limit?: string;
    };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.queueId) where.queueId = query.queueId;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.slaStatus) where.slaStatus = query.slaStatus;
    if (query.search) {
      where.OR = [
        { ticketNumber: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
        { reporterEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          category: { select: { id: true, displayName: true, color: true } },
          queue: { select: { id: true, displayName: true } },
          tenant: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return { tickets, total, page, limit };
  });

  // POST /tickets - Create ticket
  app.post('/tickets', async (request) => {
    const body = createTicketSchema.parse(request.body);
    const admin = (request as any).admin;

    const ticketNumber = await generateTicketNumber();

    // Get default SLA if none specified
    let slaId = body.slaId;
    let slaDates = {};
    if (!slaId) {
      const defaultSla = await prisma.ticketSla.findFirst({ where: { isDefault: true } });
      if (defaultSla) {
        slaId = defaultSla.id;
        slaDates = calculateSlaDates(body.priority, defaultSla);
      }
    } else {
      const sla = await prisma.ticketSla.findUnique({ where: { id: slaId } });
      if (sla) {
        slaDates = calculateSlaDates(body.priority, sla);
      }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        ...body,
        ticketNumber,
        slaId,
        ...slaDates,
        assigneeId: admin.id, // Auto-assign to creator for now
      },
      include: {
        category: true,
        queue: true,
        tenant: true,
      },
    });

    return { ticket };
  });

  // GET /tickets/:id - Get ticket
  app.get('/tickets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        category: true,
        queue: true,
        sla: true,
        tenant: true,
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    return { ticket };
  });

  // PUT /tickets/:id - Update ticket
  app.put('/tickets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateTicketSchema.parse(request.body);
    const admin = (request as any).admin;

    const existing = await prisma.supportTicket.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    // Track status changes
    const updates: Record<string, unknown> = { ...body };

    if (body.status === 'resolved' && existing.status !== 'resolved') {
      updates.resolvedAt = new Date();
    }
    if (body.status === 'closed' && existing.status !== 'closed') {
      updates.closedAt = new Date();
    }

    // Check first response
    if (body.status === 'open' && existing.status === 'new' && !existing.firstResponseAt) {
      updates.firstResponseAt = new Date();
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: updates,
      include: {
        category: true,
        queue: true,
        tenant: true,
      },
    });

    return { ticket };
  });

  // DELETE /tickets/:id - Delete ticket
  app.delete('/tickets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.supportTicket.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    await prisma.supportTicket.delete({ where: { id } });
    return { success: true };
  });

  // ============================================
  // Comments
  // ============================================

  // GET /tickets/:id/comments - Get ticket comments
  app.get('/tickets/:id/comments', async (request, reply) => {
    const { id } = request.params as { id: string };

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    const comments = await prisma.ticketComment.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'asc' },
    });

    return { comments };
  });

  // POST /tickets/:id/comments - Add comment
  app.post('/tickets/:id/comments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = createCommentSchema.parse(request.body);
    const admin = (request as any).admin;

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }

    // Create comment
    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: id,
        authorId: admin.id,
        authorName: admin.name,
        authorEmail: admin.email,
        content: body.content,
        isInternal: body.isInternal,
      },
    });

    // Update ticket status and first response if this is first public response
    const updates: Record<string, unknown> = {};
    if (!body.isInternal && ticket.status === 'new') {
      updates.status = 'open';
      if (!ticket.firstResponseAt) {
        updates.firstResponseAt = new Date();
      }
    }
    if (Object.keys(updates).length > 0) {
      await prisma.supportTicket.update({ where: { id }, data: updates });
    }

    return { comment };
  });

  // ============================================
  // Categories
  // ============================================

  // GET /categories - List categories
  app.get('/categories', async () => {
    const categories = await prisma.ticketCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { tickets: true } } },
    });
    return { categories };
  });

  // POST /categories - Create category
  app.post('/categories', async (request, reply) => {
    const body = createCategorySchema.parse(request.body);

    const existing = await prisma.ticketCategory.findUnique({ where: { name: body.name } });
    if (existing) {
      return reply.status(400).send({ error: 'Category name already exists' });
    }

    const category = await prisma.ticketCategory.create({ data: body });
    return { category };
  });

  // PUT /categories/:id - Update category
  app.put('/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = createCategorySchema.partial().parse(request.body);

    const existing = await prisma.ticketCategory.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    const category = await prisma.ticketCategory.update({ where: { id }, data: body });
    return { category };
  });

  // DELETE /categories/:id - Deactivate category
  app.delete('/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.ticketCategory.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    await prisma.ticketCategory.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  });

  // ============================================
  // Queues
  // ============================================

  // GET /queues - List queues
  app.get('/queues', async () => {
    const queues = await prisma.ticketQueue.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { tickets: true } } },
    });
    return { queues };
  });

  // POST /queues - Create queue
  app.post('/queues', async (request, reply) => {
    const body = createQueueSchema.parse(request.body);

    const existing = await prisma.ticketQueue.findUnique({ where: { name: body.name } });
    if (existing) {
      return reply.status(400).send({ error: 'Queue name already exists' });
    }

    const queue = await prisma.ticketQueue.create({ data: body });
    return { queue };
  });

  // PUT /queues/:id - Update queue
  app.put('/queues/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = createQueueSchema.partial().parse(request.body);

    const existing = await prisma.ticketQueue.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Queue not found' });
    }

    const queue = await prisma.ticketQueue.update({ where: { id }, data: body });
    return { queue };
  });

  // DELETE /queues/:id - Deactivate queue
  app.delete('/queues/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.ticketQueue.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Queue not found' });
    }

    await prisma.ticketQueue.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  });

  // ============================================
  // SLAs
  // ============================================

  // GET /slas - List SLAs
  app.get('/slas', async () => {
    const slas = await prisma.ticketSla.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { tickets: true } } },
    });
    return { slas };
  });

  // POST /slas - Create SLA
  app.post('/slas', async (request, reply) => {
    const body = createSlaSchema.parse(request.body);

    const existing = await prisma.ticketSla.findUnique({ where: { name: body.name } });
    if (existing) {
      return reply.status(400).send({ error: 'SLA name already exists' });
    }

    // If this is default, remove default from others
    if (body.isDefault) {
      await prisma.ticketSla.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const sla = await prisma.ticketSla.create({ data: body });
    return { sla };
  });

  // PUT /slas/:id - Update SLA
  app.put('/slas/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = createSlaSchema.partial().parse(request.body);

    const existing = await prisma.ticketSla.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'SLA not found' });
    }

    if (body.isDefault) {
      await prisma.ticketSla.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const sla = await prisma.ticketSla.update({ where: { id }, data: body });
    return { sla };
  });

  // ============================================
  // Dashboard / Stats
  // ============================================

  // GET /stats - Ticket stats
  app.get('/stats', async () => {
    const [
      byStatus,
      byPriority,
      bySlaStatus,
      recentTickets,
      openCount,
      resolvedToday,
    ] = await Promise.all([
      prisma.supportTicket.groupBy({ by: ['status'], _count: true }),
      prisma.supportTicket.groupBy({ by: ['priority'], _count: true }),
      prisma.supportTicket.groupBy({ by: ['slaStatus'], _count: true }),
      prisma.supportTicket.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { name: true } } },
      }),
      prisma.supportTicket.count({ where: { status: { in: ['new', 'open', 'pending'] } } }),
      prisma.supportTicket.count({
        where: {
          resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return {
      byStatus,
      byPriority,
      bySlaStatus,
      recentTickets,
      openCount,
      resolvedToday,
    };
  });
};
