# Super Admin Platform Plan

## Architecture Overview
**Separate application** running on its own port (e.g., `localhost:3020` for dev, `admin.agentworks.io` for prod)

- **DO NOT MODIFY** existing tenant UI (`apps/web`)
- Create new `apps/admin` application
- Shared database with tenant app
- Separate authentication (super admin only)

---

## 1. Tenant Management

### Features
- Tenant list with search, filter, pagination
- Tenant onboarding/provisioning workflow
- Tenant status management (active, suspended, trial, deleted)
- Resource quotas and usage limits per tenant
- Data export/migration for offboarding
- Impersonation (view as tenant) for support

### Database Schema
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  status ENUM('active', 'suspended', 'trial', 'deleted') DEFAULT 'trial',
  plan_id UUID REFERENCES subscription_plans(id),
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE tenant_usage_quotas (
  tenant_id UUID REFERENCES tenants(id),
  resource_type VARCHAR(100),
  quota_limit INTEGER,
  current_usage INTEGER DEFAULT 0,
  reset_period VARCHAR(50),
  PRIMARY KEY (tenant_id, resource_type)
);
```

---

## 2. Subscription & Billing

### Stripe Integration
- **Products**: Free, Pro, Enterprise tiers
- **Usage-Based Billing**: Stripe Meters for AI token consumption
- **Customer Portal**: Self-service billing management
- **Webhooks**: subscription.created, updated, deleted, invoice.paid, payment_failed

### Tiered Pricing Model
| Tier | Price | Token Limit | Features |
|------|-------|-------------|----------|
| Free | $0/mo | 1,000 tokens | Basic agents |
| Pro | $29/mo | 100,000 tokens | All agents, priority |
| Enterprise | $99/mo | Unlimited | Custom agents, SSO |

### Usage-Based Overages
- 5× markup on provider costs
- $0.25 minimum billing increment
- Real-time usage tracking with Stripe Meters

### Crypto Payments
- **Coinbase Commerce**: 1% fees, BTC/ETH/USDC
- **BitPay**: Fiat settlement, enterprise features
- **Solana Pay**: Near-zero fees, instant settlement

### Database Schema
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(50),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  tenant_id UUID,
  amount INTEGER,
  currency VARCHAR(10),
  status VARCHAR(50),
  hosted_invoice_url TEXT,
  period_start TIMESTAMP,
  period_end TIMESTAMP
);
```

---

## 3. AI Provider Management

### Features
- Add/edit/delete provider API keys (OpenAI, Anthropic, Google, ElevenLabs, fal.ai, Stability)
- Key rotation with overlapping validity
- Usage monitoring per provider
- Cost tracking and anomaly detection
- Rate limit configuration

### GCP Secret Manager Integration
- All keys stored in Secret Manager
- Version-controlled secrets
- Audit logging for key access
- Auto-rotation capabilities

### Database Schema
```sql
CREATE TABLE provider_configs (
  id UUID PRIMARY KEY,
  provider VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  enabled BOOLEAN DEFAULT true,
  secret_name VARCHAR(255), -- GCP Secret Manager reference
  rate_limit_per_minute INTEGER,
  monthly_budget DECIMAL(10,2),
  current_month_spend DECIMAL(10,2) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE provider_usage (
  id UUID PRIMARY KEY,
  provider VARCHAR(50),
  tenant_id UUID,
  model VARCHAR(100),
  input_tokens INTEGER,
  output_tokens INTEGER,
  provider_cost DECIMAL(10,6),
  billed_amount DECIMAL(10,2),
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## 4. Usage Analytics Dashboard

### Metrics
- Total platform usage (tokens, requests, cost)
- Usage by tenant, provider, model
- Revenue metrics (MRR, ARR, churn)
- Real-time usage graphs
- Cost allocation reports

### Implementation
- Materialized views for fast aggregations
- Time-series data in BigQuery (optional)
- Grafana or custom React dashboards

---

## 5. Platform Monitoring

### Health Dashboard
- Service health (API, web, database, Redis)
- Error rates and response times
- Infrastructure metrics (CPU, memory, network)
- Active tenant sessions

### Alerting
- PagerDuty/Slack integration
- Severity-based escalation
- Automated remediation for common issues

---

## 6. Access Control & Security

### Super Admin Roles
| Role | Permissions |
|------|-------------|
| Super Admin | Full platform access |
| Billing Admin | Subscriptions, invoices only |
| Support Agent | Read-only tenant access, tickets |

### Security Requirements
- MFA required for all super admins
- IP whitelisting for admin access
- Session timeout (30 min inactivity)
- Comprehensive audit logging

### Audit Logging
```sql
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY,
  admin_id UUID,
  action VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  tenant_id UUID,
  details JSONB,
  ip_address INET,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## 7. Application Structure

### New App: `apps/admin`
```
apps/admin/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── dashboard.tsx
│   │   ├── tenants/
│   │   ├── billing/
│   │   ├── providers/
│   │   ├── analytics/
│   │   └── settings/
│   ├── components/
│   │   ├── layout/
│   │   ├── tenants/
│   │   ├── billing/
│   │   └── providers/
│   ├── hooks/
│   ├── stores/
│   └── lib/
```

### New API Routes: `apps/api/src/routes/admin/`
```
routes/admin/
├── index.ts
├── auth.ts          # Super admin auth
├── tenants.ts       # Tenant CRUD
├── billing.ts       # Stripe integration
├── providers.ts     # API key management
├── analytics.ts     # Usage analytics
├── audit.ts         # Audit logs
└── webhooks/
    ├── stripe.ts
    └── coinbase.ts
```

---

## 8. Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + TypeScript + Vite |
| UI Library | Shadcn/UI (consistent with tenant app) |
| State | Zustand |
| API | Fastify (shared with tenant API) |
| Database | PostgreSQL + Prisma |
| Payments | Stripe + Coinbase Commerce |
| Secrets | GCP Secret Manager |
| Monitoring | GCP Cloud Monitoring + Sentry |
| Auth | Lucia (separate admin users table) |

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create `apps/admin` scaffold
- [ ] Admin authentication (separate from tenant auth)
- [ ] Basic dashboard layout
- [ ] Tenant list view

### Phase 2: Tenant Management (Week 2-3)
- [ ] Tenant CRUD operations
- [ ] Status management (suspend/activate)
- [ ] Usage quotas configuration
- [ ] Tenant impersonation

### Phase 3: Billing Integration (Week 3-4)
- [ ] Stripe product/price setup
- [ ] Subscription management UI
- [ ] Webhook handlers
- [ ] Invoice management
- [ ] Usage-based billing with Meters

### Phase 4: Provider Management (Week 4-5)
- [ ] Provider configuration UI
- [ ] GCP Secret Manager integration
- [ ] Key rotation workflow
- [ ] Usage tracking per provider

### Phase 5: Analytics & Monitoring (Week 5-6)
- [ ] Usage analytics dashboard
- [ ] Revenue metrics
- [ ] Health monitoring
- [ ] Alerting setup

### Phase 6: Security & Polish (Week 6-7)
- [ ] MFA implementation
- [ ] Audit logging
- [ ] IP whitelisting
- [ ] Documentation

---

## 10. Environment Configuration

### Development
```env
# apps/admin/.env
VITE_API_URL=http://localhost:3010
VITE_ADMIN_PORT=3020
```

### API Admin Routes
```env
# apps/api/.env
ADMIN_ENABLED=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
COINBASE_COMMERCE_API_KEY=...
GCP_PROJECT_ID=agentworks
```

---

## Key Principles

1. **Separate App**: Admin runs independently, doesn't affect tenant experience
2. **No Mock Data**: Real database connections, real Stripe integration
3. **Security First**: MFA, audit logs, IP restrictions
4. **GCP Native**: Secret Manager, Cloud Monitoring, Cloud Run
5. **5× Markup**: Consistent billing model across all providers
