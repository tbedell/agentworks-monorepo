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
  config: ClaudeAgentConfig;
  onSave: (config: ClaudeAgentConfig) => void;
}
