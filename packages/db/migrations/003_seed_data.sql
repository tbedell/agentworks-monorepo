-- AgentWorks Seed Data
-- Initial data for development and testing

-- =============================================
-- DEFAULT AGENTS CONFIGURATION
-- =============================================

-- Insert default agents based on AgentWorks specification
INSERT INTO agents (name, display_name, description, allowed_lanes, capabilities, default_provider, default_model, system_prompt) VALUES

-- Lane 0: Vision & CoPilot Planning
('ceo_copilot', 'CEO CoPilot Agent', 'Executive supervisor for entire project lifecycle', 
 ARRAY[0], ARRAY['project_management', 'strategic_planning', 'executive_oversight'], 
 'openai', 'gpt-4-turbo',
 'You are the CEO CoPilot Agent, responsible for maintaining project alignment with business objectives, generating executive summaries, and ensuring strategic coherence throughout the development process.'),

('strategy', 'Strategy Agent', 'Transform Q&A into coherent product strategy',
 ARRAY[0], ARRAY['strategic_analysis', 'market_research', 'competitive_analysis'],
 'openai', 'gpt-4-turbo',
 'You are the Strategy Agent, specialized in analyzing market opportunities, defining product positioning, and creating comprehensive strategic frameworks.'),

('storyboard_ux', 'Storyboard/UX Agent', 'Translate strategy into user flows and wireframes',
 ARRAY[0], ARRAY['ux_design', 'user_research', 'wireframing', 'user_journey_mapping'],
 'openai', 'gpt-4-turbo',
 'You are the UX/Storyboard Agent, focused on creating user-centered design solutions, wireframes, and comprehensive user journey maps.'),

-- Lane 1: PRD / MVP Definition  
('prd', 'PRD Agent', 'Generate and maintain Product Requirements Document',
 ARRAY[1], ARRAY['requirements_analysis', 'technical_writing', 'product_specification'],
 'openai', 'gpt-4-turbo',
 'You are the PRD Agent, responsible for creating comprehensive Product Requirements Documents that translate business strategy into detailed technical and functional specifications.'),

('mvp_scope', 'MVP Scope Agent', 'Define minimal viable product slice',
 ARRAY[1], ARRAY['scope_definition', 'feature_prioritization', 'mvp_planning'],
 'openai', 'gpt-4-turbo',
 'You are the MVP Scope Agent, specialized in identifying the minimal viable feature set that delivers maximum value to users while minimizing development complexity.'),

-- Lane 2: Research
('research', 'Research Agent', 'Perform external research and competitive analysis',
 ARRAY[2], ARRAY['web_research', 'competitive_analysis', 'technology_evaluation'],
 'openai', 'gpt-4-turbo',
 'You are the Research Agent, equipped with web browsing capabilities to conduct thorough market research, competitive analysis, and technology evaluation.'),

-- Lane 3: Architecture & Stack
('architect', 'Architect Agent', 'Design system architecture and choose tech stack',
 ARRAY[3], ARRAY['system_design', 'architecture_planning', 'technology_selection'],
 'anthropic', 'claude-3-5-sonnet-20241022',
 'You are the Architect Agent, responsible for designing scalable system architectures, selecting appropriate technologies, and creating implementation roadmaps.'),

-- Lane 4: Planning & Task Breakdown
('planner', 'Planner/Decomposition Agent', 'Break features into development tasks',
 ARRAY[4], ARRAY['task_decomposition', 'project_planning', 'dependency_mapping'],
 'openai', 'gpt-4-turbo',
 'You are the Planner Agent, specialized in breaking down complex features into manageable development tasks with clear acceptance criteria and dependencies.'),

-- Lanes 5-6: Scaffolding & Build
('devops', 'DevOps/Infrastructure Agent', 'Infrastructure-as-code, CI/CD, deployment configs',
 ARRAY[5, 6], ARRAY['infrastructure_automation', 'ci_cd', 'deployment', 'monitoring'],
 'anthropic', 'claude-3-5-sonnet-20241022',
 'You are the DevOps Agent, responsible for creating infrastructure as code, setting up CI/CD pipelines, and ensuring robust deployment and monitoring solutions.'),

('dev_backend', 'Backend Development Agent', 'Implement backend APIs and services',
 ARRAY[5, 6], ARRAY['backend_development', 'api_design', 'database_design', 'testing'],
 'anthropic', 'claude-3-5-sonnet-20241022',
 'You are the Backend Development Agent, specialized in building scalable APIs, implementing business logic, and ensuring robust backend architecture.'),

('dev_frontend', 'Frontend Development Agent', 'Implement frontend UI components',
 ARRAY[5, 6], ARRAY['frontend_development', 'ui_implementation', 'responsive_design', 'user_experience'],
 'anthropic', 'claude-3-5-sonnet-20241022',
 'You are the Frontend Development Agent, focused on creating intuitive user interfaces, implementing responsive designs, and ensuring excellent user experience.'),

-- Lane 7: Test & QA
('qa', 'QA Agent', 'Testing and quality assurance',
 ARRAY[7], ARRAY['test_planning', 'automated_testing', 'quality_assurance', 'bug_detection'],
 'anthropic', 'claude-3-5-sonnet-20241022',
 'You are the QA Agent, responsible for comprehensive testing strategies, automated test creation, and ensuring high-quality deliverables.'),

('troubleshooter', 'Troubleshooting Agent', 'Debug failing builds and tests',
 ARRAY[7], ARRAY['debugging', 'error_analysis', 'system_diagnosis', 'problem_solving'],
 'google', 'gemini-1.5-pro',
 'You are the Troubleshooting Agent, specialized in analyzing failures, diagnosing complex issues, and providing actionable solutions for technical problems.'),

-- Lane 8: Deploy
('deployment', 'Deployment Agent', 'Production deployment and monitoring',
 ARRAY[8], ARRAY['deployment_automation', 'production_monitoring', 'performance_optimization'],
 'anthropic', 'claude-3-5-sonnet-20241022',
 'You are the Deployment Agent, responsible for safe production deployments, monitoring system health, and ensuring optimal performance.'),

-- Lane 9: Docs & Training
('documentation', 'Documentation Agent', 'Generate comprehensive documentation',
 ARRAY[9], ARRAY['technical_writing', 'user_documentation', 'api_documentation'],
 'openai', 'gpt-4-turbo',
 'You are the Documentation Agent, specialized in creating clear, comprehensive documentation for users, developers, and administrators.'),

-- Lane 10: Learn & Optimize
('refactor', 'Refactor Agent', 'Improve code quality and performance',
 ARRAY[10], ARRAY['code_optimization', 'refactoring', 'performance_tuning', 'best_practices'],
 'anthropic', 'claude-3-5-sonnet-20241022',
 'You are the Refactor Agent, focused on improving code quality, optimizing performance, and implementing best practices while maintaining functionality.');

-- =============================================
-- DEFAULT LANE CONFIGURATIONS
-- =============================================

-- Function to create default board structure for new projects
CREATE OR REPLACE FUNCTION create_default_board_structure(project_uuid UUID, creator_uuid UUID)
RETURNS UUID AS $$
DECLARE
    board_uuid UUID;
    lane_configs JSON[] := ARRAY[
        '{"number": 0, "name": "Vision & CoPilot Planning", "color": "#8B5CF6", "wip_limit": null, "auto_trigger": "ceo_copilot"}',
        '{"number": 1, "name": "PRD / MVP Definition", "color": "#10B981", "wip_limit": 5, "auto_trigger": "prd"}',
        '{"number": 2, "name": "Research", "color": "#F59E0B", "wip_limit": 3, "auto_trigger": "research"}',
        '{"number": 3, "name": "Architecture & Stack", "color": "#EF4444", "wip_limit": 3, "auto_trigger": "architect"}',
        '{"number": 4, "name": "Planning & Task Breakdown", "color": "#3B82F6", "wip_limit": 5, "auto_trigger": "planner"}',
        '{"number": 5, "name": "Scaffolding", "color": "#6366F1", "wip_limit": 5, "auto_trigger": null}',
        '{"number": 6, "name": "Build", "color": "#8B5CF6", "wip_limit": 8, "auto_trigger": null}',
        '{"number": 7, "name": "Test & QA", "color": "#06B6D4", "wip_limit": 5, "auto_trigger": "qa"}',
        '{"number": 8, "name": "Deploy", "color": "#10B981", "wip_limit": 3, "auto_trigger": "deployment"}',
        '{"number": 9, "name": "Docs & Training", "color": "#F59E0B", "wip_limit": 3, "auto_trigger": "documentation"}',
        '{"number": 10, "name": "Learn & Optimize", "color": "#6B7280", "wip_limit": 2, "auto_trigger": "refactor"}'
    ];
    lane_config JSON;
BEGIN
    -- Create the board
    INSERT INTO boards (project_id, name, description, created_by, updated_by)
    VALUES (project_uuid, 'Development Board', 'Kanban board for development workflow', creator_uuid, creator_uuid)
    RETURNING id INTO board_uuid;
    
    -- Create lanes
    FOREACH lane_config IN ARRAY lane_configs
    LOOP
        INSERT INTO lanes (
            board_id, 
            lane_number, 
            name, 
            color, 
            wip_limit, 
            auto_trigger_agent, 
            position
        ) VALUES (
            board_uuid,
            (lane_config->>'number')::INTEGER,
            lane_config->>'name',
            lane_config->>'color',
            (lane_config->>'wip_limit')::INTEGER,
            lane_config->>'auto_trigger',
            (lane_config->>'number')::INTEGER
        );
    END LOOP;
    
    RETURN board_uuid;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DEVELOPMENT SEED DATA
-- =============================================

-- Create a development user (only for development environment)
DO $$
DECLARE
    dev_user_id UUID;
    dev_workspace_id UUID;
    dev_project_id UUID;
    dev_board_id UUID;
BEGIN
    -- Check if we're in development (this should be conditional based on environment)
    -- Insert development user
    INSERT INTO users (email, name, password_hash, email_verified, created_by, updated_by)
    VALUES ('dev@agentworks.com', 'Development User', '$argon2id$v=19$m=65536,t=3,p=4$dummy_hash', TRUE, NULL, NULL)
    RETURNING id INTO dev_user_id;
    
    -- Create development workspace
    INSERT INTO workspaces (name, description, slug, owner_id, billing_plan, max_projects, max_members, created_by, updated_by)
    VALUES ('Development Workspace', 'Default workspace for development', 'dev-workspace', dev_user_id, 'free', 10, 10, dev_user_id, dev_user_id)
    RETURNING id INTO dev_workspace_id;
    
    -- Add user to workspace
    INSERT INTO workspace_members (workspace_id, user_id, role, joined_at, created_by, updated_by)
    VALUES (dev_workspace_id, dev_user_id, 'owner', NOW(), dev_user_id, dev_user_id);
    
    -- Create development project
    INSERT INTO projects (workspace_id, name, description, slug, status, created_by, updated_by)
    VALUES (dev_workspace_id, 'Sample Project', 'A sample project for development and testing', 'sample-project', 'active', dev_user_id, dev_user_id)
    RETURNING id INTO dev_project_id;
    
    -- Create default board structure
    SELECT create_default_board_structure(dev_project_id, dev_user_id) INTO dev_board_id;
    
    -- Create sample cards
    INSERT INTO cards (board_id, lane_id, title, description, card_type, status, priority, created_by, updated_by)
    SELECT 
        dev_board_id,
        l.id,
        CASE l.lane_number
            WHEN 0 THEN 'Project Vision and Strategy'
            WHEN 1 THEN 'Define Product Requirements'
            WHEN 2 THEN 'Research Competitive Landscape'
            WHEN 3 THEN 'Design System Architecture'
            WHEN 4 THEN 'Break Down Development Tasks'
            WHEN 5 THEN 'Setup Development Environment'
            WHEN 6 THEN 'Implement Core Features'
            WHEN 7 THEN 'Comprehensive Testing'
            WHEN 8 THEN 'Production Deployment'
            WHEN 9 THEN 'User Documentation'
            WHEN 10 THEN 'Performance Optimization'
        END,
        CASE l.lane_number
            WHEN 0 THEN 'Define the overall vision, goals, and strategic direction for the project.'
            WHEN 1 THEN 'Create detailed product requirements document with feature specifications.'
            WHEN 2 THEN 'Analyze competitors and market trends to inform product decisions.'
            WHEN 3 THEN 'Design scalable system architecture and technology stack.'
            WHEN 4 THEN 'Decompose features into manageable development tasks with clear acceptance criteria.'
            WHEN 5 THEN 'Setup development environment, CI/CD pipeline, and infrastructure.'
            WHEN 6 THEN 'Implement core application features and functionality.'
            WHEN 7 THEN 'Develop and execute comprehensive testing strategy.'
            WHEN 8 THEN 'Deploy application to production environment with monitoring.'
            WHEN 9 THEN 'Create user guides, API documentation, and training materials.'
            WHEN 10 THEN 'Optimize performance and refactor code for maintainability.'
        END,
        CASE l.lane_number
            WHEN 0 THEN 'blueprint'
            WHEN 1 THEN 'doc'
            WHEN 2 THEN 'task'
            WHEN 3 THEN 'epic'
            WHEN 4 THEN 'task'
            ELSE 'feature'
        END,
        'draft',
        CASE l.lane_number
            WHEN 0 THEN 'critical'
            WHEN 1 THEN 'high'
            WHEN 2 THEN 'medium'
            ELSE 'medium'
        END,
        dev_user_id,
        dev_user_id
    FROM lanes l 
    WHERE l.board_id = dev_board_id
    ORDER BY l.lane_number;
    
    -- Create billing account for development workspace
    INSERT INTO billing_accounts (workspace_id, billing_email, status)
    VALUES (dev_workspace_id, 'billing@agentworks.com', 'active');
    
    RAISE NOTICE 'Development seed data created successfully';
    RAISE NOTICE 'Development user ID: %', dev_user_id;
    RAISE NOTICE 'Development workspace ID: %', dev_workspace_id;
    RAISE NOTICE 'Development project ID: %', dev_project_id;
    RAISE NOTICE 'Development board ID: %', dev_board_id;
    
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Development seed data already exists, skipping creation';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating development seed data: %', SQLERRM;
END;
$$;

-- =============================================
-- DATA VALIDATION AND INTEGRITY CHECKS
-- =============================================

-- Function to validate database integrity
CREATE OR REPLACE FUNCTION validate_database_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check agent configurations
    RETURN QUERY
    SELECT 
        'agent_count'::TEXT,
        CASE WHEN COUNT(*) >= 15 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        FORMAT('Found %s agents (expected at least 15)', COUNT(*))::TEXT
    FROM agents;
    
    -- Check lane configurations
    RETURN QUERY
    SELECT 
        'default_lanes'::TEXT,
        CASE WHEN COUNT(DISTINCT lane_number) = 11 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        FORMAT('Found %s unique lanes (expected 11: 0-10)', COUNT(DISTINCT lane_number))::TEXT
    FROM lanes;
    
    -- Check development workspace
    RETURN QUERY
    SELECT 
        'dev_workspace'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        FORMAT('Found %s development workspaces', COUNT(*))::TEXT
    FROM workspaces WHERE slug = 'dev-workspace';
    
    -- Check foreign key relationships
    RETURN QUERY
    SELECT 
        'orphaned_cards'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        FORMAT('Found %s orphaned cards', COUNT(*))::TEXT
    FROM cards c
    LEFT JOIN boards b ON c.board_id = b.id
    WHERE b.id IS NULL;
    
    RETURN QUERY
    SELECT 
        'orphaned_projects'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        FORMAT('Found %s orphaned projects', COUNT(*))::TEXT
    FROM projects p
    LEFT JOIN workspaces w ON p.workspace_id = w.id
    WHERE w.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Run integrity check
SELECT * FROM validate_database_integrity();

-- Add helpful views for development
CREATE VIEW active_workspaces AS
SELECT 
    w.*,
    u.name as owner_name,
    (SELECT COUNT(*) FROM projects p WHERE p.workspace_id = w.id AND p.status = 'active') as active_projects,
    (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) as member_count
FROM workspaces w
JOIN users u ON w.owner_id = u.id
WHERE w.status = 'active' AND w.deleted_at IS NULL;

CREATE VIEW project_summary AS
SELECT 
    p.*,
    w.name as workspace_name,
    (SELECT COUNT(*) FROM cards c JOIN boards b ON c.board_id = b.id WHERE b.project_id = p.id) as total_cards,
    (SELECT COUNT(*) FROM cards c JOIN boards b ON c.board_id = b.id WHERE b.project_id = p.id AND c.status = 'done') as completed_cards
FROM projects p
JOIN workspaces w ON p.workspace_id = w.id
WHERE p.status = 'active';

-- Add comments
COMMENT ON FUNCTION create_default_board_structure IS 'Creates the standard 11-lane AgentWorks board structure for new projects';
COMMENT ON FUNCTION validate_database_integrity IS 'Validates database integrity and reports any issues';
COMMENT ON VIEW active_workspaces IS 'Summary view of active workspaces with member and project counts';
COMMENT ON VIEW project_summary IS 'Summary view of projects with card completion statistics';