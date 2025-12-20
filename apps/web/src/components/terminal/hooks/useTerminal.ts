import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import type {
  TerminalStatus,
  TerminalConfig,
  TerminalMessage,
  UseTerminalOptions,
  KanbanNotification,
  AgentStatusNotification,
  TerminalAgentConfig,
} from '../types';
import { DEFAULT_TERMINAL_CONFIG } from '../types';

// Use dynamic hostname to support local network access
const getTerminalGatewayUrl = () => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TERMINAL_GATEWAY_URL) {
    return (import.meta as any).env.VITE_TERMINAL_GATEWAY_URL;
  }
  // Use same hostname as current page
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `ws://${hostname}:8005/api/terminal`;
};

interface UseTerminalReturn {
  terminalRef: React.RefObject<HTMLDivElement>;
  terminal: Terminal | null;
  status: TerminalStatus;
  connect: (sessionId: string, projectId: string) => void;
  disconnect: () => void;
  write: (data: string) => void;
  clear: () => void;
  focus: () => void;
  fit: () => void;
  // AI Chat mode
  aiChatEnabled: boolean;
  setAiChatEnabled: (enabled: boolean) => void;
  agentConfig: TerminalAgentConfig | null;
  setAgentConfig: (config: TerminalAgentConfig) => void;
  sendAiChat: (message: string) => void;
  linkToCard: (cardId: string) => void;
  isAiStreaming: boolean;
}

export function useTerminal(options: UseTerminalOptions = {}): UseTerminalReturn {
  const {
    config: userConfig,
    autoConnect: _autoConnect = false,
    onConnect,
    onDisconnect,
    onError,
    onData,
  } = options;

  // Memoize config to prevent unnecessary terminal re-initialization
  const config = useMemo((): TerminalConfig => ({
    ...DEFAULT_TERMINAL_CONFIG,
    ...userConfig,
  }), [
    userConfig?.fontSize,
    userConfig?.fontFamily,
    userConfig?.cursorBlink,
    userConfig?.cursorStyle,
    userConfig?.scrollback,
    // Note: theme is an object, so we stringify to compare
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(userConfig?.theme),
  ]);

  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  // Store current session info for reconnection
  const sessionInfoRef = useRef<{ sessionId: string; projectId: string } | null>(null);
  // Track if disconnect was intentional
  const intentionalDisconnectRef = useRef<boolean>(false);
  // Track last sent dimensions to avoid redundant resize events
  const lastSentDimensionsRef = useRef<{ cols: number; rows: number } | null>(null);

  const [status, setStatus] = useState<TerminalStatus>('disconnected');
  const [aiChatEnabled, setAiChatEnabledState] = useState(false);
  const [agentConfig, setAgentConfigState] = useState<TerminalAgentConfig | null>(null);
  const [isAiStreaming, setIsAiStreaming] = useState(false);

  const initTerminal = useCallback(() => {
    if (!terminalRef.current || terminalInstanceRef.current) return;

    const terminal = new Terminal({
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      cursorBlink: config.cursorBlink,
      cursorStyle: config.cursorStyle,
      scrollback: config.scrollback,
      theme: config.theme,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(terminalRef.current);

    // Initial fit
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    terminalInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle terminal input
    terminal.onData((data) => {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        const message: TerminalMessage = {
          type: 'input',
          data,
          timestamp: Date.now(),
        };
        websocketRef.current.send(JSON.stringify(message));
      }
      onData?.(data);
    });

    // Handle terminal resize - only send if dimensions actually changed
    terminal.onResize(({ cols, rows }) => {
      const last = lastSentDimensionsRef.current;
      if (last && last.cols === cols && last.rows === rows) {
        // Dimensions haven't changed, skip sending resize event
        return;
      }

      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        console.log('[useTerminal] Sending resize event:', cols, 'x', rows);
        lastSentDimensionsRef.current = { cols, rows };
        const message: TerminalMessage = {
          type: 'resize',
          cols,
          rows,
          timestamp: Date.now(),
        };
        websocketRef.current.send(JSON.stringify(message));
      }
    });

    return terminal;
  }, [config, onData]);

  const connect = useCallback(
    (sessionId: string, projectId: string) => {
      console.log('[useTerminal] connect called with sessionId:', sessionId, 'projectId:', projectId);

      // Store session info for potential reconnection
      sessionInfoRef.current = { sessionId, projectId };
      intentionalDisconnectRef.current = false;

      // Check if already connected to this session
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        console.log('[useTerminal] Already connected, skipping');
        return;
      }

      // Check if already connecting
      if (websocketRef.current?.readyState === WebSocket.CONNECTING) {
        console.log('[useTerminal] Already connecting, skipping');
        return;
      }

      setStatus('connecting');
      console.log('[useTerminal] Status set to connecting');

      const wsUrl = `${getTerminalGatewayUrl()}/ws/terminal/${sessionId}?projectId=${projectId}`;
      console.log('[useTerminal] Creating WebSocket to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[useTerminal] WebSocket opened successfully');
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        onConnect?.();

        // Send initial resize and track dimensions
        if (terminalInstanceRef.current && fitAddonRef.current) {
          const { cols, rows } = terminalInstanceRef.current;
          console.log('[useTerminal] Sending initial resize:', cols, 'x', rows);
          lastSentDimensionsRef.current = { cols, rows };
          const message: TerminalMessage = {
            type: 'resize',
            cols,
            rows,
            timestamp: Date.now(),
          };
          ws.send(JSON.stringify(message));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: TerminalMessage = JSON.parse(event.data);
          if (message.type === 'output' && message.data) {
            terminalInstanceRef.current?.write(message.data);
          } else if (message.type === 'error') {
            console.error('Terminal error:', message.data);
            onError?.(new Error(message.data || 'Unknown terminal error'));
          } else if (message.type === 'kanban' && message.kanban) {
            // Format Kanban notification for terminal display
            const notification = formatKanbanNotification(message.kanban);
            terminalInstanceRef.current?.write(notification);
          } else if (message.type === 'agent_status' && message.agent) {
            // Format agent status notification for terminal display
            const notification = formatAgentNotification(message.agent);
            terminalInstanceRef.current?.write(notification);
          } else if (message.type === 'ai_response') {
            // Handle streaming AI response
            if (message.data) {
              terminalInstanceRef.current?.write(message.data);
            }
            if (message.done) {
              setIsAiStreaming(false);
              terminalInstanceRef.current?.write('\r\n');
            }
          }
        } catch {
          // Raw data, write directly
          terminalInstanceRef.current?.write(event.data);
        }
      };

      ws.onclose = (event) => {
        console.log('[useTerminal] WebSocket closed:', event.code, event.reason, 'wasClean:', event.wasClean, 'intentional:', intentionalDisconnectRef.current);
        setStatus('disconnected');
        onDisconnect?.();

        // Only attempt reconnection if:
        // 1. Not an intentional disconnect
        // 2. Not a clean close
        // 3. Haven't exceeded max attempts
        // 4. Still have session info
        if (!intentionalDisconnectRef.current && !event.wasClean && reconnectAttemptsRef.current < 5 && sessionInfoRef.current) {
          console.log('[useTerminal] Attempting reconnection, attempt:', reconnectAttemptsRef.current + 1);
          setStatus('reconnecting');
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          const { sessionId: sid, projectId: pid } = sessionInfoRef.current;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect(sid, pid);
          }, delay);
        }
      };

      ws.onerror = (event) => {
        console.error('[useTerminal] WebSocket error:', event);
        setStatus('error');
        onError?.(new Error('WebSocket connection failed'));
      };

      websocketRef.current = ws;
    },
    [onConnect, onDisconnect, onError]
  );

  const disconnect = useCallback(() => {
    console.log('[useTerminal] disconnect called');
    // Mark as intentional disconnect to prevent reconnection
    intentionalDisconnectRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    sessionInfoRef.current = null;

    if (websocketRef.current) {
      websocketRef.current.close(1000, 'Intentional disconnect');
      websocketRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const write = useCallback((data: string) => {
    terminalInstanceRef.current?.write(data);
  }, []);

  const clear = useCallback(() => {
    terminalInstanceRef.current?.clear();
  }, []);

  const focus = useCallback(() => {
    terminalInstanceRef.current?.focus();
  }, []);

  const fit = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  // AI Chat mode functions
  const setAiChatEnabled = useCallback((enabled: boolean) => {
    setAiChatEnabledState(enabled);
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      const message: TerminalMessage = {
        type: 'ai_toggle',
        enabled,
        timestamp: Date.now(),
      };
      websocketRef.current.send(JSON.stringify(message));
    }
  }, []);

  const setAgentConfig = useCallback((config: TerminalAgentConfig) => {
    setAgentConfigState(config);
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      const message: TerminalMessage = {
        type: 'agent_select',
        agentName: config.agentName,
        provider: config.provider,
        model: config.model,
        timestamp: Date.now(),
      };
      websocketRef.current.send(JSON.stringify(message));
    }
  }, []);

  const sendAiChat = useCallback((chatMessage: string) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN && agentConfig) {
      setIsAiStreaming(true);
      // Echo user message
      terminalInstanceRef.current?.write(`\r\n${ANSI.bold}${ANSI.cyan}You:${ANSI.reset} ${chatMessage}\r\n`);
      terminalInstanceRef.current?.write(`${ANSI.bold}${ANSI.magenta}${agentConfig.agentName}:${ANSI.reset} `);

      const message: TerminalMessage = {
        type: 'ai_chat',
        message: chatMessage,
        agentName: agentConfig.agentName,
        provider: agentConfig.provider,
        model: agentConfig.model,
        timestamp: Date.now(),
      };
      websocketRef.current.send(JSON.stringify(message));
    }
  }, [agentConfig]);

  const linkToCard = useCallback((cardId: string) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      const message: TerminalMessage = {
        type: 'context_link',
        cardId,
        timestamp: Date.now(),
      };
      websocketRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Initialize terminal on mount
  useEffect(() => {
    const terminal = initTerminal();

    // Handle window resize
    const handleResize = () => {
      fitAddonRef.current?.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal?.dispose();
      terminalInstanceRef.current = null;
      fitAddonRef.current = null;
    };
  }, [initTerminal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    terminalRef,
    terminal: terminalInstanceRef.current,
    status,
    connect,
    disconnect,
    write,
    clear,
    focus,
    fit,
    // AI Chat mode
    aiChatEnabled,
    setAiChatEnabled,
    agentConfig,
    setAgentConfig,
    sendAiChat,
    linkToCard,
    isAiStreaming,
  };
}

// ANSI color codes for terminal formatting
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

/**
 * Format Kanban notification for terminal display
 */
function formatKanbanNotification(notification: KanbanNotification): string {
  const prefix = `${ANSI.bold}${ANSI.cyan}[Kanban]${ANSI.reset}`;
  const cardTitle = notification.cardTitle.length > 40
    ? notification.cardTitle.slice(0, 37) + '...'
    : notification.cardTitle;

  switch (notification.type) {
    case 'card_created':
      return `\r\n${prefix} ${ANSI.green}Card created:${ANSI.reset} "${cardTitle}"${notification.toLane ? ` in ${notification.toLane}` : ''}\r\n`;
    case 'card_moved':
      return `\r\n${prefix} ${ANSI.blue}Card moved:${ANSI.reset} "${cardTitle}" ${notification.fromLane} -> ${notification.toLane}\r\n`;
    case 'card_status_changed':
      return `\r\n${prefix} ${ANSI.yellow}Status changed:${ANSI.reset} "${cardTitle}" -> ${notification.status}\r\n`;
    case 'card_assigned':
      return `\r\n${prefix} ${ANSI.magenta}Assigned:${ANSI.reset} "${cardTitle}" to ${notification.agent}\r\n`;
    case 'card_comment':
      return `\r\n${prefix} ${ANSI.dim}Comment on "${cardTitle}":${ANSI.reset} ${notification.comment?.slice(0, 80)}\r\n`;
    default:
      return `\r\n${prefix} ${notification.type}: "${cardTitle}"\r\n`;
  }
}

/**
 * Format agent status notification for terminal display
 */
function formatAgentNotification(notification: AgentStatusNotification): string {
  const prefix = `${ANSI.bold}${ANSI.magenta}[Agent:${notification.agentId}]${ANSI.reset}`;

  switch (notification.type) {
    case 'started':
      return `\r\n${prefix} ${ANSI.green}Started${ANSI.reset} execution${notification.message ? `: ${notification.message}` : ''}\r\n`;
    case 'completed':
      return `\r\n${prefix} ${ANSI.green}Completed${ANSI.reset}${notification.message ? `: ${notification.message}` : ''}\r\n`;
    case 'failed':
      return `\r\n${prefix} ${ANSI.red}Failed${ANSI.reset}${notification.message ? `: ${notification.message}` : ''}\r\n`;
    case 'tool_use':
      return `\r\n${prefix} ${ANSI.dim}Using tool:${ANSI.reset} ${notification.tool}${notification.progress !== undefined ? ` (${notification.progress}%)` : ''}\r\n`;
    default:
      return `\r\n${prefix} ${notification.type}${notification.message ? `: ${notification.message}` : ''}\r\n`;
  }
}
