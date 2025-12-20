import { useEffect, useCallback, useState, useRef } from 'react';
import { useTerminal } from './hooks/useTerminal';
import type { TerminalStatus, UseTerminalOptions, TerminalAgentConfig } from './types';
import '@xterm/xterm/css/xterm.css';

// Type for agents fetched from API
interface AgentFromAPI {
  id: string;
  name: string;
  displayName: string;
  defaultProvider: string;
  defaultModel: string;
}

interface XTerminalProps {
  sessionId?: string;
  projectId: string;
  className?: string;
  options?: UseTerminalOptions;
  onStatusChange?: (status: TerminalStatus) => void;
  // Card-bound agent context
  linkedCardId?: string;
  linkedLaneIndex?: number;
  onAgentChange?: (agentName: string, provider: string, model: string) => void;
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

// Map lane indices to default agents
const LANE_AGENT_MAP: Record<number, string> = {
  0: 'ceo_copilot',
  1: 'prd',
  2: 'research',
  3: 'architect',
  4: 'planner',
  5: 'dev_backend',
  6: 'dev_frontend',
  7: 'qa',
  8: 'devops',
  9: 'docs',
  10: 'refactor',
};

export default function XTerminal({
  sessionId,
  projectId,
  className = '',
  options,
  onStatusChange,
  linkedCardId,
  linkedLaneIndex,
  onAgentChange,
}: XTerminalProps) {
  const {
    terminalRef,
    status,
    connect,
    disconnect,
    clear,
    focus,
    fit,
    aiChatEnabled,
    setAiChatEnabled,
    agentConfig,
    setAgentConfig,
    sendAiChat,
    isAiStreaming,
  } = useTerminal({
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

  // AI Chat input state
  const [chatInput, setChatInput] = useState('');
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Dynamic agents fetched from API
  const [agents, setAgents] = useState<AgentFromAPI[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  // Fetch agents from API on mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        if (response.ok) {
          const data = await response.json();
          setAgents(data);
        } else {
          console.error('[XTerminal] Failed to fetch agents:', response.status);
        }
      } catch (error) {
        console.error('[XTerminal] Error fetching agents:', error);
      } finally {
        setAgentsLoading(false);
      }
    };
    fetchAgents();
  }, []);

  // Auto-select agent based on linked card's lane
  useEffect(() => {
    if (linkedCardId && linkedLaneIndex !== undefined && agents.length > 0 && status === 'connected') {
      const defaultAgentName = LANE_AGENT_MAP[linkedLaneIndex] || 'claude_code_agent';
      const agent = agents.find(a => a.name === defaultAgentName);

      if (agent && agentConfig?.agentName !== agent.name) {
        console.log('[XTerminal] Auto-selecting agent for lane', linkedLaneIndex, '→', agent.name);
        const config: TerminalAgentConfig = {
          agentName: agent.name,
          provider: agent.defaultProvider,
          model: agent.defaultModel,
        };
        setAgentConfig(config);
        setAiChatEnabled(true); // Enable AI chat when card is linked
        onAgentChange?.(agent.name, agent.defaultProvider, agent.defaultModel);
      }
    }
  }, [linkedCardId, linkedLaneIndex, agents, status, agentConfig?.agentName, setAgentConfig, setAiChatEnabled, onAgentChange]);

  // Handle agent selection
  const handleAgentChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = agents.find(a => a.name === e.target.value);
    if (selected) {
      const config: TerminalAgentConfig = {
        agentName: selected.name,
        provider: selected.defaultProvider,
        model: selected.defaultModel,
      };
      setAgentConfig(config);
      onAgentChange?.(selected.name, selected.defaultProvider, selected.defaultModel);
    }
  }, [agents, setAgentConfig, onAgentChange]);

  // Handle AI chat submit
  const handleChatSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && !isAiStreaming) {
      sendAiChat(chatInput.trim());
      setChatInput('');
    }
  }, [chatInput, isAiStreaming, sendAiChat]);

  // Toggle AI chat mode
  const handleToggleAiChat = useCallback(() => {
    const newEnabled = !aiChatEnabled;
    setAiChatEnabled(newEnabled);
    if (newEnabled && !agentConfig && agents.length > 0) {
      // Set default agent when enabling (use first agent from API)
      const defaultAgent = agents[0];
      setAgentConfig({
        agentName: defaultAgent.name,
        provider: defaultAgent.defaultProvider,
        model: defaultAgent.defaultModel,
      });
    }
  }, [aiChatEnabled, agentConfig, agents, setAiChatEnabled, setAgentConfig]);

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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
            <span className="text-xs text-gray-400">{STATUS_TEXT[status]}</span>
          </div>

          {/* Separator */}
          <span className="text-gray-600">|</span>

          {/* AI Chat Toggle */}
          <button
            onClick={handleToggleAiChat}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              aiChatEnabled
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title={aiChatEnabled ? 'Disable AI Chat' : 'Enable AI Chat'}
          >
            {aiChatEnabled ? 'AI On' : 'AI Off'}
          </button>

          {/* Agent Selector - only shown when AI chat is enabled */}
          {aiChatEnabled && (
            <select
              value={agentConfig?.agentName || ''}
              onChange={handleAgentChange}
              disabled={agentsLoading || agents.length === 0}
              className="px-2 py-1 text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded hover:border-gray-500 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              title="Select AI Agent"
            >
              {agentsLoading ? (
                <option value="">Loading agents...</option>
              ) : agents.length === 0 ? (
                <option value="">No agents available</option>
              ) : (
                agents.map((agent) => (
                  <option key={agent.name} value={agent.name}>
                    {agent.displayName}
                  </option>
                ))
              )}
            </select>
          )}

          {/* Agent/Provider Status Indicator */}
          {aiChatEnabled && agentConfig && (
            <div className="flex items-center gap-2 px-2 py-0.5 bg-gray-800/50 rounded text-xs">
              <span className="text-green-400 font-mono">{agentConfig.agentName}</span>
              <span className="text-gray-500">•</span>
              <span className="text-blue-400 font-mono">{agentConfig.provider}</span>
            </div>
          )}

          {/* Card link indicator */}
          {linkedCardId && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-900/30 rounded text-xs">
              <span className="text-yellow-400">📎</span>
              <span className="text-yellow-300 font-mono truncate max-w-[80px]" title={linkedCardId}>
                Card Linked
              </span>
            </div>
          )}

          {/* Streaming indicator */}
          {isAiStreaming && (
            <span className="text-xs text-purple-400 animate-pulse">
              Thinking...
            </span>
          )}
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

      {/* AI Chat Input - only shown when AI chat is enabled */}
      {aiChatEnabled && (
        <form
          onSubmit={handleChatSubmit}
          className="flex items-center gap-2 px-3 py-2 border-t border-gray-700 bg-[#15161e]"
        >
          <span className="text-xs text-purple-400">
            {agentConfig?.agentName || 'AI'}:
          </span>
          <input
            ref={chatInputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask the AI agent..."
            disabled={isAiStreaming || status !== 'connected'}
            className="flex-1 px-2 py-1 text-sm bg-gray-800 text-gray-200 border border-gray-600 rounded placeholder-gray-500 focus:border-purple-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isAiStreaming || status !== 'connected'}
            className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      )}

      {/* Note: The "no session" overlay is handled by the parent FloatingCardWindow component */}
    </div>
  );
}
