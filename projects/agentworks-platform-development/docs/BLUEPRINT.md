# AgentWorks Cloud – Blueprint

**Document:** Blueprint.md
**Product:** AgentWorks Cloud (Multi-Tenant BYOA Vibe Coding Platform)
**Owner:** Executive Team / Product
**Version:** 2.0
**Date:** 2025-12-08

---

## 1. Product Overview

AgentWorks Cloud is a **multi-tenant, agent-orchestrated development suite** that takes a project from idea → blueprint → PRD → MVP → running application.

The platform combines:

- **Planning & Kanban** – structured 11-lane process from vision to deploy.
- **CoPilot & 15+ specialized agents** – architecture, backend, frontend, DB, workflows, docs, QA, DevOps.
- **Visual builders** – UI Builder, DB Builder, Workflow Builder.
- **Browser terminal + GitHub** – a Claude-Code–style dev environment that lives in the browser but runs in our GCP compute plane, writing to **tenant-owned GitHub repos**.
- **Multi-tenant admin console** – tenants, BYOA provider setup, billing, KPIs, analytics, audit logs, affiliates, founders program.

**Key model change:**
Tenants **Bring Their Own Agent (BYOA)** – they connect Anthropic/OpenAI/Gemini accounts. We orchestrate; they pay the LLM bills.

---

## 2. Problem & Opportunity

### 2.1 Problems with current "AI coding" tools

- Chat-style tools can generate code, but **no persistent structure or recall** of how an app was built.
- Existing "vibe coding" systems are usually single-user, fragile, and don't scale to teams.
- Most hosted AI dev platforms keep code in their own infra; **ownership and portability are murky**.
- LLM cost volatility sits on the platform vendor, compressing margins and forcing aggressive limits.

### 2.2 What we solve

1. **Total Recall of the Build**
   Every step, card, agent run, and file change is tracked by **cardID.context** with timestamps, so humans and CoPilot can replay the entire build.

2. **Structured from day one**
   From the first prompt, CoPilot forces a disciplined flow: **Blueprint.md → PRD.md → MVP.md → AgentPlaybook.md → granular cards**.

3. **Team-ready multi-tenant suite**
   Tenants, members, roles, billing, BYOA, analytics, audit logs, affiliates, founders – already wired into the Admin Console.

4. **Clean code ownership**
   All code lives in **tenant-owned GitHub repos**. AgentWorks is the orchestrator, not the code landlord.

5. **Healthy unit economics**
   BYOA shifts LLM COGS to the customer. Our COGS is primarily **GCP compute + storage**, which is predictable and controllable.

---

## 3. Vision & Positioning

> **Vision:**
> Become the standard "idea-to-app" operating system for developers and small teams, where AI agents and humans build together under a disciplined, auditable process.

**Positioning:**

- Not "another chat IDE".
- A **multi-tenant SaaS dev studio** that:
  - Looks and feels like Jira + Linear + Retool + Claude Code in one place.
  - Scales from lone hacker to 1M devs and tens of thousands of tenants.
  - Respects traditional software engineering discipline (blueprints, specs, PRDs, reviews).

---

## 4. Target Segments & Personas

### 4.1 Segments

1. **Solo & indie devs** – building SaaS/MVPs, want speed + structure.
2. **Agencies & studios** – running multiple client projects, need traceability, billing, and repeatable workflows.
3. **Startups & internal product teams** – multiple devs, multiple projects, mix of human/AI work.
4. **Educators / bootcamps** – want a controlled environment to teach AI-assisted development.

### 4.2 Personas

- **Indie Builder (Lite)** – one dev, 2–5 projects, heavy AI usage but limited infra needs.
- **Lead Engineer / Tech Lead (Pro)** – coordinates a small squad, needs Kanban, specs, and sane automation.
- **Agency Principal / VP Engineering (Power)** – runs many projects/clients, needs governance, analytics, multi-tenant management.

---

## 5. Core Concepts

- **Tenant** – a company/workspace; owns projects, members, providers, billing.
- **User / Seat** – an individual dev; each seat is licensed (Lite/Pro/Power).
- **Project** – one app being built (e.g., "Ice Tea App").
- **Card** – atomic work unit in the Kanban; has `card_id`, lane, status, prompt, outputs, events.
- **CoPilot** – CEO agent handling discovery, requirements, and orchestration of specialized agents.
- **Specialized Agents** – architect, dev_backend, dev_frontend, devops, docs, QA, etc.
- **Run** – execution of one card by one or more agents in the dev environment.
- **Workspace** – cloud dev environment (container) for a project; holds repo checkout + MCP servers + terminal.
- **Provider** – Anthropic/OpenAI/Google etc. configured by tenant (BYOA).
- **Admin Console** – global view of tenants, BYOA status, billing, KPIs, audit logs, waitlist, founders, affiliates.

---

## 6. Product Scope v1 (Cloud BYOA Edition)

### 6.1 AgentWorks Studio (per-tenant)

- Planning workspace:
  - Vision, requirements, goals, stakeholders, high-level architecture.
  - CoPilot Q&A driving creation of Blueprint, PRD, MVP, AgentPlaybook.
- Kanban board:
  - 11-lane process from Vision/Planning to Deploy.
  - Cards with Details, Agents, Review, History, Context tabs.
  - "Run All" orchestration per lane.
- Builders:
  - **UI Builder** – drag-and-drop layout, generates code or JSON spec.
  - **DB Builder** – tables, relationships, migrations, export schema.
  - **Workflow Builder** – triggers, conditions, actions; integrates with Run Agent, API Call, Notify, Update Card actions.
- Usage & Billing at project level:
  - Requests, tokens (from provider APIs), response times.
  - High-level spend based on providers' metering (read-only).

### 6.2 Dev Environment & Terminal

- Browser:
  - Terminal tab using xterm.js (or equivalent).
  - Shows logs, command history, agent activity.
- Backend:
  - Ephemeral dev environments (containers) per active project/session in GCP.
  - Each environment:
    - Clones tenant GitHub repo.
    - Starts shell (bash/zsh/pwsh).
    - Runs MCP servers for filesystem + terminal.
- Card → Terminal:
  - "Run Card" sends `cardID.context` + prompt → dev environment.
  - Agents execute via LLM calls → tools:
    - Modify files
    - Run build/test commands
    - Commit/Push to GitHub
  - Results streamed back to card history and event log.

### 6.3 BYOA & Providers

- Tenant connects providers via Admin Console → BYOA:
  - Anthropic, OpenAI, Google, ElevenLabs, etc.
- Keys/credentials stored in Secret Manager, tied to tenant.
- Each agent or lane can be configured with:
  - Preferred provider + model (e.g. Architect = Claude 3.5 Sonnet, CEO CoPilot = GPT-4.1, etc.).
- All LLM usage is billed to tenant provider accounts.
- AgentWorks only tracks tokens/requests for analytics and throttle logic.

### 6.4 GitHub Integration

- Tenant installs AgentWorks GitHub App or connects via OAuth.
- Per project, map to a repo:
  - Create new or attach existing.
- Dev environments:
  - `git clone` on start, work on feature branches or main.
  - On successful runs, create commits/PRs according to lane:
    - Planning lanes: update `/docs/Blueprint.md`, `/docs/PRD.md`, `/docs/MVP.md`, `/docs/AgentPlaybook.md`.
    - Build lanes: update `src/`, `infra/`, `db/`, `workflows/`.
- AgentWorks never becomes the system of record for code; GitHub is.

### 6.5 Admin Console (Global)

Already visible in UI:

- Dashboard:
  - Total tenants, active providers, monthly revenue, tokens this month.
- Executive KPIs:
  - MRR, ARR, churn, conversion, active users, platform health.
- Tenants:
  - Tenant list, plan, status, usage, created date.
- BYOA:
  - Providers per tenant, connection health.
- Billing:
  - Stripe integration, subscription status, 5x markup rules, overage.
- Analytics:
  - Provider cost breakdown (read-only via provider APIs where available).
- Audit Logs:
  - Admin actions, tenant config changes, provider key updates.
- Growth:
  - Waitlist, Founders tiers (Launch Week, Early Bird, Founding 50).
  - Affiliates program (tiers, conversions, payouts).

---

## 7. Pricing & Tiers Blueprint

All users are dev seats. Teams require one seat per human.

### 7.1 Seat tiers

| Tier  | Target user                      | Monthly price | Projects | Concurrent terminals | Est. terminal hours/mo | Notes |
|-------|----------------------------------|--------------:|---------:|----------------------:|------------------------:|-------|
| Lite  | Solo / hobby / indie             | $15           | 5       | 1                    | ~10 h                  | Community support |
| Pro   | Serious indie / small team dev   | $39           | 20      | 2                    | ~40 h                  | Email/chat support |
| Power | Agencies / internal platform     | $99           | 100     | 4                    | ~120 h                 | Priority support / SLAs |

Terminal hours and card runs are **soft limits**; we throttle + upsell when exceeded.

### 7.2 Founder "Pay Once" Packages

One-time, lifetime access (effectively prepaid seats for Lite/Pro level; infra capped via limits):

- **Launch Week** – 500 seats × $249
- **Early Bird** – 200 seats × $199
- **Founding 50** – 50 seats × $149

Used for:

- Early cash injection
- Case studies, evangelists
- Affiliate seeding

---

## 8. High-Level Economics (BYOA)

- Revenue comes from **seat subscriptions + occasional infra overage**.
- LLM usage costs are **not** on our books (BYOA).
- Our primary COGS: GCP compute (dev environments, services), storage, networking.

At 1M paying seats with a rough mix (50% Lite, 35% Pro, 15% Power):

- **MRR ≈ $36M**
- **COGS ≈ $3.6M** (mostly infra)
- **Gross margin ≈ 89–90%**
- Target OpEx at scale: ~$23M/month → operating margin ~25–30%.

This is good enough to satisfy any serious exec or investor if we actually execute and fill the funnel.

---

## 9. Architecture Blueprint (Conceptual)

### 9.1 Control Plane (multi-tenant SaaS)

Runs in GCP, multi-tenant:

- **Services:**
  - Auth & Identity
  - Tenant & User Management
  - Projects, Cards, Lanes, Events
  - CoPilot & Agent Orchestrator
  - Admin Console APIs (Tenants, BYOA, Billing, Analytics, Audit)
  - Metrics aggregator (tokens, runs, infra usage)
- **Storage:**
  - Relational DB (Postgres/AlloyDB) with `tenant_id` on all tables.
  - Optional Firestore for event streams or card history.
- **Characteristics:**
  - Stateless services on Cloud Run / GKE.
  - Strict RBAC and tenant isolation at app and DB layers.
  - Scales horizontally; no per-tenant infrastructure.

### 9.2 Compute Plane (dev environments)

- **Ephemeral containers** in GKE or Cloud Run:
  - One or more per active project session.
  - Pod includes:
    - Shell + PTY
    - MCP filesystem server
    - MCP terminal server
    - Git client
    - Language runtimes (Node, Python, etc.)
- **Lifecycle:**
  - Created on demand (card run or user opening Terminal).
  - Idle timeout (e.g. 15–30 minutes) → pod shutdown.
  - Workspace backed by GitHub + optional persistent volume.
- **Security & BYOA:**
  - Tenant provider secrets injected as env vars, scoped per pod.
  - No secrets logged; strict network controls:
    - Egress only to GitHub + provider APIs + our services.
- **Browser terminal:**
  - xterm.js in AgentWorks connects via WebSocket → gateway → pod PTY.

### 9.3 Observability & Governance

- Per-tenant metrics:
  - Dev env hours
  - Card runs, success/failure
  - Provider tokens (queried from provider dashboards where allowed)
- Audit logs:
  - Tenant configuration changes (plans, providers, billing).
  - Admin actions.
  - Critical system events (new cluster, major deploy, failures).

---

## 10. Risks & Mitigations

1. **Unbounded infra cost from abusive users**
   - Hard per-seat limits on concurrent environments & terminal hours.
   - Queueing for card runs.
   - Plan-based maximums with enforced throttling.

2. **LLM key misuse / credential leaks (BYOA)**
   - Store all keys in Secret Manager; never log values.
   - Scope keys strictly by tenant and provider; rotation workflows in UI.
   - Optionally support provider-side OAuth scopes instead of raw keys.

3. **GitHub integration failures**
   - Clear error handling and recovery for:
     - Missing permissions
     - Rate limits
     - Merge conflicts
   - Local workspace always reconcilable with upstream repo.

4. **User confusion vs "magic" automation**
   - Lean on our Kanban + card standards.
   - Always show:
     - Which agent ran.
     - What prompt it used.
     - Diffs to files (before/after).
   - Force review steps in critical lanes (e.g., Deploy).

---

## 11. Roadmap Phases (High Level)

**Phase 0 – Hardening what we have (Now → 3 months)**
- Stabilize existing Studio & Admin flows (tenants, billing, providers, KPIs, analytics, audit).
- Implement **basic dev environment**:
  - Single provider, single terminal, simple GitHub integration.
- Tie **card runs → terminal** with cardID.context logs.

**Phase 1 – Full BYOA Dev Suite (3 → 9 months)**
- Multi-provider BYOA (Anthropic, OpenAI, Google).
- Ephemeral containers with scaling + throttling.
- GitHub App + branch/PR workflow.
- Tier limits (Lite/Pro/Power) enforced.
- Founders packages + affiliate program live.

**Phase 2 – Scale & Enterprise (9 → 24 months)**
- SSO / SCIM for larger tenants.
- Org-level observability: DORA-ish metrics, repo health, agent ROI.
- Vertical templates for common stacks (Next.js SaaS, API-first, etc.).
- Multiple regions, regulatory features (GDPR tools, data residency options).

---

## 12. Next Documents

This Blueprint is the **strategic overview**.

Next steps:

1. **PRD.md** – turn this into concrete requirements:
   - Detailed user stories
   - API contracts
   - Data models
   - Edge cases and constraints
2. **MVP.md** – cut this down to the smallest version that:
   - Onboards a tenant
   - Connects GitHub + 1 provider
   - Runs cards through a single dev environment
   - Writes code to GitHub and logs the full build

Those two documents, plus this Blueprint, are what we use with the executive team and engineering leads to lock scope for the first public "Founder" release.
