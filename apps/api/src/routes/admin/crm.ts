import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { adminAuthMiddleware } from './auth.js';

// Zod Schemas
const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  mobilePhone: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  tags: z.array(z.string()).default([]),
  linkedin: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateContactSchema = createContactSchema.partial();

const createCompanySchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  type: z.enum(['prospect', 'customer', 'vendor', 'partner']).default('prospect'),
  status: z.enum(['active', 'inactive']).default('active'),
  tags: z.array(z.string()).default([]),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tenantId: z.string().uuid().optional().nullable(),
});

const updateCompanySchema = createCompanySchema.partial();

const createLeadSchema = z.object({
  title: z.string().min(1).max(200),
  contactId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  source: z.string().optional().nullable(),
  stage: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).default('new'),
  score: z.number().int().min(0).max(100).default(0),
  temperature: z.enum(['cold', 'warm', 'hot']).default('cold'),
  estimatedValue: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  nextFollowUp: z.string().datetime().optional().nullable(),
});

const updateLeadSchema = createLeadSchema.partial();

const createDealSchema = z.object({
  name: z.string().min(1).max(200),
  companyId: z.string().uuid().optional().nullable(),
  stage: z.enum(['discovery', 'proposal', 'negotiation', 'won', 'lost']).default('discovery'),
  value: z.number().min(0).default(0),
  probability: z.number().int().min(0).max(100).default(0),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateDealSchema = createDealSchema.partial();

const createActivitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'note', 'task']),
  subject: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  durationMins: z.number().int().optional().nullable(),
  outcome: z.enum(['positive', 'negative', 'neutral']).optional().nullable(),
});

const convertLeadSchema = z.object({
  tenantName: z.string().min(1),
  tenantSlug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export const adminCrmRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  // ============================================
  // Contacts
  // ============================================

  // GET /contacts - List contacts
  app.get('/contacts', async (request) => {
    const query = request.query as {
      search?: string;
      companyId?: string;
      status?: string;
      page?: string;
      limit?: string;
    };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.companyId) where.companyId = query.companyId;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.crmContact.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          _count: { select: { leads: true, activities: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.crmContact.count({ where }),
    ]);

    return { contacts, total, page, limit };
  });

  // POST /contacts - Create contact
  app.post('/contacts', async (request) => {
    const body = createContactSchema.parse(request.body);
    const admin = (request as any).admin;

    const contact = await prisma.crmContact.create({
      data: {
        ...body,
        ownerId: admin.id,
      },
      include: { company: { select: { id: true, name: true } } },
    });

    return { contact };
  });

  // GET /contacts/:id - Get contact
  app.get('/contacts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const contact = await prisma.crmContact.findUnique({
      where: { id },
      include: {
        company: true,
        leads: { orderBy: { createdAt: 'desc' }, take: 10 },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!contact) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    return { contact };
  });

  // PUT /contacts/:id - Update contact
  app.put('/contacts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateContactSchema.parse(request.body);

    const existing = await prisma.crmContact.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    const contact = await prisma.crmContact.update({
      where: { id },
      data: body,
    });

    return { contact };
  });

  // DELETE /contacts/:id - Delete contact
  app.delete('/contacts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.crmContact.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    await prisma.crmContact.delete({ where: { id } });
    return { success: true };
  });

  // ============================================
  // Companies
  // ============================================

  // GET /companies - List companies
  app.get('/companies', async (request) => {
    const query = request.query as {
      search?: string;
      type?: string;
      status?: string;
      page?: string;
      limit?: string;
    };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [companies, total] = await Promise.all([
      prisma.crmCompany.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          _count: { select: { contacts: true, leads: true, deals: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.crmCompany.count({ where }),
    ]);

    return { companies, total, page, limit };
  });

  // POST /companies - Create company
  app.post('/companies', async (request) => {
    const body = createCompanySchema.parse(request.body);
    const admin = (request as any).admin;

    const company = await prisma.crmCompany.create({
      data: {
        ...body,
        ownerId: admin.id,
      },
    });

    return { company };
  });

  // GET /companies/:id - Get company
  app.get('/companies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const company = await prisma.crmCompany.findUnique({
      where: { id },
      include: {
        tenant: true,
        contacts: { orderBy: { createdAt: 'desc' } },
        leads: { orderBy: { createdAt: 'desc' } },
        deals: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!company) {
      return reply.status(404).send({ error: 'Company not found' });
    }

    return { company };
  });

  // PUT /companies/:id - Update company
  app.put('/companies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateCompanySchema.parse(request.body);

    const existing = await prisma.crmCompany.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Company not found' });
    }

    const company = await prisma.crmCompany.update({
      where: { id },
      data: body,
    });

    return { company };
  });

  // DELETE /companies/:id - Soft delete company
  app.delete('/companies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.crmCompany.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Company not found' });
    }

    await prisma.crmCompany.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  });

  // ============================================
  // Leads
  // ============================================

  // GET /leads - List leads
  app.get('/leads', async (request) => {
    const query = request.query as {
      search?: string;
      stage?: string;
      temperature?: string;
      source?: string;
      page?: string;
      limit?: string;
    };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    const where: Record<string, unknown> = {};
    if (query.stage) where.stage = query.stage;
    if (query.temperature) where.temperature = query.temperature;
    if (query.source) where.source = query.source;
    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    const [leads, total] = await Promise.all([
      prisma.crmLead.findMany({
        where,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          company: { select: { id: true, name: true } },
          _count: { select: { activities: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.crmLead.count({ where }),
    ]);

    return { leads, total, page, limit };
  });

  // POST /leads - Create lead
  app.post('/leads', async (request) => {
    const body = createLeadSchema.parse(request.body);
    const admin = (request as any).admin;

    const lead = await prisma.crmLead.create({
      data: {
        ...body,
        nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : null,
        ownerId: admin.id,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
      },
    });

    return { lead };
  });

  // GET /leads/:id - Get lead
  app.get('/leads/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const lead = await prisma.crmLead.findUnique({
      where: { id },
      include: {
        contact: true,
        company: true,
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!lead) {
      return reply.status(404).send({ error: 'Lead not found' });
    }

    return { lead };
  });

  // PUT /leads/:id - Update lead
  app.put('/leads/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateLeadSchema.parse(request.body);

    const existing = await prisma.crmLead.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Lead not found' });
    }

    const lead = await prisma.crmLead.update({
      where: { id },
      data: {
        ...body,
        nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : undefined,
      },
    });

    return { lead };
  });

  // DELETE /leads/:id - Delete lead
  app.delete('/leads/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.crmLead.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Lead not found' });
    }

    await prisma.crmLead.delete({ where: { id } });
    return { success: true };
  });

  // POST /leads/:id/convert - Convert lead to tenant
  app.post('/leads/:id/convert', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = convertLeadSchema.parse(request.body);

    const lead = await prisma.crmLead.findUnique({
      where: { id },
      include: { contact: true, company: true },
    });

    if (!lead) {
      return reply.status(404).send({ error: 'Lead not found' });
    }

    if (lead.stage === 'converted') {
      return reply.status(400).send({ error: 'Lead already converted' });
    }

    // Check slug uniqueness
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: body.tenantSlug },
    });
    if (existingTenant) {
      return reply.status(400).send({ error: 'Tenant slug already exists' });
    }

    // Create tenant and update lead in transaction
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: body.tenantName,
          slug: body.tenantSlug,
          status: 'trial',
        },
      });

      // Update lead to converted
      await tx.crmLead.update({
        where: { id },
        data: {
          stage: 'converted',
          convertedAt: new Date(),
          convertedToTenantId: tenant.id,
        },
      });

      // Link company to tenant if exists
      if (lead.companyId) {
        await tx.crmCompany.update({
          where: { id: lead.companyId },
          data: {
            tenantId: tenant.id,
            type: 'customer',
          },
        });
      }

      return tenant;
    });

    return { success: true, tenant: result };
  });

  // ============================================
  // Deals / Opportunities
  // ============================================

  // GET /deals - List deals
  app.get('/deals', async (request) => {
    const query = request.query as {
      search?: string;
      stage?: string;
      companyId?: string;
      page?: string;
      limit?: string;
    };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    const where: Record<string, unknown> = {};
    if (query.stage) where.stage = query.stage;
    if (query.companyId) where.companyId = query.companyId;
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [deals, total] = await Promise.all([
      prisma.crmDeal.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          _count: { select: { activities: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.crmDeal.count({ where }),
    ]);

    // Calculate pipeline metrics
    const pipeline = await prisma.crmDeal.groupBy({
      by: ['stage'],
      _sum: { value: true },
      _count: true,
    });

    return { deals, total, page, limit, pipeline };
  });

  // POST /deals - Create deal
  app.post('/deals', async (request) => {
    const body = createDealSchema.parse(request.body);
    const admin = (request as any).admin;

    const deal = await prisma.crmDeal.create({
      data: {
        ...body,
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
        ownerId: admin.id,
      },
      include: { company: { select: { id: true, name: true } } },
    });

    return { deal };
  });

  // GET /deals/:id - Get deal
  app.get('/deals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const deal = await prisma.crmDeal.findUnique({
      where: { id },
      include: {
        company: true,
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!deal) {
      return reply.status(404).send({ error: 'Deal not found' });
    }

    return { deal };
  });

  // PUT /deals/:id - Update deal
  app.put('/deals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateDealSchema.parse(request.body);

    const existing = await prisma.crmDeal.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Deal not found' });
    }

    const deal = await prisma.crmDeal.update({
      where: { id },
      data: {
        ...body,
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
        actualCloseDate: body.stage === 'won' || body.stage === 'lost' ? new Date() : undefined,
      },
    });

    return { deal };
  });

  // DELETE /deals/:id - Delete deal
  app.delete('/deals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.crmDeal.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Deal not found' });
    }

    await prisma.crmDeal.delete({ where: { id } });
    return { success: true };
  });

  // ============================================
  // Activities
  // ============================================

  // GET /activities - List activities
  app.get('/activities', async (request) => {
    const query = request.query as {
      type?: string;
      companyId?: string;
      contactId?: string;
      leadId?: string;
      dealId?: string;
      page?: string;
      limit?: string;
    };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);

    const where: Record<string, unknown> = {};
    if (query.type) where.type = query.type;
    if (query.companyId) where.companyId = query.companyId;
    if (query.contactId) where.contactId = query.contactId;
    if (query.leadId) where.leadId = query.leadId;
    if (query.dealId) where.dealId = query.dealId;

    const [activities, total] = await Promise.all([
      prisma.crmActivity.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          lead: { select: { id: true, title: true } },
          deal: { select: { id: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.crmActivity.count({ where }),
    ]);

    return { activities, total, page, limit };
  });

  // POST /activities - Create activity
  app.post('/activities', async (request) => {
    const body = createActivitySchema.parse(request.body);
    const admin = (request as any).admin;

    const activity = await prisma.crmActivity.create({
      data: {
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        ownerId: admin.id,
      },
    });

    return { activity };
  });

  // PUT /activities/:id/complete - Mark activity complete
  app.put('/activities/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { outcome?: string };

    const existing = await prisma.crmActivity.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Activity not found' });
    }

    const activity = await prisma.crmActivity.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        outcome: body.outcome,
      },
    });

    return { activity };
  });

  // DELETE /activities/:id - Delete activity
  app.delete('/activities/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.crmActivity.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Activity not found' });
    }

    await prisma.crmActivity.delete({ where: { id } });
    return { success: true };
  });

  // ============================================
  // Dashboard / Stats
  // ============================================

  // GET /stats - CRM dashboard stats
  app.get('/stats', async () => {
    const [
      contactCount,
      companyCount,
      leadsByStage,
      dealsByStage,
      recentActivities,
      hotLeads,
    ] = await Promise.all([
      prisma.crmContact.count({ where: { status: 'active' } }),
      prisma.crmCompany.count({ where: { deletedAt: null } }),
      prisma.crmLead.groupBy({
        by: ['stage'],
        _count: true,
      }),
      prisma.crmDeal.groupBy({
        by: ['stage'],
        _sum: { value: true },
        _count: true,
      }),
      prisma.crmActivity.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { name: true } },
          contact: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.crmLead.findMany({
        where: { temperature: 'hot', stage: { not: 'converted' } },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          contact: { select: { firstName: true, lastName: true } },
          company: { select: { name: true } },
        },
      }),
    ]);

    const totalPipelineValue = dealsByStage
      .filter((d) => d.stage !== 'won' && d.stage !== 'lost')
      .reduce((sum, d) => sum + (d._sum.value || 0), 0);

    const wonValue = dealsByStage.find((d) => d.stage === 'won')?._sum.value || 0;

    return {
      contactCount,
      companyCount,
      leadsByStage,
      dealsByStage,
      totalPipelineValue,
      wonValue,
      recentActivities,
      hotLeads,
    };
  });
};
