# AgentWorks – Agent Playbook

**Version:** 1.0  
**Date:** YYYY-MM-DD  
**Owner:** CEO CoPilot  

---

## 1. Overview

This playbook defines:

- The **agents** available in AgentWorks.
- Their **roles**, **lanes**, **inputs**, **outputs**, and **default providers**.
- Basic prompt structure and responsibilities.

All agents share:

- Access to project `BLUEPRINT.md`, `PRD.md`, `MVP.md`, `Plan.md`.
- Access to board state (cards, lanes, dependencies).
- A logging API for writing to their run logs (shown in the LLM terminal).

---

## 2. Agent Registry

### 2.1 CEO CoPilot Agent

- **Role:** Executive supervisor for the entire project.
- **Lanes:** 0–10 (global).
- **Responsibilities:**
  - Run Lane 0 Q&A with human to build Blueprint.
  - Maintain alignment between Blueprint, PRD, MVP, and actual work.
  - Generate daily/weekly summaries of progress and risks.
  - Flag scope creep and stalled cards.
- **Inputs:**
  - Board snapshot, Blueprint, PRD, MVP, Plan, metrics.
- **Outputs:**
  - Updated `BLUEPRINT.md` sections.
  - Summary reports (posted to UI and integrations).
  - Annotations on cards (scope risk, blocked reasons).
- **Default Provider/Model:** planner-focused LLM (e.g., OpenAI GPT-4.x).

---

### 2.2 Strategy Agent

- **Role:** Turn raw Q&A into a coherent product strategy.
- **Lane:** 0 – Vision & CoPilot Planning.
- **Responsibilities:**
  - Define positioning, target segments, differentiators.
  - Group features into logical buckets.
  - Identify risks (technical, product, market).
- **Inputs:** Lane 0 Q&A transcript, early Blueprint notes.
- **Outputs:** Strategy section in `BLUEPRINT.md`.
- **Default Provider:** Planner/model with strong structured reasoning (e.g., ChatGPT/Claude).

---

### 2.3 Storyboard / UX Agent

- **Role:** Translate strategy into user flows and screens.
- **Lane:** 0.
- **Responsibilities:**
  - Produce user journeys (“Happy paths” and key variants).
  - Create screen inventory and text-based wireframes.
- **Inputs:** Strategy output, Blueprint.
- **Outputs:** `/docs/ux/storyboards.md` or `UX` section in `BLUEPRINT.md`.
- **Default Provider:** General LLM (e.g., GPT-4.x or Claude Opus/Sonnet).

---

### 2.4 PRD Agent

- **Role:** Generate and maintain the Product Requirements Document.
- **Lane:** 1 – PRD / MVP Definition.
- **Responsibilities:**
  - Convert Blueprint + storyboards into a structured PRD.
  - Include functional/non-functional requirements and user stories.
- **Inputs:** `BLUEPRINT.md`, UX storyboards.
- **Outputs:** `/docs/PRD.md`.
- **Default Provider:** Planner LLM (e.g., GPT-4.x or Claude).

---

### 2.5 MVP Scope Agent

- **Role:** Define the minimal viable product slice.
- **Lane:** 1.
- **Responsibilities:**
  - Read PRD and identify MVP features.
  - Explicitly list what is in/out of MVP.
  - Create MVP feature cards in board.
- **Inputs:** `PRD.md`.
- **Outputs:** `/docs/MVP.md`, feature cards (type=Feature).
- **Default Provider:** Planner LLM.

---

### 2.6 Research Agent

- **Role:** Perform external research.
- **Lanes:** 2 (Research), occasionally others.
- **Responsibilities:**
  - Investigate technologies, competitors, patterns.
  - Produce concise research briefs with pros/cons and risks.
- **Inputs:** Specific research prompts attached to cards.
- **Outputs:** Research notes appended to `Plan.md` or separate `/docs/research/*.md`.
- **Default Provider:** LLM with strong browsing tools.

---

### 2.7 Architect Agent

- **Role:** Design system architecture and choose stack.
- **Lane:** 3 – Architecture & Stack.
- **Responsibilities:**
  - Define services, data models, interfaces.
  - Choose stack profile (e.g., webapp-node-ts).
  - Append architecture section to `Plan.md`.
- **Inputs:** Blueprint, PRD, research.
- **Outputs:** Architecture diagrams (text/mermaid), stack decisions, tasks for Planner.
- **Default Provider:** Coding-capable LLM (e.g., Claude 3.5 Sonnet).

---

### 2.8 Planner / Decomposition Agent

- **Role:** Break features into tasks.
- **Lane:** 4 – Planning & Task Breakdown.
- **Responsibilities:**
  - Turn features into dev-sized tasks (backend, frontend, tests, infra, docs).
  - Define dependencies and acceptance criteria.
- **Inputs:** Architecture, PRD, MVP.
- **Outputs:** Task cards under each feature.
- **Default Provider:** Planner LLM.

---

### 2.9 Dev Agent – Backend

- **Role:** Implement backend APIs and services.
- **Lane:** 6 – Build (Backend).
- **Responsibilities:**
  - Generate and refactor backend code.
  - Write unit/integration tests for backend.
- **Inputs:** Backend tasks, architecture, repo snapshot.
- **Outputs:** Code changes, tests, updates to `Plan.md` (implementation notes).
- **Default Provider:** Coding-focused LLM (e.g., Claude 3.5 Sonnet / GPT-4 Turbo).

---

### 2.10 Dev Agent – Frontend

- **Role:** Implement frontend UI.
- **Lane:** 6 – Build (Frontend).
- **Responsibilities:**
  - Build components, pages, and state management.
  - Respect UX storyboards and design guidelines.
- **Inputs:** Frontend tasks, UX storyboards, repo.
- **Outputs:** Frontend code, tests, notes.
- **Default Provider:** Coding LLM.

---

### 2.11 DevOps/Infra Agent

- **Role:** Infra-as-code, CI/CD, deploy configs.
- **Lanes:** 5 (Scaffolding), 8 (Deploy).
- **Responsibilities:**
  - Create/update Dockerfiles, Cloud Run configs, Terraform/YAML, CI workflows.
- **Inputs:** Architecture, INFRA_DESIGN.
- **Outputs:** Infra code, deployment scripts, runbooks.
- **Default Provider:** Coding LLM.

---

### 2.12 QA Agent

- **Role:** Testing and quality checks.
- **Lane:** 7 – Test & QA.
- **Responsibilities:**
  - Generate test plans and E2E tests.
  - Run tests and classify failures.
- **Inputs:** PRD, tasks, codebase.
- **Outputs:** Test code, test reports, bug cards as needed.
- **Default Provider:** Coding LLM.

---

### 2.13 Docs Agent

- **Role:** Documentation (user, API, ops).
- **Lane:** 9 – Docs & Training.
- **Responsibilities:**
  - Create/update user guides, API docs, runbooks.
- **Inputs:** PRD, MVP, Plan, code, tests.
- **Outputs:** `/docs/user/*.md`, `/docs/api/*.md`, `/docs/runbooks/*.md`.
- **Default Provider:** Planner LLM.

---

### 2.14 Refactor Agent

- **Role:** Improve quality of existing code.
- **Lanes:** 6 (Build), 10 (Learn & Optimize).
- **Responsibilities:**
  - Identify code smells and refactor with tests passing.
- **Inputs:** Codebase, test results, architecture guidelines.
- **Outputs:** Refactored code, update notes.
- **Default Provider:** Coding LLM.

---

### 2.15 Troubleshooting Agent

- **Role:** Debug failing builds/tests.
- **Lane:** 7 – Test & QA.
- **Responsibilities:**
  - Analyze logs, identify likely root causes.
  - Propose and apply fixes if safe.
- **Inputs:** Failing tests, logs, recent diffs.
- **Outputs:** Patches, explanations, or bug cards.
- **Default Provider:** Coding + reasoning LLM (e.g., Gemini, Claude).

---

## 3. Default Provider Mapping (Example)

This is configurable per project, but defaults might be:

```json
{
  "planner": { "provider": "openai", "model": "gpt-4-turbo" },
  "strategy": { "provider": "openai", "model": "gpt-4-turbo" },
  "storyboard": { "provider": "openai", "model": "gpt-4-turbo" },
  "prd": { "provider": "openai", "model": "gpt-4-turbo" },
  "mvp": { "provider": "openai", "model": "gpt-4-turbo" },
  "research": { "provider": "openai", "model": "gpt-4-turbo" },
  "architect": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
  "dev_backend": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
  "dev_frontend": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
  "devops": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
  "qa": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
  "docs": { "provider": "openai", "model": "gpt-4-turbo" },
  "refactor": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
  "troubleshooter": { "provider": "google", "model": "gemini-1.5-pro" },
  "video": { "provider": "nanobanana", "model": "nb-video-1" }
}

