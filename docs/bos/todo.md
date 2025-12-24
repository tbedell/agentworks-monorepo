# AgentWorks BOS - Implementation Todo

**Last Updated**: December 2024

---

## Phase 1: Foundation & RBAC

### Database
- [ ] Add AdminPermission model to schema.prisma
- [ ] Add AdminRole model to schema.prisma
- [ ] Add AdminRolePermission model to schema.prisma
- [ ] Add AdminUserRole model to schema.prisma
- [ ] Add relations to existing AdminUser model
- [ ] Run prisma generate
- [ ] Run prisma db push
- [ ] Create seed data for default permissions
- [ ] Create seed data for default roles (SuperAdmin, Admin, User)

### API
- [ ] Create `apps/api/src/routes/admin-rbac.ts`
- [ ] Implement GET /api/admin/permissions
- [ ] Implement GET /api/admin/roles
- [ ] Implement POST /api/admin/roles
- [ ] Implement PUT /api/admin/roles/:id
- [ ] Implement DELETE /api/admin/roles/:id
- [ ] Implement PUT /api/admin/roles/:id/permissions
- [ ] Implement GET /api/admin/users/:id/roles
- [ ] Implement PUT /api/admin/users/:id/roles
- [ ] Register routes in index.ts

### Frontend
- [ ] Create `apps/admin/src/lib/permissions.ts`
- [ ] Create `apps/admin/src/stores/rbac.ts`
- [ ] Extend auth store with hasPermission()
- [ ] Create PermissionGate component
- [ ] Create RoleForm component
- [ ] Create RoleBadge component
- [ ] Create RolesList page
- [ ] Update UsersList to show role badges
- [ ] Add role assignment modal to users
- [ ] Add RBAC section to navigation
- [ ] Add routes to App.tsx

### Testing
- [ ] Test role creation
- [ ] Test permission assignment
- [ ] Test user role assignment
- [ ] Test permission blocking on API
- [ ] Test UI permission gating

---

## Phase 2: Mini CRM

### Database
- [ ] Add CrmContact model
- [ ] Add CrmLead model
- [ ] Add CrmActivity model
- [ ] Add relation from CrmLead to Tenant
- [ ] Run prisma generate
- [ ] Run prisma db push
- [ ] Add indexes for queries

### API
- [ ] Create `apps/api/src/routes/crm.ts`
- [ ] Implement GET /api/crm/contacts
- [ ] Implement POST /api/crm/contacts
- [ ] Implement GET /api/crm/contacts/:id
- [ ] Implement PUT /api/crm/contacts/:id
- [ ] Implement DELETE /api/crm/contacts/:id
- [ ] Implement GET /api/crm/leads
- [ ] Implement POST /api/crm/leads
- [ ] Implement GET /api/crm/leads/:id
- [ ] Implement PUT /api/crm/leads/:id
- [ ] Implement DELETE /api/crm/leads/:id
- [ ] Implement POST /api/crm/leads/:id/convert
- [ ] Implement GET /api/crm/activities
- [ ] Implement POST /api/crm/activities
- [ ] Register routes in index.ts
- [ ] Add permission checks

### Frontend
- [ ] Create `apps/admin/src/stores/crm.ts`
- [ ] Add CRM namespace to api.ts
- [ ] Create ContactForm component
- [ ] Create ContactCard component
- [ ] Create LeadForm component
- [ ] Create LeadCard component
- [ ] Create ActivityTimeline component
- [ ] Create ActivityForm component
- [ ] Create ContactsList page
- [ ] Create ContactDetail page
- [ ] Create LeadsList page
- [ ] Create LeadDetail page
- [ ] Add CRM section to navigation
- [ ] Add routes to App.tsx

### Integration
- [ ] Implement lead → tenant conversion
- [ ] Link contact to activities
- [ ] Link lead to activities

### Testing
- [ ] Test contact CRUD
- [ ] Test lead CRUD
- [ ] Test lead stage progression
- [ ] Test activity logging
- [ ] Test lead conversion to tenant

---

## Phase 3: Support Tickets

### Database
- [ ] Add SupportTicket model
- [ ] Add TicketComment model
- [ ] Add relation to Tenant
- [ ] Run prisma generate
- [ ] Run prisma db push
- [ ] Add ticket number generation logic

### API
- [ ] Create `apps/api/src/routes/tickets.ts`
- [ ] Implement GET /api/tickets
- [ ] Implement POST /api/tickets (with auto-numbering)
- [ ] Implement GET /api/tickets/:id
- [ ] Implement PUT /api/tickets/:id
- [ ] Implement DELETE /api/tickets/:id
- [ ] Implement GET /api/tickets/:id/comments
- [ ] Implement POST /api/tickets/:id/comments
- [ ] Register routes in index.ts
- [ ] Add permission checks

### Frontend
- [ ] Create `apps/admin/src/stores/tickets.ts`
- [ ] Add tickets namespace to api.ts
- [ ] Create TicketForm component
- [ ] Create TicketCard component
- [ ] Create StatusBadge component
- [ ] Create CommentThread component
- [ ] Create TicketsList page
- [ ] Create TicketDetail page
- [ ] Add Support section to navigation
- [ ] Add routes to App.tsx

### Testing
- [ ] Test ticket creation with auto-number
- [ ] Test status transitions
- [ ] Test comment creation (public/internal)
- [ ] Test assignment
- [ ] Test filtering

---

## Phase 4: Personal Workspace

### Database
- [ ] Add PersonalKanban model
- [ ] Add PersonalTask model
- [ ] Run prisma generate
- [ ] Run prisma db push

### API
- [ ] Create `apps/api/src/routes/workspace.ts`
- [ ] Implement GET /api/workspace/kanban (auto-create)
- [ ] Implement PUT /api/workspace/kanban
- [ ] Implement GET /api/workspace/tasks
- [ ] Implement POST /api/workspace/tasks
- [ ] Implement PUT /api/workspace/tasks/:id
- [ ] Implement DELETE /api/workspace/tasks/:id
- [ ] Implement PUT /api/workspace/tasks/reorder
- [ ] Register routes in index.ts

### Frontend
- [ ] Install @dnd-kit/core, @dnd-kit/sortable
- [ ] Create `apps/admin/src/stores/workspace.ts`
- [ ] Add workspace namespace to api.ts
- [ ] Adapt AdminKanbanBoard from web app
- [ ] Create AdminKanbanLane component
- [ ] Create AdminKanbanCard component
- [ ] Create TaskForm component
- [ ] Create TaskLinkSelector component
- [ ] Create MyKanban page
- [ ] Add Work section to navigation
- [ ] Add routes to App.tsx

### Integration
- [ ] Link tasks to CRM leads
- [ ] Link tasks to CRM deals
- [ ] Link tasks to tickets

### Testing
- [ ] Test kanban auto-creation
- [ ] Test task CRUD
- [ ] Test drag-drop reordering
- [ ] Test task linking

---

## Phase 5: Calendar

### Database
- [ ] Add Calendar model
- [ ] Add CalendarEvent model
- [ ] Run prisma generate
- [ ] Run prisma db push

### API
- [ ] Create `apps/api/src/routes/calendar.ts`
- [ ] Implement GET /api/calendar (auto-create)
- [ ] Implement GET /api/calendar/events
- [ ] Implement POST /api/calendar/events
- [ ] Implement PUT /api/calendar/events/:id
- [ ] Implement DELETE /api/calendar/events/:id
- [ ] Register routes in index.ts

### Frontend
- [ ] Create `apps/admin/src/stores/calendar.ts`
- [ ] Add calendar namespace to api.ts
- [ ] Create MonthView component
- [ ] Create WeekView component
- [ ] Create DayView component
- [ ] Create CalendarView component
- [ ] Create EventForm component
- [ ] Create EventCard component
- [ ] Create MyCalendar page
- [ ] Add Calendar section to navigation
- [ ] Add routes to App.tsx

### Integration
- [ ] Link events to CRM entities
- [ ] Link events to tickets

### Testing
- [ ] Test calendar auto-creation
- [ ] Test event CRUD
- [ ] Test month/week view rendering
- [ ] Test date range filtering

---

## Phase 6: Teams

### Database
- [ ] Add TeamRoom model
- [ ] Add TeamRoomParticipant model
- [ ] Run prisma generate
- [ ] Run prisma db push

### API
- [ ] Create `apps/api/src/routes/teams.ts`
- [ ] Implement GET /api/teams/rooms
- [ ] Implement POST /api/teams/rooms
- [ ] Implement GET /api/teams/rooms/:id
- [ ] Implement POST /api/teams/rooms/:id/join
- [ ] Implement POST /api/teams/rooms/:id/leave
- [ ] Add WebSocket signaling endpoint
- [ ] Register routes in index.ts

### Frontend
- [ ] Install simple-peer
- [ ] Create `apps/admin/src/stores/teams.ts`
- [ ] Create `apps/admin/src/lib/webrtc.ts`
- [ ] Add teams namespace to api.ts
- [ ] Create VideoGrid component
- [ ] Create Controls component
- [ ] Create Chat component
- [ ] Create SessionsList page
- [ ] Create RoomView page
- [ ] Add Teams section to navigation
- [ ] Add routes to App.tsx

### WebRTC
- [ ] Implement P2P connection setup
- [ ] Implement video stream handling
- [ ] Implement audio stream handling
- [ ] Implement screen share
- [ ] Handle connection/disconnection

### Testing
- [ ] Test room creation
- [ ] Test joining room
- [ ] Test video/audio toggle
- [ ] Test screen share
- [ ] Test multi-participant (2-5)

---

## Post-MVP Enhancements

### RBAC
- [ ] Add AdminGroup model
- [ ] Add AdminUserGroup model
- [ ] Add AdminGroupRole model
- [ ] Implement group hierarchy
- [ ] Add role expiration
- [ ] Add audit logging

### CRM
- [ ] Add CrmCompany model
- [ ] Add CrmDeal model
- [ ] Implement deal pipeline view
- [ ] Add vendor management
- [ ] Add reporting dashboard

### Tickets
- [ ] Add TicketCategory model
- [ ] Add TicketQueue model
- [ ] Add TicketSla model
- [ ] Implement SLA tracking
- [ ] Implement queue routing
- [ ] Add auto-assignment

### Workspace
- [ ] Add PersonalNote model
- [ ] Implement notes feature
- [ ] Add team boards
- [ ] Add project tracking

### Calendar
- [ ] Add EventAttendee model
- [ ] Implement attendee management
- [ ] Add team calendars
- [ ] Add recurring events

### Teams
- [ ] Add Whiteboard model
- [ ] Integrate tldraw
- [ ] Add Y.js sync
- [ ] Add Mediasoup SFU
- [ ] Add recording

---

## Infrastructure

- [ ] Create production migration scripts
- [ ] Update deployment configs
- [ ] Add monitoring for new endpoints
- [ ] Update API documentation
- [ ] Create user guides

---

## Progress Tracking

| Phase | Database | API | Frontend | Testing | Status |
|-------|----------|-----|----------|---------|--------|
| 1. RBAC | 0% | 0% | 0% | 0% | Not Started |
| 2. CRM | 0% | 0% | 0% | 0% | Not Started |
| 3. Tickets | 0% | 0% | 0% | 0% | Not Started |
| 4. Workspace | 0% | 0% | 0% | 0% | Not Started |
| 5. Calendar | 0% | 0% | 0% | 0% | Not Started |
| 6. Teams | 0% | 0% | 0% | 0% | Not Started |

---

## Notes

- All phases build on existing admin app patterns
- Database changes are additive (no breaking changes)
- Each phase is independently deployable
- Testing should happen continuously
