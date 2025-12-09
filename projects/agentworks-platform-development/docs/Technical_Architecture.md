# AgentWorks Cloud – Technical Architecture

**Document:** Technical_Architecture.md
**Product:** AgentWorks Cloud (Multi-Tenant BYOA Vibe Coding Platform)
**Owner:** Architecture / Engineering
**Version:** 0.9
**Date:** 2025-12-08

---

## 1. Architecture Goals

1. **Multi-tenant SaaS** – Single control plane for up to 1M dev seats, with strict tenant isolation.
2. **BYOA** – All LLM/API usage is paid by tenants (Anthropic/OpenAI/etc.), not by the platform.
3. **Cloud dev environments** – Ephemeral per-project workspaces in GCP, accessed via browser terminal.
4. **GitHub as source of truth** – All code in tenant-owned repos; AgentWorks never owns the code.
5. **Structured build process** – CoPilot + agents drive idea → Blueprint/PRD/MVP → Kanban → code, with cardID-based history.
6. **Scalable + observable** – Clear service boundaries, metrics, logs, rate limits and quotas.

---

## 2. System Topology

### 2.1 High-Level View

The system is split into two logical planes:

1. **Control Plane (multi-tenant SaaS)**
   - Hosts:
     - AgentWorks Studio UI (tenant-facing)
     - Admin Console UI (internal)
     - APIs for auth, tenants, projects, cards, BYOA, billing, analytics
   - Stateless services behind an API Gateway / load balancer.
   - Shared multi-tenant databases.

2. **Compute Plane (per-project dev environments)**
   - GCP Kubernetes cluster (GKE) or Cloud Run services.
   - Each *active* project gets one dev environment (pod) when needed.
   - Dev environments:
     - Clone tenant GitHub repo.
     - Run shell + MCP servers (filesystem + terminal).
     - Expose WebSocket endpoint for terminal.
     - Execute agent jobs tied to Kanban cards.

### 2.2 External Integrations

- **Identity/Email** – SMTP provider for invites, password resets.
- **Stripe** – seat subscriptions, founders payments.
- **GitHub** – repos, branches, commits (via GitHub App or OAuth).
- **LLM Providers (BYOA)** – Anthropic, OpenAI (MVP), others later.
- **GCP services** – GKE/Cloud Run, AlloyDB/Postgres, Secret Manager, GCS, Cloud Logging, Cloud Monitoring.

---

## 3. Components & Responsibilities

### 3.1 Frontends

1. **AgentWorks Studio (Tenant UI)**
   - Views:
     - Workspace selector (tenant / projects).
     - Planning (CoPilot Q&A).
     - Docs viewer (Blueprint/PRD/MVP/AgentPlaybook).
     - Kanban board + card drawer.
     - Builders: UI/DB/Workflow (MVP can stub DB/Workflow).
     - Project Usage & Billing (read-only view of provider usage + tier limits).
     - BYOA setup.
   - Integrations:
     - Calls Control Plane APIs (REST/GraphQL).
     - Establishes WebSocket for terminal sessions.

2. **Admin Console (Internal UI)**
   - Views:
     - Tenants (list, details).
     - Plans & limits.
     - Providers (BYOA status per tenant).
     - Billing & revenue (Stripe).
     - Founders & Affiliates.
     - Analytics & KPIs.
     - Audit logs.
   - Integrations:
     - Calls Admin APIs (same backend, different scopes).

---

### 3.2 Backend Services (Control Plane)

Assume containerized microservices (Node/TS, Go, or similar). Some can be combined initially, then split as scale demands.

1. **API Gateway / Edge**
   - Terminates TLS.
   - Routes `/tenant/*`, `/project/*`, `/admin/*`, `/terminal/*` to appropriate services.
   - Handles authentication & JWT/session validation.
   - Enforces basic rate-limiting per tenant.

2. **Auth Service**
   - User registration, login, password reset.
   - Issues JWT or session tokens with:
     - `user_id`, `tenant_id`, `role`, `plan`, expiry.
   - Supports multi-tenant context (one user may belong to many tenants).

3. **Tenant & Billing Service**
   - Entities:
     - `Tenant`, `User`, `TenantUser`, `Plan`, `BillingSubscription`, `FounderPurchase`.
   - Responsibilities:
     - Create tenants.
     - Manage seat counts and roles.
     - Integrate with Stripe:
       - Create checkout sessions.
       - Handle webhooks (invoice paid, subscription updated, cancelled).
     - Enforce plan-level limits (project count, seat count, etc).

4. **Provider (BYOA) Service**
   - Entities:
     - `ProviderConfig` (tenant_id + provider_type + secret_ref + status).
   - Responsibilities:
     - Store provider config (Secret Manager ref only).
     - Test connectivity (simple ping to LLM).
     - Provide signed "provider context" tokens to dev environments:
       - Which provider(s) to use.
       - Which models for CoPilot/Architect/Dev agents.
   - Ensures **no** provider keys are ever returned to the frontend.

5. **Project & Kanban Service**
   - Entities:
     - `Project`, `Card`, `CardEvent`, `Doc` (Blueprint/PRD/MVP/AgentPlaybook metadata).
   - Responsibilities:
     - Project CRUD.
     - CoPilot initiation and doc generation (calls LLM with prompt templates via Provider Service).
     - Kanban lanes configuration (MVP: static lanes).
     - Card CRUD and movement.
     - `cardID.context` storage:
       - Each run: append `CardEvent` row with summary + references.

6. **GitHub Integration Service**
   - Holds configuration:
     - `tenant_id`, `installation_id` / OAuth token ref.
   - Responsibilities:
     - Repo listing & selection for project creation.
     - Create new repo via GitHub App if needed.
     - Provide dev environments with:
       - Repo URL.
       - Install access tokens (short-lived) or PAT.
   - Handles webhook callbacks:
     - Repo events (optional for later).
   - Does **not** run git directly; environment pods do the clones/commits.

7. **Dev Environment Manager**
   - Entities:
     - `DevEnvironmentSession` (tenant_id, project_id, pod_id, status, started_at, last_active).
   - Responsibilities:
     - Given `{tenant_id, project_id}`, ensure a dev environment exists:
       - If none: create a pod in GKE.
       - If existing but idle: reuse.
     - Enforce limits:
       - Max concurrent environments per tenant/plan.
       - Idle timeout.
     - Expose:
       - API for Studio to request a terminal session token.
       - Internal API for Project & Kanban Service to enqueue card runs.

8. **Orchestration / Job Service (Control Plane side)**
   - Maintains a job queue (`RunCardJob`) with states:
     - `queued`, `dispatching`, `running`, `succeeded`, `failed`.
   - Logic:
     - Receives `RunCard` requests from Project Service.
     - Hands jobs off to Dev Environment Manager to dispatch into correct pod.
     - Receives job results from pods (via callback or polling).
     - Updates Card & CardEvent accordingly.

9. **Analytics & Audit Service**
   - Aggregates:
     - Dev env hours (approx from session durations).
     - Card runs per tenant/project.
     - Provider usage metrics (from CardEvents or provider telemetry).
   - Maintains `AuditLogEntry` table for:
     - Plan changes.
     - Provider config updates.
     - Admin actions.

---

### 3.3 Components Inside Dev Environments (Compute Plane)

Each dev environment runs a container with:

1. **Workspace Root**
   - `/workspace` bound to:
     - Ephemeral disk OR
     - Persistent volume (if needed later).
   - Contains:
     - Git repo clone.
     - `.agentworks/` metadata directory.

2. **Shell & PTY Server**
   - Unix shell (bash/zsh).
   - PTY backend (e.g., `node-pty` or native).
   - WebSocket server exposing `/ws/pty`.
   - Authentication:
     - Accepts a signed session token from Dev Environment Manager.
     - Token carries `tenant_id`, `project_id`, `user_id`.

3. **MCP Tools (inside the environment)**
   - Filesystem MCP server:
     - Read/write limited to `/workspace`.
   - Terminal MCP server:
     - Run shell commands via the PTY backend, returning stdout/stderr+status.
   - Both reachable by the agent orchestrator process only (local communication).

4. **Agent Orchestrator (in-env)**
   - Service/process invoked by `RunCardJob` dispatcher:
     - Receives card payload:
       - Prompt.
       - LLM provider+model.
       - Relevant docs (or paths).
       - Execution policy (what tools allowed).
     - Orchestrates:
       - LLM calls via HTTP to provider endpoints (using BYOA env vars).
       - MCP file & terminal operations.
   - Writes:
     - `cardID.context` JSON to workspace (`.agentworks/cards/{card_id}/...`).
     - Summary + structured logs back to Job Service.

5. **Metrics & Health**
   - Emits:
     - CPU/memory usage.
     - LLM call counts.
     - Run durations.
   - Health endpoint for GKE readiness/liveness.

---

## 4. Data & Storage

### 4.1 Primary Relational Database (AlloyDB/Postgres)

Core tables (simplified):

- `tenants(id, name, plan_id, status, created_at, ...)`
- `users(id, email, password_hash, created_at, ...)`
- `tenant_users(id, tenant_id, user_id, role, seat_type, ...)`
- `plans(id, name, price, project_limit, env_limit, terminal_hours_limit, ...)`
- `provider_configs(id, tenant_id, provider_type, secret_ref, status, default_models, ...)`
- `projects(id, tenant_id, name, slug, repo_owner, repo_name, default_branch, created_at, ...)`
- `cards(id, project_id, card_id, lane, status, priority, agent_owner, title, description, ...)`
- `card_events(id, card_id, created_at, event_type, provider_type, model, summary, payload_json, ...)`
- `dev_environment_sessions(id, tenant_id, project_id, pod_name, status, started_at, stopped_at, last_active_at, ...)`
- `billing_subscriptions(id, tenant_id, stripe_customer_id, stripe_subscription_id, plan_id, status, ...)`
- `founder_purchases(id, tenant_id, plan_name, seats, price_paid, created_at, ...)`
- `audit_log_entries(id, tenant_id, actor_user_id, action_type, details_json, created_at, ...)`

Every table with tenant scope includes `tenant_id` for enforcement and indexing.

### 4.2 Secret Storage (GCP Secret Manager)

- Per-tenant secrets:
  - LLM provider keys (Anthropic/OpenAI).
  - GitHub tokens / installation secrets.
- Control plane DB stores only references:
  - `secret_ref = "projects/{gcp-project}/secrets/{tenant-provider-id}/versions/latest"`

### 4.3 Object Storage (GCS) [Optional in MVP]

- Large logs or artifacts (if needed):
  - Build logs.
  - Expanded diffs.
- For MVP, we can store small logs in Postgres as JSON in `card_events.payload_json`.

---

## 5. Dev Environment Lifecycle (Detailed)

1. **Request**
   - Studio UI calls:
     - `POST /projects/{project_id}/terminal/session`
   - Or Project Service calls:
     - `POST /projects/{project_id}/cards/{card_id}/run`

2. **Env Lookup**
   - Dev Environment Manager checks for existing session:
     - If session with `status=active` and recent `last_active_at` exists:
       - Reuse `pod_name`.
     - Else:
       - Schedule new pod via GKE API:
         - Labels: `tenant_id`, `project_id`, `plan`, `env_type=dev`.

3. **Pod Startup**
   - Container starts:
     - Reads env vars:
       - `TENANT_ID`, `PROJECT_ID`, `BYOA_PROVIDER_CONTEXT`, `GITHUB_REPO_URL`, etc.
     - Runs init script:
       - Clone repo if `/workspace` empty.
       - Else `git fetch && git pull` on default branch.

4. **Session Token & WebSocket**
   - Dev Env Manager generates a **short-lived JWT**:
     - `tenant_id`, `project_id`, `user_id`, `pod_name`, expiry.
   - Studio Terminal connects:
     - `wss://gateway/terminal?token=...`
   - Gateway routes WebSocket to correct pod's `/ws/pty`.

5. **Idle Detection & Shutdown**
   - Pod tracks activity:
     - No PTY traffic and no RunCard jobs for N minutes.
   - On idle:
     - Calls back to Dev Env Manager:
       - Update session status to `stopping`.
     - Shutdown gracefully; GKE terminates pod.
   - For MVP, workspace is ephemeral; long-term persistence is in GitHub.

---

## 6. Key Flows (Sequence-Level)

### 6.1 Tenant Signup + BYOA + GitHub

1. User → Studio: Sign up form.
2. Studio → Auth Service: create user.
3. Studio → Tenant Service: create tenant + initial plan.
4. Tenant → Stripe: checkout (Lite/Pro/Power or manual founder set by Admin).
5. Owner → Studio: BYOA screen → add Anthropic/OpenAI keys.
   - Studio → Provider Service → store Secret Manager ref, test connection.
6. Owner → Studio: Connect GitHub.
   - Studio → GitHub Service: OAuth/App install and repo mapping.

### 6.2 Project Creation + CoPilot Docs

1. Dev → Studio: Create project:
   - Name, description, choose GitHub repo or create new.
2. Studio → Project Service: create project record.
3. Studio → CoPilot endpoint:
   - Launch Q&A (driven by script).
   - Responses streamed to control plane.
4. CoPilot (Project Service + Provider Service):
   - Build prompts and call LLM to generate Blueprint/PRD/MVP/AgentPlaybook.
   - Save docs:
     - In DB (`docs` metadata).
     - As markdown files via RunCard or direct write on first dev env startup.
5. Project Service:
   - Create initial cards for docs and a small number of implementation tasks.

### 6.3 Run Card / Agent Execution

1. Dev clicks "Run Card" on a card for a project.
2. Studio → Project Service:
   - `POST /projects/{id}/cards/{id}/run`
3. Project Service:
   - Validates dependencies and limits.
   - Creates `RunCardJob` in Job Service.
4. Job Service:
   - Asks Dev Env Manager for an environment.
   - Once env is ready, sends job payload to orchestrator inside pod:
     - Card details, doc excerpts, provider context.
5. Orchestrator:
   - Calls LLM via BYOA provider.
   - Uses MCP filesystem + terminal tools to:
     - Edit files.
     - Run `npm install`, `npm test`, etc.
   - On success:
     - Creates git commit(s) and pushes via GitHub.
   - Sends `RunCardJobResult` to Job Service:
     - Status, summary, affected files, commit hash, logs.
6. Job Service → Project Service:
   - Update card status/lane.
   - Create `CardEvent` with `cardID.context`.
7. Studio:
   - Updates Kanban and card history UI.

### 6.4 Terminal Interactive Session

1. Dev opens "Terminal" tab.
2. Studio:
   - Requests terminal session token from Dev Env Manager:
     - `POST /projects/{id}/terminal/session`
3. Dev Env Manager:
   - Ensures env.
   - Returns signed WebSocket token and connection URL.
4. Studio:
   - Connects via WebSocket.
   - User interacts with real shell; commands execute inside pod.

---

## 7. Multi-Tenancy & Security

1. **Tenant isolation**
   - Every control plane request includes `tenant_id` in auth context.
   - All DB queries filter by `tenant_id`.
   - Optional RLS (row-level security) at DB level for defense-in-depth.

2. **Env isolation**
   - Pods labeled with `tenant_id` and `project_id`.
   - Network policy:
     - Pods cannot talk to each other.
     - Pods can talk only to:
       - GitHub endpoints.
       - LLM providers.
       - Control Plane internal APIs (strict allowlist).
   - No shared volumes between tenants.

3. **Secret hygiene**
   - No provider keys exposed outside dev env containers and Provider Service.
   - Secrets loaded into pods as env vars or mounted files; not written to logs.
   - Key rotations handled by Provider Service.

4. **Auditing**
   - All sensitive actions logged:
     - Changing plans.
     - Adding/removing provider keys.
     - Connecting/disconnecting GitHub.
     - Admin overrides.

---

## 8. Scaling & Limits

1. **Control Plane**
   - Horizontal scaling of stateless services via autoscaling (Cloud Run or GKE).
   - DB tuned with:
     - Proper indexes on `tenant_id`, `project_id`, `card_id`.
     - Read replicas if necessary.

2. **Compute Plane**
   - GKE node pools sized for expected concurrent dev env count.
   - Per-plan and per-tenant limits:
     - Max concurrent envs.
     - Max terminal-hours/month.
   - RunCard job queues per tenant to avoid noisy-neighbor.

3. **Rate Limiting**
   - API gateway enforces:
     - Per-tenant request limits.
     - Per-user request limits for sensitive operations (e.g., RunCard).

---

## 9. Environments & Deployment

- **Environments**
  - `dev`: fast iteration, small cluster.
  - `staging`: near-prod topologies, used for soak tests.
  - `prod`: full scale.

- **Deployment**
  - IaC (Terraform/Config Connector) to manage:
    - GKE cluster(s).
    - AlloyDB/Postgres.
    - GCS buckets.
    - Secret Manager entries.
  - CI/CD:
    - Build & push Docker images.
    - Apply K8s manifests or Cloud Run services.
    - Run migrations on DB using schema tool.

---

## 10. Implementation Priorities

For MVP:

1. Stand up **Control Plane skeleton**:
   - Auth + Tenant/Billing + Provider + Project/CoPilot + GitHub Service.
2. Stand up **Dev Environment Manager** + a minimal dev environment image:
   - Shell + PTY + simple orchestrator stub.
3. Wire up Studio:
   - Project creation, CoPilot docs, Kanban, Terminal.
4. Implement **Run Card** for:
   - Docs generation.
   - One simple build card (e.g., generate basic web app skeleton).
5. Validate end-to-end:
   - Tenant signs up → connects Anthropic/OpenAI + GitHub → creates project → runs CoPilot → runs card → sees code in GitHub.

After that, iterate on builders, analytics, and Power-tier features.
