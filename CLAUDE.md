# AgentWorks - Claude Code Configuration

**Project**: Agent-native Kanban platform for AI-powered development  
**Owner**: Thomas R. Bedell  
**Version**: 1.0  

---

## Project Context

AgentWorks is a GCP-hosted SaaS platform that transforms AI-powered development into a visible, managed production line. Every idea becomes a card, moving through a Kanban pipeline where specialist agents execute at each lane, supervised by a CEO CoPilot that maintains alignment with the Blueprint, PRD, and MVP.

### Core Architecture
- **Frontend**: React/TypeScript SPA with Kanban UI
- **Backend**: Node.js/TypeScript with Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Infrastructure**: GCP (Cloud Run, Cloud SQL, Secret Manager)
- **Agent Orchestration**: Multi-provider LLM routing (OpenAI, Anthropic, Google, Nano Banana)

### Key Features
- Kanban-first project management (Lanes 0-10)
- Multi-agent orchestration with provider mixing
- LLM terminal with live logs and replay
- Usage tracking and billing (2× markup, $0.25 increments)
- Real-time agent execution monitoring

---

## Agent Registry

### Lane 0: Vision & CoPilot Planning

#### CEO CoPilot Agent
- **Role**: Executive supervisor for entire project
- **Provider**: OpenAI GPT-4
- **Responsibilities**: Run Lane 0 Q&A, maintain Blueprint alignment, generate progress summaries
- **Inputs**: Board snapshot, Blueprint, PRD, MVP, metrics
- **Outputs**: Updated BLUEPRINT.md, summary reports, card annotations

#### Strategy Agent
- **Role**: Transform Q&A into coherent product strategy
- **Provider**: OpenAI GPT-4 / Claude Sonnet
- **Responsibilities**: Define positioning, target segments, feature buckets, risk analysis
- **Inputs**: Lane 0 Q&A transcript, Blueprint notes
- **Outputs**: Strategy section in BLUEPRINT.md

#### Storyboard/UX Agent
- **Role**: Translate strategy into user flows and wireframes
- **Provider**: OpenAI GPT-4 / Claude Sonnet
- **Responsibilities**: Create user journeys, screen inventory, text-based wireframes
- **Inputs**: Strategy output, Blueprint
- **Outputs**: UX storyboards in BLUEPRINT.md or /docs/ux/

### Lane 1: PRD / MVP Definition

#### PRD Agent
- **Role**: Generate and maintain Product Requirements Document
- **Provider**: OpenAI GPT-4
- **Responsibilities**: Convert Blueprint + storyboards into structured PRD
- **Inputs**: BLUEPRINT.md, UX storyboards
- **Outputs**: /docs/PRD.md

#### MVP Scope Agent
- **Role**: Define minimal viable product slice
- **Provider**: OpenAI GPT-4
- **Responsibilities**: Identify MVP features, create feature cards
- **Inputs**: PRD.md
- **Outputs**: /docs/MVP.md, MVP feature cards

### Lane 2: Research

#### Research Agent
- **Role**: Perform external research and competitive analysis
- **Provider**: OpenAI GPT-4 (with browsing)
- **Responsibilities**: Investigate technologies, competitors, patterns
- **Inputs**: Research prompts from cards
- **Outputs**: Research briefs in /docs/research/

### Lane 3: Architecture & Stack

#### Architect Agent
- **Role**: Design system architecture and choose tech stack
- **Provider**: Claude Code
- **Responsibilities**: Define services, data models, interfaces, stack profile
- **Inputs**: Blueprint, PRD, research
- **Outputs**: Architecture diagrams, stack decisions, implementation tasks

### Lane 4: Planning & Task Breakdown

#### Planner/Decomposition Agent
- **Role**: Break features into development tasks
- **Provider**: OpenAI GPT-4
- **Responsibilities**: Create dev-sized tasks with dependencies and acceptance criteria
- **Inputs**: Architecture, PRD, MVP
- **Outputs**: Task cards under each feature

### Lanes 5-6: Scaffolding & Build

#### DevOps/Infrastructure Agent
- **Role**: Infrastructure-as-code, CI/CD, deployment configs
- **Provider**: Claude Code
- **Responsibilities**: Create Dockerfiles, Cloud Run configs, Terraform, CI workflows
- **Inputs**: Architecture, INFRA_DESIGN
- **Outputs**: Infrastructure code, deployment scripts, runbooks

#### Dev Agent - Backend
- **Role**: Implement backend APIs and services
- **Provider**: Claude Code
- **Responsibilities**: Generate backend code, write tests
- **Inputs**: Backend tasks, architecture, repo snapshot
- **Outputs**: Backend code, tests, implementation notes

#### Dev Agent - Frontend
- **Role**: Implement frontend UI components
- **Provider**: Claude Code
- **Responsibilities**: Build React components, state management, respect UX guidelines
- **Inputs**: Frontend tasks, UX storyboards, repo
- **Outputs**: Frontend code, component tests

### Lane 7: Test & QA

#### QA Agent
- **Role**: Testing and quality assurance
- **Provider**: Claude Code
- **Responsibilities**: Generate test plans, E2E tests, classify failures
- **Inputs**: PRD, tasks, codebase
- **Outputs**: Test code, test reports, bug cards

#### Troubleshooting Agent
- **Role**: Debug failing builds and tests
- **Provider**: Google Gemini Pro
- **Responsibilities**: Analyze logs, identify root causes, propose fixes
- **Inputs**: Failing tests, logs, recent diffs
- **Outputs**: Patches, explanations, bug reports

### Lane 8: Deploy

#### Deployment Agent
- **Role**: Production deployment and monitoring
- **Provider**: Claude Code
- **Responsibilities**: Deploy to GCP, configure monitoring, health checks
- **Inputs**: Tested builds, deployment configs
- **Outputs**: Live deployments, monitoring setup

### Lane 9: Docs & Training

#### Documentation Agent
- **Role**: Generate comprehensive documentation
- **Provider**: OpenAI GPT-4
- **Responsibilities**: Create user guides, API docs, runbooks
- **Inputs**: PRD, MVP, code, tests
- **Outputs**: /docs/user/, /docs/api/, /docs/runbooks/

### Lane 10: Learn & Optimize

#### Refactor Agent
- **Role**: Improve code quality and performance
- **Provider**: Claude Code
- **Responsibilities**: Identify code smells, refactor with passing tests
- **Inputs**: Codebase, test results, architecture guidelines
- **Outputs**: Refactored code, performance improvements

---

## Development Workflows

### Lane 0 Workflow: Blueprint Creation
```bash
# Initialize new project
./scripts/lane0/init-project.sh

# Run CoPilot Q&A session
./scripts/lane0/copilot-session.sh

# Generate strategy analysis
./scripts/lane0/strategy-analysis.sh

# Create UX storyboards
./scripts/lane0/ux-storyboards.sh

# Finalize Blueprint
./scripts/lane0/finalize-blueprint.sh
```

### Lane 1 Workflow: PRD & MVP
```bash
# Generate PRD from Blueprint
./scripts/lane1/generate-prd.sh

# Define MVP scope
./scripts/lane1/define-mvp.sh

# Create feature cards
./scripts/lane1/create-feature-cards.sh
```

### Build Workflow: Lanes 3-6
```bash
# Architecture design
./scripts/build/design-architecture.sh

# Task breakdown
./scripts/build/breakdown-tasks.sh

# Infrastructure setup
./scripts/build/setup-infrastructure.sh

# Backend development
./scripts/build/develop-backend.sh

# Frontend development
./scripts/build/develop-frontend.sh
```

### Quality Workflow: Lane 7
```bash
# Run comprehensive tests
./scripts/quality/run-tests.sh

# QA analysis
./scripts/quality/qa-analysis.sh

# Troubleshoot failures
./scripts/quality/troubleshoot.sh
```

---

## Provider Configuration

### Default Provider Mapping
```json
{
  "ceo_copilot": { "provider": "openai", "model": "gpt-4-turbo" },
  "strategy": { "provider": "openai", "model": "gpt-4-turbo" },
  "storyboard": { "provider": "openai", "model": "gpt-4-turbo" },
  "prd": { "provider": "openai", "model": "gpt-4-turbo" },
  "mvp": { "provider": "openai", "model": "gpt-4-turbo" },
  "research": { "provider": "openai", "model": "gpt-4-turbo" },
  "architect": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
  "planner": { "provider": "openai", "model": "gpt-4-turbo" },
  "devops": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
  "dev_backend": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
  "dev_frontend": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
  "qa": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
  "troubleshooter": { "provider": "google", "model": "gemini-1.5-pro" },
  "docs": { "provider": "openai", "model": "gpt-4-turbo" },
  "refactor": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022" },
  "video": { "provider": "nanobanana", "model": "nb-video-1" }
}
```

### Usage Tracking
- **Pricing Formula**: `P = ceil((2 * cost) / 0.25) * 0.25`
- **Minimum Markup**: 2× provider cost
- **Billing Increment**: $0.25
- **Target Margin**: ≥50% gross margin

---

## Development Commands

### Project Setup
```bash
# Install dependencies
pnpm install

# Generate database schema
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

### Quality Assurance
```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Build verification
pnpm build

# Test suite
pnpm test
```

### Agent Operations
```bash
# Initialize agent for current card
./scripts/agents/init-agent.sh <agent-name> <card-id>

# Execute agent workflow
./scripts/agents/execute.sh <agent-name> <workflow>

# Monitor agent logs
./scripts/agents/monitor.sh <run-id>

# Generate usage report
./scripts/agents/usage-report.sh
```

---

## Tools & Plugins

### Agent Orchestration Tools
- `agent-router`: Multi-provider LLM routing
- `usage-tracker`: API call logging and billing
- `terminal-logger`: Agent execution logging
- `card-automator`: Kanban workflow automation

### Development Tools
- `blueprint-generator`: Lane 0 Blueprint creation
- `prd-generator`: Lane 1 PRD generation
- `task-decomposer`: Lane 4 task breakdown
- `code-generator`: Lanes 5-6 implementation
- `test-automator`: Lane 7 quality assurance

### Monitoring & Analytics
- `agent-monitor`: Real-time execution tracking
- `cost-analyzer`: Usage and billing analytics
- `performance-tracker`: Agent efficiency metrics
- `board-analytics`: Kanban flow analysis

---

## Integration Points

### External Services
- **GCP**: Cloud Run, Cloud SQL, Secret Manager, Cloud Storage
- **LLM Providers**: OpenAI, Anthropic, Google AI, Nano Banana
- **Development**: GitHub, Docker, Terraform
- **Monitoring**: GCP Monitoring, Logging
- **Billing**: Stripe integration for usage billing

### Data Flow
1. **User Input** → Kanban Board → Card Creation
2. **Agent Trigger** → Provider Router → LLM API
3. **Agent Output** → Terminal Logger → Card Update
4. **Usage Event** → Cost Calculator → Billing System
5. **Board State** → Analytics → Dashboard

---

## Security & Compliance

### API Key Management
- All provider keys stored in GCP Secret Manager
- Rotation policies for production keys
- Audit logging for key access

### Data Protection
- All data encrypted in transit (HTTPS/TLS)
- All data encrypted at rest (GCP-managed keys)
- Multi-tenant data isolation
- GDPR compliance for user data

### Access Control
- Workspace-level isolation
- Role-based permissions (Owner, Member, Viewer)
- Agent execution audit trails
- Usage tracking and billing transparency

---

This configuration establishes AgentWorks as a production-ready agent orchestration platform following the architecture and methodology defined in the project documentation.