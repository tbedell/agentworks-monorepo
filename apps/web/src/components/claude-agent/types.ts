/**
 * Claude Agent Component Types
 */

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  duration?: number;
  timestamp: string;
}

export interface AgentRunSummary {
  id: string;
  agentRunId: string;
  filesRead: string[];
  filesWritten: string[];
  commandsRun: string[];
  docsUpdated: string[];
  cardUpdates: {
    status?: string;
    lane?: string;
    fieldsUpdated?: string[];
  };
  todoChanges: {
    added: string[];
    completed: string[];
  };
  builderChanges: {
    ui: boolean;
    db: boolean;
    workflow: boolean;
  };
  followUpItems: string[];
  summary: string;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  cardId: string;
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  iteration: number;
  maxIterations: number;
  toolCalls: ToolCall[];
  summary?: AgentRunSummary;
  error?: string;
}

export interface ClaudeAgentConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  maxIterations: number;
  tools: string[];
}

export interface ClaudeAgentPanelProps {
  cardId: string;
  projectId: string;
  onRunComplete?: (run: AgentRun) => void;
  className?: string;
}

export interface RunSummaryViewProps {
  summary: AgentRunSummary;
  className?: string;
}

export interface ToolCallLogProps {
  toolCalls: ToolCall[];
  className?: string;
}

export interface AgentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  projectId: string;
  agentName?: string;
  config: ClaudeAgentConfig;
  onSave: (config: ClaudeAgentConfig) => void;
}

// API response type for agent details
export interface AgentDetailsResponse {
  id: string;
  name: string;
  displayName: string;
  description: string;
  defaultProvider: string;
  defaultModel: string;
  effectiveProvider: string;
  effectiveModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  systemPrompt: string;
  allowedLanes: number[];
  projectConfig?: {
    provider: string;
    model: string;
  } | null;
}

// SSE Event types from context-service
export type SSEEventType =
  | 'connected'
  | 'message'
  | 'iteration_start'
  | 'iteration_complete'
  | 'tool_call'
  | 'tool_result'
  | 'agent_complete'
  | 'error'
  | 'heartbeat';

export interface SSEEvent {
  type: SSEEventType;
  timestamp: string;
  data: unknown;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolCalls?: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
    error?: string;
  }[];
  metadata?: Record<string, unknown>;
}

export interface CardContext {
  cardId: string;
  projectId: string;
  conversationHistory: ConversationMessage[];
  metadata: {
    lastUpdated: string;
    totalMessages: number;
    linkedTerminalSessions: string[];
    agentName?: string;
  };
}
