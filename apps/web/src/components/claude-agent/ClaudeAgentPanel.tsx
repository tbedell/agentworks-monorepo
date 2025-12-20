import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, StopCircle, Settings, RefreshCw, Loader2, Bot, AlertCircle, Radio } from 'lucide-react';
import ToolCallLog from './ToolCallLog';
import RunSummaryView from './RunSummaryView';
import AgentConfigModal from './AgentConfigModal';
import type {
  ClaudeAgentPanelProps,
  AgentRun,
  ClaudeAgentConfig,
  AgentRunSummary,
  SSEEvent,
  ConversationMessage,
} from './types';

const API_BASE = '/api';

const DEFAULT_CONFIG: ClaudeAgentConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  temperature: 1.0, // Default from backend: DEFAULT_AGENT_TEMPERATURE
  maxTokens: 0, // 0 = use model max (from backend: getMaxTokensForModel)
  maxIterations: 10,
  tools: [
    'read_file',
    'write_file',
    'list_files',
    'run_command',
    'update_docs',
    'update_kanban_card',
    'append_card_todo',
    'complete_card_todo',
    'update_ui_builder_state',
    'update_db_builder_state',
    'update_workflow_builder_state',
    'log_run_summary',
  ],
};

type ViewMode = 'live' | 'summary' | 'history';

export default function ClaudeAgentPanel({
  cardId,
  projectId,
  onRunComplete,
  className = '',
}: ClaudeAgentPanelProps) {
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [runHistory, setRunHistory] = useState<AgentRun[]>([]);
  const [config, setConfig] = useState<ClaudeAgentConfig>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // SSE streaming state
  const [streamMessages, setStreamMessages] = useState<ConversationMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE stream for live updates
  const connectToStream = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${API_BASE}/context/cards/${cardId}/stream`, {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('SSE connected for card:', cardId);
    };

    eventSource.onmessage = (event) => {
      try {
        const sseEvent = JSON.parse(event.data) as SSEEvent;
        handleSSEEvent(sseEvent);
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      console.log('SSE connection error, will retry...');
    };

    eventSourceRef.current = eventSource;
  }, [cardId]);

  // Handle SSE events
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case 'connected':
        console.log('SSE stream connected');
        break;

      case 'message':
        // New message from agent
        const message = event.data as ConversationMessage;
        setStreamMessages((prev) => [...prev, message]);
        break;

      case 'iteration_start':
        // Agent started a new iteration
        setCurrentRun((prev) =>
          prev ? { ...prev, status: 'running' as const } : prev
        );
        break;

      case 'agent_complete':
        // Agent completed - extract runId for logging
        {
          const { runId } = event.data as { runId: string; status: string; usage?: Record<string, unknown> };
          console.log('Agent run completed:', runId);
          setCurrentRun((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, status: 'completed' as const };
            if (onRunComplete) {
              onRunComplete(updated);
            }
            return updated;
          });
        }
        break;

      case 'error':
        // Error occurred
        const errorData = event.data as { message?: string };
        setError(errorData.message || 'An error occurred');
        setCurrentRun((prev) =>
          prev ? { ...prev, status: 'failed' as const } : prev
        );
        break;

      case 'heartbeat':
        // Just a keepalive
        break;

      default:
        console.log('Unhandled SSE event:', event.type);
    }
  }, [onRunComplete]);

  // Disconnect from stream
  const disconnectStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Connect to stream when component mounts and when run starts
  useEffect(() => {
    connectToStream();
    return () => disconnectStream();
  }, [cardId, connectToStream, disconnectStream]);

  // Fetch run history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE}/cards/${cardId}/run-summaries`, {
          credentials: 'include',
        });
        if (response.ok) {
          interface HistoryItem {
            id: string;
            agentRunId: string;
            summary: string;
            filesRead: string[];
            filesWritten: string[];
            commandsRun: string[];
            docsUpdated: string[];
            cardUpdates: Record<string, unknown>;
            todoChanges: Record<string, unknown>;
            builderChanges: Record<string, unknown>;
            followUpItems: string[];
            createdAt: string;
          }
          const data = (await response.json()) as { summaries: HistoryItem[] };
          // Convert summaries to run history format
          const history: AgentRun[] = data.summaries.map((s: HistoryItem) => ({
            id: s.agentRunId,
            cardId,
            agentName: 'claude_code_agent',
            status: 'completed' as const,
            iteration: 0,
            maxIterations: 10,
            toolCalls: [],
            summary: s as unknown as AgentRunSummary,
          }));
          setRunHistory(history);
        }
      } catch {
        console.error('Failed to fetch run history');
      }
    };
    fetchHistory();
  }, [cardId]);

  // Poll for run status when running
  useEffect(() => {
    if (!currentRun || currentRun.status !== 'running') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/agent-runs/${currentRun.id}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = (await response.json()) as AgentRun;
          setCurrentRun(data);

          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(pollInterval);
            if (data.status === 'completed' && onRunComplete) {
              onRunComplete(data);
            }
            // Refresh history
            setRunHistory((prev) => [data, ...prev.filter((r) => r.id !== data.id)]);
          }
        }
      } catch {
        console.error('Failed to poll run status');
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentRun, onRunComplete]);

  const handleStartRun = useCallback(async () => {
    setError(null);
    setIsStarting(true);
    setStreamMessages([]); // Clear previous stream messages

    try {
      const response = await fetch(`${API_BASE}/agents/claude_code_agent/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cardId,
          projectId,
          config,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || 'Failed to start agent');
      }

      const data = (await response.json()) as { run: AgentRun };
      setCurrentRun(data.run);
      setViewMode('live');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start agent');
    } finally {
      setIsStarting(false);
    }
  }, [cardId, projectId, config]);

  const handleStopRun = useCallback(async () => {
    if (!currentRun) return;

    try {
      await fetch(`${API_BASE}/agent-runs/${currentRun.id}/stop`, {
        method: 'POST',
        credentials: 'include',
      });
      setCurrentRun((prev) => (prev ? { ...prev, status: 'failed' as const } : null));
    } catch {
      console.error('Failed to stop run');
    }
  }, [currentRun]);

  const isRunning = currentRun?.status === 'running';

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-purple-600" />
          <span className="font-medium text-gray-900">Claude Code Agent</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-sm text-blue-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running...
            </span>
          )}
          {/* SSE Connection indicator */}
          <span
            className={`flex items-center gap-1 text-xs ${
              isConnected ? 'text-green-600' : 'text-gray-400'
            }`}
            title={isConnected ? 'Live stream connected' : 'Connecting...'}
          >
            <Radio className={`h-3 w-3 ${isConnected ? 'animate-pulse' : ''}`} />
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Configure Agent"
          >
            <Settings className="h-4 w-4" />
          </button>

          {isRunning ? (
            <button
              onClick={handleStopRun}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg"
            >
              <StopCircle className="h-4 w-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleStartRun}
              disabled={isStarting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
            >
              {isStarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Agent
            </button>
          )}
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setViewMode('live')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            viewMode === 'live'
              ? 'text-purple-600 border-purple-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Live Activity
        </button>
        <button
          onClick={() => setViewMode('summary')}
          disabled={!currentRun?.summary}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 ${
            viewMode === 'summary'
              ? 'text-purple-600 border-purple-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Run Summary
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            viewMode === 'history'
              ? 'text-purple-600 border-purple-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          History ({runHistory.length})
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-red-800">Error</div>
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'live' && (
          <div>
            {currentRun ? (
              <>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Iteration: {currentRun.iteration} / {currentRun.maxIterations}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        currentRun.status === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : currentRun.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {currentRun.status}
                    </span>
                  </div>
                </div>

                {/* Live streaming messages */}
                {streamMessages.length > 0 && (
                  <div className="mb-4 space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Radio className="h-4 w-4 text-green-500 animate-pulse" />
                      Live Stream
                    </h4>
                    {streamMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg text-sm ${
                          msg.role === 'assistant'
                            ? 'bg-purple-50 border border-purple-100'
                            : msg.role === 'user'
                              ? 'bg-blue-50 border border-blue-100'
                              : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-xs uppercase text-gray-500">
                            {msg.role}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            Tools used: {msg.toolCalls.map((tc) => tc.name).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <ToolCallLog toolCalls={currentRun.toolCalls || []} />
              </>
            ) : (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No agent run in progress</p>
                <p className="text-sm text-gray-400">
                  Click "Run Agent" to execute the Claude Code Agent on this card
                </p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'summary' && currentRun?.summary && (
          <RunSummaryView summary={currentRun.summary} />
        )}

        {viewMode === 'history' && (
          <div className="space-y-4">
            {runHistory.length === 0 ? (
              <div className="text-center py-12">
                <RefreshCw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No previous runs</p>
              </div>
            ) : (
              runHistory.map((run) => (
                <div key={run.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Run {run.id.slice(0, 8)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        run.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                  {run.summary && (
                    <p className="text-sm text-gray-600 line-clamp-2">{run.summary.summary}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Config Modal */}
      <AgentConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        cardId={cardId}
        projectId={projectId}
        agentName="claude_code_agent"
        config={config}
        onSave={setConfig}
      />
    </div>
  );
}
