import type { AgentName } from '@agentworks/shared';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enum?: string[];
  items?: { type: string };
  default?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
      default?: unknown;
    }>;
    required: string[];
  };
}

export interface ToolContext {
  projectId: string;
  agentName: AgentName;
  agentRunId?: string;
  tenantSlug: string;
  projectSlug: string;
  projectPath: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
  requiresApproval?: boolean;
  allowedAgents?: AgentName[];
  category: 'file' | 'code' | 'git' | 'search' | 'style' | 'claude-code' | 'wordpress' | 'document';
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  toolCallId: string;
  result: ToolResult;
}

export interface ToolExecutionContext extends ToolContext {
  onApprovalRequired?: (tool: AgentTool, args: Record<string, unknown>) => Promise<boolean>;
  maxExecutionTime?: number;
}

export type ToolRegistration = Omit<AgentTool, 'execute'> & {
  handler: AgentTool['execute'];
};
