# AgentWorks BOS (Business Operating System) Blueprint

**Version**: 1.0
**Last Updated**: December 2024
**Status**: Active Development

---

## Executive Summary

The AgentWorks Business Operating System (BOS) transforms the Admin portal (`admin.agentworksstudio.com`) into a comprehensive internal operating system. This is an **enhancement** to the existing admin functionality, adding new capabilities while preserving and integrating with all current features.

### Core Modules

| Module | Purpose | Status |
|--------|---------|--------|
| **Revenue Ops** | Mini CRM for leads, contacts, tenants, vendors, opportunities | Planned |
| **Delivery Ops** | Personal Kanban, team boards, projects, tasks | Planned |
| **Time Ops** | Unified calendar for meetings, campaigns, deadlines | Planned |
| **Collaboration Ops** | WebRTC rooms, whiteboard, screen share | Planned |
| **Service Ops** | Support tickets with queues, SLAs, agent routing | Planned |
| **Security Ops** | RBAC with departments, groups, granular permissions | Planned |

---

## Architecture Overview

### Integration Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                    AgentWorks Admin Portal                       │
├─────────────────────────────────────────────────────────────────┤
│  EXISTING FEATURES          │  NEW BOS ENHANCEMENTS             │
│  ─────────────────          │  ────────────────────             │
│  • Dashboard                │  • Mini CRM (Revenue Ops)         │
│  • Tenant Management        │  • Personal Workspace (Delivery)  │
│  • User Management          │  • Calendar System (Time Ops)     │
│  • Waitlist                 │  • Team Rooms (Collaboration)     │
│  • Usage/Billing            │  • Ticket System (Service Ops)    │
│  • Agent Monitoring         │  • Enhanced RBAC (Security Ops)   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Admin UI   │────▶│   API Layer  │────▶│  PostgreSQL  │
│  (React/TS)  │◀────│   (Fastify)  │◀────│   (Prisma)   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │              ┌─────┴─────┐
       │              │  WebSocket │
       │              │  Gateway   │
       │              └───────────┘
       │                    │
       └────────────────────┘
         Real-time Updates
```

---

## Module Specifications

### 1. Security Ops (RBAC Foundation)

**Purpose**: Granular permission control across all BOS modules

**Key Entities**:
- `AdminPermission` - Individual permissions (e.g., "crm:lead:create")
- `AdminRole` - Named role collections (Sales, Developer, CSuite)
- `AdminGroup` - Department/team groupings with hierarchies
- `AdminUserRole` - User-to-role assignments
- `AdminUserGroup` - User-to-group memberships
- `AdminGroupRole` - Group-level role inheritance

**Permission Code Format**: `{resource}:{entity}:{action}`
- Resources: crm, support, calendar, billing, admin
- Actions: create, read, update, delete, assign, export

**Default Roles**:
| Role | Level | Description |
|------|-------|-------------|
| SuperAdmin | 100 | Full system access |
| CSuite | 90 | Executive oversight |
| Manager | 70 | Department management |
| Sales | 50 | CRM and customer access |
| Support | 50 | Ticket and customer access |
| Developer | 50 | Technical access |
| Viewer | 10 | Read-only access |

---

### 2. Revenue Ops (Mini CRM)

**Purpose**: Track leads through conversion to paying tenants

**Key Entities**:
- `CrmCompany` - Organizations (prospects, customers, vendors, partners)
- `CrmContact` - Individual people linked to companies
- `CrmLead` - Sales opportunities with stage tracking
- `CrmDeal` - Qualified opportunities with values
- `CrmActivity` - Interactions (calls, emails, meetings, notes)

**Lead Pipeline Stages**:
```
New → Contacted → Qualified → Converted
                      ↓
              [Creates Tenant]
```

**Integration Points**:
- Converts leads to Tenants in existing tenant system
- Links activities to support tickets
- Syncs contacts with calendar attendees

---

### 3. Service Ops (Support Tickets)

**Purpose**: Customer support with SLA tracking and queue management

**Key Entities**:
- `SupportTicket` - Support requests with priority/status
- `TicketCategory` - Classification (billing, technical, feature)
- `TicketQueue` - Routing queues with team assignment
- `TicketSla` - SLA policies with response/resolution times
- `TicketComment` - Conversation thread (public/internal)

**Ticket Lifecycle**:
```
New → Open → Pending → Resolved → Closed
       ↓        ↓
    [Working] [Waiting on Customer]
```

**SLA Tracking**:
- First response time (by priority)
- Resolution time targets
- Business hours calculation
- SLA breach alerts

---

### 4. Delivery Ops (Personal Workspace)

**Purpose**: Personal productivity and team task management

**Key Entities**:
- `PersonalKanban` - Individual's task board
- `PersonalTask` - Tasks with lane positioning
- `PersonalNote` - Quick notes with categorization

**Kanban Integration**:
- Adapts existing web app Kanban components
- Links tasks to CRM deals, leads, tickets
- Personal boards + team visibility options

**Task Linking**:
```
PersonalTask ──▶ CrmDeal
             ──▶ CrmLead
             ──▶ SupportTicket
```

---

### 5. Time Ops (Calendar)

**Purpose**: Unified scheduling across all BOS activities

**Key Entities**:
- `Calendar` - Personal/team calendars
- `CalendarEvent` - Meetings, deadlines, reminders
- `EventAttendee` - Participant tracking with RSVP

**Event Types**:
- Meeting - Internal/external meetings
- Campaign - Marketing activities
- Deadline - Project milestones
- Reminder - Personal reminders

**Integration Points**:
- Links to CRM activities (meetings)
- Links to ticket follow-ups
- Links to deal close dates

---

### 6. Collaboration Ops (Teams)

**Purpose**: Real-time collaboration with video, audio, whiteboard

**Key Entities**:
- `TeamRoom` - Virtual meeting rooms
- `TeamRoomParticipant` - Room membership
- `Whiteboard` - Collaborative canvas

**Technical Architecture**:
- **P2P WebRTC** for 2-5 participants
- **Mediasoup SFU** for 6+ participants
- **tldraw** for whiteboard rendering
- **Y.js** for real-time sync

**Room Features**:
- Video/audio conferencing
- Screen sharing
- Collaborative whiteboard
- In-room chat
- Recording (optional)

---

## Navigation Structure

```
Dashboard
│
├── CRM
│   ├── Leads
│   ├── Contacts
│   ├── Tenants (existing, linked)
│   ├── Vendors
│   └── Opportunities
│
├── Work
│   ├── My Kanban
│   ├── Team Boards
│   ├── Projects
│   └── Tasks
│
├── Calendar
│   ├── My Schedule
│   └── Team Schedules
│
├── Teams
│   ├── Sessions
│   └── Whiteboards
│
├── Support
│   ├── Tickets
│   └── Queues & SLAs
│
├── Admin
│   ├── Users & Roles
│   ├── Groups
│   └── Audit Log
│
└── [Existing Menus]
    ├── Tenants
    ├── Waitlist
    ├── Usage
    └── Settings
```

---

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **State**: Zustand with persistence
- **Data Fetching**: TanStack React Query
- **UI Components**: Existing admin UI library
- **Kanban**: Adapted from web app components
- **Calendar**: Custom components
- **Whiteboard**: tldraw v2

### Backend
- **Framework**: Fastify with TypeScript
- **ORM**: Prisma with PostgreSQL
- **WebSocket**: Fastify WebSocket
- **Auth**: Lucia Auth (existing)
- **Real-time Sync**: Y.js

### Infrastructure
- **Database**: PostgreSQL (Cloud SQL)
- **API**: Cloud Run
- **WebRTC**: Mediasoup (future)

---

## Security Model

### Permission Enforcement

```typescript
// API Route Protection
app.get('/api/crm/leads', {
  preHandler: [requirePermission('crm:lead:read')]
}, handler);

// UI Component Protection
<PermissionGate permission="crm:lead:create">
  <CreateLeadButton />
</PermissionGate>
```

### Data Isolation

- All CRM data scoped to admin tenant
- Support tickets linked to customer tenants
- Personal workspace isolated per admin user
- Calendars with visibility controls

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lead Conversion Rate | Track | Leads → Tenants |
| Ticket Response Time | < SLA | First response |
| Ticket Resolution Time | < SLA | Time to close |
| Task Completion | 80%+ | Personal tasks done |
| Calendar Adoption | 70%+ | Events created/week |
| Room Usage | Track | Sessions/week |

---

## Dependencies

### New npm Packages

```json
{
  "@tldraw/tldraw": "^2.x",
  "yjs": "^13.x",
  "y-websocket": "^1.x",
  "@dnd-kit/core": "^6.x",
  "@dnd-kit/sortable": "^8.x"
}
```

### Existing Dependencies (Reused)

- `@tanstack/react-query` - Data fetching
- `zustand` - State management
- `lucia` - Authentication
- `@prisma/client` - Database ORM
- `lucide-react` - Icons

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| WebRTC complexity | Medium | High | Start with P2P, add SFU later |
| Database migration | Low | Medium | Incremental schema changes |
| Performance at scale | Low | Medium | Pagination, lazy loading |
| RBAC complexity | Medium | Medium | Start with simple roles |

---

## Appendix: File Structure

```
apps/admin/src/
├── components/
│   ├── crm/           # CRM components
│   ├── tickets/       # Support ticket components
│   ├── kanban/        # Admin Kanban (adapted)
│   ├── calendar/      # Calendar components
│   ├── teams/         # Teams/collaboration
│   └── rbac/          # Permission components
├── routes/
│   ├── crm/           # CRM pages
│   ├── tickets/       # Support pages
│   ├── work/          # Workspace pages
│   ├── calendar/      # Calendar pages
│   ├── teams/         # Teams pages
│   └── admin/         # RBAC admin pages
├── stores/
│   ├── crm.ts         # CRM state
│   ├── tickets.ts     # Ticket state
│   ├── workspace.ts   # Personal workspace
│   ├── calendar.ts    # Calendar state
│   └── teams.ts       # Teams state
└── lib/
    ├── permissions.ts # RBAC helpers
    └── api.ts         # Extended API client
```
