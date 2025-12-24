import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { adminAuthMiddleware } from './auth.js';

// Zod Schemas
const updateCalendarSchema = z.object({
  name: z.string().optional(),
  timezone: z.string().optional(),
  color: z.string().optional(),
  isPublic: z.boolean().optional(),
});

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  type: z.enum(['meeting', 'campaign', 'deadline', 'reminder', 'task']).default('meeting'),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  isAllDay: z.boolean().default(false),
  location: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).default('confirmed'),
  visibility: z.enum(['default', 'public', 'private']).default('default'),
  relatedType: z.enum(['deal', 'lead', 'ticket', 'contact']).optional().nullable(),
  relatedId: z.string().uuid().optional().nullable(),
  reminders: z.array(z.object({
    type: z.enum(['email', 'notification']),
    minutes: z.number().int(),
  })).optional(),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
    role: z.enum(['organizer', 'attendee', 'optional']).default('attendee'),
  })).optional(),
});

const updateEventSchema = createEventSchema.partial();

const respondToEventSchema = z.object({
  status: z.enum(['accepted', 'declined', 'tentative']),
});

export const adminCalendarRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  // ============================================
  // Calendar
  // ============================================

  // GET /calendar - Get user's calendar (auto-create if needed)
  app.get('/', async (request) => {
    const admin = (request as any).admin;

    let calendar = await prisma.bosCalendar.findUnique({
      where: { adminId: admin.id },
    });

    // Auto-create if doesn't exist
    if (!calendar) {
      calendar = await prisma.bosCalendar.create({
        data: {
          adminId: admin.id,
          name: 'My Calendar',
          isDefault: true,
        },
      });
    }

    return { calendar };
  });

  // PUT /calendar - Update calendar settings
  app.put('/', async (request) => {
    const admin = (request as any).admin;
    const body = updateCalendarSchema.parse(request.body);

    const calendar = await prisma.bosCalendar.update({
      where: { adminId: admin.id },
      data: body,
    });

    return { calendar };
  });

  // ============================================
  // Events
  // ============================================

  // GET /events - Get events (with date range)
  app.get('/events', async (request) => {
    const admin = (request as any).admin;
    const query = request.query as {
      start?: string;
      end?: string;
      type?: string;
      status?: string;
    };

    // Get or create calendar
    let calendar = await prisma.bosCalendar.findUnique({
      where: { adminId: admin.id },
    });

    if (!calendar) {
      calendar = await prisma.bosCalendar.create({
        data: {
          adminId: admin.id,
          name: 'My Calendar',
          isDefault: true,
        },
      });
    }

    const where: Record<string, unknown> = { calendarId: calendar.id };

    // Date range filter (default to current month)
    if (query.start) {
      where.startAt = { gte: new Date(query.start) };
    }
    if (query.end) {
      where.endAt = { ...(where.endAt as object || {}), lte: new Date(query.end) };
    }
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const events = await prisma.bosCalendarEvent.findMany({
      where,
      include: {
        attendees: true,
      },
      orderBy: { startAt: 'asc' },
    });

    return { events };
  });

  // POST /events - Create event
  app.post('/events', async (request) => {
    const admin = (request as any).admin;
    const body = createEventSchema.parse(request.body);

    // Get or create calendar
    let calendar = await prisma.bosCalendar.findUnique({
      where: { adminId: admin.id },
    });

    if (!calendar) {
      calendar = await prisma.bosCalendar.create({
        data: {
          adminId: admin.id,
          name: 'My Calendar',
          isDefault: true,
        },
      });
    }

    const { attendees, ...eventData } = body;

    const event = await prisma.bosCalendarEvent.create({
      data: {
        ...eventData,
        calendarId: calendar.id,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        createdBy: admin.id,
        attendees: attendees ? {
          create: attendees.map((a) => ({
            email: a.email,
            name: a.name,
            role: a.role,
            attendeeType: 'external',
          })),
        } : undefined,
      },
      include: { attendees: true },
    });

    return { event };
  });

  // GET /events/:id - Get event
  app.get('/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const event = await prisma.bosCalendarEvent.findFirst({
      where: { id },
      include: {
        calendar: true,
        attendees: true,
      },
    });

    if (!event || event.calendar.adminId !== admin.id) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    return { event };
  });

  // PUT /events/:id - Update event
  app.put('/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateEventSchema.parse(request.body);
    const admin = (request as any).admin;

    const existing = await prisma.bosCalendarEvent.findFirst({
      where: { id },
      include: { calendar: true },
    });

    if (!existing || existing.calendar.adminId !== admin.id) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const { attendees, ...eventData } = body;

    const event = await prisma.bosCalendarEvent.update({
      where: { id },
      data: {
        ...eventData,
        startAt: body.startAt ? new Date(body.startAt) : undefined,
        endAt: body.endAt ? new Date(body.endAt) : undefined,
      },
      include: { attendees: true },
    });

    // Update attendees if provided
    if (attendees) {
      await prisma.bosEventAttendee.deleteMany({ where: { eventId: id } });
      if (attendees.length > 0) {
        await prisma.bosEventAttendee.createMany({
          data: attendees.map((a) => ({
            eventId: id,
            email: a.email,
            name: a.name,
            role: a.role,
            attendeeType: 'external',
          })),
        });
      }
    }

    return { event };
  });

  // DELETE /events/:id - Delete event
  app.delete('/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const existing = await prisma.bosCalendarEvent.findFirst({
      where: { id },
      include: { calendar: true },
    });

    if (!existing || existing.calendar.adminId !== admin.id) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    await prisma.bosCalendarEvent.delete({ where: { id } });
    return { success: true };
  });

  // PUT /events/:id/cancel - Cancel event
  app.put('/events/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    const admin = (request as any).admin;

    const existing = await prisma.bosCalendarEvent.findFirst({
      where: { id },
      include: { calendar: true },
    });

    if (!existing || existing.calendar.adminId !== admin.id) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const event = await prisma.bosCalendarEvent.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return { event };
  });

  // ============================================
  // Attendees
  // ============================================

  // POST /events/:id/attendees - Add attendee
  app.post('/events/:id/attendees', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      email: z.string().email(),
      name: z.string().optional(),
      role: z.enum(['organizer', 'attendee', 'optional']).default('attendee'),
    }).parse(request.body);
    const admin = (request as any).admin;

    const event = await prisma.bosCalendarEvent.findFirst({
      where: { id },
      include: { calendar: true },
    });

    if (!event || event.calendar.adminId !== admin.id) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const attendee = await prisma.bosEventAttendee.create({
      data: {
        eventId: id,
        email: body.email,
        name: body.name,
        role: body.role,
        attendeeType: 'external',
      },
    });

    return { attendee };
  });

  // DELETE /events/:eventId/attendees/:attendeeId - Remove attendee
  app.delete('/events/:eventId/attendees/:attendeeId', async (request, reply) => {
    const { eventId, attendeeId } = request.params as { eventId: string; attendeeId: string };
    const admin = (request as any).admin;

    const event = await prisma.bosCalendarEvent.findFirst({
      where: { id: eventId },
      include: { calendar: true },
    });

    if (!event || event.calendar.adminId !== admin.id) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    await prisma.bosEventAttendee.delete({ where: { id: attendeeId } });
    return { success: true };
  });

  // PUT /events/:eventId/attendees/:attendeeId/respond - Respond to event
  app.put('/events/:eventId/attendees/:attendeeId/respond', async (request, reply) => {
    const { eventId, attendeeId } = request.params as { eventId: string; attendeeId: string };
    const body = respondToEventSchema.parse(request.body);

    const attendee = await prisma.bosEventAttendee.update({
      where: { id: attendeeId },
      data: {
        status: body.status,
        respondedAt: new Date(),
      },
    });

    return { attendee };
  });

  // ============================================
  // Upcoming / Today
  // ============================================

  // GET /today - Get today's events
  app.get('/today', async (request) => {
    const admin = (request as any).admin;

    const calendar = await prisma.bosCalendar.findUnique({
      where: { adminId: admin.id },
    });

    if (!calendar) {
      return { events: [] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = await prisma.bosCalendarEvent.findMany({
      where: {
        calendarId: calendar.id,
        startAt: { gte: today, lt: tomorrow },
        status: { not: 'cancelled' },
      },
      include: { attendees: true },
      orderBy: { startAt: 'asc' },
    });

    return { events };
  });

  // GET /upcoming - Get upcoming events (next 7 days)
  app.get('/upcoming', async (request) => {
    const admin = (request as any).admin;

    const calendar = await prisma.bosCalendar.findUnique({
      where: { adminId: admin.id },
    });

    if (!calendar) {
      return { events: [] };
    }

    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const events = await prisma.bosCalendarEvent.findMany({
      where: {
        calendarId: calendar.id,
        startAt: { gte: now, lte: nextWeek },
        status: { not: 'cancelled' },
      },
      include: { attendees: true },
      orderBy: { startAt: 'asc' },
      take: 20,
    });

    return { events };
  });

  // ============================================
  // Stats
  // ============================================

  // GET /stats - Calendar stats
  app.get('/stats', async (request) => {
    const admin = (request as any).admin;

    const calendar = await prisma.bosCalendar.findUnique({
      where: { adminId: admin.id },
    });

    if (!calendar) {
      return {
        todayCount: 0,
        weekCount: 0,
        byType: [],
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const [todayCount, weekCount, byType] = await Promise.all([
      prisma.bosCalendarEvent.count({
        where: {
          calendarId: calendar.id,
          startAt: { gte: today, lt: tomorrow },
          status: { not: 'cancelled' },
        },
      }),
      prisma.bosCalendarEvent.count({
        where: {
          calendarId: calendar.id,
          startAt: { gte: today, lt: nextWeek },
          status: { not: 'cancelled' },
        },
      }),
      prisma.bosCalendarEvent.groupBy({
        by: ['type'],
        where: { calendarId: calendar.id },
        _count: true,
      }),
    ]);

    return { todayCount, weekCount, byType };
  });
};
