# AgentWorks BOS - MVP Definition

**Version**: 1.0
**Last Updated**: December 2024

---

## MVP Philosophy

The MVP focuses on delivering core functionality for each module with minimal complexity. Advanced features are deferred to post-MVP phases.

---

## MVP Scope Summary

| Module | MVP Scope | Deferred |
|--------|-----------|----------|
| **RBAC** | Roles, permissions, user assignment | Groups, hierarchy, expiration |
| **CRM** | Leads, contacts, activities | Deals pipeline, vendor management |
| **Tickets** | Basic tickets, comments | Queues, SLAs, auto-routing |
| **Workspace** | Personal Kanban, tasks | Notes, team boards |
| **Calendar** | Personal calendar, events | Team calendars, attendees |
| **Teams** | Basic P2P rooms | Whiteboard, recording |

---

## Phase 1 MVP: Foundation (Week 1)

### Database Models

```prisma
// MVP RBAC - Simplified
model AdminPermission {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  resource    String
  action      String
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  rolePermissions AdminRolePermission[]
}

model AdminRole {
  id          String   @id @default(uuid())
  name        String   @unique
  displayName String
  description String?
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  permissions AdminRolePermission[]
  userRoles   AdminUserRole[]
}

model AdminRolePermission {
  id           String   @id @default(uuid())
  roleId       String
  permissionId String
  role       AdminRole       @relation(...)
  permission AdminPermission @relation(...)
  @@unique([roleId, permissionId])
}

model AdminUserRole {
  id        String   @id @default(uuid())
  adminId   String
  roleId    String
  grantedAt DateTime @default(now())
  admin AdminUser @relation(...)
  role  AdminRole @relation(...)
  @@unique([adminId, roleId])
}
```

### MVP Features

- [x] Permission CRUD (seeded defaults)
- [x] Role CRUD with permission assignment
- [x] User role assignment
- [x] Permission checking middleware
- [x] UI permission gating

### MVP Endpoints

```
GET    /api/admin/permissions      # List all permissions
GET    /api/admin/roles            # List all roles
POST   /api/admin/roles            # Create role
PUT    /api/admin/roles/:id        # Update role
DELETE /api/admin/roles/:id        # Delete role
PUT    /api/admin/roles/:id/permissions  # Set role permissions
GET    /api/admin/users/:id/roles  # Get user roles
PUT    /api/admin/users/:id/roles  # Set user roles
```

### MVP Pages

- `/admin/roles` - Role management list
- `/admin/users` - User list with role badges

---

## Phase 2 MVP: CRM Core (Week 2)

### Database Models

```prisma
// MVP CRM - Leads and Contacts only
model CrmContact {
  id           String    @id @default(uuid())
  firstName    String
  lastName     String
  email        String?
  phone        String?
  jobTitle     String?
  company      String?   // Simple text, not relational
  status       String    @default("active")
  ownerId      String?
  tags         String[]  @default([])
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  leads        CrmLead[]
  activities   CrmActivity[]
}

model CrmLead {
  id           String    @id @default(uuid())
  contactId    String?
  title        String
  source       String?
  stage        String    @default("new")
  temperature  String    @default("cold")
  ownerId      String?
  convertedAt  DateTime?
  tenantId     String?   // Links to converted Tenant
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  contact      CrmContact? @relation(...)
  activities   CrmActivity[]
}

model CrmActivity {
  id           String    @id @default(uuid())
  contactId    String?
  leadId       String?
  type         String    // call, email, meeting, note
  subject      String
  description  String?
  completedAt  DateTime?
  ownerId      String?
  createdAt    DateTime  @default(now())
  contact      CrmContact? @relation(...)
  lead         CrmLead?    @relation(...)
}
```

### MVP Features

- [x] Contact CRUD with search/filter
- [x] Lead CRUD with stage progression
- [x] Activity logging (manual)
- [x] Lead → Tenant conversion
- [x] Activity timeline per entity

### MVP Endpoints

```
GET    /api/crm/contacts           # List contacts
POST   /api/crm/contacts           # Create contact
GET    /api/crm/contacts/:id       # Get contact
PUT    /api/crm/contacts/:id       # Update contact
DELETE /api/crm/contacts/:id       # Delete contact

GET    /api/crm/leads              # List leads
POST   /api/crm/leads              # Create lead
GET    /api/crm/leads/:id          # Get lead
PUT    /api/crm/leads/:id          # Update lead
DELETE /api/crm/leads/:id          # Delete lead
POST   /api/crm/leads/:id/convert  # Convert to Tenant

GET    /api/crm/activities         # List activities
POST   /api/crm/activities         # Create activity
```

### MVP Pages

- `/crm/contacts` - Contact list with filters
- `/crm/contacts/:id` - Contact detail with activities
- `/crm/leads` - Lead list with stage filters
- `/crm/leads/:id` - Lead detail with activities

---

## Phase 3 MVP: Support Tickets (Week 3)

### Database Models

```prisma
// MVP Tickets - Basic without queues/SLAs
model SupportTicket {
  id            String    @id @default(uuid())
  ticketNumber  String    @unique
  subject       String
  description   String
  status        String    @default("new")
  priority      String    @default("medium")
  reporterEmail String?
  reporterName  String?
  tenantId      String?
  assigneeId    String?
  resolvedAt    DateTime?
  tags          String[]  @default([])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  tenant        Tenant?   @relation(...)
  comments      TicketComment[]
}

model TicketComment {
  id           String    @id @default(uuid())
  ticketId     String
  authorId     String?
  authorName   String?
  content      String
  isInternal   Boolean   @default(false)
  createdAt    DateTime  @default(now())
  ticket       SupportTicket @relation(...)
}
```

### MVP Features

- [x] Ticket CRUD with auto-numbering
- [x] Status transitions (new → open → resolved → closed)
- [x] Comment thread (public + internal)
- [x] Assignment to admin users
- [x] Filter by status, priority, assignee

### MVP Endpoints

```
GET    /api/tickets                # List tickets
POST   /api/tickets                # Create ticket
GET    /api/tickets/:id            # Get ticket
PUT    /api/tickets/:id            # Update ticket
DELETE /api/tickets/:id            # Delete ticket

GET    /api/tickets/:id/comments   # List comments
POST   /api/tickets/:id/comments   # Add comment
```

### MVP Pages

- `/support/tickets` - Ticket list with filters
- `/support/tickets/:id` - Ticket detail with comments

---

## Phase 4 MVP: Personal Workspace (Week 4)

### Database Models

```prisma
// MVP Workspace - Personal Kanban only
model PersonalKanban {
  id           String   @id @default(uuid())
  adminId      String   @unique
  name         String   @default("My Tasks")
  lanes        Json     @default("[...]")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  tasks        PersonalTask[]
}

model PersonalTask {
  id           String    @id @default(uuid())
  kanbanId     String
  title        String
  description  String?
  laneId       String    @default("todo")
  position     Int       @default(0)
  priority     String    @default("medium")
  dueDate      DateTime?
  completed    Boolean   @default(false)
  completedAt  DateTime?
  relatedType  String?
  relatedId    String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  kanban       PersonalKanban @relation(...)
}
```

### MVP Features

- [x] Auto-create Kanban for user on first access
- [x] Task CRUD
- [x] Drag-and-drop between lanes
- [x] Link task to CRM lead or ticket
- [x] Due date display

### MVP Endpoints

```
GET    /api/workspace/kanban       # Get user's Kanban
PUT    /api/workspace/kanban       # Update lanes

GET    /api/workspace/tasks        # List tasks
POST   /api/workspace/tasks        # Create task
PUT    /api/workspace/tasks/:id    # Update task
DELETE /api/workspace/tasks/:id    # Delete task
PUT    /api/workspace/tasks/reorder  # Bulk reorder
```

### MVP Pages

- `/work/my-board` - Personal Kanban board

---

## Phase 5 MVP: Calendar (Week 5)

### Database Models

```prisma
// MVP Calendar - Personal only
model Calendar {
  id           String   @id @default(uuid())
  adminId      String   @unique
  name         String   @default("My Calendar")
  timezone     String   @default("America/New_York")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  events       CalendarEvent[]
}

model CalendarEvent {
  id           String    @id @default(uuid())
  calendarId   String
  title        String
  description  String?
  type         String    @default("meeting")
  startAt      DateTime
  endAt        DateTime
  isAllDay     Boolean   @default(false)
  location     String?
  relatedType  String?
  relatedId    String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  calendar     Calendar  @relation(...)
}
```

### MVP Features

- [x] Auto-create calendar for user on first access
- [x] Event CRUD
- [x] Month view rendering
- [x] Week view rendering
- [x] Link event to CRM lead or ticket

### MVP Endpoints

```
GET    /api/calendar               # Get user's calendar
GET    /api/calendar/events        # List events (with date range)
POST   /api/calendar/events        # Create event
PUT    /api/calendar/events/:id    # Update event
DELETE /api/calendar/events/:id    # Delete event
```

### MVP Pages

- `/calendar/my` - Personal calendar (month/week views)

---

## Phase 6 MVP: Teams (Week 6)

### Database Models

```prisma
// MVP Teams - Basic rooms only
model TeamRoom {
  id           String    @id @default(uuid())
  name         String
  status       String    @default("waiting")
  startedAt    DateTime?
  endedAt      DateTime?
  createdBy    String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  participants TeamRoomParticipant[]
}

model TeamRoomParticipant {
  id            String    @id @default(uuid())
  roomId        String
  participantId String
  displayName   String?
  joinedAt      DateTime?
  leftAt        DateTime?
  room          TeamRoom  @relation(...)
  @@unique([roomId, participantId])
}
```

### MVP Features

- [x] Create instant room
- [x] Join room by URL
- [x] P2P video/audio (WebRTC)
- [x] Screen share
- [x] Basic in-room chat

### MVP Endpoints

```
POST   /api/teams/rooms            # Create room
GET    /api/teams/rooms/:id        # Get room
POST   /api/teams/rooms/:id/join   # Join room
POST   /api/teams/rooms/:id/leave  # Leave room
GET    /api/teams/rooms/:id/token  # Get WebRTC signaling token
```

### MVP Pages

- `/teams/sessions` - Room list / create room
- `/teams/room/:id` - Active room view

---

## Deferred to Post-MVP

### RBAC Enhancements
- Group hierarchies
- Role expiration dates
- Permission inheritance
- Audit logging

### CRM Enhancements
- Full Company model with relations
- Deal/Opportunity pipeline
- Vendor management
- Advanced reporting

### Ticket Enhancements
- Queue routing
- SLA policies and tracking
- Auto-assignment rules
- Ticket categories

### Workspace Enhancements
- Personal notes
- Team boards
- Project tracking
- Task dependencies

### Calendar Enhancements
- Team calendars
- Attendee management
- External calendar sync
- Recurring events

### Teams Enhancements
- Whiteboard (tldraw)
- Recording/playback
- Scheduled rooms
- Mediasoup SFU for large rooms

---

## MVP Success Criteria

| Module | Success Metric |
|--------|----------------|
| RBAC | Can assign role to user, permission blocks unauthorized action |
| CRM | Can create lead, log activity, convert to tenant |
| Tickets | Can create ticket, add comments, resolve |
| Workspace | Can create task, drag between lanes |
| Calendar | Can create event, view in month/week |
| Teams | Can create room, join with video |

---

## MVP Timeline

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Foundation | RBAC models + admin pages |
| 2 | CRM | Contacts + Leads + Activities |
| 3 | Tickets | Basic ticket management |
| 4 | Workspace | Personal Kanban |
| 5 | Calendar | Personal calendar |
| 6 | Teams | Basic video rooms |

---

## Technical Priorities

1. **Database First**: All models in Prisma schema before UI
2. **API Second**: Endpoints with validation before pages
3. **UI Third**: Pages following existing admin patterns
4. **Integration Fourth**: Link entities (lead→tenant, task→lead)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| WebRTC complexity | Use simple-peer library, defer SFU |
| Migration conflicts | Incremental schema changes |
| Scope creep | Strict MVP boundary, defer enhancements |
| Timeline pressure | Focus on core flows, polish later |
