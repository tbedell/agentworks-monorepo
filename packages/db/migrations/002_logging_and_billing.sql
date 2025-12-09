-- AgentWorks Logging and Billing Schema
-- Part 2: Comprehensive logging, usage tracking, and billing

-- =============================================
-- LOGGING AND MONITORING SCHEMA
-- =============================================

-- Detailed logs for agent runs
CREATE TABLE agent_run_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    
    -- Log entry details
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    log_level VARCHAR(10) NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
    source VARCHAR(50) DEFAULT 'agent', -- 'agent', 'orchestrator', 'provider'
    
    -- Message content
    message TEXT NOT NULL,
    structured_data JSONB, -- Additional structured log data
    
    -- Context
    operation VARCHAR(100), -- 'prompt_construction', 'llm_call', 'result_processing'
    correlation_id UUID, -- For tracing across services
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
);

-- Card activity log for detailed audit trail
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
);

-- =============================================
-- USAGE TRACKING AND BILLING SCHEMA
-- =============================================

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
);

-- Pre-aggregated usage summaries for faster billing
CREATE TABLE usage_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    project_id UUID REFERENCES projects(id), -- NULL for workspace-level summary
    
    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
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
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'suspended')),
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
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
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

-- =============================================
-- DOCUMENT MANAGEMENT SCHEMA
-- =============================================

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
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
    
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
    
    UNIQUE(project_id, document_type, version)
);

-- Add full-text search for documents
ALTER TABLE project_documents ADD COLUMN search_vector TSVECTOR 
GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED;

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

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Agent run logs indexes
CREATE INDEX idx_agent_run_logs_run_id ON agent_run_logs(run_id, timestamp);
CREATE INDEX idx_agent_run_logs_timestamp ON agent_run_logs(timestamp);
CREATE INDEX idx_agent_run_logs_level ON agent_run_logs(log_level);

-- Audit log indexes
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_workspace ON audit_log(workspace_id, created_at);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id, created_at);

-- Card activities indexes
CREATE INDEX idx_card_activities_card ON card_activities(card_id, created_at DESC);
CREATE INDEX idx_card_activities_user ON card_activities(user_id, created_at DESC);

-- Usage events indexes
CREATE INDEX idx_usage_events_workspace_period ON usage_events(workspace_id, billing_period);
CREATE INDEX idx_usage_events_project ON usage_events(project_id, event_time);
CREATE INDEX idx_usage_events_run ON usage_events(run_id);
CREATE INDEX idx_usage_events_time ON usage_events(event_time);

-- Usage summaries indexes
CREATE INDEX idx_usage_summaries_workspace ON usage_summaries(workspace_id, period_start);
CREATE INDEX idx_usage_summaries_project ON usage_summaries(project_id, period_start) WHERE project_id IS NOT NULL;

-- Billing indexes
CREATE INDEX idx_billing_accounts_workspace ON billing_accounts(workspace_id);
CREATE INDEX idx_invoices_workspace ON invoices(workspace_id, period_start);
CREATE INDEX idx_invoices_status ON invoices(status, due_date);

-- Document indexes
CREATE INDEX idx_project_documents_project ON project_documents(project_id, document_type);
CREATE INDEX idx_project_documents_search ON project_documents USING gin(search_vector);
CREATE INDEX idx_document_revisions_document ON document_revisions(document_id, created_at);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspace_members_updated_at BEFORE UPDATE ON workspace_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lanes_updated_at BEFORE UPDATE ON lanes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_configs_updated_at BEFORE UPDATE ON agent_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_runs_updated_at BEFORE UPDATE ON agent_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_summaries_updated_at BEFORE UPDATE ON usage_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_accounts_updated_at BEFORE UPDATE ON billing_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_documents_updated_at BEFORE UPDATE ON project_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (entity_type, entity_id, action, actor_id, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'create', NEW.created_by, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (entity_type, entity_id, action, actor_id, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'update', NEW.updated_by, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (entity_type, entity_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers for key tables
CREATE TRIGGER audit_workspaces AFTER INSERT OR UPDATE OR DELETE ON workspaces FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON projects FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_cards AFTER INSERT OR UPDATE OR DELETE ON cards FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Add table comments
COMMENT ON TABLE agent_run_logs IS 'Detailed logs for agent execution runs';
COMMENT ON TABLE audit_log IS 'System-wide audit trail for all entity changes';
COMMENT ON TABLE card_activities IS 'Detailed activity log for card changes';
COMMENT ON TABLE usage_events IS 'Individual usage events for billing calculation';
COMMENT ON TABLE usage_summaries IS 'Pre-aggregated usage data for performance';
COMMENT ON TABLE billing_accounts IS 'Billing account information per workspace';
COMMENT ON TABLE invoices IS 'Generated invoices with payment tracking';
COMMENT ON TABLE project_documents IS 'Project documentation with versioning';
COMMENT ON TABLE document_revisions IS 'Change tracking for document versions';