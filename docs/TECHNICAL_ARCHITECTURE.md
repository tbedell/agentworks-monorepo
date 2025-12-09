# AgentWorks - Technical Architecture

**Version:** 1.0  
**Date:** 2025-12-02  
**Owner:** Architect Agent  
**Status:** MVP Architecture  

---

## 1. Executive Summary

AgentWorks is a GCP-hosted SaaS platform that transforms AI-powered development into a visible, managed production line using a Kanban-first interface with multi-agent orchestration and multi-provider LLM routing.

### Key Architectural Principles
- **Microservices Architecture**: Loosely coupled services on GCP Cloud Run
- **Multi-Provider LLM Routing**: Unified API supporting OpenAI, Anthropic, Google, and Nano Banana
- **Multi-Tenant SaaS**: Workspace-level isolation with shared infrastructure
- **Event-Driven Architecture**: Pub/Sub for asynchronous processing
- **Cost Transparency**: 5x markup pricing with $0.25 increments
- **Real-Time Observability**: Live terminal streaming and comprehensive logging

---

## 2. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React SPA)                     │
│                     Next.js on Cloud Run                        │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTPS/WebSocket
┌─────────────────▼───────────────────────────────────────────────┐
│                      API Gateway                                │
│                  Fastify on Cloud Run                           │
│                 (Auth, CORS, Rate Limiting)                     │
└─────────────────┬───────────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┬─────────────┐
    │             │             │             │             │
┌───▼───┐   ┌───▼───┐   ┌───▼───┐   ┌───▼───┐   ┌───▼───┐
│ Core  │   │Agent  │   │Provider│   │ Log   │   │Billing│
│Service│   │Orchestr│   │Router │   │Stream │   │Service│
│       │   │       │   │Service│   │Service│   │       │
└───┬───┘   └───┬───┘   └───┬───┘   └───┬───┘   └───┬───┘
    │           │           │           │           │
┌───▼───────────▼───────────▼───────────▼───────────▼───┐
│                    Event Bus (Pub/Sub)                │
│     Topics: card-events, agent-runs, usage-events     │
└────────────────────────────────────────────────────────┘
    │
┌───▼─────────────────────────────────────────────────────┐
│                   Data Layer                            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐    │
│  │ PostgreSQL  │  │  Firestore   │  │ Cloud       │    │
│  │ (AlloyDB)   │  │  (Metadata)  │  │ Storage     │    │
│  │ Primary Data│  │  Documents   │  │ Files/Logs  │    │
│  └─────────────┘  └──────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Service Architecture

### 3.1 Frontend Service (Next.js)
**Technology**: Next.js 14, React 18, TypeScript, Tailwind CSS  
**Deployment**: Cloud Run (stateless containers)  
**Responsibilities**:
- Kanban board interface with drag-and-drop
- Real-time terminal/log streaming via WebSockets
- Agent configuration and provider mapping UI
- Usage dashboard and billing interface
- Authentication UI (email/OAuth)

**Key Components**:
- `KanbanBoard`: Lane-based project management
- `Terminal`: Real-time log streaming with replay
- `AgentConsole`: Lane 0 CoPilot Q&A interface  
- `UsageDashboard`: Cost tracking and analytics
- `ProviderConfig`: Multi-provider settings

### 3.2 API Gateway Service (Fastify)
**Technology**: Fastify, TypeScript, Lucia Auth  
**Deployment**: Cloud Run with auto-scaling  
**Responsibilities**:
- Authentication and session management
- Request routing and middleware
- Rate limiting and DDoS protection
- WebSocket connection handling
- Multi-tenant request isolation

**Endpoints**:
```typescript
// Core Resources
GET    /api/workspaces
POST   /api/workspaces/:id/projects
GET    /api/projects/:id/boards
POST   /api/projects/:id/cards
PUT    /api/cards/:id/move

// Agent Operations
POST   /api/cards/:id/agents/:agent/run
GET    /api/cards/:id/runs
WS     /api/cards/:id/terminal

// Usage & Billing
GET    /api/workspaces/:id/usage
GET    /api/workspaces/:id/billing
```

### 3.3 Core Service (Data Layer)
**Technology**: Prisma ORM, TypeScript  
**Database**: PostgreSQL (AlloyDB for production)  
**Responsibilities**:
- CRUD operations for all entities
- Multi-tenant data isolation
- Workspace and project management
- Card lifecycle management
- Agent run metadata storage

### 3.4 Agent Orchestrator Service
**Technology**: Node.js/TypeScript  
**Deployment**: Cloud Run with event-driven scaling  
**Responsibilities**:
- Listen to card events (lane changes, manual triggers)
- Determine appropriate agent for context
- Construct agent prompts with project context
- Coordinate with Provider Router for LLM calls
- Update card status and create child cards
- Emit agent run events

**Agent Types**:
```typescript
export const AGENTS = {
  CEO_COPILOT: { lanes: [0], provider: 'openai', model: 'gpt-4-turbo' },
  STRATEGY: { lanes: [0], provider: 'openai', model: 'gpt-4-turbo' },
  PRD: { lanes: [1], provider: 'openai', model: 'gpt-4-turbo' },
  ARCHITECT: { lanes: [3], provider: 'anthropic', model: 'claude-3-5-sonnet' },
  DEV_BACKEND: { lanes: [5,6], provider: 'anthropic', model: 'claude-3-5-sonnet' },
  DEV_FRONTEND: { lanes: [5,6], provider: 'anthropic', model: 'claude-3-5-sonnet' },
  QA: { lanes: [7], provider: 'anthropic', model: 'claude-3-5-sonnet' },
  TROUBLESHOOTER: { lanes: [7], provider: 'google', model: 'gemini-1.5-pro' }
} as const;
```

### 3.5 Provider Router Service
**Technology**: Node.js/TypeScript  
**Deployment**: Cloud Run with high availability  
**Responsibilities**:
- Unified LLM API abstraction
- Provider-specific request/response handling
- Cost calculation and usage logging
- Circuit breaker for provider failures
- Request queuing and rate limiting per provider

**Supported Providers**:
- **OpenAI**: GPT-4 Turbo, GPT-4o for planning and strategy
- **Anthropic**: Claude 3.5 Sonnet for development tasks
- **Google**: Gemini 1.5 Pro for troubleshooting
- **Nano Banana**: Specialized video/media processing

**Pricing Logic**:
```typescript
function calculatePrice(cost: number): number {
  const markup = 5; // 5x minimum markup
  const increment = 0.25; // $0.25 billing increments
  return Math.ceil((markup * cost) / increment) * increment;
}
```

### 3.6 Log Streaming Service
**Technology**: Node.js/TypeScript, WebSocket  
**Deployment**: Cloud Run with persistent connections  
**Responsibilities**:
- Real-time log streaming to terminals
- Log persistence and replay functionality
- Log aggregation and formatting
- WebSocket connection management
- Historical log retrieval

### 3.7 Billing Service
**Technology**: Node.js/TypeScript  
**Deployment**: Cloud Run with scheduled jobs  
**Responsibilities**:
- Usage event aggregation
- Invoice generation
- Stripe integration for payments
- Usage analytics and reporting
- Cost optimization recommendations

---

## 4. Data Architecture

### 4.1 Primary Database (PostgreSQL/AlloyDB)

**Multi-Tenant Strategy**: Row-Level Security with workspace_id isolation

```sql
-- Core Entities
workspaces (workspace_id, name, owner_id, billing_config)
users (user_id, email, name, avatar_url)
workspace_members (workspace_id, user_id, role)

-- Project Management
projects (project_id, workspace_id, name, status)
boards (board_id, project_id, name)
lanes (lane_id, board_id, lane_number, name, wip_limit)
cards (card_id, board_id, lane_id, title, type, assignee_id, position)

-- Agent System
agents (agent_id, name, display_name, allowed_lanes, default_provider)
agent_configs (project_id, agent_id, provider, model)
agent_runs (run_id, card_id, agent_id, status, tokens, cost, price)
run_logs (log_id, run_id, timestamp, level, message)

-- Usage & Billing
usage_events (event_id, workspace_id, project_id, run_id, provider, cost, price)
```

**Indexes for Performance**:
```sql
-- Multi-tenant queries
CREATE INDEX idx_cards_workspace ON cards(workspace_id, lane_id);
CREATE INDEX idx_agent_runs_card ON agent_runs(card_id, created_at);
CREATE INDEX idx_usage_events_workspace_date ON usage_events(workspace_id, created_at);

-- Real-time queries
CREATE INDEX idx_run_logs_run_timestamp ON run_logs(run_id, timestamp);
CREATE INDEX idx_cards_lane_position ON cards(lane_id, position);
```

### 4.2 Document Store (Firestore)

**Structure**:
```
/workspaces/{workspace_id}/
  /projects/{project_id}/
    /docs/
      - blueprint.md
      - prd.md
      - mvp.md
      - agent_playbook.md
      - infra_design.md
    /configs/
      - agent_mappings.json
      - board_config.json
```

**Usage**: 
- Project documentation with versioning
- Agent configuration templates
- Board customizations
- Rich content that doesn't fit relational model

### 4.3 File Storage (Cloud Storage)

**Buckets**:
- `agentworks-logs-{env}`: Long-term log archives
- `agentworks-exports-{env}`: Report exports and backups
- `agentworks-uploads-{env}`: User uploads and attachments

---

## 5. Event-Driven Architecture

### 5.1 Event Topics (Pub/Sub)

```typescript
interface CardEvent {
  type: 'card.created' | 'card.moved' | 'card.updated';
  cardId: string;
  workspaceId: string;
  projectId: string;
  fromLane?: number;
  toLane?: number;
  triggeredBy: string;
  timestamp: Date;
}

interface AgentRunEvent {
  type: 'agent.run.started' | 'agent.run.completed' | 'agent.run.failed';
  runId: string;
  cardId: string;
  agentId: string;
  provider: string;
  model: string;
  cost?: number;
  price?: number;
  timestamp: Date;
}

interface UsageEvent {
  workspaceId: string;
  projectId: string;
  runId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  price: number;
  timestamp: Date;
}
```

### 5.2 Event Flow

1. **Card Move** → `card-events` topic → Agent Orchestrator
2. **Agent Start** → `agent-runs` topic → Log Streaming Service
3. **LLM Call** → Provider Router → `usage-events` topic → Billing Service
4. **Agent Complete** → Update card → `card-events` topic → UI notification

---

## 6. Security Architecture

### 6.1 Authentication & Authorization

**Authentication**: Lucia-based session management with secure cookies
**Authorization**: Role-based access control (Owner, Member, Viewer)

```typescript
interface WorkspacePermissions {
  owner: ['read', 'write', 'delete', 'billing', 'invite'];
  member: ['read', 'write', 'agent_run'];
  viewer: ['read'];
}
```

### 6.2 Multi-Tenant Isolation

**Database**: Row-Level Security with workspace_id filtering
**API**: Middleware validates workspace membership on every request
**Storage**: Workspace-prefixed paths in Cloud Storage

### 6.3 Secrets Management

**GCP Secret Manager** for:
- LLM provider API keys (OpenAI, Anthropic, Google, Nano Banana)
- Database connection strings
- Stripe API keys
- JWT signing keys

**Access Pattern**:
```typescript
// Service-specific secret access via IAM roles
const openaiKey = await secretManager.accessSecret('openai-api-key');
const anthropicKey = await secretManager.accessSecret('anthropic-api-key');
```

### 6.4 Data Protection

- **In Transit**: TLS 1.3 for all external connections
- **At Rest**: GCP-managed encryption for databases and storage
- **API Keys**: Encrypted at rest in Secret Manager
- **Logs**: Sanitized to exclude sensitive data

---

## 7. Observability & Monitoring

### 7.1 Logging Strategy

**Structured Logging** with correlation IDs:
```json
{
  "timestamp": "2025-12-02T10:00:00Z",
  "level": "info",
  "service": "agent-orchestrator",
  "correlation_id": "req_abc123",
  "workspace_id": "ws_xyz789",
  "card_id": "card_def456",
  "message": "Agent run started",
  "metadata": {
    "agent": "architect",
    "provider": "anthropic",
    "model": "claude-3-5-sonnet"
  }
}
```

### 7.2 Metrics & Alerts

**Key Metrics**:
- API response times (p50, p95, p99)
- Agent run success/failure rates
- Provider usage and costs per workspace
- WebSocket connection health
- Database query performance

**Critical Alerts**:
- Service error rate > 1%
- Agent run failure rate > 5%
- Database connection pool exhaustion
- Provider cost spike (> 50% increase)
- WebSocket disconnection rate > 10%

### 7.3 Distributed Tracing

**Cloud Trace** for request correlation across services:
- API Gateway → Core Service → Database
- Agent Orchestrator → Provider Router → External LLM
- Log Streaming → WebSocket → Frontend

---

## 8. Performance & Scaling

### 8.1 Scaling Strategy

**Horizontal Scaling**: Cloud Run auto-scaling based on:
- CPU utilization > 70%
- Memory utilization > 80%
- Request concurrency > 100 per instance

**Database Scaling**:
- Read replicas for analytics queries
- Connection pooling (100 connections per service)
- Query optimization with proper indexing

### 8.2 Caching Strategy

**Redis Cache** for:
- User sessions (TTL: 24 hours)
- Workspace metadata (TTL: 1 hour)
- Agent configurations (TTL: 30 minutes)
- Usage aggregations (TTL: 5 minutes)

### 8.3 Rate Limiting

**API Rate Limits**:
- Authenticated users: 1000 requests/hour
- Agent operations: 100 runs/hour per workspace
- Provider calls: Based on provider limits

---

## 9. Deployment Architecture

### 9.1 Infrastructure as Code

**Terraform Configuration**:
```hcl
# Cloud Run Services
resource "google_cloud_run_service" "api_gateway" {
  name     = "agentworks-api"
  location = var.region
  
  template {
    spec {
      containers {
        image = "gcr.io/${var.project}/agentworks-api:${var.version}"
        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
        env {
          name  = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = "database-url"
              key  = "url"
            }
          }
        }
      }
    }
  }
}
```

### 9.2 CI/CD Pipeline

**Cloud Build Configuration**:
```yaml
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/$PROJECT_ID/agentworks-api:$SHORT_SHA', '.']
  dir: 'apps/api'
  
- name: 'gcr.io/cloud-builders/docker'
  args: ['push', 'gcr.io/$PROJECT_ID/agentworks-api:$SHORT_SHA']
  
- name: 'gcr.io/cloud-builders/gcloud'
  args: [
    'run', 'deploy', 'agentworks-api',
    '--image', 'gcr.io/$PROJECT_ID/agentworks-api:$SHORT_SHA',
    '--region', 'us-central1',
    '--platform', 'managed'
  ]
```

### 9.3 Environment Strategy

**Environments**:
- **Development**: Single-region, reduced redundancy
- **Staging**: Production-like for integration testing
- **Production**: Multi-region with high availability

---

## 10. Cost Management

### 10.1 Cost Attribution

**Resource Tagging**:
```typescript
const resourceTags = {
  environment: 'production',
  service: 'agent-orchestrator',
  workspace: workspace_id,
  cost_center: 'platform'
};
```

### 10.2 Usage-Based Pricing

**Cost Calculation**:
```typescript
interface UsagePricing {
  providerCost: number;        // Actual provider cost
  markup: number;              // 5x minimum
  billingIncrement: number;    // $0.25
  grossMargin: number;         // Target 80%
}

function calculateCustomerPrice(providerCost: number): number {
  const targetPrice = providerCost * 5; // 5x markup minimum
  return Math.ceil(targetPrice / 0.25) * 0.25; // Round up to $0.25
}
```

### 10.3 Cost Optimization

**Optimization Strategies**:
- Provider cost monitoring and alerting
- Automatic model selection based on task complexity
- Usage pattern analysis for workspace recommendations
- Reserved capacity for predictable workloads

---

## 11. Disaster Recovery & Business Continuity

### 11.1 Backup Strategy

**Database Backups**:
- Automated daily backups with 30-day retention
- Point-in-time recovery for last 7 days
- Cross-region backup replication

**Document Backups**:
- Firestore automatic backups
- Cloud Storage lifecycle policies
- Versioned document history

### 11.2 Disaster Recovery

**Recovery Time Objectives (RTO)**:
- Critical services: 15 minutes
- Full platform: 1 hour
- Complete disaster recovery: 4 hours

**Recovery Point Objectives (RPO)**:
- Transactional data: 5 minutes
- Agent logs: 15 minutes
- Documents: 1 hour

---

## 12. Compliance & Governance

### 12.1 Data Governance

**Data Classification**:
- Public: Documentation, marketing content
- Internal: System metrics, anonymized usage
- Confidential: User data, workspace content
- Restricted: API keys, billing information

### 12.2 Audit Trail

**Audit Events**:
- User authentication and authorization
- Data access and modifications
- Agent runs and outputs
- Billing and usage events
- Administrative actions

---

## 13. Future Architecture Considerations

### 13.1 Planned Enhancements

**Q1 2026**:
- Custom agent development framework
- Advanced workflow automation
- Integration marketplace

**Q2 2026**:
- On-premises deployment option
- Advanced analytics and ML insights
- Enterprise SSO and governance

### 13.2 Scalability Planning

**Technical Debt Management**:
- Quarterly architecture reviews
- Performance optimization sprints
- Technology stack evolution planning

**Capacity Planning**:
- Workspace growth projections
- Provider cost optimization
- Infrastructure scaling strategies

---

This technical architecture provides a comprehensive foundation for building AgentWorks as a scalable, secure, and cost-effective multi-tenant SaaS platform with sophisticated AI agent orchestration capabilities.