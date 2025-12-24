# AgentWorks Trident - Product Requirements Document (PRD)

**Version**: 1.0
**Author**: Thomas R. Bedell
**Date**: December 24, 2024
**Status**: Draft

---

## 1. Product Overview

### 1.1 Product Name
AgentWorks Trident

### 1.2 Product Vision
A one-click workflow automation platform that deploys AI-powered business processes across 9 industry verticals, enabling agencies to resell productized services to their clients.

### 1.3 Target Users

| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| **Agency Owner** | Marketing, IT, or consulting agency | White-label platform to resell to clients |
| **SMB Owner** | Dentist, lawyer, contractor, etc. | Automated business processes without technical knowledge |
| **Operations Manager** | Back-office operations lead | KPI visibility and workflow management |

### 1.4 Success Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Time to First Workflow | Minutes from signup to first running workflow | < 10 minutes |
| Blueprint Installation Rate | % of users who install at least one blueprint | > 60% |
| Workflow Success Rate | % of workflow executions that complete without error | > 95% |
| Agency Partner MRR | Monthly revenue from agency tier | $100K by Month 6 |

---

## 2. User Stories

### 2.1 Agency Owner Stories

```
As an agency owner,
I want to white-label the platform with my branding
So that my clients see my company, not AgentWorks.

As an agency owner,
I want to create sub-accounts for each client
So that I can manage multiple clients from one dashboard.

As an agency owner,
I want to see KPIs across all clients
So that I can prove value in monthly reports.

As an agency owner,
I want to lock workflows and resell them
So that I can productize my services.
```

### 2.2 SMB Owner Stories

```
As a dentist,
I want to install a Patient Recall Bot
So that I never miss sending preventive care reminders.

As an accountant,
I want to install an Invoice Chaser Bot
So that I reduce AR collection time automatically.

As a contractor,
I want to install Subcontractor Compliance
So that I never chase COIs and W-9s manually.
```

### 2.3 Operations Manager Stories

```
As an operations manager,
I want to see a dashboard of workflow KPIs
So that I can report on automation ROI.

As an operations manager,
I want to pause/resume workflows
So that I can control automation timing.

As an operations manager,
I want to see an audit log of all actions
So that I can troubleshoot issues.
```

---

## 3. Functional Requirements

### 3.1 Workflow Store

**FR-101**: System shall display a marketplace of workflow blueprints.

**FR-102**: Blueprints shall be filterable by:
- Industry (finance, sales, hr, healthcare, construction, legal, real_estate, ecommerce, professional)
- Pricing tier (free, starter, professional, enterprise)
- Featured status

**FR-103**: Each blueprint card shall display:
- Name
- Description
- Industry category
- Trident metrics (Velocity, Leverage, Precision)
- Install count
- Rating (1-5 stars)

**FR-104**: Blueprint detail view shall show:
- Long description
- Screenshots/preview
- Required integrations
- Setup wizard steps
- Reviews

**FR-105**: "Install" button shall launch installation wizard.

### 3.2 Installation Wizard

**FR-201**: Wizard shall support multi-step flow with progress indicator.

**FR-202**: Step types shall include:
- `integration`: OAuth connection to third-party services
- `config`: Form fields for workflow configuration
- `data_import`: CSV upload with field mapping
- `test`: Run a test execution
- `confirm`: Final confirmation before activation

**FR-203**: Integration step shall:
- Show integration name and logo
- Launch OAuth popup for authorization
- Display success/error status
- Store credentials securely (encrypted)

**FR-204**: Config step shall:
- Render form fields dynamically from blueprint schema
- Validate required fields
- Support field types: string, number, boolean, select, date

**FR-205**: Data import step shall:
- Accept CSV file upload
- Parse headers and preview first 5 rows
- Allow field mapping (CSV column → entity field)
- Validate data format

**FR-206**: Test step shall:
- Execute one test run of the workflow
- Show real-time progress
- Display success/error result
- Allow retry on failure

**FR-207**: Confirm step shall:
- Summarize all configuration choices
- Show "Activate Workflow" button
- Create workflow instance on activation

### 3.3 Insight Dashboard (KPIs)

**FR-301**: Dashboard shall display above the Kanban board.

**FR-302**: Dashboard shall show four primary metrics:
- **Velocity**: Tasks completed this period vs previous period
- **Savings**: Estimated human hours saved (with $ value)
- **Throughput**: Visual graph of cards moving through stages
- **ROI**: Custom metric per workflow (e.g., leads generated, cost per lead)

**FR-303**: Dashboard shall support time range selection:
- This week
- This month
- This quarter
- Custom range

**FR-304**: Dashboard shall be exportable as:
- PNG image (screenshot)
- PDF report
- CSV data

**FR-305**: Dashboard data shall update in real-time (WebSocket or polling).

### 3.4 White-Label System

**FR-401**: Workspace settings shall include "Branding" tab.

**FR-402**: Branding settings shall support:
- Logo upload (PNG, SVG, max 1MB)
- Primary color (hex code)
- Secondary color (hex code)
- Custom domain (CNAME)

**FR-403**: White-label shall apply to:
- Login page
- Dashboard header
- Email templates
- Client-facing URLs

**FR-404**: Custom domain shall:
- Support CNAME configuration
- Auto-provision SSL certificate
- Verify domain ownership

### 3.5 Sub-Account Management (Agency)

**FR-501**: Agency tier shall support unlimited sub-accounts.

**FR-502**: Sub-account creation shall require:
- Client name
- Client email (optional)
- Assigned workflows

**FR-503**: Each sub-account shall have:
- Isolated data (no cross-client visibility)
- Own login credentials (optional)
- Assigned workflows only

**FR-504**: Agency dashboard shall show:
- All sub-accounts in sidebar
- Aggregate KPIs across clients
- Per-client drill-down

**FR-505**: Sub-account users shall only see:
- Their assigned workflows
- Their KPI dashboard
- Agency branding (not AgentWorks)

### 3.6 Audit Trail & Insight Log

**FR-601**: System shall log all workflow actions.

**FR-602**: Log entries shall include:
- Timestamp
- Action type (email_sent, invoice_created, approval_requested, etc.)
- Entity affected
- Result (success/failure)
- Human-readable description

**FR-603**: Log shall be filterable by:
- Workflow
- Action type
- Date range
- Status

**FR-604**: Log shall NOT display:
- Raw code output
- API responses
- Technical error stacks (only user-friendly messages)

**FR-605**: Log entries shall be searchable by keyword.

### 3.7 Client Operations Center

**FR-701**: Kanban board shall support custom stage names.

**FR-702**: Default stages shall be business-oriented:
- Lead In
- Qualified
- In Progress
- Awaiting Response
- Completed

**FR-703**: Each card shall display:
- Entity name (invoice #, patient name, lead name)
- Current status
- Time in stage
- Assigned workflow
- Priority indicator

**FR-704**: Drag-and-drop shall move cards between stages.

**FR-705**: Card detail view shall show:
- Full entity details
- Action history (audit log for this entity)
- Manual action buttons (if approval required)

---

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-101**: Page load time shall be < 2 seconds on 3G.

**NFR-102**: Workflow execution latency shall be < 5 seconds for simple workflows.

**NFR-103**: Dashboard shall update within 10 seconds of new data.

**NFR-104**: System shall support 10,000 concurrent users.

### 4.2 Security

**NFR-201**: All data shall be encrypted at rest (AES-256).

**NFR-202**: All data in transit shall use TLS 1.3.

**NFR-203**: OAuth tokens shall be stored encrypted in database.

**NFR-204**: Sub-account data shall be strictly isolated (row-level security).

**NFR-205**: Audit logs shall be immutable (append-only).

**NFR-206**: GDPR compliance shall be maintained (data export, deletion).

### 4.3 Reliability

**NFR-301**: System uptime shall be 99.9% (< 8.76 hours downtime/year).

**NFR-302**: Workflow failures shall auto-retry up to 3 times.

**NFR-303**: Failed workflows shall generate alerts to workspace owner.

**NFR-304**: Database backups shall occur every 6 hours.

### 4.4 Scalability

**NFR-401**: System shall support 1M workflow executions per day.

**NFR-402**: Single workspace shall support 10,000 entities per workflow.

**NFR-403**: Agency shall support 500 sub-accounts.

---

## 5. Integrations (Priority)

### 5.1 P0 (Launch Required)

| Integration | Use Case | Auth Type |
|-------------|----------|-----------|
| **Stripe** | Payment processing, invoicing | OAuth 2.0 |
| **QuickBooks** | Accounting sync, AR/AP | OAuth 2.0 |
| **Google Workspace** | Email, Calendar, Drive | OAuth 2.0 |
| **Microsoft 365** | Email, Calendar, OneDrive | OAuth 2.0 |

### 5.2 P1 (Post-Launch)

| Integration | Use Case | Auth Type |
|-------------|----------|-----------|
| Xero | Accounting (international) | OAuth 2.0 |
| HubSpot | CRM | OAuth 2.0 |
| Salesforce | CRM | OAuth 2.0 |
| Twilio | SMS/Voice | API Key |
| SendGrid | Email delivery | API Key |

### 5.3 P2 (Vertical-Specific)

| Integration | Vertical | Use Case |
|-------------|----------|----------|
| Procore | Construction | Project management |
| Clio | Legal | Practice management |
| Gusto | HR | Payroll |
| DocuSign | All | E-signatures |
| Podium | Healthcare | Patient communication |

---

## 6. Data Model (Key Entities)

### 6.1 WorkflowBlueprint

```
id: UUID
slug: String (unique)
name: String
description: String
longDescription: String
industry: Enum (finance, sales, hr, healthcare, construction, legal, real_estate, ecommerce, professional)
version: String
velocityMetric: String
leverageMetric: String
precisionMetric: String
workflowJson: JSON (workflow definition)
integrations: JSON (required integrations)
setupWizard: JSON (wizard steps)
pricing: Enum (free, starter, professional, enterprise)
isPublic: Boolean
isFeatured: Boolean
installCount: Integer
rating: Float
reviewCount: Integer
authorId: UUID
authorName: String
publishedAt: DateTime
createdAt: DateTime
updatedAt: DateTime
```

### 6.2 WorkflowInstallation

```
id: UUID
blueprintId: UUID (FK)
workspaceId: UUID (FK)
installedById: UUID (FK)
config: JSON (user configuration)
integrationKeys: JSON (encrypted credentials)
status: Enum (active, paused, error)
workflowId: UUID (FK to WorkflowDefinition)
installedAt: DateTime
lastRunAt: DateTime
```

### 6.3 WorkflowExecution

```
id: UUID
workflowId: UUID (FK)
status: Enum (pending, running, completed, failed)
triggeredBy: String (schedule, webhook, manual)
input: JSON
output: JSON
logs: JSON (array of log entries)
startedAt: DateTime
completedAt: DateTime
createdAt: DateTime
```

### 6.4 AgencySubAccount

```
id: UUID
agencyWorkspaceId: UUID (FK)
clientName: String
clientEmail: String
brandingOverride: JSON
assignedWorkflows: UUID[]
status: Enum (active, suspended)
createdAt: DateTime
```

---

## 7. API Endpoints

### 7.1 Workflow Store

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workflow-store/blueprints` | List blueprints (paginated, filterable) |
| GET | `/workflow-store/blueprints/:slug` | Get blueprint details |
| GET | `/workflow-store/blueprints/featured` | Get featured blueprints |
| GET | `/workflow-store/industries` | List industries with counts |
| POST | `/workflow-store/install/:slug` | Install blueprint |
| GET | `/workflow-store/installations` | List my installations |
| PATCH | `/workflow-store/installations/:id` | Update installation (pause/resume) |
| DELETE | `/workflow-store/installations/:id` | Uninstall |
| POST | `/workflow-store/reviews/:slug` | Submit review |

### 7.2 Insight Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/insights/summary` | Get KPI summary |
| GET | `/insights/velocity` | Get velocity data |
| GET | `/insights/savings` | Get savings calculation |
| GET | `/insights/throughput` | Get throughput graph data |
| GET | `/insights/export` | Export dashboard data |

### 7.3 Agency

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/agency/sub-accounts` | List sub-accounts |
| POST | `/agency/sub-accounts` | Create sub-account |
| PATCH | `/agency/sub-accounts/:id` | Update sub-account |
| DELETE | `/agency/sub-accounts/:id` | Delete sub-account |
| GET | `/agency/aggregate-kpis` | Get cross-client KPIs |

---

## 8. UI/UX Requirements

### 8.1 Workflow Store Page

- Hero section with search bar
- Industry filter sidebar (checkboxes)
- Blueprint grid (3-4 columns)
- Each card shows: name, description, Trident metrics, install count
- Featured section at top
- "Recently Installed" section for returning users

### 8.2 Blueprint Detail Modal

- Large modal (80% viewport)
- Header: name, rating, install count
- Tabs: Overview, Integrations, Reviews
- Overview: long description, screenshots, Trident metrics
- Integrations: list with logos and auth status
- Reviews: star rating, written reviews
- Footer: "Install" button (prominent)

### 8.3 Installation Wizard

- Full-screen modal with step progress bar
- Left sidebar: step list with checkmarks
- Main content: current step content
- Footer: Back, Next/Finish buttons
- Animations between steps

### 8.4 Insight Dashboard

- Positioned above Kanban board
- 4 metric cards in a row
- Expandable detail view per metric
- Time range selector (top right)
- Export button (top right)

### 8.5 Client Operations Center

- Standard Kanban layout
- Custom column headers (configurable)
- Card mini-view: entity name, time in stage, priority dot
- Card expanded view: full details, action history, manual actions
- Drag-and-drop between columns

---

## 9. Acceptance Criteria

### 9.1 Workflow Store

- [ ] User can browse blueprints by industry
- [ ] User can search blueprints by keyword
- [ ] User can view blueprint details
- [ ] User can see Trident metrics on each blueprint
- [ ] User can see install count and rating

### 9.2 Installation Wizard

- [ ] User can complete OAuth for required integrations
- [ ] User can configure workflow settings
- [ ] User can import data via CSV
- [ ] User can run a test execution
- [ ] User can activate workflow with one click

### 9.3 Insight Dashboard

- [ ] User can see Velocity, Savings, Throughput, ROI
- [ ] User can change time range
- [ ] User can export dashboard as PNG/PDF
- [ ] Dashboard updates in real-time

### 9.4 White-Label

- [ ] Agency can upload custom logo
- [ ] Agency can set custom colors
- [ ] Agency can configure custom domain
- [ ] Sub-account users see agency branding

### 9.5 Sub-Accounts

- [ ] Agency can create sub-accounts
- [ ] Sub-accounts have isolated data
- [ ] Sub-account users can log in separately
- [ ] Agency can view aggregate KPIs

---

## 10. Out of Scope (v1)

- Mobile native apps (web-responsive only)
- Custom workflow builder (use pre-built blueprints only)
- Marketplace for user-created blueprints (AgentWorks-authored only)
- Multi-language support (English only)
- Advanced workflow branching (linear flows only)
- Real-time collaboration (single-user editing)

---

## 11. Dependencies

| Dependency | Owner | Status |
|------------|-------|--------|
| Existing AgentWorks platform | Engineering | Stable |
| OAuth integrations (Stripe, QuickBooks, Google, Microsoft) | Engineering | In Progress |
| Prisma schema updates | Database | Planned |
| React components (existing) | Frontend | Reusable |
| GCP Cloud Run deployment | DevOps | Stable |

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Integration OAuth failures | Medium | High | Fallback to API key, clear error messages |
| Blueprint maintenance burden | High | Medium | Version control, auto-update notifications |
| Agency support volume | High | Medium | Self-serve docs, knowledge base |
| Workflow execution costs | Medium | High | Usage limits, tiered pricing |

---

## 13. Timeline

See MVP.md for phased rollout plan.

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-24 | Thomas R. Bedell | Initial draft |
