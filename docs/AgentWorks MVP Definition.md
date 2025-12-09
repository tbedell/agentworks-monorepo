# AgentWorks – MVP Definition

**Version:** 1.0  
**Date:** YYYY-MM-DD  
**Owner:** Product + CEO CoPilot  
**Status:** Approved MVP Scope  

---

## 1. MVP Goal

Deliver a working AgentWorks SaaS where:

- A user can design a project end-to-end with CoPilot (Blueprint → PRD → MVP).
- Planned work is represented on a Kanban board.
- Key agents (CoPilot, PRD, MVP, Architect, Dev, QA, Docs) can run on cards.
- Every agent run is visible via an LLM terminal.
- LLM calls across at least **two providers** are routed and logged, with usage tracked and priced.

---

## 2. MVP In-Scope Features

### 2.1 Authentication & Workspaces

- Simple email/password or OAuth login.
- Workspaces:
  - Create workspace, basic metadata.
  - Invite collaborators by email.

### 2.2 Projects & Kanban Board

- Create/delete projects inside a workspace.
- Each project:
  - Has a default board with lanes 0–10.
  - Supports creating/moving cards.
- Card detail view:
  - Metadata (title, type, lane, description).
  - Links to project docs.
  - Agent run history & terminal.

### 2.3 Lane 0 – Blueprint & CoPilot Planning

- Blueprint cards:
  - CoPilot Q&A console.
  - Live preview of `BLUEPRINT.md`.
- Strategy Agent producing:
  - Positioning, segments, feature buckets, risk map.
- Storyboard/UX Agent producing:
  - User flows & screen inventory in text.
- Blueprint approval flow:
  - Approve → move to PRD/MVP lane.

### 2.4 PRD & MVP Generation (Lane 1)

- PRD Agent:
  - Generate `/docs/PRD.md` from Blueprint.
- MVP Agent:
  - Generate `/docs/MVP.md`.
  - Create MVP feature cards.

### 2.5 Agent Orchestration

- Registry of core agents:
  - CEO CoPilot
  - Strategy
  - Storyboard/UX
  - PRD
  - MVP
  - Architect
  - Planner
  - Dev (Backend, Frontend)
  - QA
  - Docs
- Per-card actions:
  - Run Agent, Re-run last Agent.
- Per-lane auto-trigger:
  - Simple configuration for a subset of lanes.

### 2.6 LLM Terminal & Logs

- Live terminal for current run on a card.
- Replay of past runs via dropdown.
- Logs stored per run for at least 30 days (configurable later).

### 2.7 Multi-Provider Routing & Usage Tracking

- Provider Router service supports:
  - At least **two providers** (e.g., OpenAI and Anthropic) in MVP.
- Per-project agent/provider mapping:
  - UI to set: planner→providerA, coder→providerB, etc.
- Usage tracking:
  - Records every call: provider, model, tokens, cost, price.
  - Basic workspace usage page.

### 2.8 Basic Billing Integration

- Pricing logic implemented (5× cost, $0.25 increments).
- Store usage totals per workspace for billing.
- Integrate with Stripe or placeholder for monthly manual invoicing.

---

## 3. MVP Out-of-Scope

- Advanced custom lane configurations (beyond default).
- Visual Figma integration (images) – start with text-based wireframes only.
- Complex RBAC (simple roles only: Owner, Member, Viewer).
- BYOK (Bring Your Own Key) – v2 feature.
- Automated rollback and migration orchestration.

---

## 4. MVP Acceptance Criteria

- A new user can:
  1. Sign up, create a workspace, create a project.
  2. Create a Blueprint card, complete Lane 0 Q&A, and approve a Blueprint.
  3. See PRD and MVP docs generated.
  4. See MVP feature cards created in Kanban.
  5. Run at least Architect and Dev agents on a feature card and see logs in terminal.
  6. Confirm that multiple providers are used (e.g., planner→OpenAI, coder→Claude) with usage recorded.

- Internal:
  - At least one non-trivial internal project is managed end-to-end within AgentWorks using this MVP.

---

## 5. Phased Rollout

- **MVP v1.0**: Single provider (whichever is easiest to bootstrap), full routing architecture in place.
- **MVP v1.1**: Add second provider + agent mapping UI.
- **MVP v1.2**: Tighten cost/usage reporting and usage dashboard.

---

