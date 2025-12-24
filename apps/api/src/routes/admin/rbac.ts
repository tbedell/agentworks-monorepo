import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { adminAuthMiddleware } from './auth.js';

// Zod Schemas
const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  description: z.string().optional(),
  level: z.number().int().min(0).max(100).default(0),
  color: z.string().optional(),
});

const updateRoleSchema = createRoleSchema.partial();

const createGroupSchema = z.object({
  name: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  color: z.string().optional(),
});

const updateGroupSchema = createGroupSchema.partial();

const assignRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

const assignGroupsSchema = z.object({
  groupIds: z.array(z.string().uuid()),
});

const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});

export const adminRbacRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', adminAuthMiddleware);

  // ============================================
  // Permissions
  // ============================================

  // GET /permissions - List all permissions
  app.get('/permissions', async (request) => {
    const query = request.query as { resource?: string };

    const where: Record<string, unknown> = {};
    if (query.resource) where.resource = query.resource;

    const permissions = await prisma.adminPermission.findMany({
      where,
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    // Group by resource
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) acc[perm.resource] = [];
      acc[perm.resource].push(perm);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return { permissions, grouped };
  });

  // POST /permissions/seed - Seed default permissions
  app.post('/permissions/seed', async () => {
    const defaultPermissions = [
      // CRM permissions
      { code: 'crm:lead:create', name: 'Create Leads', resource: 'crm', action: 'create', isSystem: true },
      { code: 'crm:lead:read', name: 'View Leads', resource: 'crm', action: 'read', isSystem: true },
      { code: 'crm:lead:update', name: 'Edit Leads', resource: 'crm', action: 'update', isSystem: true },
      { code: 'crm:lead:delete', name: 'Delete Leads', resource: 'crm', action: 'delete', isSystem: true },
      { code: 'crm:contact:create', name: 'Create Contacts', resource: 'crm', action: 'create', isSystem: true },
      { code: 'crm:contact:read', name: 'View Contacts', resource: 'crm', action: 'read', isSystem: true },
      { code: 'crm:contact:update', name: 'Edit Contacts', resource: 'crm', action: 'update', isSystem: true },
      { code: 'crm:contact:delete', name: 'Delete Contacts', resource: 'crm', action: 'delete', isSystem: true },
      { code: 'crm:company:create', name: 'Create Companies', resource: 'crm', action: 'create', isSystem: true },
      { code: 'crm:company:read', name: 'View Companies', resource: 'crm', action: 'read', isSystem: true },
      { code: 'crm:company:update', name: 'Edit Companies', resource: 'crm', action: 'update', isSystem: true },
      { code: 'crm:company:delete', name: 'Delete Companies', resource: 'crm', action: 'delete', isSystem: true },
      { code: 'crm:deal:create', name: 'Create Deals', resource: 'crm', action: 'create', isSystem: true },
      { code: 'crm:deal:read', name: 'View Deals', resource: 'crm', action: 'read', isSystem: true },
      { code: 'crm:deal:update', name: 'Edit Deals', resource: 'crm', action: 'update', isSystem: true },
      { code: 'crm:deal:delete', name: 'Delete Deals', resource: 'crm', action: 'delete', isSystem: true },
      // Support permissions
      { code: 'support:ticket:create', name: 'Create Tickets', resource: 'support', action: 'create', isSystem: true },
      { code: 'support:ticket:read', name: 'View Tickets', resource: 'support', action: 'read', isSystem: true },
      { code: 'support:ticket:update', name: 'Edit Tickets', resource: 'support', action: 'update', isSystem: true },
      { code: 'support:ticket:delete', name: 'Delete Tickets', resource: 'support', action: 'delete', isSystem: true },
      { code: 'support:ticket:assign', name: 'Assign Tickets', resource: 'support', action: 'assign', isSystem: true },
      // Calendar permissions
      { code: 'calendar:event:create', name: 'Create Events', resource: 'calendar', action: 'create', isSystem: true },
      { code: 'calendar:event:read', name: 'View Events', resource: 'calendar', action: 'read', isSystem: true },
      { code: 'calendar:event:update', name: 'Edit Events', resource: 'calendar', action: 'update', isSystem: true },
      { code: 'calendar:event:delete', name: 'Delete Events', resource: 'calendar', action: 'delete', isSystem: true },
      // Teams permissions
      { code: 'teams:room:create', name: 'Create Rooms', resource: 'teams', action: 'create', isSystem: true },
      { code: 'teams:room:read', name: 'View Rooms', resource: 'teams', action: 'read', isSystem: true },
      { code: 'teams:room:update', name: 'Edit Rooms', resource: 'teams', action: 'update', isSystem: true },
      { code: 'teams:room:delete', name: 'Delete Rooms', resource: 'teams', action: 'delete', isSystem: true },
      // Admin permissions
      { code: 'admin:user:read', name: 'View Users', resource: 'admin', action: 'read', isSystem: true },
      { code: 'admin:user:update', name: 'Edit Users', resource: 'admin', action: 'update', isSystem: true },
      { code: 'admin:role:create', name: 'Create Roles', resource: 'admin', action: 'create', isSystem: true },
      { code: 'admin:role:read', name: 'View Roles', resource: 'admin', action: 'read', isSystem: true },
      { code: 'admin:role:update', name: 'Edit Roles', resource: 'admin', action: 'update', isSystem: true },
      { code: 'admin:role:delete', name: 'Delete Roles', resource: 'admin', action: 'delete', isSystem: true },
      { code: 'admin:group:create', name: 'Create Groups', resource: 'admin', action: 'create', isSystem: true },
      { code: 'admin:group:read', name: 'View Groups', resource: 'admin', action: 'read', isSystem: true },
      { code: 'admin:group:update', name: 'Edit Groups', resource: 'admin', action: 'update', isSystem: true },
      { code: 'admin:group:delete', name: 'Delete Groups', resource: 'admin', action: 'delete', isSystem: true },
    ];

    let created = 0;
    for (const perm of defaultPermissions) {
      await prisma.adminPermission.upsert({
        where: { code: perm.code },
        update: {},
        create: perm,
      });
      created++;
    }

    return { message: `Seeded ${created} permissions` };
  });

  // ============================================
  // Roles
  // ============================================

  // GET /roles - List all roles
  app.get('/roles', async () => {
    const roles = await prisma.adminRole.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: {
          select: { userRoles: true, groupRoles: true },
        },
      },
      orderBy: { level: 'desc' },
    });

    return {
      roles: roles.map((r) => ({
        ...r,
        permissions: r.permissions.map((p) => p.permission),
        userCount: r._count.userRoles,
        groupCount: r._count.groupRoles,
      })),
    };
  });

  // POST /roles - Create role
  app.post('/roles', async (request, reply) => {
    const body = createRoleSchema.parse(request.body);

    const existing = await prisma.adminRole.findUnique({
      where: { name: body.name },
    });
    if (existing) {
      return reply.status(400).send({ error: 'Role name already exists' });
    }

    const role = await prisma.adminRole.create({
      data: body,
    });

    return { role };
  });

  // GET /roles/:id - Get role with permissions
  app.get('/roles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const role = await prisma.adminRole.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        userRoles: {
          include: { admin: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!role) {
      return reply.status(404).send({ error: 'Role not found' });
    }

    return {
      role: {
        ...role,
        permissions: role.permissions.map((p) => p.permission),
        users: role.userRoles.map((ur) => ur.admin),
      },
    };
  });

  // PUT /roles/:id - Update role
  app.put('/roles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateRoleSchema.parse(request.body);

    const existing = await prisma.adminRole.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Role not found' });
    }
    if (existing.isSystem) {
      return reply.status(400).send({ error: 'Cannot modify system role' });
    }

    const role = await prisma.adminRole.update({
      where: { id },
      data: body,
    });

    return { role };
  });

  // DELETE /roles/:id - Delete role
  app.delete('/roles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.adminRole.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Role not found' });
    }
    if (existing.isSystem) {
      return reply.status(400).send({ error: 'Cannot delete system role' });
    }

    await prisma.adminRole.delete({ where: { id } });
    return { success: true };
  });

  // PUT /roles/:id/permissions - Set role permissions
  app.put('/roles/:id/permissions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { permissionIds } = assignPermissionsSchema.parse(request.body);

    const role = await prisma.adminRole.findUnique({ where: { id } });
    if (!role) {
      return reply.status(404).send({ error: 'Role not found' });
    }

    // Remove existing permissions
    await prisma.adminRolePermission.deleteMany({ where: { roleId: id } });

    // Add new permissions
    if (permissionIds.length > 0) {
      await prisma.adminRolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
      });
    }

    return { success: true, permissionCount: permissionIds.length };
  });

  // POST /roles/seed - Seed default roles
  app.post('/roles/seed', async () => {
    const defaultRoles = [
      { name: 'super_admin', displayName: 'Super Admin', description: 'Full system access', level: 100, isSystem: true, color: '#dc2626' },
      { name: 'admin', displayName: 'Admin', description: 'Administrative access', level: 90, isSystem: true, color: '#ea580c' },
      { name: 'manager', displayName: 'Manager', description: 'Department management', level: 70, isSystem: false, color: '#ca8a04' },
      { name: 'sales', displayName: 'Sales', description: 'CRM and customer access', level: 50, isSystem: false, color: '#16a34a' },
      { name: 'support', displayName: 'Support', description: 'Ticket and customer access', level: 50, isSystem: false, color: '#2563eb' },
      { name: 'developer', displayName: 'Developer', description: 'Technical access', level: 50, isSystem: false, color: '#7c3aed' },
      { name: 'viewer', displayName: 'Viewer', description: 'Read-only access', level: 10, isSystem: false, color: '#64748b' },
    ];

    let created = 0;
    for (const role of defaultRoles) {
      await prisma.adminRole.upsert({
        where: { name: role.name },
        update: {},
        create: role,
      });
      created++;
    }

    return { message: `Seeded ${created} roles` };
  });

  // ============================================
  // Groups
  // ============================================

  // GET /groups - List all groups
  app.get('/groups', async () => {
    const groups = await prisma.adminGroup.findMany({
      include: {
        parent: { select: { id: true, name: true, displayName: true } },
        children: { select: { id: true, name: true, displayName: true } },
        roles: { include: { role: true } },
        _count: { select: { members: true } },
      },
      orderBy: { displayName: 'asc' },
    });

    return {
      groups: groups.map((g) => ({
        ...g,
        roles: g.roles.map((r) => r.role),
        memberCount: g._count.members,
      })),
    };
  });

  // POST /groups - Create group
  app.post('/groups', async (request, reply) => {
    const body = createGroupSchema.parse(request.body);

    const existing = await prisma.adminGroup.findUnique({
      where: { name: body.name },
    });
    if (existing) {
      return reply.status(400).send({ error: 'Group name already exists' });
    }

    const group = await prisma.adminGroup.create({ data: body });
    return { group };
  });

  // GET /groups/:id - Get group details
  app.get('/groups/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const group = await prisma.adminGroup.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        members: {
          include: { admin: { select: { id: true, name: true, email: true, role: true } } },
        },
        roles: { include: { role: true } },
      },
    });

    if (!group) {
      return reply.status(404).send({ error: 'Group not found' });
    }

    return {
      group: {
        ...group,
        members: group.members.map((m) => ({ ...m.admin, isPrimary: m.isPrimary })),
        roles: group.roles.map((r) => r.role),
      },
    };
  });

  // PUT /groups/:id - Update group
  app.put('/groups/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateGroupSchema.parse(request.body);

    const existing = await prisma.adminGroup.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Group not found' });
    }

    const group = await prisma.adminGroup.update({
      where: { id },
      data: body,
    });

    return { group };
  });

  // DELETE /groups/:id - Delete group
  app.delete('/groups/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.adminGroup.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Group not found' });
    }

    await prisma.adminGroup.delete({ where: { id } });
    return { success: true };
  });

  // PUT /groups/:id/roles - Set group roles
  app.put('/groups/:id/roles', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { roleIds } = assignRolesSchema.parse(request.body);

    const group = await prisma.adminGroup.findUnique({ where: { id } });
    if (!group) {
      return reply.status(404).send({ error: 'Group not found' });
    }

    await prisma.adminGroupRole.deleteMany({ where: { groupId: id } });

    if (roleIds.length > 0) {
      await prisma.adminGroupRole.createMany({
        data: roleIds.map((roleId) => ({ groupId: id, roleId })),
      });
    }

    return { success: true };
  });

  // ============================================
  // User Role/Group Assignments
  // ============================================

  // GET /users/:id/roles - Get user roles
  app.get('/users/:id/roles', async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.adminUser.findUnique({
      where: { id },
      include: {
        adminRoles: { include: { role: true } },
        adminGroups: { include: { group: { include: { roles: { include: { role: true } } } } } },
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Get direct roles
    const directRoles = user.adminRoles.map((ur) => ur.role);

    // Get inherited roles from groups
    const inheritedRoles = user.adminGroups.flatMap((ug) =>
      ug.group.roles.map((gr) => ({ ...gr.role, fromGroup: ug.group.displayName }))
    );

    return {
      directRoles,
      inheritedRoles,
      groups: user.adminGroups.map((ug) => ({
        ...ug.group,
        isPrimary: ug.isPrimary,
      })),
    };
  });

  // PUT /users/:id/roles - Set user roles
  app.put('/users/:id/roles', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { roleIds } = assignRolesSchema.parse(request.body);

    const user = await prisma.adminUser.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    await prisma.adminUserRole.deleteMany({ where: { adminId: id } });

    if (roleIds.length > 0) {
      await prisma.adminUserRole.createMany({
        data: roleIds.map((roleId) => ({ adminId: id, roleId })),
      });
    }

    return { success: true };
  });

  // PUT /users/:id/groups - Set user groups
  app.put('/users/:id/groups', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { groupIds } = assignGroupsSchema.parse(request.body);

    const user = await prisma.adminUser.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    await prisma.adminUserGroup.deleteMany({ where: { adminId: id } });

    if (groupIds.length > 0) {
      await prisma.adminUserGroup.createMany({
        data: groupIds.map((groupId, index) => ({
          adminId: id,
          groupId,
          isPrimary: index === 0, // First group is primary
        })),
      });
    }

    return { success: true };
  });

  // GET /users - List users with roles (for admin management)
  app.get('/users', async (request) => {
    const query = request.query as { search?: string; page?: string; limit?: string };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.adminUser.findMany({
        where,
        include: {
          adminRoles: { include: { role: { select: { id: true, name: true, displayName: true, color: true } } } },
          adminGroups: { include: { group: { select: { id: true, name: true, displayName: true, color: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.adminUser.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role, // Legacy role field
        roles: u.adminRoles.map((ur) => ur.role),
        groups: u.adminGroups.map((ug) => ({ ...ug.group, isPrimary: ug.isPrimary })),
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  });
};
