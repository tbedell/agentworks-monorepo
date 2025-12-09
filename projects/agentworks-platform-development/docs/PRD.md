# AgentWorks Cloud – Product Requirements Document (PRD)

**Document:** PRD.md
**Product:** AgentWorks Cloud (Multi-Tenant BYOA Vibe Coding Platform)
**Owner:** Product / Executive Team
**Version:** 2.0
**Date:** 2025-12-08

---

## 0. Overview

This PRD defines the functional and non-functional requirements for **AgentWorks Cloud – BYOA Edition**, a multi-tenant AI-assisted development platform.

The system combines:

- AgentWorks **Studio** (Planning, Kanban, UI/DB/Workflow Builders, CoPilot & agents)
- A **cloud dev environment & browser terminal** per project
- **GitHub integration** (tenant-owned repos)
- **Bring Your Own Agent (BYOA)**: tenants connect Anthropic/OpenAI/Gemini accounts
- A **multi-tenant Admin Console** for tenants, billing, usage, founders, affiliates, analytics, and audit logs

This PRD translates the **Blueprint.md** into detailed, testable requirements and sets the baseline for the first production-ready release.

---

## 1. Goals & Non-Goals

### 1.1 Primary Goals

1. **Multi-tenant SaaS control plane**
   - Support thousands of tenants and up to 1M developer seats.
   - Tenants can manage members, projects, providers, billing, and usage.

2. **Idea-to-App pipeline**
   - CoPilot flow that converts an initial idea into:
     - `docs/Blueprint.md`
     - `docs/PRD.md`
     - `docs/MVP.md`
     - `docs/AgentPlaybook.md`
   - Generates and maintains a structured Kanban with cardID-based history.

3. **Cloud dev environments with browser terminal**
   - Ephemeral containers running in GCP.
   - Browser-based terminal (Claude Code–style) connected to those containers.
   - Environments read/write code in tenant-owned GitHub repos.

4. **Bring Your Own Agent (BYOA)**
   - Tenants connect Anthropic/OpenAI/Gemini accounts.
   - All LLM usage is billed directly to the tenant providers.
   - AgentWorks only orchestrates and logs usage/metadata.

5. **Monetization & tiers**
   - Implement Lite / Pro / Power seat tiers with project and usage limits.
   - Implement Founders "pay once" packages.
   - Stripe-based subscription billing for recurring revenue.

### 1.2 Non-Goals (for this PRD / initial phases)

- No on-prem or self-hosted version.
- No offline/local-only development; all dev happens in cloud environments.
- No deep CI/CD platform (only basic build/test commands triggered by cards).
- No marketplace for third-party agents in v1 (all agents are our own).
- No guarantee of data residency by region in v1 (future roadmap).

---

## 2. Personas & Use Cases

### 2.1 Personas

1. **Indie Builder (Lite)**
   - One person, multiple small projects.
   - Wants fast "vibe coding" with structure.
   - Price sensitive; okay with limited resources.

2. **Lead Engineer / Tech Lead (Pro)**
   - Leads a small team in a startup or internal product group.
   - Needs team-level organization, specs, and repeatable workflows.
   - Concerned about auditability and GitHub-based ownership.

3. **Agency Principal / VP Engineering (Power)**
   - Runs an agency or a platform team with many clients/projects.
   - Needs multi-project control, governance, analytics, founders & affiliate programs.
   - Will pay for higher limits and priority support.

4. **Platform Admin (AgentWorks)**
   - Operates the platform via Admin Console.
   - Manages tenants, billing, founders/affiliates, providers, and compliance.

### 2.2 Core Use Cases

1. Tenant signs up, chooses tier, and completes payment.
2. Tenant invites team members (each seat is a paid license).
3. Tenant connects GitHub and LLM providers (BYOA).
4. User creates new project and runs CoPilot discovery.
5. System generates Blueprint/PRD/MVP/AgentPlaybook and seeded Kanban cards.
6. Users and agents execute cards; dev environment is spun up, terminal opens in browser.
7. Agents modify code, run commands, commit/push to GitHub; cards move through lanes.
8. Tenant admins view usage & billing; see LLM usage (read-only) and infra usage.
9. Founders purchase lifetime packages; affiliates refer new tenants.

---

## 3. Functional Requirements

### 3.1 Tenants & Users

**FR-T1 – Tenant Creation**

- A visitor can create a new tenant by:
  - Providing email + password (or OAuth in future).
  - Choosing a plan (Lite/Pro/Power) or using a Founder code.
- On tenant creation:
  - A **workspace slug** is generated (e.g., `ice-tea-app`) for URLs.
  - Tenant record is created with plan, status (`trial`, `active`, `cancelled`), and limits.
  - A default project quota is applied according to tier.

**FR-T2 – User Management & Roles**

- Each user belongs to one or more tenants via `tenant_user` relationships.
- Minimum roles:
  - `owner` – full control, billing, provider config.
  - `admin` – manage users/projects, not billing.
  - `developer` – full project and agent access, no billing/provider config.
  - `viewer` – read-only.
- Owners/admins can:
  - Invite users (email).
  - Assign roles.
  - Remove users and reassign or remove their seats.

**FR-T3 – Seat Licensing**

- Each **developer** or **owner/admin** seat consumes one subscription.
- A tenant must have at least one active paid seat to access dev environments.
- Founders and special agreements can mark seats as `lifetime` instead of `subscription`.

---

### 3.2 Pricing, Plans & Limits

**FR-P1 – Tier Configuration**

For each tier we must store:

- Name: Lite, Pro, Power.
- Monthly price.
- Project limit per seat.
- Max concurrent dev environments per seat.
- Soft cap on terminal hours per seat per month.
- Soft cap on agent runs per seat per month.

Initial defaults:

- **Lite**:
  - Price: $15/seat/mo.
  - Projects: 5.
  - Concurrent envs: 1.
  - Terminal hours: 10/mo.
- **Pro**:
  - Price: $39/seat/mo.
  - Projects: 20.
  - Concurrent envs: 2.
  - Terminal hours: 40/mo.
- **Power**:
  - Price: $99/seat/mo.
  - Projects: 100.
  - Concurrent envs: 4.
  - Terminal hours: 120/mo.

**FR-P2 – Limit Enforcement**

- When a tenant approaches a limit:
  - 80% usage → in-app warning.
  - 100% usage:
    - For projects: block new project creation.
    - For concurrent envs: queue new env requests until existing ones shut down.
    - For terminal hours: throttle card runs and prompt user to upgrade or buy overage.
- Overage pricing: to be configurable per tier (e.g., `$X per 10 extra terminal hours`).

**FR-P3 – Founder Packages**

- Admin Console must allow configuration of Founder plans:
  - `Launch Week`, `Early Bird`, `Founding 50` with:
    - Max seats.
    - Price.
    - Feature level (maps to Lite or Pro).
- When a Founder tier is bought:
  - A `lifetime` seat or pack of seats is attached to a tenant.
  - No recurring charges for those seats.
  - They still count against infra limits (we manage margin via tier limits).

---

### 3.3 BYOA – Provider Management

**FR-B1 – Provider Registry**

- Support the following providers in v1:
  - Anthropic
  - OpenAI
  - Google (Gemini or Vertex)
  - (Placeholders in UI for ElevenLabs, Stability, etc.)
- For each provider we store:
  - Provider type.
  - API key or credential reference.
  - Status (`connected`, `error`, `disabled`).
  - Default models per agent type (optional overrides).

**FR-B2 – Tenant Provider Setup**

- Under **BYOA** in tenant portal:
  - Tenant owner/admin can add a provider with:
    - API key input (masked).
    - Optional test button to validate key.
  - On save:
    - Key is stored in GCP Secret Manager.
    - DB stores only the Secret Manager reference + metadata.
    - A background job validates connectivity and sets status.

**FR-B3 – Provider Selection for Agents**

- In the **Agents** tab:
  - Each agent card shows:
    - Provider dropdown (Anthropic, OpenAI, Google, etc.).
    - Model dropdown (populated with curated list per provider).
- CoPilot and specialized agents must read provider+model config when executing a card.

**FR-B4 – LLM Billing Responsibility**

- All LLM calls from dev environments and control plane:
  - MUST use the tenant's configured provider keys.
- AgentWorks only stores:
  - Approximate token counts (if returned by providers).
  - Request counts per provider and per tenant.
- There shall be NO shared or hidden platform keys used for main coding flows.

---

### 3.4 GitHub Integration

**FR-G1 – Connect GitHub**

- Tenant owners/admins can:
  - Connect GitHub via OAuth or by installing the AgentWorks GitHub App.
- Once connected:
  - Tenant can see a list of accessible orgs/repos (scoped by GitHub permissions).
  - Tenant can choose:
    - Create new repo for a project.
    - Attach an existing repo.

**FR-G2 – Project Repo Mapping**

- Each project has a `repo` association:
  - `provider=github`, `owner`, `repo_name`, `branch_default`.
- Repos must be unique per project, but a repo MAY be shared by multiple projects in advanced scenarios (not recommended; default = 1:1).

**FR-G3 – Dev Environment Git Operations**

- On environment start:
  - Clone repo into `/workspace`.
  - Checkout the appropriate branch (e.g., `main` or a card-specific branch).
- Agents and humans can:
  - Create/edit files.
  - Run tests / builds.
- On successful run, system can:
  - Commit changes with a standardized message referencing `card_id` and lane.
  - Push to branch or create PR (depending on lane configuration).

**FR-G4 – Error Handling**

- If GitHub authentication fails:
  - Environment start must fail gracefully with clear error messaging in UI.
- If push fails due to conflicts:
  - System must:
    - Capture diff.
    - Mark card as `blocked`.
    - Provide remediation hints (e.g., rebase or manual resolve).

---

### 3.5 Projects, Cards, and CoPilot Flow

**FR-C1 – Project Creation Flow**

- User creates project from AgentWorks Studio:
  - Enter project name, summary, tech preferences (optional).
  - Select GitHub repo or create new.
- CoPilot is launched automatically in **Planning → Project Vision** lane.

**FR-C2 – CoPilot Discovery**

- CoPilot chat asks a scripted sequence:
  - What problem are you solving?
  - Who are the users?
  - Key features & flows?
  - Constraints & tech preferences?
- On completion:
  - CoPilot generates:
    - `/docs/Blueprint.md`
    - `/docs/PRD.md` (this doc's structure, simplified)
    - `/docs/MVP.md`
    - `/docs/AgentPlaybook.md`
  - Four main cards are created in lane 0/1:
    - `0001_blueprint_md`
    - `0002_prd_md`
    - `0003_mvp_md`
    - `0004_agent_playbook_md`

**FR-C3 – Kanban & Card Structure**

- Kanban must implement the 11-lane process visible in UI:
  - Vision/Planning, Frontend Build, DB Build, Workflow Build, Test/Troubleshoot, Deploy, etc.
- For each card we store:
  - `card_id` (sequential with prefix, e.g., `#8_k` as UI ID and internal slug).
  - `lane`, `status`, `priority`.
  - `title`, `description` (Markdown).
  - `agent_owner` (e.g., `dev_frontend`, `dev_backend`, `architect`, `qa`).
  - `prompt_template`.
  - `target_paths` (optional list of files/folders).
  - `dependencies` (list of other `card_id`s).
- Each card has tabs:
  - **Details** – description, deliverables, metadata.
  - **Agents** – which agents are responsible.
  - **Review** – approvals from humans and summary of runs.
  - **History** – events timeline.
  - **Context** – link to `cardID.context` data and related files.

**FR-C4 – cardID.context**

- For each card, every agent run must produce a `cardID.context` snapshot containing:
  - Input prompt.
  - Selected provider + model.
  - Files read/written (paths).
  - Commands executed.
  - Commit hashes (if any).
  - Summary of changes.
- This context is:
  - Stored in DB (for quick retrieval in UI).
  - Also serialized to `/workspace/.agentworks/cards/{card_id}/events/` as JSON, in case we want a repo copy later.

---

### 3.6 Dev Environments & Browser Terminal

**FR-D1 – Environment Provisioning**

- When a user opens the **Terminal** tab or triggers a card run:
  - Control plane requests a dev environment for `{tenant_id, project_id}`.
- Environment:
  - Runs in GKE as a pod or in Cloud Run.
  - Has access only to:
    - GitHub.
    - Provider APIs.
    - AgentWorks APIs.
  - Has configurable CPU/RAM based on tier (default: 2 vCPU / 4–8GB RAM).

**FR-D2 – Environment Lifecycle**

- **Start:**
  - Check tenant limits (concurrent envs + terminal-hours).
  - Clone repo.
  - Start shell and MCP servers.
  - Establish WebSocket endpoint for PTY.
- **Idle Detection:**
  - Monitor command activity.
  - If idle for N minutes (configurable; default 20), send warning.
  - After grace period, terminate environment.
- **Stop:**
  - Gracefully stop processes.
  - Persist any local metadata to control plane.
  - Pod is destroyed; workspace relies on GitHub as source of truth.

**FR-D3 – Browser Terminal UX**

- The **Terminal** tab (in project view) shows:
  - xterm.js instance connected via WebSocket.
  - A dropdown showing active env sessions (if multiple).
  - Indicators:
    - Connected/Disconnected
    - Current branch
    - Running agent (if any)
- Users can:
  - Type commands directly (human interaction).
  - Watch agent-driven commands streaming in.
  - Toggle "Agent mode" vs "Manual mode".

**FR-D4 – Card Execution Pipeline**

- When user clicks "Run Card":
  - System:
    - Validates dependencies are met.
    - Ensures env is running (start if needed).
    - Fetches card prompt + context + relevant docs (Blueprint/PRD/MVP/AgentPlaybook).
    - Calls the orchestrator service inside the env:
      - LLM uses provider+model defined for `agent_owner`.
      - Tools: filesystem + terminal.
  - As agent works:
    - Logs stdout/stderr to card **History** and terminal view.
    - Updates `cardID.context`.
  - On completion:
    - Card status updated (`in_progress` → `done` or `blocked`).
    - Optionally moves card to next lane if configured.

---

### 3.7 Analytics, KPIs & Audit

**FR-A1 – Tenant Analytics**

- In **Analytics** tab (per tenant), show:
  - Total card runs.
  - Total terminal hours (approx).
  - Provider breakdown (requests / tokens if available).
  - Projects with highest activity.

**FR-A2 – Platform Analytics & KPIs (Admin Console)**

- As already visible in UI:
  - Monthly Revenue, Total Costs (configurable), Gross Margin.
  - Active tenants, active users.
  - Provider cost breakdown (anthropic, openai, google).
  - Platform health: active users, MRR, waitlist, etc.

**FR-A3 – Audit Logs**

- Log key events:
  - Tenant plan changes.
  - Provider key updates (not the key value itself).
  - Billing events (subscription create/cancel/renewal).
  - Admin actions in Admin Console.
- Audit logs visible in **Audit Logs** section with filters:
  - Date range, tenant, action type, actor.

---

### 3.8 Billing & Subscriptions

**FR-S1 – Stripe Integration**

- Use Stripe for:
  - Subscription management (Lite/Pro/Power per seat).
  - One-time Founder purchases.
- Tenant Billing UI shows:
  - MRR, ARR (derived).
  - Active subscriptions.
  - Plan changes and history.

**FR-S2 – Usage-Based Add-ons (Phase 2+)**

- Allow configuration of add-ons:
  - Extra terminal hours.
  - Extra projects.
- Billing for add-ons should be clearly itemized.

---

### 3.9 Affiliates & Founders

**FR-F1 – Founders Program**

- In Admin Console → Founders:
  - Configure plans (Launch Week, Early Bird, Founding 50).
  - Set max spots and price.
- Show:
  - Spots sold / remaining.
  - Revenue per plan.

**FR-F2 – Affiliate Program**

- Affiliates have:
  - Unique codes or links.
  - Tiers (Standard, Silver, Gold, Platinum) with % commissions.
- System tracks:
  - Conversions per affiliate.
  - Pending/paid out commissions.

---

## 4. Non-Functional Requirements

**NFR-1 – Scalability**

- Control plane must support:
  - 1M user accounts.
  - 100k+ active tenants.
  - 10k concurrent dev envs (future target), with autoscaling at GKE layer.

**NFR-2 – Performance**

- Main Studio pages should load in < 1.5s under normal load.
- CoPilot responses should begin within 2–3s (network and provider latency permitting).
- Terminal latency: < 200ms RTT for keystroke echo under typical conditions.

**NFR-3 – Availability**

- Target 99.5% uptime for control plane.
- Dev environments are "best effort" but should be resilient to node failures (pod auto-restart).

**NFR-4 – Security**

- All provider secrets in **GCP Secret Manager**.
- TLS on all external connections.
- Strong tenant isolation at DB and application levels.
- Logs must never contain provider API keys or secrets.

**NFR-5 – Observability**

- Centralized logging (Stackdriver / Cloud Logging).
- Metrics & alerts:
  - Dev env failures.
  - Pod saturation and OOM kills.
  - Rate of "limit reached" events per tenant.

---

## 5. Data Model (High Level)

Entities (simplified):

- `Tenant`
- `User`
- `TenantUser` (role, seat_type)
- `Plan` (Lite/Pro/Power, Founder variants)
- `Project`
- `Card`
- `CardEvent` (for `cardID.context`)
- `ProviderConfig` (per tenant, per provider)
- `DevEnvironmentSession`
- `BillingSubscription`
- `FounderPurchase`
- `Affiliate`
- `AffiliateConversion`
- `AuditLogEntry`

Each entity must include `tenant_id` where relevant for multi-tenancy.

---

## 6. External Integrations

- **Stripe** – subscriptions, one-time purchases (Founders).
- **GitHub** – repos, branches, PRs.
- **LLM providers** – Anthropic, OpenAI, Google.
- **Email provider** (for invites, billing notices).

---

## 7. MVP Scope (v1)

The MVP for **AgentWorks Cloud – BYOA Edition** MUST include:

1. **Tenants & Seats**
   - Tenant creation with one owner seat.
   - Lite/Pro/Power plan selection.
   - Basic seat count (no complex team management yet).

2. **BYOA**
   - Anthropic + OpenAI as providers.
   - Provider setup screen (add/edit/remove key).
   - Provider selection per agent.

3. **GitHub Integration**
   - One GitHub connection per tenant.
   - One repo per project.
   - Clone → edit → commit → push to default branch.

4. **Studio**
   - Planning screen with CoPilot steps for:
     - Vision, Requirements, Goals.
   - Auto-generation of:
     - Blueprint.md
     - PRD.md (simplified)
     - MVP.md
     - AgentPlaybook.md
   - Kanban board with cards representing those docs and a handful of build tasks.

5. **Dev Environment & Terminal**
   - Single environment per project.
   - Manual start from Terminal tab.
   - "Run Card" button that:
     - Starts env if needed.
     - Executes a simple agent flow to:
       - Create or update files in repo.
       - Run a command (`npm install`, `npm test`, etc.).
   - Basic `cardID.context` logging.

6. **Admin Console**
   - Tenant list.
   - BYOA provider status per tenant.
   - Billing view (Stripe integration).
   - Simple KPIs (tenants, active users).

7. **Founders Program (Launch Only)**
   - Ability to issue lifetime seats via Founder purchase links.
   - Founders dashboard with spots sold/remaining.

Everything else (full affiliates, advanced analytics, power tier add-ons, multiple environments per project, extra providers) can follow in v1.1+.

---

## 8. Open Questions

1. Do we enforce **1 env per project** hard in MVP, or allow multiple but limit concurrency?
2. How aggressive should idle timeouts be per tier? (Lite shorter, Power longer?)
3. Do we default to branch-per-card workflow or commit directly to main in MVP?
4. How much of provider token usage can we reliably read from APIs vs what we calculate locally?
5. Which additional providers are "must have" for GA (Google, ElevenLabs, Stability)?

These will need to be resolved with engineering and product before MVP build is locked.

---

## 9. Acceptance Criteria (High-Level)

- A new tenant can:
  - Sign up, purchase a plan (or Founder), invite at least one developer.
  - Connect Anthropic or OpenAI and GitHub.
  - Create a project, run CoPilot discovery, and see generated Blueprint/PRD/MVP/AgentPlaybook in GitHub.
  - View and interact with Kanban cards created from those docs.
  - Open a terminal in the browser, run commands, and see code change in GitHub.
  - Click "Run Card" and see the card move from TODO → Done, with a recorded history.

- Admin can:
  - See tenants, plans, providers, and basic usage in the Admin Console.
  - View Founders dashboard and make sure Founder purchases are tracked.

Once these are met, we have a coherent v1 to release to Founders and early customers.
