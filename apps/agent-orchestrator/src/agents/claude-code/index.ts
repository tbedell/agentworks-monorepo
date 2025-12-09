/**
 * Claude Code Agent Module
 *
 * Exports the system prompt and configuration for the Claude Code Agent,
 * a full-featured coding agent with tool-calling capabilities.
 */

export { CLAUDE_CODE_SYSTEM_PROMPT, default as claudeCodeSystemPrompt } from './system-prompt.js';

/**
 * Claude Code Agent configuration for the agent registry
 */
export const CLAUDE_CODE_AGENT_CONFIG = {
  name: 'claude_code_agent' as const,
  displayName: 'Claude Code Agent',
  description: 'Full-featured coding agent with file, terminal, docs, and Kanban integration',
  allowedLanes: [0, 1, 2, 3, 4, 5, 6], // Allowed in all lanes
  defaultProvider: 'anthropic' as const,
  defaultModel: 'claude-sonnet-4-20250514',
  temperature: 0.2, // Lower temperature for more deterministic code generation
  maxTokens: 16384, // Higher token limit for complex code tasks
  maxIterations: 10, // Maximum tool-calling iterations
  tools: [
    'read_file',
    'write_file',
    'list_files',
    'run_command',
    'update_docs',
    'update_kanban_card',
    'append_card_todo',
    'complete_card_todo',
    'update_ui_builder_state',
    'update_db_builder_state',
    'update_workflow_builder_state',
    'log_run_summary',
  ],
} as const;

export type ClaudeCodeAgentTool = (typeof CLAUDE_CODE_AGENT_CONFIG.tools)[number];
