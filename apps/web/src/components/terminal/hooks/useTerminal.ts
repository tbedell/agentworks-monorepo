import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import type {
  TerminalStatus,
  TerminalConfig,
  TerminalMessage,
  UseTerminalOptions,
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
  };
}
