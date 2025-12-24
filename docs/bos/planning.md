# AgentWorks BOS - Implementation Planning

**Version**: 1.0
**Last Updated**: December 2024

---

## Implementation Phases

### Phase Overview

| Phase | Module | Focus | Database Models | Routes | Pages |
|-------|--------|-------|-----------------|--------|-------|
| 1 | Foundation | RBAC | 4 | 8 | 2 |
| 2 | Revenue | CRM | 4 | 15 | 4 |
| 3 | Service | Tickets | 3 | 8 | 2 |
| 4 | Delivery | Workspace | 2 | 6 | 1 |
| 5 | Time | Calendar | 2 | 5 | 1 |
| 6 | Collab | Teams | 2 | 5 | 2 |

---

## Phase 1: Foundation & RBAC

### 1.1 Database Schema

**Files to Modify:**
- `packages/db/prisma/schema.prisma`

**New Models:**
```
AdminPermission
AdminRole
AdminRolePermission
AdminUserRole
```

**Steps:**
1. Add RBAC models to schema.prisma
2. Add relations to existing AdminUser model
3. Run `pnpm --filter @agentworks/db generate`
4. Run `pnpm --filter @agentworks/db push` (dev)
5. Create seed data for default permissions/roles

### 1.2 API Routes

**Files to Create:**
- `apps/api/src/routes/admin-rbac.ts`

**Endpoints:**
```
GET    /api/admin/permissions
GET    /api/admin/roles
POST   /api/admin/roles
PUT    /api/admin/roles/:id
DELETE /api/admin/roles/:id
PUT    /api/admin/roles/:id/permissions
GET    /api/admin/users/:id/roles
PUT    /api/admin/users/:id/roles
```

**Steps:**
1. Create route file with Zod schemas
2. Implement CRUD handlers
3. Add permission checking middleware
4. Register routes in index.ts

### 1.3 Frontend

**Files to Create:**
- `apps/admin/src/lib/permissions.ts`
- `apps/admin/src/stores/rbac.ts`
- `apps/admin/src/routes/admin/RolesList.tsx`
- `apps/admin/src/routes/admin/UserRoles.tsx`
- `apps/admin/src/components/rbac/PermissionGate.tsx`

**Files to Modify:**
- `apps/admin/src/stores/auth.ts` - Add permission checking
- `apps/admin/src/lib/api.ts` - Add RBAC endpoints
- `apps/admin/src/components/layout/AdminLayout.tsx` - Add nav items
- `apps/admin/src/App.tsx` - Add routes

**Steps:**
1. Create permission helper functions
2. Add RBAC store with role/permission fetching
3. Extend auth store with hasPermission()
4. Create PermissionGate component
5. Build RolesList page
6. Modify user management to show roles
7. Update navigation

---

## Phase 2: Mini CRM

### 2.1 Database Schema

**New Models:**
```
CrmContact
CrmLead
CrmActivity
```

**Steps:**
1. Add CRM models to schema.prisma
2. Add relation to Tenant model (for conversion)
3. Generate and push schema
4. Create indexes for common queries

### 2.2 API Routes

**Files to Create:**
- `apps/api/src/routes/crm.ts`

**Endpoints:**
```
GET/POST   /api/crm/contacts
GET/PUT/DELETE /api/crm/contacts/:id
GET/POST   /api/crm/leads
GET/PUT/DELETE /api/crm/leads/:id
POST       /api/crm/leads/:id/convert
GET/POST   /api/crm/activities
```

**Steps:**
1. Create route file with all CRM endpoints
2. Implement contact CRUD
3. Implement lead CRUD with stage validation
4. Implement lead conversion (creates Tenant)
5. Implement activity logging
6. Add permission checks

### 2.3 Frontend

**Files to Create:**
- `apps/admin/src/stores/crm.ts`
- `apps/admin/src/routes/crm/ContactsList.tsx`
- `apps/admin/src/routes/crm/ContactDetail.tsx`
- `apps/admin/src/routes/crm/LeadsList.tsx`
- `apps/admin/src/routes/crm/LeadDetail.tsx`
- `apps/admin/src/components/crm/ContactForm.tsx`
- `apps/admin/src/components/crm/LeadForm.tsx`
- `apps/admin/src/components/crm/ActivityTimeline.tsx`
- `apps/admin/src/components/crm/ActivityForm.tsx`

**Files to Modify:**
- `apps/admin/src/lib/api.ts` - Add CRM namespace
- `apps/admin/src/components/layout/AdminLayout.tsx` - Add CRM nav
- `apps/admin/src/App.tsx` - Add CRM routes

**Steps:**
1. Create CRM store with contacts/leads state
2. Add API client functions
3. Build ContactsList with filters
4. Build ContactDetail with activities
5. Build LeadsList with stage filters
6. Build LeadDetail with conversion button
7. Add activity timeline component
8. Update navigation with CRM section

---

## Phase 3: Support Tickets

### 3.1 Database Schema

**New Models:**
```
SupportTicket
TicketComment
```

**Steps:**
1. Add ticket models to schema.prisma
2. Add relation to Tenant model
3. Generate and push schema
4. Add ticket number sequence logic

### 3.2 API Routes

**Files to Create:**
- `apps/api/src/routes/tickets.ts`

**Endpoints:**
```
GET/POST   /api/tickets
GET/PUT/DELETE /api/tickets/:id
GET/POST   /api/tickets/:id/comments
```

**Steps:**
1. Create route file
2. Implement ticket CRUD with auto-numbering
3. Implement status transitions
4. Implement comment thread
5. Add assignment logic
6. Add permission checks

### 3.3 Frontend

**Files to Create:**
- `apps/admin/src/stores/tickets.ts`
- `apps/admin/src/routes/tickets/TicketsList.tsx`
- `apps/admin/src/routes/tickets/TicketDetail.tsx`
- `apps/admin/src/components/tickets/TicketForm.tsx`
- `apps/admin/src/components/tickets/TicketCard.tsx`
- `apps/admin/src/components/tickets/CommentThread.tsx`

**Steps:**
1. Create tickets store
2. Add API client functions
3. Build TicketsList with filters
4. Build TicketDetail with comments
5. Add comment form
6. Update navigation

---

## Phase 4: Personal Workspace

### 4.1 Database Schema

**New Models:**
```
PersonalKanban
PersonalTask
```

**Steps:**
1. Add workspace models
2. Generate and push schema
3. Create auto-initialization logic

### 4.2 API Routes

**Files to Create:**
- `apps/api/src/routes/workspace.ts`

**Endpoints:**
```
GET/PUT    /api/workspace/kanban
GET/POST   /api/workspace/tasks
PUT/DELETE /api/workspace/tasks/:id
PUT        /api/workspace/tasks/reorder
```

**Steps:**
1. Create route file
2. Implement kanban get/update
3. Implement task CRUD
4. Implement drag-drop reorder
5. Add auto-create on first access

### 4.3 Frontend

**Files to Create:**
- `apps/admin/src/stores/workspace.ts`
- `apps/admin/src/routes/work/MyKanban.tsx`
- `apps/admin/src/components/kanban/AdminKanbanBoard.tsx`
- `apps/admin/src/components/kanban/AdminKanbanLane.tsx`
- `apps/admin/src/components/kanban/AdminKanbanCard.tsx`
- `apps/admin/src/components/kanban/TaskForm.tsx`

**Steps:**
1. Adapt Kanban components from web app
2. Create workspace store
3. Add API client functions
4. Build MyKanban page
5. Implement drag-drop with dnd-kit
6. Add task linking to CRM/tickets
7. Update navigation

---

## Phase 5: Calendar

### 5.1 Database Schema

**New Models:**
```
Calendar
CalendarEvent
```

**Steps:**
1. Add calendar models
2. Generate and push schema
3. Create auto-initialization logic

### 5.2 API Routes

**Files to Create:**
- `apps/api/src/routes/calendar.ts`

**Endpoints:**
```
GET        /api/calendar
GET/POST   /api/calendar/events
PUT/DELETE /api/calendar/events/:id
```

**Steps:**
1. Create route file
2. Implement calendar get (auto-create)
3. Implement event CRUD
4. Add date range filtering
5. Add entity linking

### 5.3 Frontend

**Files to Create:**
- `apps/admin/src/stores/calendar.ts`
- `apps/admin/src/routes/calendar/MyCalendar.tsx`
- `apps/admin/src/components/calendar/CalendarView.tsx`
- `apps/admin/src/components/calendar/MonthView.tsx`
- `apps/admin/src/components/calendar/WeekView.tsx`
- `apps/admin/src/components/calendar/EventForm.tsx`
- `apps/admin/src/components/calendar/EventCard.tsx`

**Steps:**
1. Create calendar store
2. Add API client functions
3. Build MonthView component
4. Build WeekView component
5. Build CalendarView with view switching
6. Build MyCalendar page
7. Add event creation modal
8. Update navigation

---

## Phase 6: Teams

### 6.1 Database Schema

**New Models:**
```
TeamRoom
TeamRoomParticipant
```

**Steps:**
1. Add team models
2. Generate and push schema

### 6.2 API Routes

**Files to Create:**
- `apps/api/src/routes/teams.ts`

**Endpoints:**
```
GET/POST   /api/teams/rooms
GET        /api/teams/rooms/:id
POST       /api/teams/rooms/:id/join
POST       /api/teams/rooms/:id/leave
```

**Steps:**
1. Create route file
2. Implement room CRUD
3. Implement join/leave
4. Add WebSocket signaling endpoint

### 6.3 Frontend

**Files to Create:**
- `apps/admin/src/stores/teams.ts`
- `apps/admin/src/routes/teams/SessionsList.tsx`
- `apps/admin/src/routes/teams/RoomView.tsx`
- `apps/admin/src/components/teams/VideoGrid.tsx`
- `apps/admin/src/components/teams/Controls.tsx`
- `apps/admin/src/lib/webrtc.ts`

**Steps:**
1. Create teams store
2. Add API client functions
3. Build SessionsList page
4. Build RoomView with video grid
5. Implement WebRTC P2P connection
6. Add media controls
7. Add screen share
8. Update navigation

---

## File Change Summary

### New Files (by phase)

**Phase 1 (8 files):**
- `apps/api/src/routes/admin-rbac.ts`
- `apps/admin/src/lib/permissions.ts`
- `apps/admin/src/stores/rbac.ts`
- `apps/admin/src/routes/admin/RolesList.tsx`
- `apps/admin/src/routes/admin/UserRoles.tsx`
- `apps/admin/src/components/rbac/PermissionGate.tsx`
- `apps/admin/src/components/rbac/RoleForm.tsx`
- `apps/admin/src/components/rbac/RoleBadge.tsx`

**Phase 2 (12 files):**
- `apps/api/src/routes/crm.ts`
- `apps/admin/src/stores/crm.ts`
- `apps/admin/src/routes/crm/ContactsList.tsx`
- `apps/admin/src/routes/crm/ContactDetail.tsx`
- `apps/admin/src/routes/crm/LeadsList.tsx`
- `apps/admin/src/routes/crm/LeadDetail.tsx`
- `apps/admin/src/components/crm/ContactForm.tsx`
- `apps/admin/src/components/crm/ContactCard.tsx`
- `apps/admin/src/components/crm/LeadForm.tsx`
- `apps/admin/src/components/crm/LeadCard.tsx`
- `apps/admin/src/components/crm/ActivityTimeline.tsx`
- `apps/admin/src/components/crm/ActivityForm.tsx`

**Phase 3 (8 files):**
- `apps/api/src/routes/tickets.ts`
- `apps/admin/src/stores/tickets.ts`
- `apps/admin/src/routes/tickets/TicketsList.tsx`
- `apps/admin/src/routes/tickets/TicketDetail.tsx`
- `apps/admin/src/components/tickets/TicketForm.tsx`
- `apps/admin/src/components/tickets/TicketCard.tsx`
- `apps/admin/src/components/tickets/CommentThread.tsx`
- `apps/admin/src/components/tickets/StatusBadge.tsx`

**Phase 4 (8 files):**
- `apps/api/src/routes/workspace.ts`
- `apps/admin/src/stores/workspace.ts`
- `apps/admin/src/routes/work/MyKanban.tsx`
- `apps/admin/src/components/kanban/AdminKanbanBoard.tsx`
- `apps/admin/src/components/kanban/AdminKanbanLane.tsx`
- `apps/admin/src/components/kanban/AdminKanbanCard.tsx`
- `apps/admin/src/components/kanban/TaskForm.tsx`
- `apps/admin/src/components/kanban/TaskLinkSelector.tsx`

**Phase 5 (9 files):**
- `apps/api/src/routes/calendar.ts`
- `apps/admin/src/stores/calendar.ts`
- `apps/admin/src/routes/calendar/MyCalendar.tsx`
- `apps/admin/src/components/calendar/CalendarView.tsx`
- `apps/admin/src/components/calendar/MonthView.tsx`
- `apps/admin/src/components/calendar/WeekView.tsx`
- `apps/admin/src/components/calendar/DayView.tsx`
- `apps/admin/src/components/calendar/EventForm.tsx`
- `apps/admin/src/components/calendar/EventCard.tsx`

**Phase 6 (8 files):**
- `apps/api/src/routes/teams.ts`
- `apps/admin/src/stores/teams.ts`
- `apps/admin/src/routes/teams/SessionsList.tsx`
- `apps/admin/src/routes/teams/RoomView.tsx`
- `apps/admin/src/components/teams/VideoGrid.tsx`
- `apps/admin/src/components/teams/Controls.tsx`
- `apps/admin/src/components/teams/Chat.tsx`
- `apps/admin/src/lib/webrtc.ts`

### Modified Files (all phases)

- `packages/db/prisma/schema.prisma` - All new models
- `apps/api/src/index.ts` - Route registration
- `apps/admin/src/lib/api.ts` - API client extensions
- `apps/admin/src/stores/auth.ts` - Permission checking
- `apps/admin/src/components/layout/AdminLayout.tsx` - Navigation
- `apps/admin/src/App.tsx` - Route definitions

---

## Dependencies to Install

```bash
# Admin app
cd apps/admin
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
pnpm add simple-peer  # WebRTC (Phase 6)
```

---

## Database Migration Strategy

### Development
```bash
# After each schema change
pnpm --filter @agentworks/db generate
pnpm --filter @agentworks/db push
```

### Production
```bash
# Create migration
pnpm --filter @agentworks/db migrate dev --name bos_phase_X

# Apply migration
pnpm --filter @agentworks/db migrate deploy
```

---

## Testing Strategy

### Per Phase Testing

1. **API Tests**: Test each endpoint with curl/Postman
2. **Permission Tests**: Verify RBAC enforcement
3. **UI Tests**: Manual walkthrough of pages
4. **Integration Tests**: Test cross-module links

### Test Checkpoints

- [ ] Phase 1: Role creation, user assignment, permission blocking
- [ ] Phase 2: Contact/lead CRUD, conversion to tenant
- [ ] Phase 3: Ticket creation, comment thread, status changes
- [ ] Phase 4: Task creation, drag-drop, linking
- [ ] Phase 5: Event creation, calendar views
- [ ] Phase 6: Room creation, video connection

---

## Rollback Plan

### Per Phase Rollback

```bash
# Revert code changes
git checkout HEAD~1 -- apps/admin apps/api

# Revert database (if migration applied)
pnpm --filter @agentworks/db migrate reset
```

### Partial Rollback

Each phase is independent - can disable features via:
1. Remove route registration
2. Remove navigation items
3. Schema can remain (unused)
