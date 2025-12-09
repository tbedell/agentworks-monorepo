/**
 * Claude Code Agent Tools
 *
 * This module provides the 12 tools available to the Claude Code Agent:
 * - MCP-based: read_file, write_file, list_files, run_command
 * - REST API: update_docs, update_kanban_card, append_card_todo, complete_card_todo,
 *             update_ui_builder_state, update_db_builder_state, update_workflow_builder_state,
 *             log_run_summary
 */

import { createLogger } from '@agentworks/shared';
import type { AgentTool, ToolContext, ToolResult } from '../../types.js';

const logger = createLogger('agent-tools:claude-code');

// Type guard for error objects
interface ApiError {
  error?: string;
}

// Type helpers for API responses
interface FileReadResponse {
  content: string;
  size?: number;
}

interface FileWriteResponse {
  created?: boolean;
}

interface FileListResponse {
  entries: Array<{ name: string; type: string }>;
}

interface CommandResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface DocUpdateResponse {
  updatedAt: string;
}

interface CardResponse {
  id: string;
  title?: string;
  status?: string;
  [key: string]: unknown;
}

interface TodoResponse {
  todo: {
    id: string;
    completedAt?: string;
    [key: string]: unknown;
  };
}

interface BuilderStateResponse {
  builderState: {
    version: number;
    [key: string]: unknown;
  };
}

interface RunSummaryResponse {
  runSummary: {
    id: string;
    [key: string]: unknown;
  };
}

function getErrorMessage(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const errorObj = data as ApiError;
    return errorObj.error || 'Unknown error';
  }
  return 'Unknown error';
}

// Extended context for Claude Code Agent tools
export interface ClaudeCodeToolContext extends ToolContext {
  mcpEndpoints?: {
    filesystem?: string;
    terminal?: string;
    git?: string;
  };
  apiBaseUrl: string;
  authToken?: string;
}

// ============================================
// MCP Filesystem Tools
// ============================================

export const mcpReadFileTool: AgentTool = {
  name: 'read_file',
  description:
    'Read a file from the project workspace. Returns file content as string. Use for source code, config files, documentation.',
  category: 'claude-code',
  allowedAgents: ['claude_code_agent'],
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Relative path to the file in the workspace (e.g., "src/index.ts")',
      required: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const ctx = context as ClaudeCodeToolContext;
    const path = args.path as string;

    if (!path) {
      return { success: false, error: 'path is required' };
    }

    try {
      // MCP filesystem call - will be implemented by MCP client
      const mcpEndpoint = ctx.mcpEndpoints?.filesystem;
      if (!mcpEndpoint) {
        // Fallback to REST API for now
        const response = await fetch(`${ctx.apiBaseUrl}/projects/${ctx.projectId}/files/read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ctx.authToken && { Authorization: `Bearer ${ctx.authToken}` }),
          },
          body: JSON.stringify({ path }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to read file' }));
          return { success: false, error: getErrorMessage(errorData) || 'Failed to read file' };
        }

        const data = (await response.json()) as FileReadResponse;
        return {
          success: true,
          data: { path, content: data.content, size: data.size },
        };
      }

      // MCP protocol call (placeholder for when MCP client is integrated)
      logger.info('MCP read_file call', { path, projectId: ctx.projectId });
      return {
        success: false,
        error: 'MCP filesystem server not connected - use REST API fallback',
      };
    } catch (error) {
      logger.error('read_file failed', { path, error: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, error: error instanceof Error ? error.message : 'Failed to read file' };
    }
  },
};

export const mcpWriteFileTool: AgentTool = {
  name: 'write_file',
  description:
    'Write content to a file in the project workspace. Creates file if it does not exist, overwrites if it does. Creates parent directories as needed.',
  category: 'claude-code',
  allowedAgents: ['claude_code_agent'],
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Relative path to the file in the workspace (e.g., "src/utils/helper.ts")',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'The content to write to the file',
      required: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const ctx = context as ClaudeCodeToolContext;
    const path = args.path as string;
    const content = args.content as string;

    if (!path) {
      return { success: false, error: 'path is required' };
    }
    if (content === undefined || content === null) {
      return { success: false, error: 'content is required' };
    }

    try {
      const mcpEndpoint = ctx.mcpEndpoints?.filesystem;
      if (!mcpEndpoint) {
        // Fallback to REST API
        const response = await fetch(`${ctx.apiBaseUrl}/projects/${ctx.projectId}/files/write`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ctx.authToken && { Authorization: `Bearer ${ctx.authToken}` }),
          },
          body: JSON.stringify({ path, content }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to write file' }));
          return { success: false, error: getErrorMessage(errorData) || 'Failed to write file' };
        }

        const data = (await response.json()) as FileWriteResponse;
        return {
          success: true,
          data: { path, size: content.length, created: data.created },
        };
      }

      logger.info('MCP write_file call', { path, projectId: ctx.projectId });
      return {
        success: false,
        error: 'MCP filesystem server not connected - use REST API fallback',
      };
    } catch (error) {
      logger.error('write_file failed', { path, error: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, error: error instanceof Error ? error.message : 'Failed to write file' };
    }
  },
};

export const mcpListFilesTool: AgentTool = {
  name: 'list_files',
  description:
    'List files and directories in the project workspace. Returns array of file/directory entries with names and types.',
  category: 'claude-code',
  allowedAgents: ['claude_code_agent'],
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Relative path to the directory to list (default: project root)',
      required: false,
      default: '.',
    },
    {
      name: 'recursive',
      type: 'boolean',
      description: 'Whether to list files recursively (default: false)',
      required: false,
      default: false,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const ctx = context as ClaudeCodeToolContext;
    const path = (args.path as string) || '.';
    const recursive = (args.recursive as boolean) || false;

    try {
      const mcpEndpoint = ctx.mcpEndpoints?.filesystem;
      if (!mcpEndpoint) {
        // Fallback to REST API
        const response = await fetch(`${ctx.apiBaseUrl}/projects/${ctx.projectId}/files/list`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ctx.authToken && { Authorization: `Bearer ${ctx.authToken}` }),
          },
          body: JSON.stringify({ path, recursive }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to list files' }));
          return { success: false, error: getErrorMessage(errorData) || 'Failed to list files' };
        }

        const data = (await response.json()) as FileListResponse;
        return {
          success: true,
          data: { path, entries: data.entries },
        };
      }

      logger.info('MCP list_files call', { path, recursive, projectId: ctx.projectId });
      return {
        success: false,
        error: 'MCP filesystem server not connected - use REST API fallback',
      };
    } catch (error) {
      logger.error('list_files failed', { path, error: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list files' };
    }
  },
};

// ============================================
// MCP Terminal Tool
// ============================================

export const mcpRunCommandTool: AgentTool = {
  name: 'run_command',
  description:
    'Execute a shell command in the project workspace. Returns stdout, stderr, and exit code. Use for build, test, install commands.',
  category: 'claude-code',
  allowedAgents: ['claude_code_agent'],
  parameters: [
    {
      name: 'command',
      type: 'string',
      description: 'The shell command to execute (e.g., "npm install", "npm run build")',
      required: true,
    },
    {
      name: 'cwd',
      type: 'string',
      description: 'Working directory relative to project root (default: project root)',
      required: false,
      default: '.',
    },
    {
      name: 'timeout',
      type: 'number',
      description: 'Timeout in milliseconds (default: 120000)',
      required: false,
      default: 120000,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const ctx = context as ClaudeCodeToolContext;
    const command = args.command as string;
    const cwd = (args.cwd as string) || '.';
    const timeout = (args.timeout as number) || 120000;

    if (!command) {
      return { success: false, error: 'command is required' };
    }

    try {
      const mcpEndpoint = ctx.mcpEndpoints?.terminal;
      if (!mcpEndpoint) {
        // Fallback to REST API
        const response = await fetch(`${ctx.apiBaseUrl}/projects/${ctx.projectId}/terminal/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ctx.authToken && { Authorization: `Bearer ${ctx.authToken}` }),
          },
          body: JSON.stringify({ command, cwd, timeout }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to execute command' }));
          return { success: false, error: getErrorMessage(errorData) || 'Failed to execute command' };
        }

        const data = (await response.json()) as CommandResponse;
        return {
          success: data.exitCode === 0,
          data: {
            stdout: data.stdout,
            stderr: data.stderr,
            exitCode: data.exitCode,
          },
          error: data.exitCode !== 0 ? `Command exited with code ${data.exitCode}` : undefined,
        };
      }

      logger.info('MCP run_command call', { command, cwd, projectId: ctx.projectId });
      return {
        success: false,
        error: 'MCP terminal server not connected - use REST API fallback',
      };
    } catch (error) {
      logger.error('run_command failed', { command, error: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, error: error instanceof Error ? error.message : 'Failed to execute command' };
    }
  },
};

// ============================================
// REST API Tools - Project Docs
// ============================================

export const updateDocsTool: AgentTool = {
  name: 'update_docs',
  description:
    'Update a project document (Blueprint, PRD, MVP, or Playbook). Replaces the entire document content.',
  category: 'claude-code',
  allowedAgents: ['claude_code_agent'],
  parameters: [
    {
      name: 'doc_type',
      type: 'string',
      description: 'The type of document to update',
      required: true,
      enum: ['blueprint', 'prd', 'mvp', 'playbook'],
    },
    {
      name: 'content',
      type: 'string',
      description: 'The new content for the document (Markdown format)',
      required: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const ctx = context as ClaudeCodeToolContext;
    const docType = args.doc_type as string;
    const content = args.content as string;

    if (!docType) {
      return { success: false, error: 'doc_type is required' };
    }
    if (!content) {
      return { success: false, error: 'content is required' };
    }

    const validDocTypes = ['blueprint', 'prd', 'mvp', 'playbook'];
    if (!validDocTypes.includes(docType)) {
      return { success: false, error: `Invalid doc_type. Must be one of: ${validDocTypes.join(', ')}` };
    }

    try {
      const response = await fetch(`${ctx.apiBaseUrl}/projects/${ctx.projectId}/docs/${docType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(ctx.authToken && { Authorization: `Bearer ${ctx.authToken}` }),
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update document' }));
        return { success: false, error: getErrorMessage(errorData) || 'Failed to update document' };
      }

      const data = (await response.json()) as DocUpdateResponse;
      logger.info('update_docs succeeded', { docType, projectId: ctx.projectId });
      return {
        success: true,
        data: { docType, updated: true, updatedAt: data.updatedAt },
      };
    } catch (error) {
      logger.error('update_docs failed', { docType, error: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update document' };
    }
  },
};

// ============================================
// REST API Tools - Kanban Card
// ============================================

export const updateKanbanCardTool: AgentTool = {
  name: 'update_kanban_card',
  description:
    'Update a Kanban card: change title, description, lane, status, or other properties. Can move cards between lanes.',
  category: 'claude-code',
  allowedAgents: ['claude_code_agent'],
  parameters: [
    {
      name: 'card_id',
      type: 'string',
      description: 'The ID of the card to update',
      required: true,
    },
    {
      name: 'title',
      type: 'string',
      description: 'New title for the card',
      required: false,
    },
    {
      name: 'description',
      type: 'string',
      description: 'New description for the card',
      required: false,
    },
    {
      name: 'lane_id',
      type: 'string',
      description: 'ID of lane to move the card to',
      required: false,
    },
    {
      name: 'status',
      type: 'string',
      description: 'New status for the card',
      required: false,
      enum: ['pending', 'in_progress', 'blocked', 'completed'],
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const ctx = context as ClaudeCodeToolContext;
    const cardId = args.card_id as string;

    if (!cardId) {
      return { success: false, error: 'card_id is required' };
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.lane_id !== undefined) updates.laneId = args.lane_id;
    if (args.status !== undefined) updates.status = args.status;

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'At least one field to update is required' };
    }

    try {
      const response = await fetch(`${ctx.apiBaseUrl}/cards/${cardId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(ctx.authToken && { Authorization: `Bearer ${ctx.authToken}` }),
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update card' }));
        return { success: false, error: getErrorMessage(errorData) || 'Failed to update card' };
      }

      const data = (await response.json()) as CardResponse;
      logger.info('update_kanban_card succeeded', { cardId, updates });
      return {
        success: true,
        data: { cardId, updated: Object.keys(updates), card: data },
      };
    } catch (error) {
      logger.error('update_kanban_card failed', { cardId, error: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update card' };
    }
  },
};

// ============================================
// REST API Tools - Card Todos
// ============================================

export const appendCardTodoTool: AgentTool = {
  name: 'append_card_todo',
  description: 'Add a new todo item to a Kanban card. Used for tracking subtasks and follow-ups.',
  category: 'claude-code',
  allowedAgents: ['claude_code_agent'],
  parameters: [
    {
      name: 'card_id',
      type: 'string',
      description: 'The ID of the card to add the todo to',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'The text content of the todo item',
      required: true,
    },
    {
      name: 'priority',
      type: 'number',
      description: 'Priority level (higher = more important, default: 0)',
      required: false,
      default: 0,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const ctx = context as ClaudeCodeToolContext;
    const cardId = args.card_id as string;
    const content = args.content as string;
    const priority = (args.priority as number) || 0;

    if (!cardId) {
      return { success: false, error: 'card_id is required' };
    }
    if (!content) {
      return { success: false, error: 'content is required' };
    }

    try {
      const response = await fetch(`${ctx.apiBaseUrl}/cards/${cardId}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ctx.authToken && { Authorization: `Bearer ${ctx.authToken}` }),
        },
        body: JSON.stringify({ content, priority, agentSource: ctx.agentName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to add todo' }));
        return { success: false, error: getErrorMessage(errorData) || 'Failed to add todo' };
      }

      const data = (await response.json()) as TodoResponse;
      logger.info('append_card_todo succeeded', { cardId, content });
      return {
        success: true,
        data: { todoId: data.todo.id, cardId, content, priority },
      };
    } catch (error) {
      logger.error('append_card_todo failed', { cardId, error: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, error: error instanceof Error ? error.message : 'Failed to add todo' };
    }
  },
};

export const completeCardTodoTool: AgentTool = {
  name: 'complete_card_todo',
  description: 'Mark a todo item on a Kanban card as completed.',
  category: 'claude-code',
  allowedAgents: ['claude_code_agent'],
  parameters: [
    {
      name: 'card_id',
      type: 'string',
      description: 'The ID of the card containing the todo',
      required: true,
    },
    {
      name: 'todo_id',
      type: 'string',
      description: 'The ID of the todo to mark as completed',
      required: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const ctx = context as ClaudeCodeToolContext;
    const cardId = args.card_id as string;
    const todoId = args.todo_id as string;

    if (!cardId) {
      return { success: false, error: 'card_id is required' };
    }
    if (!todoId) {
      return { success: false, error: 'todo_id is required' };
    }

    try {
      const response = await fetch(`${ctx.apiBaseUrl}/cards/${cardId}/todos/${todoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(ctx.authToken && { Authorization: `Bearer ${ctx.authToken}` }),
        },
        body: JSON.stringify({ completed: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to complete todo' }));
        return { success: false, error: getErrorMessage(errorData) || 'Failed to complete todo' };
      }

      const data = (await response.json()) as TodoResponse;
      logger.info('complete_card_todo succeeded', { cardId, todoId });
      return {
        success: true,
        data: { todoId, cardId, completed: true, completedAt: data.todo.completedAt },
      };
    } catch (error) {
      logger.error('complete_card_todo failed', { cardId, todoId, error: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, error: error instanceof Error ? error.message : 'Failed to complete todo' };
    }
  },
};

// ============================================
// REST API Tools - Builder States
// ============================================

export const updateUiBuilderStateTool: AgentTool = {
  name: 'update_ui_builder_state',
  description: 'Update the UI Builder JSON state for the project. Stores component tree, layout, and styling configuration.',
  category: 'claude-code',
  allowedAgents: ['claude_code_agent'],
  parameters: [
    {
      name: 'state',
      type: 'object',
      description: 'The UI builder state object (JSON)',
      required: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const ctx = context as ClaudeCodeToolContext;
    const state = args.state;

    if (!state || typeof state !== 'object') {
      return { success: false, error: 'state must be a valid JSON object' };
    }

    try {
      const response = await fetch(`${ctx.apiBaseUrl}/projects/${ctx.projectId}/builders/ui`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(ctx.authToken && { Authorization: `Bearer ${ctx.authToken}` }),
        },
        body: JSON.stringify({ state }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update UI builder state' }));
        return { success: false, error: getErrorMessage(errorData) || 'Failed to update UI builder state' };
      }

      const data = (await response.json()) as BuilderStateResponse;
      logger.info('update_ui_builder_state succeeded', { projectId: ctx.projectId });
      return {
        success: true,
        data: { builderType: 'ui', version: data.builderState.version, updated: true },
      };
    } catch (error) {
      logger.error('update_ui_builder_state failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update UI builder state' };
    }
  },
};

export const updateDbBuilderStateTool: AgentTool = {
  name: 'update_db_builder_state',
  description: 'Update the DB Builder JSON state for the project. Stores database schema, models, and relationships.',
  category: 'claude-code',
  allowedAgents: ['claude_code_agent'],
  parameters: [
    {
      name: 'state',
      type: 'object',
      description: 'The DB builder state object (JSON)',
      required: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const ctx = context as ClaudeCodeToolContext;
    const state = args.state;

    if (!state || typeof state !== 'object') {
      return { success: false, error: 'state must be a valid JSON object' };
    }

    try {
      const response = await fetch(`${ctx.apiBaseUrl}/projects/${ctx.projectId}/builders/db`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(ctx.authToken && { Authorization: `Bearer ${ctx.authToken}` }),
        },
        body: JSON.stringify({ state }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update DB builder state' }));
        return { success: false, error: getErrorMessage(errorData) || 'Failed to update DB builder state' };
      }

      const data = (await response.json()) as BuilderStateResponse;
      logger.info('update_db_builder_state succeeded', { projectId: ctx.projectId });
      return {
        success: true,
        data: { builderType: 'db', version: data.builderState.version, updated: true },
      };
    } catch (error) {
      logger.error('update_db_builder_state failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update DB builder state' };
    }
  },
};

export const updateWorkflowBuilderStateTool: AgentTool = {
  name: 'update_workflow_builder_state',
  description: 'Update the Workflow Builder JSON state for the project. Stores workflow definitions, triggers, and automation rules.',
  category: 'claude-code',
  allowedAgents: ['claude_code_agent'],
  parameters: [
    {
      name: 'state',
      type: 'object',
      description: 'The workflow builder state object (JSON)',
      required: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const ctx = context as ClaudeCodeToolContext;
    const state = args.state;

    if (!state || typeof state !== 'object') {
      return { success: false, error: 'state must be a valid JSON object' };
    }

    try {
      const response = await fetch(`${ctx.apiBaseUrl}/projects/${ctx.projectId}/builders/workflow`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(ctx.authToken && { Authorization: `Bearer ${ctx.authToken}` }),
        },
        body: JSON.stringify({ state }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update workflow builder state' }));
        return { success: false, error: getErrorMessage(errorData) || 'Failed to update workflow builder state' };
      }

      const data = (await response.json()) as BuilderStateResponse;
      logger.info('update_workflow_builder_state succeeded', { projectId: ctx.projectId });
      return {
        success: true,
        data: { builderType: 'workflow', version: data.builderState.version, updated: true },
      };
    } catch (error) {
      logger.error('update_workflow_builder_state failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update workflow builder state' };
    }
  },
};

// ============================================
// REST API Tools - Run Summary
// ============================================

export const logRunSummaryTool: AgentTool = {
  name: 'log_run_summary',
  description:
    'Log a structured summary of the agent run. MUST be called before finishing a run to record what was accomplished.',
  category: 'claude-code',
  allowedAgents: ['claude_code_agent'],
  parameters: [
    {
      name: 'files_read',
      type: 'array',
      description: 'List of file paths that were read during the run',
      required: false,
      items: { type: 'string' },
      default: [],
    },
    {
      name: 'files_written',
      type: 'array',
      description: 'List of file paths that were created or modified during the run',
      required: false,
      items: { type: 'string' },
      default: [],
    },
    {
      name: 'commands_run',
      type: 'array',
      description: 'List of shell commands that were executed during the run',
      required: false,
      items: { type: 'string' },
      default: [],
    },
    {
      name: 'docs_updated',
      type: 'array',
      description: 'List of project documents that were updated (blueprint, prd, mvp, playbook)',
      required: false,
      items: { type: 'string' },
      default: [],
    },
    {
      name: 'card_updates',
      type: 'object',
      description: 'Summary of card updates made during the run',
      required: false,
      default: {},
    },
    {
      name: 'todo_changes',
      type: 'object',
      description: 'Summary of todo items added or completed',
      required: false,
      default: {},
    },
    {
      name: 'builder_changes',
      type: 'object',
      description: 'Summary of builder state changes (ui, db, workflow)',
      required: false,
      default: {},
    },
    {
      name: 'follow_up_items',
      type: 'array',
      description: 'List of follow-up tasks or items that need attention',
      required: false,
      items: { type: 'string' },
      default: [],
    },
    {
      name: 'summary',
      type: 'string',
      description: 'A brief human-readable summary of what was accomplished',
      required: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const ctx = context as ClaudeCodeToolContext;

    if (!ctx.agentRunId) {
      return { success: false, error: 'agentRunId is required in context' };
    }

    const summary = args.summary as string;
    if (!summary) {
      return { success: false, error: 'summary is required' };
    }

    try {
      const response = await fetch(`${ctx.apiBaseUrl}/agents/runs/${ctx.agentRunId}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ctx.authToken && { Authorization: `Bearer ${ctx.authToken}` }),
        },
        body: JSON.stringify({
          filesRead: args.files_read || [],
          filesWritten: args.files_written || [],
          commandsRun: args.commands_run || [],
          docsUpdated: args.docs_updated || [],
          cardUpdates: args.card_updates || {},
          todoChanges: args.todo_changes || {},
          builderChanges: args.builder_changes || {},
          followUpItems: args.follow_up_items || [],
          summary,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to log run summary' }));
        return { success: false, error: getErrorMessage(errorData) || 'Failed to log run summary' };
      }

      const data = (await response.json()) as RunSummaryResponse;
      logger.info('log_run_summary succeeded', { runId: ctx.agentRunId });
      return {
        success: true,
        data: { summaryId: data.runSummary.id, logged: true },
      };
    } catch (error) {
      logger.error('log_run_summary failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, error: error instanceof Error ? error.message : 'Failed to log run summary' };
    }
  },
};

// ============================================
// Tool Collection Export
// ============================================

export const claudeCodeTools: AgentTool[] = [
  // MCP-based tools
  mcpReadFileTool,
  mcpWriteFileTool,
  mcpListFilesTool,
  mcpRunCommandTool,
  // REST API tools
  updateDocsTool,
  updateKanbanCardTool,
  appendCardTodoTool,
  completeCardTodoTool,
  updateUiBuilderStateTool,
  updateDbBuilderStateTool,
  updateWorkflowBuilderStateTool,
  logRunSummaryTool,
];

export default claudeCodeTools;
