# AgentWorks BOS - Product Requirements Document

**Version**: 1.0
**Last Updated**: December 2024
**Product Owner**: Thomas R. Bedell

---

## 1. Product Overview

### 1.1 Vision Statement

Transform AgentWorks Admin into a comprehensive Business Operating System that enables internal teams to manage revenue, delivery, time, collaboration, and service operations from a unified platform.

### 1.2 Target Users

| User Type | Primary Use Cases |
|-----------|-------------------|
| **Sales** | Lead tracking, opportunity management, activity logging |
| **Support** | Ticket management, customer communication, SLA tracking |
| **Management** | Team oversight, calendar scheduling, reporting |
| **Operations** | Task management, project tracking, resource planning |
| **All Staff** | Personal productivity, team collaboration |

### 1.3 Integration Requirements

The BOS must integrate with existing Admin features:
- Tenant management (convert leads to tenants)
- User management (RBAC extends existing users)
- Usage tracking (link to CRM activities)
- Agent monitoring (link to support tickets)

---

## 2. Functional Requirements

### 2.1 Security Ops (RBAC) - FR-100

#### FR-101: Permission Management
- **FR-101.1**: System shall support permission codes in format `{resource}:{entity}:{action}`
- **FR-101.2**: Permissions shall be assignable to roles
- **FR-101.3**: System shall support system-level (non-deletable) permissions
- **FR-101.4**: Admin shall be able to view all permissions with descriptions

#### FR-102: Role Management
- **FR-102.1**: Admin shall be able to create custom roles
- **FR-102.2**: Roles shall have a numeric level for hierarchy
- **FR-102.3**: Roles shall be assignable colors for UI display
- **FR-102.4**: System roles (SuperAdmin) cannot be deleted
- **FR-102.5**: Admin shall be able to assign permissions to roles

#### FR-103: Group Management
- **FR-103.1**: Admin shall be able to create groups (departments/teams)
- **FR-103.2**: Groups shall support parent-child hierarchy
- **FR-103.3**: Groups shall have a manager assignment
- **FR-103.4**: Roles can be assigned to groups (inheritance)
- **FR-103.5**: Users inherit permissions from group roles

#### FR-104: User Role Assignment
- **FR-104.1**: Users can have multiple roles
- **FR-104.2**: Role assignments can have expiration dates
- **FR-104.3**: Admin shall see effective permissions per user

---

### 2.2 Revenue Ops (CRM) - FR-200

#### FR-201: Company Management
- **FR-201.1**: User shall be able to create companies with name, industry, website, contact info
- **FR-201.2**: Companies shall have types: prospect, customer, vendor, partner
- **FR-201.3**: Companies can be linked to existing Tenants
- **FR-201.4**: User shall be able to assign company owner
- **FR-201.5**: Companies support tagging

#### FR-202: Contact Management
- **FR-202.1**: User shall be able to create contacts with name, email, phone, job title
- **FR-202.2**: Contacts shall be linkable to companies
- **FR-202.3**: Contact list shall be searchable and filterable
- **FR-202.4**: Contacts support tagging

#### FR-203: Lead Management
- **FR-203.1**: User shall be able to create leads from contacts
- **FR-203.2**: Leads shall have stages: New, Contacted, Qualified, Converted
- **FR-203.3**: Leads shall have score (0-100) and temperature (cold/warm/hot)
- **FR-203.4**: Leads can be converted to Tenants
- **FR-203.5**: Leads track source (where they came from)

#### FR-204: Deal/Opportunity Management
- **FR-204.1**: User shall be able to create deals with name, value, probability
- **FR-204.2**: Deals shall have stages: Discovery, Proposal, Negotiation, Won, Lost
- **FR-204.3**: Deals shall have expected close date
- **FR-204.4**: Deals link to companies

#### FR-205: Activity Tracking
- **FR-205.1**: User shall be able to log activities: call, email, meeting, note, task
- **FR-205.2**: Activities link to companies, contacts, leads, deals, tickets
- **FR-205.3**: Activities can be scheduled or completed
- **FR-205.4**: Activity timeline shows all interactions per entity

---

### 2.3 Service Ops (Tickets) - FR-300

#### FR-301: Ticket Management
- **FR-301.1**: User shall be able to create tickets with subject, description, priority
- **FR-301.2**: Tickets shall have auto-generated ticket numbers (TKT-XXXXX)
- **FR-301.3**: Tickets shall have statuses: New, Open, Pending, Resolved, Closed
- **FR-301.4**: Tickets shall have priorities: Critical, High, Medium, Low
- **FR-301.5**: Tickets link to reporter (email/name) or Tenant
- **FR-301.6**: Tickets assignable to admin users

#### FR-302: Category Management
- **FR-302.1**: Admin shall be able to create ticket categories
- **FR-302.2**: Categories have default priority
- **FR-302.3**: Categories have colors for UI

#### FR-303: Queue Management
- **FR-303.1**: Admin shall be able to create queues
- **FR-303.2**: Queues can be linked to groups for routing
- **FR-303.3**: Queues support auto-assignment toggle

#### FR-304: SLA Management
- **FR-304.1**: Admin shall be able to create SLA policies
- **FR-304.2**: SLAs define response times by priority
- **FR-304.3**: SLAs support business hours option
- **FR-304.4**: System tracks SLA status: On Track, At Risk, Breached

#### FR-305: Ticket Comments
- **FR-305.1**: User shall be able to add comments to tickets
- **FR-305.2**: Comments can be internal (not visible to reporter)
- **FR-305.3**: Comment history shows author and timestamp

---

### 2.4 Delivery Ops (Workspace) - FR-400

#### FR-401: Personal Kanban
- **FR-401.1**: Each admin user shall have a personal Kanban board
- **FR-401.2**: Kanban has default lanes: To Do, Doing, Done
- **FR-401.3**: User can customize lane names
- **FR-401.4**: Tasks are draggable between lanes

#### FR-402: Personal Tasks
- **FR-402.1**: User shall be able to create tasks with title, description
- **FR-402.2**: Tasks have priority: High, Medium, Low
- **FR-402.3**: Tasks can have due dates
- **FR-402.4**: Tasks can link to CRM deals, leads, or tickets
- **FR-402.5**: Tasks support tagging

#### FR-403: Personal Notes
- **FR-403.1**: User shall be able to create quick notes
- **FR-403.2**: Notes can be categorized
- **FR-403.3**: Notes can be pinned
- **FR-403.4**: Notes can link to CRM/ticket entities

---

### 2.5 Time Ops (Calendar) - FR-500

#### FR-501: Calendar Management
- **FR-501.1**: Each admin user shall have a default personal calendar
- **FR-501.2**: Groups can have shared calendars
- **FR-501.3**: Calendars have timezone settings
- **FR-501.4**: Calendars have visibility: Private, Public

#### FR-502: Event Management
- **FR-502.1**: User shall be able to create events with title, description, time
- **FR-502.2**: Events have types: Meeting, Campaign, Deadline, Reminder
- **FR-502.3**: Events can be all-day
- **FR-502.4**: Events can have location and video URL
- **FR-502.5**: Events can link to CRM deals, leads, or tickets

#### FR-503: Attendee Management
- **FR-503.1**: Events can have multiple attendees
- **FR-503.2**: Attendees have RSVP status: Pending, Accepted, Declined
- **FR-503.3**: Attendees can be internal (admin users) or external (email)

#### FR-504: Calendar Views
- **FR-504.1**: Calendar shall support Month view
- **FR-504.2**: Calendar shall support Week view
- **FR-504.3**: Calendar shall support Day view
- **FR-504.4**: Events are color-coded by type

---

### 2.6 Collaboration Ops (Teams) - FR-600

#### FR-601: Room Management
- **FR-601.1**: User shall be able to create meeting rooms
- **FR-601.2**: Rooms can be scheduled or instant
- **FR-601.3**: Rooms have maximum participant limits
- **FR-601.4**: Rooms track start/end times

#### FR-602: Video/Audio
- **FR-602.1**: Participants shall be able to enable/disable video
- **FR-602.2**: Participants shall be able to enable/disable audio
- **FR-602.3**: System shall support screen sharing
- **FR-602.4**: P2P WebRTC for 2-5 participants

#### FR-603: Whiteboard
- **FR-603.1**: Rooms can enable collaborative whiteboard
- **FR-603.2**: Whiteboard supports drawing, shapes, text
- **FR-603.3**: Whiteboard changes sync in real-time
- **FR-603.4**: Whiteboards can be saved independently

#### FR-604: Chat
- **FR-604.1**: Rooms shall have in-room text chat
- **FR-604.2**: Chat persists during room session

---

## 3. Non-Functional Requirements

### 3.1 Performance - NFR-100
- **NFR-101**: List pages shall load in < 2 seconds
- **NFR-102**: API responses shall be < 500ms for CRUD operations
- **NFR-103**: Calendar shall render 100+ events smoothly
- **NFR-104**: Kanban shall support 500+ cards

### 3.2 Security - NFR-200
- **NFR-201**: All endpoints shall enforce RBAC permissions
- **NFR-202**: Sensitive data shall be encrypted at rest
- **NFR-203**: Sessions shall expire after 24 hours of inactivity
- **NFR-204**: Audit log shall record all data changes

### 3.3 Usability - NFR-300
- **NFR-301**: Navigation shall be collapsible by section
- **NFR-302**: All forms shall have validation feedback
- **NFR-303**: UI shall be consistent with existing admin design
- **NFR-304**: Mobile-responsive for key workflows

### 3.4 Reliability - NFR-400
- **NFR-401**: System shall have 99.9% uptime
- **NFR-402**: Data shall be backed up daily
- **NFR-403**: Errors shall be logged and alertable

---

## 4. User Stories

### 4.1 RBAC Stories

| ID | Story | Priority |
|----|-------|----------|
| US-101 | As an admin, I want to create roles so that I can group permissions | High |
| US-102 | As an admin, I want to assign roles to users so they have appropriate access | High |
| US-103 | As an admin, I want to create groups so I can organize users by department | Medium |
| US-104 | As a user, I want to see only features I have permission to use | High |

### 4.2 CRM Stories

| ID | Story | Priority |
|----|-------|----------|
| US-201 | As a sales rep, I want to create leads so I can track prospects | High |
| US-202 | As a sales rep, I want to log activities so I can track my interactions | High |
| US-203 | As a sales manager, I want to see the pipeline so I can forecast revenue | High |
| US-204 | As a sales rep, I want to convert a lead to a tenant when they sign up | High |
| US-205 | As a sales rep, I want to filter leads by stage and temperature | Medium |

### 4.3 Support Stories

| ID | Story | Priority |
|----|-------|----------|
| US-301 | As a support agent, I want to view my assigned tickets | High |
| US-302 | As a support agent, I want to add comments to tickets | High |
| US-303 | As a support manager, I want to define SLAs so we meet commitments | High |
| US-304 | As a support agent, I want to see SLA countdown so I prioritize | Medium |
| US-305 | As a support manager, I want to create queues for routing | Medium |

### 4.4 Workspace Stories

| ID | Story | Priority |
|----|-------|----------|
| US-401 | As a user, I want a personal Kanban so I can manage my tasks | High |
| US-402 | As a user, I want to link tasks to CRM items for context | Medium |
| US-403 | As a user, I want to set due dates so I don't miss deadlines | Medium |
| US-404 | As a user, I want to take quick notes for future reference | Low |

### 4.5 Calendar Stories

| ID | Story | Priority |
|----|-------|----------|
| US-501 | As a user, I want to schedule meetings with attendees | High |
| US-502 | As a user, I want to see my week/month at a glance | High |
| US-503 | As a user, I want to link meetings to CRM deals | Medium |
| US-504 | As a manager, I want to view my team's calendars | Medium |

### 4.6 Teams Stories

| ID | Story | Priority |
|----|-------|----------|
| US-601 | As a user, I want to start an instant meeting room | High |
| US-602 | As a user, I want to share my screen during meetings | High |
| US-603 | As a user, I want a whiteboard for visual collaboration | Medium |
| US-604 | As a user, I want to schedule recurring team meetings | Low |

---

## 5. Acceptance Criteria

### 5.1 RBAC Module

- [ ] Admin can create, edit, delete roles
- [ ] Admin can assign permissions to roles
- [ ] Admin can create, edit, delete groups
- [ ] Admin can assign users to groups
- [ ] Permission checks prevent unauthorized access
- [ ] UI hides inaccessible features

### 5.2 CRM Module

- [ ] User can CRUD companies with all fields
- [ ] User can CRUD contacts linked to companies
- [ ] User can CRUD leads with stage progression
- [ ] User can convert lead to tenant (creates Tenant record)
- [ ] User can CRUD deals with pipeline view
- [ ] Activity timeline shows all interactions
- [ ] Filters work for stage, owner, tags

### 5.3 Support Module

- [ ] User can CRUD tickets with all fields
- [ ] Ticket numbers auto-generate uniquely
- [ ] User can add public and internal comments
- [ ] SLA tracking shows status (On Track/At Risk/Breached)
- [ ] Queues route tickets to appropriate teams
- [ ] Category assignment sets default priority

### 5.4 Workspace Module

- [ ] Each user gets a personal Kanban on first access
- [ ] Tasks drag-and-drop between lanes
- [ ] Tasks can link to CRM/ticket entities
- [ ] Due date reminders appear in calendar
- [ ] Notes are searchable

### 5.5 Calendar Module

- [ ] Month, Week, Day views render correctly
- [ ] Events CRUD with all fields
- [ ] Attendees receive status tracking
- [ ] Linked events show in CRM timelines
- [ ] Color-coding by event type

### 5.6 Teams Module

- [ ] Rooms create with unique URLs
- [ ] Video/audio toggle works
- [ ] Screen share initiates
- [ ] Whiteboard syncs between participants
- [ ] Chat messages persist during session

---

## 6. Dependencies

### 6.1 Internal Dependencies

| Dependency | Impact |
|------------|--------|
| Existing Admin UI | Reuse components and styling |
| Existing Auth (Lucia) | Extend for RBAC |
| Existing Tenant model | Link CRM companies |
| Existing User model | Extend for groups/roles |
| Web app Kanban | Adapt components |

### 6.2 External Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| tldraw | Whiteboard rendering | ^2.x |
| yjs | Real-time sync | ^13.x |
| y-websocket | Y.js transport | ^1.x |
| @dnd-kit | Drag and drop | ^6.x |

---

## 7. Out of Scope (Future)

- Email integration (auto-create activities from emails)
- Phone integration (click-to-call)
- External calendar sync (Google, Outlook)
- Recording and playback for rooms
- Advanced reporting and dashboards
- Mobile native apps
- AI-powered lead scoring
- Automated ticket routing
