# AgentWorks – Project Blueprint

**Version:** 1.0  
**Date:** YYYY-MM-DD  
**Owner:** Thomas R. Bedell  
**Editors:** CoPilot Agent, Strategy Agent  

---

## 1. Problem Statement

Teams are experimenting with LLMs and “AI agents” to plan, write, and test code, but:

- Work is opaque: you can’t see what the agents are doing or why.
- There is no consistent process: every project is a fresh set of ad-hoc prompts.
- It is impossible to manage multiple agents and multiple models from different providers in a disciplined way.
- Costs are unpredictable and hard to control or bill back to clients.

**AgentWorks** solves this by turning AI-powered development into a **visible, managed production line**:

> Every idea becomes a card. Every card moves through a Kanban pipeline. Specialist agents execute at each lane. A CEO CoPilot keeps the work aligned to the Blueprint, PRD, and MVP. Costs and usage are tracked and billed with clear margins.

---

## 2. Vision

AgentWorks is an **agent-native Kanban platform** that lets technical teams:

- Design a project end-to-end with a CoPilot and Strategy Agent (Lane 0).
- Automatically generate Blueprint, PRD, MVP, and Agent Playbooks.
- Orchestrate multiple AI agents (from multiple LLM providers) as if they were a dev team.
- Inspect every agent run via a live/replay “LLM terminal” attached to cards.
- Track usage and costs of provider API calls with clear margins and billing.

Long term, AgentWorks becomes the default “control plane” for AI development: the place where teams define, run, and audit their autonomous and semi-autonomous software factories.

---

## 3. Target Users

### 3.1 Primary

- **Technical founders** and **staff/principal engineers** building new products.
- **Platform / DevEx teams** inside small to mid-size companies who:
  - Already use Git, CI/CD, and Kanban tools.
  - Are actively incorporating LLMs (ChatGPT, Claude, Gemini, etc.) into their workflow.
  - Want a **repeatable, inspectable process** rather than one-off prompts.

### 3.2 Secondary

- **AI agencies / consultancies** running multiple client projects.
- **Technical product managers** who need visibility into AI-driven dev work.

### 3.3 Non-goals for v1

- Non-technical / “no-code” users.
- Enterprise-scale multi-org governance and compliance frameworks.
- On-prem deployment (v1 is GCP SaaS).

---

## 4. Goals

### 4.1 Product Goals (12–18 months)

1. Provide a **Kanban-first UI** where every project is fully defined before implementation.
2. Let users **mix and match LLM providers per agent role** (e.g., ChatGPT for planning, Claude for coding, Gemini for troubleshooting).
3. Deliver a robust **LLM terminal + logging** so every agent run can be inspected and replayed.
4. Offer transparent **usage and billing**:
   - API calls priced in $0.25 increments.
   - ≥80% gross margin on usage (at least 5× markup on underlying LLM costs).
5. Support multiple real-world projects being executed end-to-end using AgentWorks.

### 4.2 Business Goals (first year)

- Run at least **3–5 serious projects** through AgentWorks end-to-end.
- Demonstrate measurable time savings and increased throughput for those teams.
- Prove the economics of the usage-based pricing model.

---

## 5. Constraints & Assumptions

### 5.1 Time & Scope

- MVP horizon: **8–12 weeks** of focused engineering.
- Focus on:
  - Single cloud: **GCP**.
  - Single LLM provider initially for core flows (but architecture must support multi-provider from day one).
  - Web app only (no native mobile).

### 5.2 Tech Stack

- Backend: Node/TypeScript or Python (final decision in PRD/INFRA_DESIGN).
- Frontend: React or Vue (final decision in PRD/INFRA_DESIGN).
- Database: Postgres (Cloud SQL or AlloyDB).
- LLM providers:
  - ChatGPT / OpenAI
  - Claude (Anthropic)
  - Gemini (Google)
  - Nano Banana (for video/media tasks)
- GCP-native services for compute, storage, logging, and scheduling.

### 5.3 Business & Pricing

- Subscription-based SaaS (per workspace / seat) **plus** usage-based billing.
- Usage charged per API call in **$0.25 increments**.
- Minimum 80% gross margin on LLM API usage:
  - Price per call **≥ 5× cost**.

---

## 6. High-Level Solution

AgentWorks consists of:

1. **Kanban Workspace**
   - Boards, lanes, cards, WIP limits, and dependencies.
   - Lane 0: Vision & CoPilot Planning.
   - Lanes 1–10: PRD → Research → Architecture → Build → Test → Deploy → Docs → Learn.

2. **Agent Orchestration Layer**
   - CEO CoPilot, Strategy, Storyboard/UX, PRD, MVP, Research, Architect, Planner, Dev, QA, Docs, Refactor, Troubleshooting.
   - Lane-based rules: which agent can run where, and what they must produce.

3. **Provider Router & Billing Layer**
   - One unified API for all LLM calls.
   - Per-agent provider mapping (e.g., planner→OpenAI, coder→Claude, troubleshooter→Gemini).
   - Cost estimation, pricing calculation (per-call, 5× cost minimum), and logging to usage events.

4. **LLM Terminal & Logging**
   - Every agent run gets a `run_id` and log stream.
   - Active card: live terminal (streaming).
   - Inactive: writes to log; terminal can replay from stored logs.

5. **Docs & Blueprint Artifacts**
   - `/docs/BLUEPRINT.md` – this file.
   - `/docs/PRD.md` – detailed requirements.
   - `/docs/MVP.md` – MVP scope & priorities.
   - `/docs/AGENT_PLAYBOOK.md` – agent definitions & prompts.
   - `/docs/INFRA_DESIGN.md` – GCP architecture and services.

---

## 7. Success Metrics

### 7.1 Product

- Time from “New Project” to “Blueprint + PRD + MVP defined” ≤ 1 day for a typical user.
- At least **50% of implementation tasks** (code/docs/tests) auto-generated or auto-edited by agents.
- Users can trace **every agent action** via terminal/logs.

### 7.2 Business

- Effective gross margin on LLM usage ≥ 80%.
- Active workspaces using ≥ 2 different LLM providers in production.
- Reduced cycle time from idea → working MVP for anchor customers.

---

## 8. Risks & Open Questions

- Provider policy changes (OpenAI, Anthropic, Google, etc.) affecting usage or pricing.
- Complexity of supporting many agents and providers without overwhelming users.
- Ensuring reliability and safety of agent actions (e.g., code changes, infra updates).
- How soon to support BYOK (Bring-Your-Own-Key) vs reselling provider usage.

---

