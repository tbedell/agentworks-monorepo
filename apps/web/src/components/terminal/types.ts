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
  type: 'input' | 'output' | 'resize' | 'ping' | 'pong' | 'error';
  data?: string;
  cols?: number;
  rows?: number;
  timestamp?: number;
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
