# AgentWorks Trident - Master TODO List

**Last Updated**: December 24, 2024

---

## Sprint Progress

| Sprint | Status | Progress |
|--------|--------|----------|
| Sprint 0: Documentation | COMPLETE | 7/7 (100%) |
| Sprint 1: Marketing Site | NOT STARTED | 0/9 |
| Sprint 2: Schema & Database | NOT STARTED | 0/10 |
| Sprint 3: First 5 Blueprints | NOT STARTED | 0/8 |
| Sprint 4: Workflow Store API | NOT STARTED | 0/10 |
| Sprint 5: Store UI | NOT STARTED | 0/10 |
| Sprint 5.5: AgencyOS Features | NOT STARTED | 0/10 |
| Sprint 6: P0 Integrations | NOT STARTED | 0/10 |
| Sprint 7: Remaining Blueprints | NOT STARTED | 0/50 |

---

## Sprint 0: Documentation (COMPLETE)

- [x] Create `/trident/` directory structure
- [x] Create `/trident/docs/` directory
- [x] Create `/trident/marketing/` directory
- [x] Create `/trident/blueprints/` directory with industry subdirs
- [x] Create `/trident/schema/` directory
- [x] Create `/trident/integrations/` directory with provider subdirs
- [x] Write BLUEPRINT.md - Vision, strategy, market positioning
- [x] Write PRD.md - Product Requirements Document
- [x] Write MVP.md - Minimum Viable Product scope
- [x] Write AGENT_PLAYBOOK.md - Agent roles, prompts, workflows
- [x] Write PLAN.md - Implementation roadmap
- [x] Write TODO.md - Master task tracking (this file)

---

## Sprint 1: Marketing Site + Agency Landing

### Marketing Site Setup
- [ ] Initialize Vite + React app in `/trident/marketing`
- [ ] Configure TailwindCSS
- [ ] Configure shadcn/ui components
- [ ] Set up project structure (pages, components, styles)

### Trident Landing Page
- [ ] Create TridentHero component
  - [ ] Headline: "Your AI Workforce. Deployed in One Click."
  - [ ] Subhead with Trident philosophy
  - [ ] CTA button: "Get Early Access"
- [ ] Create IndustryShowcase component
  - [ ] 9 industry cards with icons
  - [ ] Brief description for each
- [ ] Create HowItWorks section
  - [ ] 3-step process visualization
  - [ ] "Vibe coding + structured workflows" messaging
- [ ] Create FeaturedBlueprints section
  - [ ] 3 preview cards
  - [ ] Link to Workflow Store

### Agency Landing Page (/agency)
- [ ] Create AgencyHero component
  - [ ] Headline: "Your Agency. Powered by an AI Workforce."
  - [ ] Subhead about stopping hiring
- [ ] Create ThreeHooks section
  - [ ] Hook 1: Productize Your Services
  - [ ] Hook 2: Client Insight Portal
  - [ ] Hook 3: Keep 100% of the Upsell
- [ ] Create AgencyPricing component
  - [ ] Starter tier: $297/mo
  - [ ] Growth tier: $497/mo
  - [ ] Enterprise tier: Custom
- [ ] Create WaitlistForm component
  - [ ] Email field
  - [ ] Agency name field
  - [ ] Agency size dropdown
  - [ ] Submit to database

### Deployment
- [ ] Configure DNS for trident.agentworksstudio.com
- [ ] Set up Cloud Run service
- [ ] Deploy marketing site
- [ ] Verify SSL certificate
- [ ] Test waitlist form submission

---

## Sprint 2: Schema & Database

### Type Definitions
- [ ] Create `/trident/schema/index.ts`
- [ ] Define extended WorkflowNodeType
  - [ ] email, sms, invoice, payment
  - [ ] calendar, document, crm, form
  - [ ] approval, integration, ai_analyze, ai_generate
  - [ ] wait, loop, webhook
- [ ] Define industry TemplateCategory
  - [ ] finance, sales, hr, healthcare
  - [ ] construction, legal, real_estate
  - [ ] ecommerce, professional
- [ ] Define AgentBlueprint interface
- [ ] Define SetupWizardStep interface
- [ ] Define IntegrationRequirement interface
- [ ] Define TridentMetrics interface

### Database Models
- [ ] Add WorkflowBlueprint model to Prisma schema
- [ ] Add WorkflowInstallation model to Prisma schema
- [ ] Add WorkflowReview model to Prisma schema
- [ ] Add indexes for performance
- [ ] Run `prisma db push`
- [ ] Verify no breaking changes to existing tables
- [ ] Generate Prisma client

### Shared Package Updates
- [ ] Export Trident types from shared package
- [ ] Update package version
- [ ] Build and verify no errors

---

## Sprint 3: First 5 Industry Blueprints

### Invoice Chaser (Finance)
- [ ] Create `/trident/blueprints/finance/ar-invoice-chaser/`
- [ ] Define workflow nodes and edges
- [ ] Create setup wizard steps
- [ ] Define Trident metrics
- [ ] Write email templates
  - [ ] friendly_reminder.md
  - [ ] followup_reminder.md
  - [ ] demand_letter.md
- [ ] Write README.md

### Lead Resurrection (Sales)
- [ ] Create `/trident/blueprints/sales/lead-resurrection/`
- [ ] Define workflow nodes and edges
- [ ] Create setup wizard steps
- [ ] Define Trident metrics
- [ ] Write email templates
  - [ ] reengagement_1.md
  - [ ] value_content.md
  - [ ] breakup_email.md
- [ ] Write README.md

### Employee Onboarding (HR)
- [ ] Create `/trident/blueprints/hr/employee-onboarding/`
- [ ] Define workflow nodes and edges
- [ ] Create setup wizard steps
- [ ] Define Trident metrics
- [ ] Write email templates
  - [ ] welcome_email.md
  - [ ] document_request.md
  - [ ] training_assignment.md
- [ ] Write README.md

### Patient Adherence (Healthcare)
- [ ] Create `/trident/blueprints/healthcare/patient-adherence/`
- [ ] Define workflow nodes and edges
- [ ] Create setup wizard steps
- [ ] Define Trident metrics
- [ ] Write SMS/email templates
  - [ ] appointment_reminder.md
  - [ ] medication_reminder.md
  - [ ] recall_notice.md
- [ ] Write README.md

### Subcontractor Compliance (Construction)
- [ ] Create `/trident/blueprints/construction/subcontractor-compliance/`
- [ ] Define workflow nodes and edges
- [ ] Create setup wizard steps
- [ ] Define Trident metrics
- [ ] Write email templates
  - [ ] document_request.md
  - [ ] expiry_warning.md
  - [ ] non_compliant_notice.md
- [ ] Write README.md

---

## Sprint 4: Workflow Store API

### Route Setup
- [ ] Create `/apps/api/src/routes/workflow-store.ts`
- [ ] Register route with Fastify
- [ ] Add authentication middleware
- [ ] Add rate limiting

### Endpoints
- [ ] GET /workflow-store/blueprints
  - [ ] Pagination
  - [ ] Industry filter
  - [ ] Search query
- [ ] GET /workflow-store/blueprints/:slug
  - [ ] Full blueprint details
  - [ ] Related blueprints
- [ ] GET /workflow-store/blueprints/featured
  - [ ] Featured flag filter
  - [ ] Limit to 5
- [ ] GET /workflow-store/industries
  - [ ] List with counts
- [ ] POST /workflow-store/install/:slug
  - [ ] Create installation record
  - [ ] Create workflow instance
  - [ ] Store configuration
- [ ] GET /workflow-store/installations
  - [ ] List for current workspace
  - [ ] Include status
- [ ] PATCH /workflow-store/installations/:id
  - [ ] Update status (pause/resume)
- [ ] DELETE /workflow-store/installations/:id
  - [ ] Soft delete or full delete
- [ ] POST /workflow-store/reviews/:slug
  - [ ] Rating validation
  - [ ] One review per user

### Testing
- [ ] Write API tests for each endpoint
- [ ] Test error scenarios
- [ ] Test pagination
- [ ] Test authentication

---

## Sprint 5: Store UI

### Pages
- [ ] Create `/apps/web/src/pages/WorkflowStore.tsx`
- [ ] Create `/apps/web/src/pages/MyWorkflows.tsx`
- [ ] Add routes to App.tsx

### Workflow Store Components
- [ ] Create BlueprintCard component
  - [ ] Name, description, industry
  - [ ] Trident metrics badges
  - [ ] Install count
  - [ ] Install button
- [ ] Create BlueprintGrid component
  - [ ] Responsive grid layout
  - [ ] Loading skeleton
- [ ] Create IndustryFilter component
  - [ ] Checkbox list
  - [ ] Clear all button
- [ ] Create SearchBar component
  - [ ] Debounced search
  - [ ] Clear button

### Blueprint Detail Modal
- [ ] Create BlueprintDetailModal component
- [ ] Create OverviewTab
  - [ ] Long description
  - [ ] Screenshots/preview
  - [ ] Trident metrics
- [ ] Create IntegrationsTab
  - [ ] Required integrations list
  - [ ] Connection status
- [ ] Create ReviewsTab
  - [ ] Star rating display
  - [ ] Review list

### Installation Wizard
- [ ] Create InstallationWizard modal
- [ ] Create WizardProgress component
- [ ] Create OverviewStep component
- [ ] Create IntegrationStep component
  - [ ] OAuth button per integration
  - [ ] Connection status indicator
- [ ] Create ConfigStep component
  - [ ] Dynamic form fields
  - [ ] Validation
- [ ] Create ConfirmStep component
  - [ ] Summary of choices
  - [ ] Activate button

### My Workflows
- [ ] Create InsightDashboard component (basic)
  - [ ] Velocity card
  - [ ] Savings card
- [ ] Create InstallationList component
- [ ] Create InstallationCard component
  - [ ] Status indicator
  - [ ] Pause/Resume button
  - [ ] View logs button

---

## Sprint 5.5: AgencyOS Features

### Enhanced Insight Dashboard
- [ ] Add Throughput graph
  - [ ] Cards per stage per day
  - [ ] Line chart visualization
- [ ] Add ROI metric card
  - [ ] Configurable per blueprint
  - [ ] Default: leads, cost per lead
- [ ] Add time range selector
- [ ] Add export button (PNG/PDF)

### Insight Calculations
- [ ] Implement Velocity calculation API
- [ ] Implement Savings calculation API
  - [ ] avg_minutes_per_task config
  - [ ] hourly_rate config
- [ ] Implement Throughput data API
- [ ] Implement ROI calculation API

### Audit Trail & Insight Log
- [ ] Create AuditLog component
- [ ] Transform terminal output to business log
- [ ] Define action type mappings
  - [ ] "Agent sent email" not "POST /api/email"
  - [ ] "Invoice marked paid" not "UPDATE invoices SET..."
- [ ] Add filtering by action type
- [ ] Add search by keyword

### White-Label (Basic)
- [ ] Create BrandingSettings component
- [ ] Implement logo upload
  - [ ] PNG/SVG support
  - [ ] Max 1MB
  - [ ] Preview
- [ ] Implement color picker
  - [ ] Primary color
  - [ ] Secondary color
- [ ] Apply branding to header
- [ ] Store settings in workspace

---

## Sprint 6: P0 Integrations

### Integration Framework
- [ ] Create `/trident/integrations/base.ts`
- [ ] Define IntegrationConnector interface
- [ ] Create token encryption utility
- [ ] Create token refresh scheduler
- [ ] Create integration status API

### Stripe Integration
- [ ] Create `/trident/integrations/stripe/index.ts`
- [ ] Implement OAuth flow
- [ ] Implement token exchange
- [ ] Implement token refresh
- [ ] Implement test connection
- [ ] Create Stripe actions
  - [ ] getInvoices
  - [ ] createPaymentLink
  - [ ] getPaymentStatus

### QuickBooks Integration
- [ ] Create `/trident/integrations/quickbooks/index.ts`
- [ ] Register app on Intuit Developer
- [ ] Implement OAuth flow
- [ ] Implement token exchange
- [ ] Implement token refresh
- [ ] Implement test connection
- [ ] Create QuickBooks actions
  - [ ] getInvoices
  - [ ] getCustomers
  - [ ] createInvoice

### Google Integration
- [ ] Create `/trident/integrations/google/index.ts`
- [ ] Configure OAuth consent screen
- [ ] Implement OAuth flow
- [ ] Implement token exchange
- [ ] Implement token refresh
- [ ] Implement test connection
- [ ] Create Google actions
  - [ ] sendEmail (Gmail)
  - [ ] createEvent (Calendar)
  - [ ] uploadFile (Drive)

### Microsoft Integration
- [ ] Create `/trident/integrations/microsoft/index.ts`
- [ ] Register Azure AD app
- [ ] Implement OAuth flow
- [ ] Implement token exchange
- [ ] Implement token refresh
- [ ] Implement test connection
- [ ] Create Microsoft actions
  - [ ] sendEmail (Outlook)
  - [ ] createEvent (Calendar)
  - [ ] uploadFile (OneDrive)

### Integration UI
- [ ] Add OAuth button to wizard IntegrationStep
- [ ] Show connection status
- [ ] Handle OAuth callback
- [ ] Show error messages
- [ ] Allow disconnect

---

## Sprint 7: Remaining Blueprints

### Finance (7 remaining)
- [ ] AP Approval Workflow
- [ ] Expense Report Processor
- [ ] Bank Reconciliation Agent
- [ ] Vendor Onboarding
- [ ] Late Fee Calculator
- [ ] Payment Reminder Sequence
- [ ] Collection Escalation

### Sales (7 remaining)
- [ ] Proposal Generator
- [ ] Follow-up Sequencer
- [ ] Meeting Scheduler
- [ ] Stale Deal Alerter
- [ ] Win/Loss Analyzer
- [ ] Renewal Manager
- [ ] Referral Request Bot

### HR (5 remaining)
- [ ] Employee Offboarding
- [ ] PTO Request Manager
- [ ] Compliance Training Tracker
- [ ] Performance Review Scheduler
- [ ] Candidate Screener

### Healthcare (5 remaining)
- [ ] Appointment Scheduler
- [ ] Insurance Verification
- [ ] Patient Intake Forms
- [ ] Patient Recall Manager
- [ ] Patient Billing Follow-up

### Construction (5 remaining)
- [ ] Change Order Processor
- [ ] Daily Report Collector
- [ ] Safety Checklist Enforcer
- [ ] Permit Tracker
- [ ] Progress Billing Automation

### Legal (5)
- [ ] Legal Deadline Tracker
- [ ] Contract Review Assistant
- [ ] Client Intake Workflow
- [ ] Matter Closing Checklist
- [ ] Trust Account Reconciler

### Real Estate (5)
- [ ] Lead Capture & Nurture
- [ ] Showing Scheduler
- [ ] Transaction Coordinator
- [ ] Listing Status Updater
- [ ] Open House Follow-up

### E-Commerce (4)
- [ ] Order Fulfillment Bot
- [ ] Return/Refund Processor
- [ ] Review Solicitor
- [ ] Abandoned Cart Recovery

### Professional Services (4)
- [ ] Client Onboarding
- [ ] Project Status Updater
- [ ] Time Entry Reminder
- [ ] Invoice Generator

---

## Post-Launch Tasks

### Documentation
- [ ] Write user documentation
- [ ] Create video tutorials
- [ ] Write API documentation
- [ ] Create knowledge base articles

### Marketing
- [ ] Launch email sequence
- [ ] Create case studies
- [ ] Partner outreach
- [ ] Content marketing calendar

### Operations
- [ ] Set up monitoring dashboards
- [ ] Create runbooks
- [ ] Establish SLAs
- [ ] Create support workflows

### Analytics
- [ ] Implement event tracking
- [ ] Create analytics dashboards
- [ ] Set up conversion funnels
- [ ] A/B testing framework

---

## Blockers & Notes

### Current Blockers
- None

### Notes
- All Sprint 0 documentation complete as of December 24, 2024
- Ready to begin Sprint 1 (Marketing Site)

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Total Tasks | 200+ |
| Completed | 12 |
| In Progress | 0 |
| Blocked | 0 |
| Remaining | 188+ |

---

**Updated By**: Claude
**Next Update**: Start of Sprint 1
