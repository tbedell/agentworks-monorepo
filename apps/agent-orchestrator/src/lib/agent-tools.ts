/**
 * Agent Tool Assignments
 *
 * Defines the tools available to each agent in the AgentWorks platform.
 * Tool assignments are based on agent responsibilities and lane permissions.
 */

import type { AgentName } from '@agentworks/shared';

// Tool categories for easier management
export const TOOL_CATEGORIES = {
  file: ['read_file', 'write_file', 'update_file', 'list_files', 'delete_file'],
  git: [
    'git_status',
    'git_diff',
    'git_log',
    'git_commit',
    'git_push',
    'git_pull',
    'git_create_branch',
    'git_list_branches',
    'git_checkout',
    'create_pr',
  ],
  code: ['run_tests', 'run_linter', 'run_typecheck', 'run_build'],
  search: ['grep', 'find_files', 'search_symbol'],
  kanban: ['update_kanban_card', 'append_card_todo', 'complete_card_todo'],
  docs: ['update_docs'],
  builder: [
    'update_ui_builder_state',
    'update_db_builder_state',
    'update_workflow_builder_state',
  ],
  summary: ['log_run_summary'],
  // WordPress-specific tools for CMS development
  wordpress: [
    'wp_cli',
    'wp_scaffold_theme',
    'wp_scaffold_plugin',
    'wp_scaffold_block',
    'wp_check_standards',
    'wp_deploy',
  ],
  // Document storage tools for cross-agent collaboration
  document: [
    'publish_brief',
    'read_agent_briefs',
    'list_agent_documents',
    'share_document',
    'get_peer_registry',
  ],
} as const;

// Helper to get all tools from specified categories
function getToolsFromCategories(
  ...categories: (keyof typeof TOOL_CATEGORIES)[]
): string[] {
  return categories.flatMap((cat) => [...TOOL_CATEGORIES[cat]]);
}

// All tools combined
const ALL_TOOLS = [
  ...TOOL_CATEGORIES.file,
  ...TOOL_CATEGORIES.git,
  ...TOOL_CATEGORIES.code,
  ...TOOL_CATEGORIES.search,
  ...TOOL_CATEGORIES.kanban,
  ...TOOL_CATEGORIES.docs,
  ...TOOL_CATEGORIES.builder,
  ...TOOL_CATEGORIES.summary,
  ...TOOL_CATEGORIES.wordpress,
  ...TOOL_CATEGORIES.document,
];

// Partial tool sets for specific use cases
const FILE_READ_ONLY = ['read_file', 'list_files'];
const FILE_READ_WRITE = ['read_file', 'write_file', 'update_file', 'list_files'];
const GIT_READ_ONLY = ['git_status', 'git_diff', 'git_log'];
const GIT_FULL = [...TOOL_CATEGORIES.git];
const SEARCH_ALL = [...TOOL_CATEGORIES.search];
const KANBAN_UPDATE = ['update_kanban_card'];
const KANBAN_ALL = [...TOOL_CATEGORIES.kanban];
const CODE_LINT_TYPE = ['run_linter', 'run_typecheck'];
const CODE_ALL = [...TOOL_CATEGORIES.code];

/**
 * Tool assignment matrix for all 17 agents
 * Each agent gets tools appropriate for their responsibilities
 */
export const AGENT_TOOL_ASSIGNMENTS: Record<AgentName, string[]> = {
  // === Lane 0: Vision & Planning ===

  ceo_copilot: [
    ...FILE_READ_WRITE,
    ...GIT_READ_ONLY,
    ...SEARCH_ALL,
    ...KANBAN_ALL,
    ...TOOL_CATEGORIES.docs,
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
    'update_ui_builder_state', // All agents can generate mockups
  ],

  strategy: [
    ...FILE_READ_WRITE,
    'grep',
    'find_files',
    ...KANBAN_UPDATE,
    ...TOOL_CATEGORIES.docs,
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
    'update_ui_builder_state', // All agents can generate mockups
  ],

  storyboard_ux: [
    ...FILE_READ_WRITE,
    'grep',
    'find_files',
    ...KANBAN_ALL,
    ...TOOL_CATEGORIES.docs,
    'update_ui_builder_state',
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
  ],

  // === Lane 1: PRD / MVP Definition ===

  prd: [
    ...FILE_READ_WRITE,
    ...SEARCH_ALL,
    ...KANBAN_ALL,
    ...TOOL_CATEGORIES.docs,
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
    'update_ui_builder_state', // All agents can generate mockups
  ],

  mvp_scope: [
    ...FILE_READ_WRITE,
    'grep',
    'find_files',
    ...KANBAN_ALL,
    ...TOOL_CATEGORIES.docs,
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
    'update_ui_builder_state', // All agents can generate mockups
  ],

  // === Lane 2: Research ===

  research: [
    ...FILE_READ_ONLY,
    ...SEARCH_ALL,
    ...KANBAN_UPDATE,
    ...TOOL_CATEGORIES.docs,
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
    'update_ui_builder_state', // All agents can generate mockups
  ],

  // === Lane 3: Architecture & Stack ===

  architect: [
    ...TOOL_CATEGORIES.file,
    ...GIT_READ_ONLY,
    'run_typecheck',
    ...SEARCH_ALL,
    ...KANBAN_ALL,
    ...TOOL_CATEGORIES.docs,
    'update_db_builder_state',
    'update_workflow_builder_state', // Workflow design capability
    'update_ui_builder_state', // All agents can generate mockups
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
  ],

  planner: [
    ...FILE_READ_WRITE,
    ...GIT_READ_ONLY,
    ...SEARCH_ALL,
    ...KANBAN_ALL,
    ...TOOL_CATEGORIES.docs,
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
    'update_ui_builder_state', // All agents can generate mockups
  ],

  code_standards: [
    ...FILE_READ_WRITE,
    'git_status',
    'git_diff',
    ...CODE_LINT_TYPE,
    ...SEARCH_ALL,
    ...KANBAN_UPDATE,
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
    'update_ui_builder_state', // All agents can generate mockups
  ],

  // === Lanes 5-6: Scaffolding & Build ===

  dev_backend: [
    ...TOOL_CATEGORIES.file,
    ...GIT_FULL,
    ...CODE_ALL,
    ...SEARCH_ALL,
    ...KANBAN_ALL,
    'update_db_builder_state',
    'update_ui_builder_state', // All agents can generate mockups
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
  ],

  dev_frontend: [
    ...TOOL_CATEGORIES.file,
    ...GIT_FULL,
    ...CODE_ALL,
    ...SEARCH_ALL,
    ...KANBAN_ALL,
    'update_ui_builder_state',
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
  ],

  devops: [
    ...TOOL_CATEGORIES.file,
    ...GIT_FULL,
    ...CODE_ALL,
    'grep',
    'find_files',
    ...KANBAN_ALL,
    ...TOOL_CATEGORIES.docs,
    'update_workflow_builder_state',
    'update_ui_builder_state', // All agents can generate mockups
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
  ],

  // === Lane 7: Test & QA ===

  qa: [
    ...TOOL_CATEGORIES.file,
    ...GIT_READ_ONLY,
    ...CODE_ALL,
    ...SEARCH_ALL,
    ...KANBAN_ALL,
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
    'update_ui_builder_state', // All agents can generate mockups
  ],

  troubleshooter: [
    ...FILE_READ_ONLY,
    ...GIT_READ_ONLY,
    ...CODE_ALL,
    ...SEARCH_ALL,
    ...KANBAN_UPDATE,
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
    'update_ui_builder_state', // All agents can generate mockups
  ],

  // === Lane 9: Docs & Training ===

  docs: [
    ...FILE_READ_WRITE,
    ...GIT_READ_ONLY,
    ...SEARCH_ALL,
    ...KANBAN_UPDATE,
    ...TOOL_CATEGORIES.docs,
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
    'update_ui_builder_state', // All agents can generate mockups
  ],

  // === Lane 10: Learn & Optimize ===

  refactor: [
    ...TOOL_CATEGORIES.file,
    ...GIT_FULL,
    ...CODE_ALL,
    ...SEARCH_ALL,
    ...KANBAN_UPDATE,
    ...TOOL_CATEGORIES.summary,
    ...TOOL_CATEGORIES.document,
    'update_ui_builder_state', // All agents can generate mockups
  ],

  // === Full-featured Claude Code Agent ===

  claude_code_agent: [...ALL_TOOLS],

  // === WordPress CMS Agent ===
  // Full-stack WordPress development with all necessary tools

  cms_wordpress: [
    ...TOOL_CATEGORIES.file,       // Full file access for theme/plugin development
    ...GIT_FULL,                   // Full git access for version control
    ...CODE_ALL,                   // Code quality tools (tests, linting, builds)
    ...SEARCH_ALL,                 // Search capabilities
    ...TOOL_CATEGORIES.wordpress,  // WordPress-specific tools (wp-cli, scaffolding, PHPCS)
    ...KANBAN_ALL,                 // Kanban management
    ...TOOL_CATEGORIES.docs,       // Documentation
    ...TOOL_CATEGORIES.summary,    // Summary logging
    ...TOOL_CATEGORIES.document,   // Cross-agent document collaboration
    'update_ui_builder_state',     // All agents can generate mockups
  ],

  // === Design UX Agent ===
  // Visual design with workflow and UI builder capabilities

  design_ux: [
    ...FILE_READ_WRITE,            // File operations for design docs
    ...SEARCH_ALL,                 // Search capabilities
    ...KANBAN_ALL,                 // Kanban management
    'update_workflow_builder_state', // Primary: workflow design
    'update_ui_builder_state',       // Primary: UI mockups
    ...TOOL_CATEGORIES.docs,       // Documentation
    ...TOOL_CATEGORIES.summary,    // Summary logging
    ...TOOL_CATEGORIES.document,   // Cross-agent document collaboration
  ],
};

/**
 * Get tools for a specific agent
 */
export function getAgentTools(agentName: AgentName): string[] {
  return AGENT_TOOL_ASSIGNMENTS[agentName] || [];
}

/**
 * Check if an agent has access to a specific tool
 */
export function agentHasTool(agentName: AgentName, toolName: string): boolean {
  const tools = AGENT_TOOL_ASSIGNMENTS[agentName];
  return tools ? tools.includes(toolName) : false;
}

/**
 * Get all agents that have access to a specific tool
 */
export function getAgentsWithTool(toolName: string): AgentName[] {
  return (Object.entries(AGENT_TOOL_ASSIGNMENTS) as [AgentName, string[]][])
    .filter(([, tools]) => tools.includes(toolName))
    .map(([name]) => name);
}
