-- AgentWorks Initial Database Schema
-- Multi-tenant SaaS platform with comprehensive audit trails

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create enum types
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE workspace_status AS ENUM ('active', 'suspended', 'cancelled');
CREATE TYPE project_status AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE card_type AS ENUM ('epic', 'feature', 'task', 'bug', 'blueprint', 'doc');
CREATE TYPE card_status AS ENUM ('draft', 'ready', 'in_progress', 'blocked', 'done');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE agent_run_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE billing_plan AS ENUM ('free', 'pro', 'enterprise');

-- =============================================
-- USER MANAGEMENT & AUTHENTICATION
-- =============================================

-- Core user entity
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

-- =============================================
-- MULTI-TENANT WORKSPACE MANAGEMENT
-- =============================================

-- Workspace entity with billing configuration
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
    owner_id UUID NOT NULL REFERENCES users(id),
    
    -- Billing configuration
    billing_plan billing_plan DEFAULT 'free',
    billing_email VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    billing_address JSONB,
    
    -- Feature flags and limits
    settings JSONB DEFAULT '{}',
    max_projects INTEGER DEFAULT 3,
    max_members INTEGER DEFAULT 5,
    max_monthly_usage DECIMAL(10,2) DEFAULT 100.00, -- Usage limit in USD
    
    -- Status and timestamps
    status workspace_status DEFAULT 'active',
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
    role user_role DEFAULT 'member',
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
    role user_role DEFAULT 'member',
    invited_by UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(workspace_id, email)
);

-- =============================================
-- PROJECT AND BOARD MANAGEMENT
-- =============================================

-- Projects within workspaces
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(100) NOT NULL, -- URL-friendly, unique within workspace
    
    -- Project configuration
    status project_status DEFAULT 'active',
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

-- =============================================
-- CARD MANAGEMENT SYSTEM
-- =============================================

-- Cards (work items) within boards
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    lane_id UUID NOT NULL REFERENCES lanes(id),
    parent_id UUID REFERENCES cards(id), -- For hierarchical cards
    
    -- Core card data
    title VARCHAR(500) NOT NULL,
    description TEXT,
    card_type card_type NOT NULL,
    
    -- Status and priority
    status card_status DEFAULT 'draft',
    priority priority_level DEFAULT 'medium',
    
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
    updated_by UUID REFERENCES users(id)
);

-- Add full-text search column for cards
ALTER TABLE cards ADD COLUMN search_vector TSVECTOR 
GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || COALESCE(description, ''))) STORED;

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

-- =============================================
-- AGENT SYSTEM SCHEMA
-- =============================================

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
    status agent_run_status DEFAULT 'pending',
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
);

-- =============================================
-- CONTINUE IN NEXT MIGRATION...
-- =============================================

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_status ON workspaces(status);

CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);

CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX idx_projects_slug ON projects(workspace_id, slug);

CREATE INDEX idx_boards_project_id ON boards(project_id);

CREATE INDEX idx_lanes_board_id ON lanes(board_id);
CREATE INDEX idx_lanes_lane_number ON lanes(board_id, lane_number);

CREATE INDEX idx_cards_board_id ON cards(board_id);
CREATE INDEX idx_cards_lane_id ON cards(lane_id, position);
CREATE INDEX idx_cards_assignee_id ON cards(assignee_id);
CREATE INDEX idx_cards_search_vector ON cards USING gin(search_vector);

CREATE INDEX idx_agent_runs_card_id ON agent_runs(card_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_created_at ON agent_runs(created_at);

-- Create comments for documentation
COMMENT ON TABLE users IS 'Core user accounts and authentication';
COMMENT ON TABLE workspaces IS 'Multi-tenant workspace containers';
COMMENT ON TABLE projects IS 'Projects within workspaces';
COMMENT ON TABLE cards IS 'Kanban cards with full-text search';
COMMENT ON TABLE agents IS 'AI agent definitions and configurations';
COMMENT ON TABLE agent_runs IS 'Individual agent execution instances';