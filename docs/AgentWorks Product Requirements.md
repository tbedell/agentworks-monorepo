# AgentWorks – Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** YYYY-MM-DD  
**Owner:** Product (Thomas R. Bedell + CEO CoPilot)  
**Status:** Draft – MVP-focused  

---

## 1. Overview

AgentWorks is a GCP-hosted, subscription SaaS that:

- Provides a Kanban-based UI for managing software projects.
- Orchestrates multiple AI agents (from multiple LLM providers) at each lane.
- Logs and surfaces every agent run via an LLM terminal per card.
- Tracks and bills usage of underlying LLM API calls with high-margin pricing.

This PRD defines the **functional** and **non-functional** requirements for the **initial platform + MVP**.

---

## 2. User Personas

### 2.1 Technical Founder

- Needs to ship new products quickly with minimal headcount.
- Comfortable with Git, CI/CD, and reading logs.
- Wants to control scope and see exactly what the AI is doing.

### 2.2 Staff/Lead Engineer

- Responsible for architecture and quality.
- Wants to use AI as force-multipliers (agents), not replace engineers.
- Needs strong observability and control (approve deployments, review code).

### 2.3 Platform / DevEx Engineer

- Builds internal tooling and frameworks.
- Wants to standardize how teams use AI agents and track costs.

---

## 3. Core Functional Requirements

### 3.1 Workspaces & Projects

**Requirements:**

- Users can create one or more **workspaces**.
- Each workspace has:
  - Name, description, billing configuration.
- Within a workspace, users can create **projects**:
  - Project name, description, owner, status (Active, Archived).
- Each project has its own:
  - Kanban board.
  - Docs namespace (`/docs`).
  - Agent configuration.

### 3.2 Kanban Boards & Cards

**Requirements:**

- Default lanes:
  - 0: Vision & CoPilot Planning
  - 1: PRD / MVP Definition
  - 2: Research
  - 3: Architecture & Stack
  - 4: Planning & Task Breakdown
  - 5: Scaffolding / Setup
  - 6: Build (Backend / Frontend / Infra)
  - 7: Test & QA
  - 8: Deploy
  - 9: Docs & Training
  - 10: Learn & Optimize

- Users can:
  - Create cards (Epic, Feature, Task, Bug, Doc, Blueprint).
  - Move cards between lanes via drag-and-drop or actions.
  - Configure WIP limits per lane (not enforced strictly in MVP; just warnings).

- Cards must contain:
  - ID, title, type, description.
  - Current lane/stage.
  - Owner/assignee.
  - Links to related docs (Blueprint, PRD, Plan, etc.).
  - Agent logs & run history.

### 3.3 Lane 0: Vision & CoPilot Planning

**Requirements:**

- When a **Blueprint card** is created and moved to Lane 0:
  - A CoPilot “console” view opens:
    - Chat between human and CEO CoPilot Agent.
    - Live preview of `BLUEPRINT.md`.

- CoPilot must:
  - Ask structured questions about:
    - Problem, target users, goals, constraints, success metrics.
  - Summarize the answers into a Blueprint skeleton.

- Strategy Agent must:
  - Distill positioning, feature buckets, and risk map.

- Storyboard/UX Agent must:
  - Generate textual storyboards (user flows, screen inventory, rough layouts).

- Output artifacts:
  - `/docs/BLUEPRINT.md` (project-specific).
  - `/docs/AGENT_PLAYBOOK.md` skeleton for that project.

- Lane exit criteria:
  - Blueprint approved by a human (explicit “Approve Blueprint” action).
  - Blueprint card moves to Lane 1.

### 3.4 PRD & MVP Definition (Lane 1)

**Requirements:**

- PRD Agent:
  - Reads Blueprint + storyboards.
  - Generates `/docs/PRD.md` with:
    - Detailed functional/non-functional requirements.
    - Use cases / user stories.
    - Edge cases and constraints.

- MVP Scope Agent:
  - Reads PRD.
  - Generates `/docs/MVP.md` with:
    - MVP goal.
    - Included MVP features.
    - Explicitly excluded features.
  - Creates initial **MVP feature cards** under the project.

- Human can edit PRD and MVP docs directly and re-run agents to update.

### 3.5 Agent Orchestration & Runs

**Requirements:**

- There is an **Agent Registry** with:
  - Agent name (e.g., CEO CoPilot, Architect).
  - Role description.
  - Allowed lanes.
  - Default provider/model (e.g., planner → ChatGPT).

- Per-card actions:
  - “Run [Agent]”:
    - Example: “Run Architect Agent” when in Lane 3.
  - “Re-run last Agent”.
  - “View Agent Log / Terminal”.

- Automatic triggers:
  - Configurable per lane:
    - Example: when card enters Architecture, auto-run Architect Agent.

- Each agent run:
  - Has `run_id`, `card_id`, `agent_name`, `status`, timestamps.
  - Writes logs via logging API.
  - Can update:
    - Card fields (description, status).
    - Project docs (Plan sections).
    - Create or update child cards (e.g., tasks).

### 3.6 LLM Terminal & Logs

**Requirements:**

- For each card:
  - **Terminal tab** shows:
    - The most recent agent run log by default.
  - Users can select previous runs to replay.

- Logs:
  - Are streamed Live if the run is active.
  - Are persisted for later replay if the card is not in focus.

- Minimum log structure:
  - Timestamped lines/events.
  - Tool call indicators.
  - Error events.

### 3.7 Multi-Provider LLM Routing

**Requirements:**

- Admin/owner can set, per project:
  - Default provider & model for each agent role:
    - e.g., `planner → openai:gpt-4-turbo`, `coder → anthropic:claude-3-5-sonnet`, `troubleshooter → google:gemini-1.5-pro`, `video → nanobanana:nb-video-1`.

- Agents never call providers directly:
  - They call a unified Provider Router API.
- Provider Router:
  - Picks a provider based on config.
  - Applies pricing logic.
  - Logs usage.

### 3.8 Usage Tracking & Billing

**Requirements:**

- For every LLM/API call via Provider Router:
  - Record:
    - Workspace, project, card, agent, provider, model, tokens, cost, price.

- Pricing:
  - Price per call is calculated as:
    - `P = ceil((5 * cost) / 0.25) * 0.25`  (minimum 5× cost, rounded up to $0.25).
- Workspace Usage View:
  - Show number of calls and total charges per:
    - Project.
    - Agent.
    - Provider.

- MVP billing:
  - Usage tracking must work from day one.
  - Actual invoicing can be simple (e.g., manual or basic Stripe integration).

---

## 4. Non-Functional Requirements

- **Performance**
  - Agent runs should start within a few seconds of trigger.
  - Terminal logs should stream with low latency.
- **Availability**
  - Target ≥ 99.5% uptime for core APIs and UI (post-MVP).
- **Security**
  - All provider API keys stored in GCP Secret Manager.
  - All data in transit encrypted (HTTPS).
  - All data at rest encrypted (GCP-managed keys or CMEK later).
- **Multi-tenant**
  - Workspaces isolated at the data layer.
  - No cross-tenant data leakage.

---

## 5. Out of Scope (for MVP)

- Enterprise SSO (SAML, Okta).
- On-prem or hybrid deployments.
- Fine-grained per-field RBAC.
- Full marketplace for third-party agents.

---

## 6. Open Questions

- Exact frontend framework choice (React vs Vue) – must be decided before implementation.
- Exact backend framework choice (Nest vs Fastify vs FastAPI).
- Whether to offer BYOK in v2, and how that changes pricing.

---

