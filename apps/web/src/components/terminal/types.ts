// Terminal session and connection types for AgentWorks Cloud

export type TerminalStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

export interface TerminalSession {
  id: string;
  projectId: string;
  userId: string;
  devEnvId?: string;
  status: TerminalStatus;
  cols: number;
  rows: number;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface TerminalConfig {
  fontSize: number;
  fontFamily: string;
  cursorBlink: boolean;
  cursorStyle: 'block' | 'underline' | 'bar';
  scrollback: number;
  theme: TerminalTheme;
}

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  selectionForeground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export const DEFAULT_TERMINAL_CONFIG: TerminalConfig = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', Consolas, monospace",
  cursorBlink: true,
  cursorStyle: 'block',
  scrollback: 10000,
  theme: {
    background: '#1a1b26',
    foreground: '#c0caf5',
    cursor: '#c0caf5',
    cursorAccent: '#1a1b26',
    selectionBackground: '#33467c',
    selectionForeground: '#c0caf5',
    black: '#15161e',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    brightBlack: '#414868',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5',
  },
};

export interface TerminalMessage {
  type: 'input' | 'output' | 'resize' | 'ping' | 'pong' | 'error' | 'kanban' | 'agent_status' | 'ai_chat' | 'ai_response' | 'agent_select' | 'context_link' | 'ai_toggle';
  data?: string;
  cols?: number;
  rows?: number;
  timestamp?: number;
  // Kanban notification data
  kanban?: KanbanNotification;
  // Agent status data
  agent?: AgentStatusNotification;
  // AI Chat specific fields
  message?: string;
  agentName?: string;
  provider?: string;
  model?: string;
  cardId?: string;
  enabled?: boolean;
  done?: boolean;
}

/**
 * AI Agent configuration for terminal chat mode
 */
export interface TerminalAgentConfig {
  agentName: string;
  provider: string;
  model: string;
}

/**
 * Available agents for terminal selection
 * Matches the agent registry in agent-orchestrator
 */
export const TERMINAL_AGENTS = [
  // Executive & Strategy (Lane 0)
  { name: 'ceo_copilot', label: 'CEO CoPilot', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { name: 'strategy', label: 'Strategy', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },

  // Product & Design (Lane 0-1)
  { name: 'storyboard_ux', label: 'UX Design', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { name: 'prd', label: 'PRD', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { name: 'mvp_scope', label: 'MVP Scope', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },

  // Research & Planning (Lane 2-4)
  { name: 'research', label: 'Research', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { name: 'architect', label: 'Architect', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { name: 'planner', label: 'Planner', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },

  // Development (Lane 1-4)
  { name: 'code_standards', label: 'Code Standards', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { name: 'dev_backend', label: 'Backend Dev', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { name: 'dev_frontend', label: 'Frontend Dev', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { name: 'devops', label: 'DevOps', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },

  // Quality & Testing (Lane 4)
  { name: 'qa', label: 'QA', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { name: 'troubleshooter', label: 'Troubleshooter', provider: 'google', model: 'gemini-2.0-flash' },

  // Documentation & Optimization (Lane 4-6)
  { name: 'docs', label: 'Documentation', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { name: 'refactor', label: 'Refactor', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },

  // Full-featured Code Agent
  { name: 'claude_code_agent', label: 'Claude Code', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
] as const;

/**
 * Kanban notification sent to terminal when card status changes
 */
export interface KanbanNotification {
  type: 'card_created' | 'card_moved' | 'card_status_changed' | 'card_assigned' | 'card_comment';
  cardId: string;
  cardTitle: string;
  fromLane?: string;
  toLane?: string;
  status?: string;
  agent?: string;
  comment?: string;
}

/**
 * Agent status notification for terminal feedback
 */
export interface AgentStatusNotification {
  type: 'started' | 'completed' | 'failed' | 'tool_use';
  runId: string;
  agentId: string;
  cardId: string;
  message?: string;
  tool?: string;
  progress?: number;
}

export interface TerminalConnectionOptions {
  sessionId: string;
  projectId: string;
  gatewayUrl?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface UseTerminalOptions {
  config?: Partial<TerminalConfig>;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onData?: (data: string) => void;
}
