import { useEffect, useCallback } from 'react';
import { useTerminal } from './hooks/useTerminal';
import type { TerminalStatus, UseTerminalOptions } from './types';
import '@xterm/xterm/css/xterm.css';

interface XTerminalProps {
  sessionId?: string;
  projectId: string;
  className?: string;
  options?: UseTerminalOptions;
  onStatusChange?: (status: TerminalStatus) => void;
}

const STATUS_COLORS: Record<TerminalStatus, string> = {
  disconnected: 'bg-gray-500',
  connecting: 'bg-yellow-500 animate-pulse',
  connected: 'bg-green-500',
  error: 'bg-red-500',
  reconnecting: 'bg-orange-500 animate-pulse',
};

const STATUS_TEXT: Record<TerminalStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  connected: 'Connected',
  error: 'Error',
  reconnecting: 'Reconnecting...',
};

export default function XTerminal({
  sessionId,
  projectId,
  className = '',
  options,
  onStatusChange,
}: XTerminalProps) {
  const { terminalRef, status, connect, disconnect, clear, focus, fit } = useTerminal({
    ...options,
    onConnect: () => {
      options?.onConnect?.();
      onStatusChange?.('connected');
    },
    onDisconnect: () => {
      options?.onDisconnect?.();
      onStatusChange?.('disconnected');
    },
    onError: (error) => {
      options?.onError?.(error);
      onStatusChange?.('error');
    },
  });

  // Connect when sessionId is provided
  // Use refs to avoid dependency on connect/disconnect which can cause reconnection loops
  useEffect(() => {
    if (sessionId && projectId) {
      console.log('[XTerminal] useEffect: connecting to session', sessionId);
      connect(sessionId, projectId);
    }

    // Cleanup only on unmount, not on sessionId/projectId changes
    return () => {
      console.log('[XTerminal] useEffect cleanup: disconnecting');
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, projectId]); // Intentionally exclude connect/disconnect to prevent loops

  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Handle fit on container resize with debounce to prevent excessive resizing
  // Only call fit() when the container size actually changes significantly
  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastWidth = 0;
    let lastHeight = 0;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;

      // Skip if dimensions haven't changed significantly (more than 5px)
      if (Math.abs(width - lastWidth) < 5 && Math.abs(height - lastHeight) < 5) {
        return;
      }

      lastWidth = width;
      lastHeight = height;

      // Debounce resize events to prevent flooding the terminal
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          console.log('[XTerminal] Calling fit() after resize to:', width, 'x', height);
          fit();
        });
      }, 150); // 150ms debounce - longer for stability
    });

    if (terminalRef.current) {
      observer.observe(terminalRef.current);
      // Store initial dimensions
      const rect = terminalRef.current.getBoundingClientRect();
      lastWidth = rect.width;
      lastHeight = rect.height;
    }

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      observer.disconnect();
    };
  }, [fit, terminalRef]);

  const handleClear = useCallback(() => {
    clear();
    focus();
  }, [clear, focus]);

  const handleFocus = useCallback(() => {
    focus();
  }, [focus]);

  return (
    <div className={`flex flex-col h-full bg-[#1a1b26] ${className}`}>
      {/* Terminal toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-[#15161e]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
          <span className="text-xs text-gray-400">{STATUS_TEXT[status]}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Clear terminal"
          >
            Clear
          </button>
          {status === 'disconnected' && sessionId && (
            <button
              onClick={() => connect(sessionId, projectId)}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Reconnect"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="flex-1 p-2 overflow-hidden cursor-text"
        onClick={handleFocus}
      />

      {/* Note: The "no session" overlay is handled by the parent FloatingCardWindow component */}
    </div>
  );
}
