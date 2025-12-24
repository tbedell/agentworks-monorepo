# AgentWorks Trident - Minimum Viable Product (MVP)

**Version**: 1.0
**Author**: Thomas R. Bedell
**Date**: December 24, 2024

---

## MVP Philosophy

> "Ship the smallest thing that delivers the Trident promise: Speed, Leverage, Precision."

The MVP is not about features. It's about proving the value proposition:
- A business owner can install a workflow in under 10 minutes
- The workflow runs automatically without human intervention
- The Insight Dashboard proves ROI visually

---

## MVP Scope Definition

### In Scope (Must Have)

| Component | Description | Why MVP |
|-----------|-------------|---------|
| Workflow Store | Browse 5 industry blueprints | Proves one-click deployment |
| Installation Wizard | OAuth + config + activation | Proves ease of setup |
| 5 Initial Blueprints | One per industry vertical | Proves cross-industry appeal |
| Insight Dashboard (Basic) | Velocity + Savings metrics | Proves ROI visibility |
| P0 Integrations (4) | Stripe, QuickBooks, Google, Microsoft | Covers most use cases |
| Marketing Landing Page | /agency with AgencyOS pitch | Captures agency leads |

### Out of Scope (Post-MVP)

| Component | Why Deferred |
|-----------|--------------|
| White-Label System | Requires DNS, SSL provisioning |
| Sub-Account Management | Complex data isolation |
| Full KPI Dashboard | Basic metrics prove concept |
| 50+ Blueprints | 5 blueprints prove model |
| P1/P2 Integrations | Core 4 integrations sufficient |
| Reviews & Ratings | Social proof can wait |
| Workflow Builder | Users install, not build |
| Custom Domains | Enterprise feature |

---

## MVP Feature Breakdown

### 1. Workflow Store (MVP)

**What it does**:
- Displays 5 featured blueprints
- Filters by industry (simple dropdown)
- Shows blueprint cards with Trident metrics

**What it doesn't do (yet)**:
- Search
- Ratings/reviews
- Multiple pages
- User-created blueprints

**UI Spec**:
```
┌──────────────────────────────────────────────────────────┐
│  Workflow Store                      [Filter: All ▼]     │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ Invoice     │  │ Lead        │  │ Employee    │       │
│  │ Chaser      │  │ Resurrection│  │ Onboarding  │       │
│  │             │  │             │  │             │       │
│  │ Finance     │  │ Sales       │  │ HR          │       │
│  │ ⚡ 7 days   │  │ ⚡ 10x leads│  │ ⚡ 2 hrs    │       │
│  │ [Install]   │  │ [Install]   │  │ [Install]   │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐                        │
│  │ Patient     │  │ Subcontractor│                       │
│  │ Adherence   │  │ Compliance  │                        │
│  │             │  │             │                        │
│  │ Healthcare  │  │ Construction│                        │
│  │ ⚡ 95% show │  │ ⚡ 99% compliant                     │
│  │ [Install]   │  │ [Install]   │                        │
│  └─────────────┘  └─────────────┘                        │
└──────────────────────────────────────────────────────────┘
```

### 2. Installation Wizard (MVP)

**Steps**:
1. **Overview**: Show what the workflow does
2. **Integrations**: Connect required services (OAuth)
3. **Configuration**: Set basic parameters
4. **Activate**: One-click activation

**What it doesn't do (yet)**:
- Data import (CSV)
- Test execution
- Advanced configuration

**UI Spec**:
```
┌──────────────────────────────────────────────────────────┐
│  Install: Invoice Chaser                                 │
├──────────────────────────────────────────────────────────┤
│  Step 2 of 4: Connect Integrations                       │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  ☐ QuickBooks                                       │ │
│  │    Sync invoices and payment status                 │ │
│  │    [Connect QuickBooks]                             │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  ☑ Gmail                                            │ │
│  │    Send reminder emails                              │ │
│  │    ✓ Connected as thomas@example.com                │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  [Back]                                          [Next →]│
└──────────────────────────────────────────────────────────┘
```

### 3. Five Initial Blueprints

| Blueprint | Industry | Trident Metrics |
|-----------|----------|-----------------|
| **Invoice Chaser** | Finance | Velocity: 45→7 days AR, Leverage: 500 accounts/manager, Precision: 99.9% follow-up |
| **Lead Resurrection** | Sales | Velocity: Re-engage in 24hrs, Leverage: 1000 leads/rep, Precision: 100% sequence completion |
| **Employee Onboarding** | HR | Velocity: 2-hour setup, Leverage: 50 hires/HR, Precision: 100% paperwork |
| **Patient Adherence** | Healthcare | Velocity: Same-day reminders, Leverage: 5000 patients/staff, Precision: 95% show rate |
| **Subcontractor Compliance** | Construction | Velocity: Instant verification, Leverage: 100 subs/PM, Precision: 99% compliant |

**Blueprint Structure (each)**:
```typescript
{
  id: "ar-invoice-chaser",
  name: "Invoice Chaser Bot",
  description: "Automated AR collection with escalating reminders",
  industry: "finance",

  trident: {
    velocity: "Reduces AR collection from 45 days to 7 days",
    leverage: "One manager handles 500+ accounts",
    precision: "99.9% follow-up compliance"
  },

  integrations: ["quickbooks", "gmail"],

  setupWizard: [
    { type: "overview", title: "What This Does" },
    { type: "integration", title: "Connect QuickBooks", integration: "quickbooks" },
    { type: "integration", title: "Connect Gmail", integration: "gmail" },
    { type: "config", title: "Set Reminder Schedule", fields: [...] },
    { type: "confirm", title: "Activate" }
  ],

  workflow: {
    nodes: [...],
    edges: [...]
  }
}
```

### 4. Insight Dashboard (MVP)

**Metrics shown**:
- **Velocity**: "42 tasks completed this week (↑15% vs last week)"
- **Savings**: "Estimated 120 human hours saved ($3,600 value)"

**What it doesn't do (yet)**:
- Throughput graph
- Custom ROI metrics
- Export functionality
- Time range selection

**UI Spec**:
```
┌──────────────────────────────────────────────────────────┐
│  Insight Dashboard                                       │
├────────────────────────────┬─────────────────────────────┤
│  ⚡ VELOCITY               │  💰 SAVINGS                 │
│                            │                             │
│  42 tasks completed        │  120 hours saved            │
│  ↑ 15% vs last week        │  $3,600 estimated value     │
│                            │                             │
└────────────────────────────┴─────────────────────────────┘
```

### 5. P0 Integrations (MVP)

| Integration | OAuth Flow | Scopes Required |
|-------------|------------|-----------------|
| **Stripe** | OAuth 2.0 | `read_write` |
| **QuickBooks** | OAuth 2.0 | `com.intuit.quickbooks.accounting` |
| **Google Workspace** | OAuth 2.0 | `gmail.send`, `calendar.events` |
| **Microsoft 365** | OAuth 2.0 | `Mail.Send`, `Calendars.ReadWrite` |

**Implementation**:
- OAuth redirect flow (no popup)
- Token storage encrypted in database
- Token refresh on expiry
- Clear error messages on failure

### 6. Marketing Landing Page (/agency)

**Headline**: "Your Agency. Powered by an AI Workforce."

**Subhead**: "Stop hiring more humans to scale your agency. Deploy white-labeled AI Agents to handle fulfillment, reporting, and operations for your clients."

**Sections**:
1. Hero with headline + CTA
2. The 3 Hooks (Productize, Insight Portal, 100% Upsell)
3. Industry showcase (9 verticals with icons)
4. Pricing preview (Agency tiers)
5. Early access signup form

**CTA**: "Join the Agency Waitlist"

---

## MVP User Flows

### Flow 1: First Blueprint Installation

```
1. User lands on Workflow Store
2. User clicks "Install" on Invoice Chaser
3. Wizard opens with Overview step
4. User clicks "Next"
5. User connects QuickBooks (OAuth redirect)
6. User returns, sees ☑ connected
7. User connects Gmail (OAuth redirect)
8. User returns, sees ☑ connected
9. User clicks "Next"
10. User configures reminder schedule (form)
11. User clicks "Activate"
12. Success modal: "Invoice Chaser is now active!"
13. User redirected to My Workflows
```

### Flow 2: Viewing Insight Dashboard

```
1. User navigates to dashboard
2. Insight cards load at top
3. User sees Velocity: 42 tasks, ↑15%
4. User sees Savings: 120 hours, $3,600
5. User scrolls down to see Kanban board
```

### Flow 3: Agency Signup

```
1. Visitor lands on /agency
2. Visitor reads headline + 3 hooks
3. Visitor scrolls to pricing preview
4. Visitor clicks "Join Agency Waitlist"
5. Form appears: email, agency name, size
6. Visitor submits
7. Thank you message with referral code
```

---

## MVP Technical Requirements

### Database Changes

Add to Prisma schema:
```prisma
model WorkflowBlueprint {
  id              String   @id @default(uuid())
  slug            String   @unique
  name            String
  description     String
  industry        String
  velocityMetric  String
  leverageMetric  String
  precisionMetric String
  workflowJson    Json
  integrations    Json     @default("[]")
  setupWizard     Json     @default("[]")
  installCount    Int      @default(0)
  createdAt       DateTime @default(now())

  installations   WorkflowInstallation[]

  @@index([industry])
}

model WorkflowInstallation {
  id              String   @id @default(uuid())
  blueprintId     String
  workspaceId     String
  installedById   String
  config          Json     @default("{}")
  integrationKeys Json     @default("{}")
  status          String   @default("active")
  installedAt     DateTime @default(now())

  blueprint       WorkflowBlueprint @relation(fields: [blueprintId], references: [id])

  @@index([blueprintId])
  @@index([workspaceId])
}
```

### API Endpoints (MVP)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workflow-store/blueprints` | List 5 blueprints |
| GET | `/workflow-store/blueprints/:slug` | Get blueprint details |
| POST | `/workflow-store/install/:slug` | Install blueprint |
| GET | `/workflow-store/installations` | List my installations |
| GET | `/insights/summary` | Get Velocity + Savings |

### Frontend Pages (MVP)

| Page | Route | Components |
|------|-------|------------|
| Workflow Store | `/workflows` | BlueprintGrid, BlueprintCard |
| Blueprint Detail | Modal on Store | BlueprintDetailModal |
| Installation Wizard | Modal on Detail | InstallationWizard, WizardStep |
| My Workflows | `/my-workflows` | InstallationList, InsightDashboard |
| Agency Landing | `/agency` | AgencyHero, AgencyHooks, AgencyPricing |

### Integration Connectors (MVP)

```typescript
// /trident/integrations/quickbooks/index.ts
export const quickbooksConnector = {
  name: "QuickBooks",
  authType: "oauth2",
  authUrl: "https://appcenter.intuit.com/connect/oauth2",
  tokenUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
  scopes: ["com.intuit.quickbooks.accounting"],

  async getInvoices(accessToken: string) { ... },
  async createPaymentReminder(accessToken: string, invoiceId: string) { ... },
}
```

---

## MVP Milestones

### Week 1: Foundation
- [ ] Create /trident directory structure
- [ ] Write all documentation (BLUEPRINT, PRD, MVP, PLAYBOOK, PLAN, TODO)
- [ ] Add Prisma models for WorkflowBlueprint, WorkflowInstallation
- [ ] Create 5 blueprint JSON definitions

### Week 2: Workflow Store UI
- [ ] Create WorkflowStore page
- [ ] Create BlueprintCard component
- [ ] Create BlueprintDetailModal
- [ ] Implement GET /workflow-store/blueprints API

### Week 3: Installation Wizard
- [ ] Create InstallationWizard modal
- [ ] Implement OAuth flow for QuickBooks
- [ ] Implement OAuth flow for Google
- [ ] Implement config step with forms
- [ ] Implement POST /workflow-store/install API

### Week 4: Insight Dashboard + Polish
- [ ] Create InsightDashboard component
- [ ] Implement Velocity metric calculation
- [ ] Implement Savings metric calculation
- [ ] Create My Workflows page
- [ ] End-to-end testing

### Week 5: Agency Landing + Launch
- [ ] Create /agency landing page
- [ ] Implement waitlist signup form
- [ ] Deploy to trident.agentworksstudio.com
- [ ] Announce to waitlist

---

## MVP Success Criteria

### Quantitative

| Metric | Target |
|--------|--------|
| Time to first installation | < 10 minutes |
| Installation completion rate | > 50% |
| Workflow execution success | > 90% |
| Agency waitlist signups | > 100 |

### Qualitative

- [ ] User can install a workflow without contacting support
- [ ] User understands what the workflow does before installing
- [ ] User can see proof of value in Insight Dashboard
- [ ] Agency owner understands the value proposition from landing page

---

## MVP Constraints

### What We Won't Build (Yet)

1. **No custom workflows**: Users install pre-built blueprints only
2. **No data import**: Skip CSV import step in wizard
3. **No test execution**: Skip test step in wizard
4. **No white-label**: Agency branding comes post-MVP
5. **No sub-accounts**: Single workspace per user for now
6. **No reviews**: Social proof deferred
7. **No mobile**: Web-responsive only
8. **No real-time updates**: Poll every 60 seconds

### What We Will Hardcode (For Now)

- 5 blueprints (not dynamically loaded from DB)
- 4 integrations (Stripe, QuickBooks, Google, Microsoft)
- 2 insight metrics (Velocity, Savings)
- English only

---

## Post-MVP Roadmap

### MVP + 1 (Month 2)
- White-label system (logo, colors)
- Sub-account management
- 10 additional blueprints
- Throughput graph in dashboard

### MVP + 2 (Month 3)
- Custom domain support
- Data import (CSV) in wizard
- Test execution in wizard
- Reviews and ratings

### MVP + 3 (Month 4)
- P1 integrations (Xero, HubSpot, Salesforce)
- ROI metric in dashboard
- Export dashboard as PDF
- 25+ blueprints

### MVP + 4 (Month 5)
- P2 integrations (Procore, Clio, Gusto)
- Workflow builder (simple)
- User-created blueprints
- 50+ blueprints

---

## Risks & Mitigations (MVP)

| Risk | Mitigation |
|------|------------|
| OAuth integration fails | Detailed error messages, support contact |
| Blueprint doesn't fit user's needs | "Request a Blueprint" form |
| Insight metrics confusing | Tooltips explaining each metric |
| Low completion rate in wizard | Progress saving, email reminder |

---

**The MVP is not the product. It's the proof that the product will work.**

Speed. Leverage. Precision.
