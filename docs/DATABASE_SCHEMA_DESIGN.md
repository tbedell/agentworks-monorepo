# AgentWorks - Database Schema Design

**Version:** 1.0  
**Date:** 2025-12-02  
**Owner:** Architect Agent  
**Status:** Production Ready  

---

## 1. Schema Overview

AgentWorks uses a PostgreSQL database (AlloyDB for production) with a multi-tenant architecture that ensures strong data isolation while maintaining performance. The schema is designed for scalability, auditability, and cost transparency.

### 1.1 Design Principles

- **Multi-Tenant Isolation**: Row-level security with workspace-based filtering
- **Performance Optimization**: Strategic indexing for common query patterns
- **Audit Trail**: Comprehensive tracking of all entity changes
- **Cost Attribution**: Granular usage tracking for accurate billing
- **Referential Integrity**: Foreign keys with proper cascade rules
- **Time-Series Optimization**: Partitioned tables for logs and usage events

---

## 2. Enhanced Schema Definition

### 2.1 User Management & Authentication

```sql
-- Core user entity with authentication support
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255), -- Argon2 hash, nullable for OAuth users
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- User authentication sessions (Lucia-compatible)
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET
);

-- OAuth provider connections
CREATE TABLE user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'github', etc.
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(provider, provider_user_id)
);

-- User preferences and settings
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT '{}',
    theme VARCHAR(20) DEFAULT 'light',
    timezone VARCHAR(50) DEFAULT 'UTC',
    notifications JSONB DEFAULT '{"email": true, "browser": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);
```

### 2.2 Multi-Tenant Workspace Management

```sql
-- Workspace entity with billing configuration
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
    owner_id UUID NOT NULL REFERENCES users(id),
    
    -- Billing configuration
    billing_plan VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'enterprise'
    billing_email VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    billing_address JSONB,
    
    -- Feature flags and limits
    settings JSONB DEFAULT '{}',
    max_projects INTEGER DEFAULT 3,
    max_members INTEGER DEFAULT 5,
    max_monthly_usage DECIMAL(10,2) DEFAULT 100.00, -- Usage limit in USD
    
    -- Status and timestamps
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Workspace membership with roles
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
    permissions JSONB DEFAULT '[]', -- Additional granular permissions
    
    -- Invitation tracking
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(workspace_id, user_id)
);

-- Workspace invitations for pending users
CREATE TABLE workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'member',
    invited_by UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(workspace_id, email)
);
```

### 2.3 Project and Board Management

```sql
-- Projects within workspaces
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(100) NOT NULL, -- URL-friendly, unique within workspace
    
    -- Project configuration
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'archived', 'deleted'
    visibility VARCHAR(20) DEFAULT 'workspace', -- 'workspace', 'members'
    settings JSONB DEFAULT '{}',
    
    -- Metadata
    repository_url TEXT,
    deployment_url TEXT,
    documentation_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    UNIQUE(workspace_id, slug)
);

-- Kanban boards for projects (usually 1 per project)
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT 'Development Board',
    description TEXT,
    
    -- Board configuration
    settings JSONB DEFAULT '{}',
    column_config JSONB DEFAULT '[]', -- Custom lane configurations
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Lanes (columns) within boards
CREATE TABLE lanes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    lane_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Lane configuration
    wip_limit INTEGER, -- Work In Progress limit
    auto_trigger_agent VARCHAR(100), -- Agent to auto-trigger on card entry
    exit_criteria TEXT, -- Conditions for moving to next lane
    settings JSONB DEFAULT '{}',
    
    -- Display configuration
    color VARCHAR(7) DEFAULT '#6B7280', -- Hex color code
    position INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(board_id, lane_number)
);
```

### 2.4 Card Management System

```sql
-- Cards (work items) within boards
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    lane_id UUID NOT NULL REFERENCES lanes(id),
    parent_id UUID REFERENCES cards(id), -- For hierarchical cards
    
    -- Core card data
    title VARCHAR(500) NOT NULL,
    description TEXT,
    card_type VARCHAR(50) NOT NULL, -- 'epic', 'feature', 'task', 'bug', 'blueprint', 'doc'
    
    -- Status and priority
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'ready', 'in_progress', 'blocked', 'done'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    
    -- Assignment and ownership
    assignee_id UUID REFERENCES users(id),
    reporter_id UUID REFERENCES users(id),
    
    -- Position and organization
    position DECIMAL(10,5) DEFAULT 0, -- Allows flexible reordering
    labels TEXT[], -- Array of string labels
    tags JSONB DEFAULT '[]', -- Structured tags with metadata
    
    -- Time tracking
    estimated_hours DECIMAL(5,2),
    logged_hours DECIMAL(5,2) DEFAULT 0,
    due_date TIMESTAMPTZ,
    
    -- Metadata and links
    external_links JSONB DEFAULT '[]', -- Links to GitHub issues, docs, etc.
    attachments JSONB DEFAULT '[]', -- File attachments metadata
    custom_fields JSONB DEFAULT '{}', -- Project-specific fields
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Full-text search
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || COALESCE(description, ''))
    ) STORED
);

-- Card dependencies for workflow management
CREATE TABLE card_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dependent_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    dependency_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) DEFAULT 'blocks', -- 'blocks', 'relates_to', 'duplicates'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    UNIQUE(dependent_card_id, dependency_card_id),
    CHECK (dependent_card_id != dependency_card_id) -- Prevent self-dependencies
);

-- Card comments for collaboration
CREATE TABLE card_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'markdown', -- 'markdown', 'plain_text'
    
    -- Reply threading
    parent_comment_id UUID REFERENCES card_comments(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete
    
    -- Audit fields
    updated_by UUID REFERENCES users(id)
);

-- Card activity log for audit trail
CREATE TABLE card_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- NULL for system activities
    activity_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'moved', 'assigned', 'commented'
    
    -- Activity details
    field_changed VARCHAR(100), -- Which field was changed
    old_value JSONB, -- Previous value
    new_value JSONB, -- New value
    metadata JSONB DEFAULT '{}', -- Additional context
    
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Partition card activities by month for performance
CREATE TABLE card_activities_y2025m12 PARTITION OF card_activities
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
```

### 2.5 Agent System Schema

```sql
-- Agent definitions (system-wide)
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL, -- 'ceo_copilot', 'architect', etc.
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Agent capabilities
    allowed_lanes INTEGER[] DEFAULT '{}', -- Which lanes this agent can operate in
    capabilities TEXT[] DEFAULT '{}', -- 'code_generation', 'analysis', etc.
    
    -- Default provider configuration
    default_provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', etc.
    default_model VARCHAR(100) NOT NULL,
    default_temperature DECIMAL(3,2) DEFAULT 0.7,
    default_max_tokens INTEGER DEFAULT 4000,
    
    -- System prompt and configuration
    system_prompt TEXT NOT NULL,
    prompt_template TEXT, -- Template for contextual prompts
    tools_config JSONB DEFAULT '[]', -- Available tools/functions
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'deprecated', 'disabled'
    version VARCHAR(20) DEFAULT '1.0',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Project-specific agent configurations
CREATE TABLE agent_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id),
    
    -- Override default agent settings
    provider VARCHAR(50), -- Override default provider
    model VARCHAR(100), -- Override default model
    temperature DECIMAL(3,2),
    max_tokens INTEGER,
    
    -- Project-specific prompt modifications
    system_prompt_additions TEXT,
    context_instructions TEXT, -- How to use project context
    
    -- Configuration state
    enabled BOOLEAN DEFAULT TRUE,
    auto_trigger BOOLEAN DEFAULT FALSE, -- Auto-trigger on lane entry
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    UNIQUE(project_id, agent_id)
);

-- Agent execution runs
CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id),
    
    -- Run configuration
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    temperature DECIMAL(3,2),
    max_tokens INTEGER,
    
    -- Execution status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    progress DECIMAL(5,2) DEFAULT 0, -- Percentage complete
    
    -- Token usage and costs
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    
    -- Cost information
    provider_cost DECIMAL(10,6) DEFAULT 0, -- What we pay the provider
    customer_price DECIMAL(10,2) DEFAULT 0, -- What we charge (5x markup)
    
    -- Timing information
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER, -- Total execution time in milliseconds
    
    -- Results
    result_summary TEXT,
    result_data JSONB, -- Structured output from agent
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Context and metadata
    input_context JSONB, -- What was sent to the agent
    execution_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Audit fields
    triggered_by UUID REFERENCES users(id), -- User who triggered the run
    
    -- Constraints
    CHECK (completed_at >= started_at),
    CHECK (progress >= 0 AND progress <= 100)
) PARTITION BY RANGE (created_at);

-- Partition agent runs by month
CREATE TABLE agent_runs_y2025m12 PARTITION OF agent_runs
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
```

### 2.6 Logging and Monitoring Schema

```sql
-- Detailed logs for agent runs
CREATE TABLE agent_run_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    
    -- Log entry details
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    log_level VARCHAR(10) NOT NULL, -- 'debug', 'info', 'warn', 'error'
    source VARCHAR(50) DEFAULT 'agent', -- 'agent', 'orchestrator', 'provider'
    
    -- Message content
    message TEXT NOT NULL,
    structured_data JSONB, -- Additional structured log data
    
    -- Context
    operation VARCHAR(100), -- 'prompt_construction', 'llm_call', 'result_processing'
    correlation_id UUID, -- For tracing across services
    
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Partition run logs by week for better performance
CREATE TABLE agent_run_logs_y2025w49 PARTITION OF agent_run_logs
    FOR VALUES FROM ('2025-12-01') TO ('2025-12-08');

-- System-wide audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Entity information
    entity_type VARCHAR(50) NOT NULL, -- 'workspace', 'project', 'card', etc.
    entity_id UUID NOT NULL,
    workspace_id UUID, -- For workspace-level filtering
    
    -- Action details
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'move', etc.
    actor_id UUID REFERENCES users(id),
    actor_type VARCHAR(20) DEFAULT 'user', -- 'user', 'system', 'agent'
    
    -- Change tracking
    field_changes JSONB, -- What fields were changed
    old_values JSONB, -- Previous values
    new_values JSONB, -- New values
    
    -- Request context
    request_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Partition audit log by month
CREATE TABLE audit_log_y2025m12 PARTITION OF audit_log
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
```

### 2.7 Usage Tracking and Billing Schema

```sql
-- Detailed usage events for billing
CREATE TABLE usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Attribution hierarchy
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    card_id UUID REFERENCES cards(id),
    agent_id UUID REFERENCES agents(id),
    run_id UUID REFERENCES agent_runs(id),
    
    -- Provider details
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    
    -- Usage metrics
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    
    -- Cost calculation
    provider_cost DECIMAL(10,6) NOT NULL, -- Actual cost from provider
    customer_price DECIMAL(10,2) NOT NULL, -- Price charged to customer
    markup_multiplier DECIMAL(4,2) DEFAULT 5.0, -- Applied markup
    
    -- Pricing breakdown
    input_cost_per_token DECIMAL(12,8),
    output_cost_per_token DECIMAL(12,8),
    
    -- Timing
    event_time TIMESTAMPTZ NOT NULL,
    
    -- Metadata
    request_metadata JSONB DEFAULT '{}',
    billing_period DATE, -- Which billing period this belongs to
    
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (event_time);

-- Partition usage events by month for efficient billing queries
CREATE TABLE usage_events_y2025m12 PARTITION OF usage_events
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Pre-aggregated usage summaries for faster billing
CREATE TABLE usage_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    project_id UUID REFERENCES projects(id), -- NULL for workspace-level summary
    
    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    
    -- Aggregated metrics
    total_calls INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) DEFAULT 0,
    gross_margin DECIMAL(5,2), -- Percentage
    
    -- Breakdown by provider
    provider_breakdown JSONB DEFAULT '{}',
    agent_breakdown JSONB DEFAULT '{}',
    
    -- Summary metadata
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(workspace_id, project_id, period_start, period_type)
);

-- Billing accounts for workspaces
CREATE TABLE billing_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    
    -- Payment method
    stripe_customer_id VARCHAR(255),
    payment_method_id VARCHAR(255),
    
    -- Billing configuration
    billing_email VARCHAR(255),
    billing_address JSONB,
    tax_id VARCHAR(100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'past_due', 'suspended'
    next_billing_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(workspace_id)
);

-- Generated invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    billing_account_id UUID NOT NULL REFERENCES billing_accounts(id),
    
    -- Invoice details
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Payment tracking
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
    issued_at TIMESTAMPTZ,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    
    -- External references
    stripe_invoice_id VARCHAR(255),
    
    -- Invoice data
    line_items JSONB NOT NULL, -- Detailed breakdown
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.8 Document Management Schema

```sql
-- Project documents (Blueprint, PRD, MVP, etc.)
CREATE TABLE project_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Document identification
    document_type VARCHAR(50) NOT NULL, -- 'blueprint', 'prd', 'mvp', 'agent_playbook'
    title VARCHAR(255) NOT NULL,
    
    -- Content
    content TEXT DEFAULT '',
    content_type VARCHAR(20) DEFAULT 'markdown', -- 'markdown', 'html', 'plain_text'
    
    -- Versioning
    version INTEGER DEFAULT 1,
    is_latest BOOLEAN DEFAULT TRUE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'review', 'approved', 'archived'
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    custom_metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Full-text search
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || content)
    ) STORED,
    
    UNIQUE(project_id, document_type, version)
);

-- Document revisions for change tracking
CREATE TABLE document_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
    
    -- Change information
    change_type VARCHAR(20) NOT NULL, -- 'created', 'updated', 'approved'
    summary TEXT,
    diff_data JSONB, -- Structured diff information
    
    -- Version info
    old_version INTEGER,
    new_version INTEGER NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);
```

---

## 3. Indexing Strategy

### 3.1 Performance-Critical Indexes

```sql
-- Multi-tenant query optimization
CREATE INDEX CONCURRENTLY idx_cards_workspace_lane 
ON cards(board_id, lane_id, position) WHERE archived_at IS NULL;

CREATE INDEX CONCURRENTLY idx_agent_runs_card_status 
ON agent_runs(card_id, status, created_at);

CREATE INDEX CONCURRENTLY idx_usage_events_workspace_period 
ON usage_events(workspace_id, billing_period, event_time);

-- Real-time queries
CREATE INDEX CONCURRENTLY idx_run_logs_run_timestamp 
ON agent_run_logs(run_id, timestamp);

CREATE INDEX CONCURRENTLY idx_card_activities_card_time 
ON card_activities(card_id, created_at DESC);

-- Search and filtering
CREATE INDEX CONCURRENTLY idx_cards_search_vector 
ON cards USING gin(search_vector);

CREATE INDEX CONCURRENTLY idx_documents_search_vector 
ON project_documents USING gin(search_vector);

-- Billing and analytics
CREATE INDEX CONCURRENTLY idx_usage_summaries_workspace_period 
ON usage_summaries(workspace_id, period_start, period_type);

-- Foreign key optimization
CREATE INDEX CONCURRENTLY idx_workspace_members_user 
ON workspace_members(user_id, workspace_id);

CREATE INDEX CONCURRENTLY idx_projects_workspace_status 
ON projects(workspace_id, status) WHERE status = 'active';
```

### 3.2 Compound Indexes for Complex Queries

```sql
-- Dashboard queries
CREATE INDEX CONCURRENTLY idx_cards_assignee_status_lane 
ON cards(assignee_id, status, lane_id, updated_at DESC) 
WHERE archived_at IS NULL;

-- Agent performance analytics
CREATE INDEX CONCURRENTLY idx_agent_runs_agent_status_timing 
ON agent_runs(agent_id, status, completed_at, duration_ms)
WHERE status = 'completed';

-- Usage analytics
CREATE INDEX CONCURRENTLY idx_usage_events_provider_model_time 
ON usage_events(provider, model, event_time, customer_price);

-- Audit trail queries
CREATE INDEX CONCURRENTLY idx_audit_log_entity_workspace_time 
ON audit_log(entity_type, entity_id, workspace_id, created_at DESC);
```

---

## 4. Multi-Tenant Security

### 4.1 Row-Level Security (RLS) Policies

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Workspace access policy
CREATE POLICY workspace_access_policy ON workspaces
FOR ALL TO authenticated_users
USING (
    id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = current_setting('app.current_user_id')::uuid
    )
);

-- Project access through workspace membership
CREATE POLICY project_access_policy ON projects
FOR ALL TO authenticated_users
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = current_setting('app.current_user_id')::uuid
    )
);

-- Card access through project membership
CREATE POLICY card_access_policy ON cards
FOR ALL TO authenticated_users
USING (
    board_id IN (
        SELECT b.id FROM boards b
        JOIN projects p ON p.id = b.project_id
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = current_setting('app.current_user_id')::uuid
    )
);
```

### 4.2 Application-Level Security Functions

```sql
-- Function to check workspace membership
CREATE OR REPLACE FUNCTION check_workspace_membership(
    workspace_uuid UUID,
    user_uuid UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = workspace_uuid 
        AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible workspaces
CREATE OR REPLACE FUNCTION get_user_workspaces(user_uuid UUID)
RETURNS TABLE(
    workspace_id UUID,
    name VARCHAR(255),
    role VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT w.id, w.name, wm.role
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = user_uuid
    AND w.deleted_at IS NULL
    ORDER BY wm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Data Archival and Cleanup

### 5.1 Automated Cleanup Procedures

```sql
-- Archive old logs (keep 90 days)
CREATE OR REPLACE FUNCTION archive_old_logs() RETURNS void AS $$
BEGIN
    -- Move logs older than 90 days to archive
    INSERT INTO agent_run_logs_archive 
    SELECT * FROM agent_run_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Delete archived logs from main table
    DELETE FROM agent_run_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Vacuum the table
    PERFORM pg_advisory_lock(12345);
    VACUUM ANALYZE agent_run_logs;
    PERFORM pg_advisory_unlock(12345);
END;
$$ LANGUAGE plpgsql;

-- Cleanup soft-deleted records
CREATE OR REPLACE FUNCTION cleanup_soft_deleted() RETURNS void AS $$
BEGIN
    -- Permanently delete workspaces deleted > 30 days ago
    DELETE FROM workspaces 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
    
    -- Archive old card activities
    DELETE FROM card_activities 
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;
```

### 5.2 Scheduled Maintenance

```sql
-- Create maintenance schedule
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily log cleanup at 2 AM UTC
SELECT cron.schedule('archive-logs', '0 2 * * *', 'SELECT archive_old_logs();');

-- Weekly soft delete cleanup on Sundays at 3 AM UTC  
SELECT cron.schedule('cleanup-deleted', '0 3 * * 0', 'SELECT cleanup_soft_deleted();');

-- Monthly usage summary generation on 1st of month at 1 AM UTC
SELECT cron.schedule('usage-summaries', '0 1 1 * *', 'SELECT generate_monthly_usage_summaries();');
```

---

## 6. Performance Monitoring

### 6.1 Database Monitoring Views

```sql
-- View for monitoring query performance
CREATE VIEW query_performance_monitor AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC;

-- View for monitoring table sizes
CREATE VIEW table_size_monitor AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stats
JOIN pg_tables ON pg_stats.tablename = pg_tables.tablename
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- View for monitoring index usage
CREATE VIEW index_usage_monitor AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## 7. Backup and Recovery Strategy

### 7.1 Backup Configuration

```sql
-- Enable point-in-time recovery
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = 'gsutil cp %p gs://agentworks-backups-prod/wal-archive/%f';

-- Configure backup retention
ALTER SYSTEM SET recovery_target_time = '7 days';

-- Create backup user with minimal privileges
CREATE ROLE backup_user WITH LOGIN PASSWORD 'secure_backup_password';
GRANT CONNECT ON DATABASE agentworks TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

### 7.2 Recovery Procedures

```sql
-- Function to validate data integrity after recovery
CREATE OR REPLACE FUNCTION validate_data_integrity() RETURNS TABLE(
    table_name TEXT,
    issue_type TEXT,
    issue_count BIGINT
) AS $$
BEGIN
    -- Check for orphaned records
    RETURN QUERY
    SELECT 'cards'::TEXT, 'orphaned_cards'::TEXT, COUNT(*)
    FROM cards c
    LEFT JOIN boards b ON c.board_id = b.id
    WHERE b.id IS NULL;
    
    RETURN QUERY
    SELECT 'agent_runs'::TEXT, 'orphaned_runs'::TEXT, COUNT(*)
    FROM agent_runs ar
    LEFT JOIN cards c ON ar.card_id = c.id
    WHERE c.id IS NULL;
    
    -- Check referential integrity
    RETURN QUERY
    SELECT 'workspace_members'::TEXT, 'invalid_users'::TEXT, COUNT(*)
    FROM workspace_members wm
    LEFT JOIN users u ON wm.user_id = u.id
    WHERE u.id IS NULL;
END;
$$ LANGUAGE plpgsql;
```

This comprehensive database schema design provides a robust foundation for AgentWorks with strong multi-tenant isolation, performance optimization, comprehensive audit trails, and scalable cost tracking capabilities.