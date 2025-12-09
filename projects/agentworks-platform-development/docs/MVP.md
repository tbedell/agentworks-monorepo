# AgentWorks Cloud – MVP Definition

**Document:** MVP.md
**Product:** AgentWorks Cloud (Multi-Tenant BYOA Vibe Coding Platform)
**Owner:** Product / Executive Team
**Version:** 0.9
**Date:** 2025-12-08

---

## 1. MVP Goal

Ship the **smallest slice** of AgentWorks Cloud that:

1. Proves the core value proposition: **AI agents build your app under a structured, auditable process with code owned in your GitHub repo.**
2. Validates willingness to pay via **Founder packages** (one-time) and **seat subscriptions** (Lite/Pro).
3. Lets us learn before over-engineering: multi-region, SSO/SCIM, advanced analytics, etc. come later.

**One-liner:**

> A tenant can sign up, connect one LLM provider and GitHub, create a project, let CoPilot + agents turn an idea into running code committed to their repo—while we track usage and charge for seats.

---

## 2. MVP Constraints / Non-Goals

| Non-Goal | Rationale |
|----------|-----------|
| Multi-region / data residency | Phase 2; MVP is US-only GCP region |
| SSO / SCIM | Phase 2; email + OAuth (Google/GitHub) is enough |
| Advanced analytics dashboards | Phase 2; MVP shows basic metrics only |
| UI Builder / DB Builder / Workflow Builder | Phase 2; MVP uses CoPilot + terminal |
| Mobile apps | Phase 2+ |
| White-label / reseller | Phase 2+ |
| Multiple concurrent dev environments per project | MVP = 1 active env per project |
| Offline / air-gapped mode | Not planned |

---

## 3. MVP Feature Set

### 3.1 Tenants & Users

- **Sign-up flow:**
  - Email/password or OAuth (Google, GitHub).
  - Email verification.
  - Create first tenant (org) automatically.
- **Tenant management (self-serve):**
  - Rename tenant.
  - Invite members (email invite link).
  - Assign roles: Owner, Admin, Member.
- **Seats:**
  - Each user = 1 seat.
  - MVP enforces Lite limits by default; upgrade via Stripe checkout.

### 3.2 BYOA (Bring Your Own Agent)

- **Provider setup:**
  - Anthropic, OpenAI, Google (Gemini).
  - Enter API key → validate → store in Secret Manager (encrypted, tenant-scoped).
- **Health check:**
  - Simple "test call" button to verify key works.
- **Default model mapping:**
  - Pre-configured per agent type (e.g., CEO CoPilot = Claude 3.5 Sonnet, Strategy = GPT-4.1).
  - Tenant can override per agent in settings (post-MVP or late MVP).

### 3.3 GitHub Integration

- **OAuth / GitHub App install:**
  - Tenant authorizes AgentWorks GitHub App.
  - We store access tokens securely.
- **Repo operations:**
  - List repos the tenant has access to.
  - Create new repo (optional).
  - Clone repo into dev environment.
  - Commit + push on behalf of user (with clear attribution).
- **Branch strategy (MVP):**
  - Work on `main` or user-specified branch.
  - PRs optional (can push direct).

### 3.4 Projects, CoPilot & Kanban

- **Project CRUD:**
  - Create project (name, description, linked repo).
  - Archive / delete project.
- **CoPilot (Lane 0):**
  - Chat-based Q&A to define vision, goals, stakeholders.
  - Generates `/docs/BLUEPRINT.md` in repo.
- **Kanban board:**
  - 11 lanes (0–10) rendered; cards draggable.
  - Card CRUD: create, edit, move, archive.
  - Card detail panel with tabs:
    - Details (title, description, lane, status)
    - Agents (assigned agent, run history)
    - Review (human approval checkbox)
    - History (event log)
    - Context (cardID.context JSON viewer)
- **"Run Card" / "Run Lane":**
  - Triggers agent orchestrator.
  - Streams logs to terminal.
  - Updates card status on completion.

### 3.5 cardID.context & Total Recall

- Every card stores a JSON context blob:
  - `card_id`, `lane`, `status`, `created_at`, `updated_at`
  - `prompt` (user or agent)
  - `outputs` (files changed, commits, logs)
  - `events` (timestamped actions)
- Context is appended to agent prompts so they "remember" the build.
- Visible in UI under "Context" tab.

### 3.6 Dev Environment (Terminal)

- **Ephemeral container per project session:**
  - Spins up on "Run Card" or when user opens Terminal tab.
  - Contains: shell (bash), git, Node.js, Python, language runtimes.
  - MCP servers for filesystem + terminal tools.
- **Browser terminal:**
  - xterm.js embedded in Studio.
  - WebSocket connection to container PTY.
- **Lifecycle:**
  - Idle timeout (15 min) → pod shutdown.
  - State persisted to GitHub (committed code).
- **Limits (MVP):**
  - Lite: 1 concurrent env, ~10 h/month.
  - Pro: 2 concurrent envs, ~40 h/month.

### 3.7 Billing & Subscriptions

- **Stripe integration:**
  - Checkout session for seat upgrades.
  - Subscription management (Lite → Pro → Power).
  - Founder package redemption (one-time purchase → lifetime seat).
- **Usage tracking:**
  - Terminal hours (per project, per tenant).
  - Card runs (count).
  - Tokens (read from provider if available; otherwise estimate).
- **Soft limits:**
  - Warn user when approaching limit.
  - Throttle (queue) new runs when exceeded.
  - Prompt upgrade.

---

## 4. MVP UX Flows

### 4.1 Founder Onboarding

1. Land on marketing page → "Get Founder Access" CTA.
2. Choose package (Launch Week / Early Bird / Founding 50).
3. Stripe checkout (one-time).
4. Redirect to sign-up with promo code applied.
5. Create tenant, verify email, land in Studio.

### 4.2 First Project Flow

1. User clicks "New Project".
2. Enter name, optional description.
3. Connect GitHub (if not already):
   - OAuth flow → select or create repo.
4. Connect LLM provider (if not already):
   - Enter Anthropic/OpenAI/Google key.
5. Land on empty Kanban board (Lane 0 highlighted).
6. CoPilot greets user, starts Q&A.
7. After Q&A, CoPilot writes `BLUEPRINT.md` to repo, creates initial cards in Lanes 0–1.
8. User reviews, approves, moves cards to Lane 1.
9. PRD Agent runs → writes `PRD.md`.
10. MVP Agent runs → writes `MVP.md`, creates feature cards.
11. Continue through lanes; terminal shows live agent activity.
12. On Lane 8, code is deployed (or instructions given for manual deploy).

### 4.3 Admin Monitoring (Internal)

1. Admin logs into `/admin` console.
2. Dashboard shows:
   - Total tenants, active today, MRR estimate.
   - Provider health (API key validity).
   - Recent errors or failed runs.
3. Drill into tenant → see projects, usage, billing status.
4. Audit log shows config changes.

---

## 5. Technical Cut Lines

| Layer | MVP Scope | Deferred |
|-------|-----------|----------|
| Auth | Email + OAuth (Google/GitHub) | SSO (Okta, Azure AD) |
| Providers | Anthropic, OpenAI, Google | ElevenLabs, custom endpoints |
| GitHub | OAuth + App, single branch | Multi-branch strategies, GitLab/Bitbucket |
| Dev Env | Single container per project | Multi-container, persistent volumes |
| Billing | Stripe subscriptions, Founder codes | Usage-based billing, invoicing |
| Analytics | Basic usage charts | Advanced BI, cohort analysis |
| Admin | Tenant list, usage, audit | Multi-admin roles, bulk ops |

---

## 6. Success Criteria for MVP

| Metric | Target | Measurement |
|--------|--------|-------------|
| Founder packages sold | 100 | Stripe transactions |
| Tenants signed up | 200 | DB count |
| Projects created | 500 | DB count |
| Cards completed | 2,000 | DB count |
| Terminal hours used | 1,000 h | Usage logs |
| NPS from founders | ≥ 40 | Survey |
| Critical bugs in first week | ≤ 5 | Issue tracker |
| P0 incidents | 0 | PagerDuty |

---

## 7. Risks & Mitigations (MVP-specific)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GitHub rate limits during heavy usage | Medium | High | Implement caching, request coalescing |
| Provider key rotation mid-run | Low | Medium | Graceful error handling, retry with new key |
| Container runaway costs | Medium | High | Hard caps on terminal hours, auto-shutdown |
| Stripe webhook failures | Low | Medium | Retry queue, manual reconciliation UI |
| First-time user confusion | High | Medium | Onboarding wizard, contextual help |

---

## 8. MVP Milestones

### M1 – Core Auth & Tenant (2 weeks)
- Sign-up, OAuth, email verification
- Tenant CRUD, member invites
- Basic seat assignment

### M2 – BYOA & GitHub (2 weeks)
- Provider key entry & validation
- GitHub App install flow
- Repo list, clone, commit/push

### M3 – Kanban & CoPilot (3 weeks)
- 11-lane board rendering
- Card CRUD, drag-and-drop
- CoPilot chat, Blueprint generation
- cardID.context storage

### M4 – Dev Environment (3 weeks)
- Ephemeral container orchestration
- Browser terminal (xterm.js + WebSocket)
- MCP servers (filesystem, terminal)
- Idle timeout, resource limits

### M5 – Agent Orchestration (2 weeks)
- Run Card → agent selection → LLM call → tool execution
- Streaming logs to terminal
- Card status updates
- Basic error handling

### M6 – Billing & Founder Launch (2 weeks)
- Stripe subscriptions & checkout
- Founder package redemption
- Usage tracking dashboard
- Soft limit enforcement

### M7 – Admin Console & Polish (2 weeks)
- Tenant list, usage view, audit log
- Bug fixes, performance tuning
- Documentation, onboarding flow

**Total estimated: ~16 weeks to MVP launch**

---

## 9. Post-MVP Roadmap Preview

Items deferred from MVP that will be prioritized in Phase 1 and Phase 2:

### Phase 1 (Post-MVP, 3–6 months)
- Multi-provider model mixing per agent
- UI Builder, DB Builder (visual tools)
- Workflow Builder
- Advanced analytics dashboards
- Team collaboration features (comments, reviews)

### Phase 2 (6–12 months)
- SSO / SCIM for enterprise
- Multi-region deployment
- GitLab / Bitbucket support
- Usage-based billing options
- White-label / reseller program
- Mobile companion app

---

**Document Control:**
- **Created by:** Product Team
- **Reviewed by:** Engineering, Executive Team
- **Approved by:** Product Owner
- **Next Review:** After MVP M3 milestone
