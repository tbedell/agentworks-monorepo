# AgentWorks Trident - Implementation Plan

**Version**: 1.0
**Author**: Thomas R. Bedell
**Date**: December 24, 2024

---

## Overview

This document outlines the phased implementation plan for AgentWorks Trident. The plan is organized into 8 sprints, with Sprint 0 (documentation) already complete.

**Guiding Principle**: Ship early, iterate often. Each sprint delivers usable value.

---

## Sprint Overview

| Sprint | Focus | Duration | Deliverable |
|--------|-------|----------|-------------|
| **0** | Documentation | Complete | BLUEPRINT, PRD, MVP, PLAYBOOK, PLAN, TODO |
| **1** | Marketing Site | 1 week | Trident landing + /agency page |
| **2** | Schema & Database | 1 week | Prisma models, API types |
| **3** | First 5 Blueprints | 1 week | Industry workflow definitions |
| **4** | Workflow Store API | 1 week | REST endpoints for blueprints |
| **5** | Store UI | 1 week | Browse, detail, install flow |
| **5.5** | AgencyOS Features | 1 week | Insight Dashboard, white-label |
| **6** | P0 Integrations | 1 week | Stripe, QuickBooks, Google, Microsoft |
| **7** | Remaining Blueprints | 2 weeks | 45+ additional workflows |

**Total Estimated Duration**: 10 weeks

---

## Sprint 0: Documentation (COMPLETE)

### Deliverables

| File | Status | Description |
|------|--------|-------------|
| `/trident/docs/BLUEPRINT.md` | Complete | Vision, strategy, market positioning |
| `/trident/docs/PRD.md` | Complete | Product Requirements Document |
| `/trident/docs/MVP.md` | Complete | Minimum Viable Product scope |
| `/trident/docs/AGENT_PLAYBOOK.md` | Complete | Agent roles, prompts, workflows |
| `/trident/docs/PLAN.md` | Complete | Implementation roadmap (this file) |
| `/trident/docs/TODO.md` | Complete | Master task tracking |

### Directory Structure Created

```
/AgentWorks/trident/
├── docs/               ✓ Complete
├── marketing/          ✓ Directory created
├── blueprints/         ✓ Directory created
│   ├── finance/
│   ├── sales/
│   ├── hr/
│   ├── healthcare/
│   ├── construction/
│   ├── legal/
│   ├── real_estate/
│   ├── ecommerce/
│   └── professional/
├── schema/             ✓ Directory created
└── integrations/       ✓ Directory created
    ├── stripe/
    ├── quickbooks/
    ├── google/
    └── microsoft/
```

---

## Sprint 1: Marketing Site + Agency Landing

### Objective
Create a compelling landing page for Trident and a dedicated /agency page for AgencyOS.

### Tasks

| Task | Priority | Owner | Status |
|------|----------|-------|--------|
| Initialize Vite + React app in `/trident/marketing` | P0 | Frontend | Pending |
| Configure TailwindCSS + shadcn/ui | P0 | Frontend | Pending |
| Create Trident hero section | P0 | Frontend | Pending |
| Create industry showcase (9 verticals) | P0 | Frontend | Pending |
| Create "How It Works" section | P1 | Frontend | Pending |
| Create /agency landing page | P0 | Frontend | Pending |
| Create agency pricing section | P1 | Frontend | Pending |
| Create waitlist signup form | P0 | Frontend | Pending |
| Deploy to trident.agentworksstudio.com | P0 | DevOps | Pending |

### Acceptance Criteria

- [ ] Trident landing page loads in < 2s
- [ ] /agency page has 3 hooks (Productize, Insight, 100% Upsell)
- [ ] Waitlist form submits to database
- [ ] Mobile responsive
- [ ] Deployed to subdomain

### Design Specs

**Trident Landing Page**:
- Hero: "Your AI Workforce. Deployed in One Click."
- Industry showcase: 9 cards with industry icons
- Workflow preview: 3 featured blueprints
- CTA: "Get Early Access"

**Agency Landing Page**:
- Hero: "Your Agency. Powered by an AI Workforce."
- 3 Hooks section
- Pricing preview (Starter $297, Growth $497, Enterprise)
- CTA: "Join Agency Waitlist"

---

## Sprint 2: Schema Extensions

### Objective
Add Trident-specific types and database models without modifying existing code.

### Tasks

| Task | Priority | Owner | Status |
|------|----------|-------|--------|
| Create `/trident/schema/index.ts` | P0 | Backend | Pending |
| Define extended WorkflowNodeType | P0 | Backend | Pending |
| Define industry TemplateCategory | P0 | Backend | Pending |
| Define AgentBlueprint interface | P0 | Backend | Pending |
| Define SetupWizardStep interface | P0 | Backend | Pending |
| Add WorkflowBlueprint Prisma model | P0 | Database | Pending |
| Add WorkflowInstallation Prisma model | P0 | Database | Pending |
| Add WorkflowReview Prisma model | P1 | Database | Pending |
| Run `prisma db push` | P0 | Database | Pending |
| Create API types in shared package | P0 | Backend | Pending |

### Schema Additions

**WorkflowNodeType Extensions**:
```typescript
// Trident Operations
| 'email' | 'sms' | 'invoice' | 'payment'
| 'calendar' | 'document' | 'crm' | 'form'
| 'approval' | 'integration' | 'ai_analyze'
| 'ai_generate' | 'wait' | 'loop' | 'webhook'
```

**Industry Categories**:
```typescript
| 'finance' | 'sales' | 'hr' | 'healthcare'
| 'construction' | 'legal' | 'real_estate'
| 'ecommerce' | 'professional'
```

### Acceptance Criteria

- [ ] All new types defined in `/trident/schema/`
- [ ] Prisma models added and migrated
- [ ] No changes to existing database tables
- [ ] Types exported from shared package

---

## Sprint 3: First 5 Industry Blueprints

### Objective
Create 5 complete workflow blueprints, one per major industry vertical.

### Tasks

| Task | Priority | Industry | Status |
|------|----------|----------|--------|
| Create Invoice Chaser blueprint | P0 | Finance | Pending |
| Create Lead Resurrection blueprint | P0 | Sales | Pending |
| Create Employee Onboarding blueprint | P0 | HR | Pending |
| Create Patient Adherence blueprint | P0 | Healthcare | Pending |
| Create Subcontractor Compliance blueprint | P0 | Construction | Pending |
| Write setup wizard steps for each | P0 | All | Pending |
| Define Trident metrics for each | P0 | All | Pending |
| Create workflow node definitions | P0 | All | Pending |

### Blueprint Structure

Each blueprint in `/trident/blueprints/{industry}/` contains:
```
ar-invoice-chaser/
├── index.ts          # Main blueprint export
├── workflow.ts       # Node/edge definitions
├── wizard.ts         # Setup wizard steps
├── templates/        # Email/SMS templates
│   ├── reminder_1.md
│   ├── reminder_2.md
│   └── demand_letter.md
└── README.md         # Blueprint documentation
```

### Acceptance Criteria

- [ ] 5 blueprints complete with all nodes/edges
- [ ] Each has 3 Trident metrics defined
- [ ] Setup wizard has 3-5 steps
- [ ] Email templates included
- [ ] README documents requirements

---

## Sprint 4: Workflow Store API

### Objective
Create REST API endpoints for the Workflow Store.

### Tasks

| Task | Priority | Owner | Status |
|------|----------|-------|--------|
| Create `/api/workflow-store` route file | P0 | Backend | Pending |
| Implement GET /blueprints (list) | P0 | Backend | Pending |
| Implement GET /blueprints/:slug | P0 | Backend | Pending |
| Implement GET /blueprints/featured | P1 | Backend | Pending |
| Implement GET /industries | P1 | Backend | Pending |
| Implement POST /install/:slug | P0 | Backend | Pending |
| Implement GET /installations | P0 | Backend | Pending |
| Implement DELETE /installations/:id | P1 | Backend | Pending |
| Implement POST /reviews/:slug | P2 | Backend | Pending |
| Add API tests | P1 | QA | Pending |

### API Response Schemas

**Blueprint List**:
```json
{
  "blueprints": [
    {
      "slug": "ar-invoice-chaser",
      "name": "Invoice Chaser Bot",
      "description": "...",
      "industry": "finance",
      "trident": {
        "velocity": "45 → 7 days AR",
        "leverage": "500 accounts/manager",
        "precision": "99.9% follow-up"
      },
      "installCount": 142
    }
  ],
  "total": 5,
  "page": 1
}
```

### Acceptance Criteria

- [ ] All endpoints return correct data
- [ ] Pagination works for blueprints
- [ ] Installation creates workflow instance
- [ ] API tests pass

---

## Sprint 5: Store UI

### Objective
Build the Workflow Store frontend components within the existing web app.

### Tasks

| Task | Priority | Owner | Status |
|------|----------|-------|--------|
| Create WorkflowStore page | P0 | Frontend | Pending |
| Create BlueprintCard component | P0 | Frontend | Pending |
| Create BlueprintGrid component | P0 | Frontend | Pending |
| Create BlueprintDetailModal | P0 | Frontend | Pending |
| Create InstallationWizard modal | P0 | Frontend | Pending |
| Create WizardStep components | P0 | Frontend | Pending |
| Create MyWorkflows page | P0 | Frontend | Pending |
| Create InsightDashboard (basic) | P1 | Frontend | Pending |
| Add routes to App.tsx | P0 | Frontend | Pending |
| Integrate with API | P0 | Frontend | Pending |

### Component Hierarchy

```
WorkflowStore
├── BlueprintGrid
│   └── BlueprintCard (×5)
├── BlueprintDetailModal
│   ├── OverviewTab
│   ├── IntegrationsTab
│   └── ReviewsTab
└── InstallationWizard
    ├── WizardProgress
    ├── OverviewStep
    ├── IntegrationStep
    ├── ConfigStep
    └── ConfirmStep

MyWorkflows
├── InsightDashboard
│   ├── VelocityCard
│   └── SavingsCard
└── InstallationList
    └── InstallationCard (×n)
```

### Acceptance Criteria

- [ ] Store displays 5 blueprints
- [ ] Detail modal shows all info
- [ ] Installation wizard completes successfully
- [ ] My Workflows shows installed blueprints
- [ ] Insight Dashboard shows 2 metrics

---

## Sprint 5.5: AgencyOS Features

### Objective
Add agency-specific features: Insight Dashboard, white-label basics.

### Tasks

| Task | Priority | Owner | Status |
|------|----------|-------|--------|
| Enhance InsightDashboard with 4 metrics | P0 | Frontend | Pending |
| Implement Velocity calculation | P0 | Backend | Pending |
| Implement Savings calculation | P0 | Backend | Pending |
| Implement Throughput graph | P1 | Frontend | Pending |
| Implement ROI metric (configurable) | P1 | Backend | Pending |
| Create Audit Trail component | P0 | Frontend | Pending |
| Transform terminal output to business log | P0 | Backend | Pending |
| Create branding settings UI | P1 | Frontend | Pending |
| Implement logo upload | P1 | Backend | Pending |
| Implement color customization | P1 | Frontend | Pending |

### Insight Metrics

| Metric | Calculation | Display |
|--------|-------------|---------|
| Velocity | Tasks completed / time period | "42 tasks this week (+15%)" |
| Savings | Tasks × avg_human_minutes × hourly_rate | "120 hours saved ($3,600)" |
| Throughput | Cards moved per stage per day | Line graph |
| ROI | Custom formula per blueprint | "50 leads, $4 CPL" |

### Acceptance Criteria

- [ ] Dashboard shows 4 metrics
- [ ] Audit log shows human-readable entries
- [ ] Branding settings UI works
- [ ] Logo appears in header when set

---

## Sprint 6: P0 Integrations

### Objective
Implement OAuth integrations for the 4 priority connectors.

### Tasks

| Task | Priority | Owner | Status |
|------|----------|-------|--------|
| Create integration connector framework | P0 | Backend | Pending |
| Implement Stripe OAuth | P0 | Backend | Pending |
| Implement QuickBooks OAuth | P0 | Backend | Pending |
| Implement Google OAuth | P0 | Backend | Pending |
| Implement Microsoft OAuth | P0 | Backend | Pending |
| Create token storage (encrypted) | P0 | Backend | Pending |
| Create token refresh logic | P0 | Backend | Pending |
| Create integration status API | P0 | Backend | Pending |
| Add integration UI to wizard | P0 | Frontend | Pending |
| Test each integration end-to-end | P0 | QA | Pending |

### Integration Framework

```typescript
// /trident/integrations/base.ts
interface IntegrationConnector {
  name: string;
  slug: string;
  authType: 'oauth2' | 'api_key';
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];

  getAuthUrl(redirectUri: string): string;
  exchangeCode(code: string): Promise<TokenSet>;
  refreshToken(refreshToken: string): Promise<TokenSet>;
  testConnection(accessToken: string): Promise<boolean>;
}
```

### Acceptance Criteria

- [ ] All 4 integrations complete OAuth flow
- [ ] Tokens stored encrypted in database
- [ ] Token refresh works automatically
- [ ] Integration status visible in wizard
- [ ] Disconnection works cleanly

---

## Sprint 7: Remaining Blueprints

### Objective
Create 45+ additional industry blueprints.

### Blueprint Inventory

| Industry | Blueprints to Create |
|----------|---------------------|
| Finance (8) | AP Approval, Expense Processor, Reconciliation, Vendor Onboarding, Late Fee, Payment Reminder, Collection Escalator |
| Sales (8) | Proposal Generator, Follow-up Sequencer, Meeting Scheduler, Stale Deal Alert, Win/Loss Analyzer, Renewal Manager, Referral Requester |
| HR (5) | Employee Offboarding, PTO Manager, Compliance Trainer, Performance Review, Candidate Screener |
| Healthcare (5) | Appointment Scheduler, Insurance Verifier, Patient Intake, Recall Manager, Billing Follow-up |
| Construction (5) | Change Order, Daily Report, Safety Checklist, Permit Tracker, Progress Billing |
| Legal (5) | Deadline Tracker, Contract Reviewer, Client Intake, Matter Closer, Trust Accounting |
| Real Estate (5) | Lead Capture, Showing Scheduler, Transaction Coordinator, Listing Updater, Open House Follow-up |
| E-Commerce (4) | Order Fulfillment, Return Processor, Review Solicitor, Abandoned Cart |
| Professional (4) | Client Onboarding, Project Status, Time Entry Reminder, Invoice Generator |

### Acceptance Criteria

- [ ] All 50 blueprints created
- [ ] Each has Trident metrics
- [ ] Each has setup wizard
- [ ] Each has email templates
- [ ] Categorized correctly in store

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| OAuth integration complexity | High | High | Start with Google (simpler) | Backend |
| Blueprint maintenance burden | High | Medium | Version control, auto-update | Product |
| Scope creep | Medium | High | Stick to MVP, defer features | PM |
| Performance at scale | Medium | Medium | Load testing in Sprint 6 | DevOps |
| Security vulnerabilities | Low | Critical | Security review each sprint | Security |

---

## Dependencies

| Dependency | Type | Required By | Status |
|------------|------|-------------|--------|
| Existing AgentWorks platform | Internal | All sprints | Stable |
| Prisma schema access | Internal | Sprint 2 | Available |
| GCP Cloud Run | External | Sprint 1 | Stable |
| Stripe API | External | Sprint 6 | Documentation ready |
| QuickBooks API | External | Sprint 6 | App registration needed |
| Google APIs | External | Sprint 6 | OAuth consent screen needed |
| Microsoft Graph | External | Sprint 6 | Azure AD app needed |

---

## Definition of Done

A sprint is considered complete when:

1. [ ] All P0 tasks are complete
2. [ ] Code reviewed and merged to Trident branch
3. [ ] Unit tests pass (>80% coverage)
4. [ ] Integration tests pass
5. [ ] Documentation updated
6. [ ] Deployed to staging environment
7. [ ] Product owner sign-off

---

## Communication Plan

| Event | Frequency | Audience | Format |
|-------|-----------|----------|--------|
| Sprint Planning | Start of sprint | Team | Meeting |
| Daily Standup | Daily | Team | Async (Slack) |
| Sprint Review | End of sprint | Stakeholders | Demo |
| Sprint Retro | End of sprint | Team | Meeting |
| Status Update | Weekly | Leadership | Document |

---

## Success Metrics

### Sprint-Level

| Sprint | Key Metric | Target |
|--------|-----------|--------|
| 1 | Agency waitlist signups | 100+ |
| 2 | Schema migration successful | No errors |
| 3 | Blueprints validated | 5 complete |
| 4 | API response time | < 200ms |
| 5 | Installation completion rate | > 70% |
| 5.5 | Dashboard data accuracy | > 95% |
| 6 | OAuth success rate | > 95% |
| 7 | Blueprint coverage | 50+ |

### Overall

| Metric | 30 Days | 90 Days | 180 Days |
|--------|---------|---------|----------|
| Active Workspaces | 50 | 300 | 1,000 |
| Workflow Executions | 1,000 | 50,000 | 500,000 |
| Agency Partners | 10 | 50 | 100 |
| MRR | $5K | $50K | $200K |

---

**The plan is not the goal. Shipping is the goal.**

Speed. Leverage. Precision.
