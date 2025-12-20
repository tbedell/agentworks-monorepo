import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Pencil,
  RefreshCw,
  Save,
  XCircle,
  Loader2,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Send,
} from 'lucide-react';
import { api } from '../../../lib/api';

interface AgentStatus {
  agentName: string;
  status: string;
}

interface CardData {
  id: string;
  laneId: string;
  projectId?: string;
  assignedAgents?: string[];
  agentStatus?: AgentStatus[];
  metadata?: {
    documentType?: 'blueprint' | 'prd' | 'mvp' | 'playbook';
  };
}

interface CardContextTabProps {
  card: CardData;
  isActive: boolean;
  onApproveReviewCard?: () => Promise<void>;
  isApproving?: boolean;
}

const AGENT_INFO: Record<string, { displayName: string }> = {
  ceo_copilot: { displayName: 'CEO CoPilot' },
  strategy: { displayName: 'Strategy Agent' },
  storyboard_ux: { displayName: 'Storyboard/UX' },
  prd: { displayName: 'PRD Agent' },
  mvp_scope: { displayName: 'MVP Scope' },
  research: { displayName: 'Research Agent' },
  architect: { displayName: 'Architect' },
  planner: { displayName: 'Planner' },
  devops: { displayName: 'DevOps' },
  dev_backend: { displayName: 'Dev Backend' },
  dev_frontend: { displayName: 'Dev Frontend' },
  qa: { displayName: 'QA Agent' },
  troubleshooter: { displayName: 'Troubleshooter' },
  docs: { displayName: 'Docs Agent' },
  refactor: { displayName: 'Refactor' },
};

export default function CardContextTab({
  card,
  isActive,
  onApproveReviewCard,
  isApproving = false,
}: CardContextTabProps) {
  // Context state
  const [contextContent, setContextContent] = useState('');
  const [contextMessage, setContextMessage] = useState('');
  const [activeAgents, setActiveAgents] = useState<{ name: string; status: string }[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAgentResponding, setIsAgentResponding] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const contextLogRef = useRef<HTMLDivElement>(null);

  // Instructions state
  const [instructions, setInstructions] = useState<string>('');
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [editedInstructions, setEditedInstructions] = useState('');
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const [isGeneratingInstructions, setIsGeneratingInstructions] = useState(false);
  const [instructionsExpanded, setInstructionsExpanded] = useState(true);

  const currentLaneNumber = parseInt(card.laneId.replace('lane-', ''));
  const documentType = card.metadata?.documentType;
  const isReviewCard = currentLaneNumber === 6 && documentType;

  // Fetch context file content
  const fetchContextContent = useCallback(async () => {
    try {
      const response = await api.copilot.getContext(card.id);
      if (response.content) {
        setContextContent(response.content);
        // Scroll to bottom when new content arrives
        setTimeout(() => {
          if (contextLogRef.current) {
            contextLogRef.current.scrollTop = contextLogRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to fetch context:', error);
    }
  }, [card.id]);

  // Fetch instructions for the card
  const fetchInstructions = useCallback(async () => {
    try {
      const response = await api.copilot.getInstructions(card.id);
      if (response.instructions) {
        setInstructions(response.instructions);
      }
    } catch (error) {
      console.error('Failed to fetch instructions:', error);
    }
  }, [card.id]);

  // Send human message to context and trigger agent response
  const handleSendContextMessage = async () => {
    if (!contextMessage.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      // 1. Send human message to context
      await api.copilot.contextChat({
        cardId: card.id,
        message: contextMessage.trim(),
      });
      setContextMessage('');
      await fetchContextContent();

      // 2. Auto-trigger agent response
      const agentName = card.assignedAgents?.[0] || 'ceo_copilot';

      // Update UI to show agent is responding
      setIsAgentResponding(true);
      setActiveAgents((prev) => {
        const existing = prev.find((a) => a.name === agentName);
        if (existing) {
          return prev.map((a) =>
            a.name === agentName ? { ...a, status: 'running' } : a
          );
        }
        return [...prev, { name: agentName, status: 'running' }];
      });

      try {
        const response = await api.copilot.agentRespond({
          cardId: card.id,
          agentName,
        });

        console.log('Agent respond started:', response);
      } catch (agentError) {
        console.error('Failed to trigger agent response:', agentError);
        setActiveAgents((prev) =>
          prev.map((a) =>
            a.name === agentName ? { ...a, status: 'error' } : a
          )
        );
      }
    } catch (error) {
      console.error('Failed to send context message:', error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Save edited instructions
  const handleSaveInstructions = async () => {
    if (isSavingInstructions) return;

    setIsSavingInstructions(true);
    try {
      await api.copilot.updateInstructions(card.id, editedInstructions);
      setInstructions(editedInstructions);
      setIsEditingInstructions(false);
    } catch (error) {
      console.error('Failed to save instructions:', error);
    } finally {
      setIsSavingInstructions(false);
    }
  };

  // Generate or regenerate instructions
  const handleGenerateInstructions = async (regenerate: boolean = false) => {
    if (isGeneratingInstructions) return;

    setIsGeneratingInstructions(true);
    try {
      const response = await api.copilot.generateInstructions(card.id, regenerate);
      if (response.instructions) {
        setInstructions(response.instructions);
      }
    } catch (error) {
      console.error('Failed to generate instructions:', error);
    } finally {
      setIsGeneratingInstructions(false);
    }
  };

  // Start editing instructions
  const handleStartEditInstructions = () => {
    setEditedInstructions(instructions);
    setIsEditingInstructions(true);
  };

  // Cancel editing instructions
  const handleCancelEditInstructions = () => {
    setIsEditingInstructions(false);
    setEditedInstructions('');
  };

  // WebSocket connection for real-time context updates
  useEffect(() => {
    if (!isActive) return;

    // Fetch initial content and instructions
    fetchContextContent();
    fetchInstructions();

    // Update active agents from card's agentStatus
    if (card.agentStatus) {
      setActiveAgents(
        card.agentStatus.map((s) => ({ name: s.agentName, status: s.status }))
      );
    }

    // Connect to WebSocket - use dynamic URL for production
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    const wsPort = (import.meta as any).env?.VITE_WS_PORT || '3010';
    const ws = new WebSocket(`${wsProtocol}//${wsHost}:${wsPort}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Subscribe to this card's events
      ws.send(JSON.stringify({
        type: 'subscribe',
        payload: { cardId: card.id }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'agent-log' || data.type === 'context-update') {
          // Refresh context content when new logs arrive
          fetchContextContent();
        }
        if (data.type === 'run-started') {
          setActiveAgents((prev) => {
            const existing = prev.find((a) => a.name === data.payload.agentName);
            if (existing) {
              return prev.map((a) =>
                a.name === data.payload.agentName ? { ...a, status: 'running' } : a
              );
            }
            return [...prev, { name: data.payload.agentName, status: 'running' }];
          });
        }
        if (data.type === 'run-completed' || data.type === 'run-error') {
          setActiveAgents((prev) =>
            prev.map((a) =>
              a.name === data.payload.agentName
                ? { ...a, status: data.type === 'run-completed' ? 'success' : 'error' }
                : a
            )
          );
          // Agent completed - clear responding state and refresh context
          setIsAgentResponding(false);
          fetchContextContent();
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isActive, card.id, card.agentStatus, fetchContextContent, fetchInstructions]);

  return (
    <div className="flex flex-col h-full -m-4">
      {/* CoPilot Instructions Panel */}
      <div className="border-b border-blue-200 bg-blue-50">
        <div
          className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setInstructionsExpanded(!instructionsExpanded)}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-sm text-blue-800">CoPilot Instructions</h4>
            {instructions && (
              <span className="text-xs text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditingInstructions && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEditInstructions();
                  }}
                  className="p-1 text-blue-600 hover:bg-blue-200 rounded transition-colors"
                  title="Edit instructions"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateInstructions(true);
                  }}
                  disabled={isGeneratingInstructions}
                  className="p-1 text-blue-600 hover:bg-blue-200 rounded transition-colors disabled:opacity-50"
                  title="Regenerate instructions"
                >
                  {isGeneratingInstructions ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </button>
              </>
            )}
            <span className={`transform transition-transform ${instructionsExpanded ? 'rotate-180' : ''}`}>
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </div>

        {instructionsExpanded && (
          <div className="px-4 pb-3">
            {isEditingInstructions ? (
              <div className="space-y-2">
                <textarea
                  value={editedInstructions}
                  onChange={(e) => setEditedInstructions(e.target.value)}
                  className="w-full h-32 px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-y"
                  placeholder="Enter CoPilot instructions for this card..."
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancelEditInstructions}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveInstructions}
                    disabled={isSavingInstructions}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSavingInstructions ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            ) : instructions ? (
              <div className="bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-blue-100 max-h-40 overflow-y-auto">
                {instructions}
              </div>
            ) : (
              <div className="bg-white rounded-lg p-3 text-sm text-slate-400 italic border border-blue-100">
                No instructions set.{' '}
                <button
                  onClick={() => handleGenerateInstructions(false)}
                  disabled={isGeneratingInstructions}
                  className="text-blue-600 hover:underline disabled:opacity-50"
                >
                  {isGeneratingInstructions ? 'Generating...' : 'Click to generate'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Agents Panel */}
      <div className="px-4 py-2 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="font-medium text-slate-700">Active Agents:</span>
          {activeAgents.length > 0 ? (
            activeAgents.map((agent) => (
              <span
                key={agent.name}
                className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                  agent.status === 'running'
                    ? 'bg-blue-100 text-blue-700'
                    : agent.status === 'success'
                    ? 'bg-green-100 text-green-700'
                    : agent.status === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {agent.status === 'running' && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                {agent.status === 'success' && (
                  <CheckCircle className="h-3 w-3" />
                )}
                {agent.status === 'error' && (
                  <AlertCircle className="h-3 w-3" />
                )}
                {AGENT_INFO[agent.name]?.displayName || agent.name}
              </span>
            ))
          ) : (
            <span className="text-slate-400 text-xs">None active</span>
          )}
        </div>
      </div>

      {/* Context Log */}
      <div
        ref={contextLogRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm bg-slate-50"
      >
        {contextContent ? (
          <div className="whitespace-pre-wrap text-slate-700">
            {contextContent}
          </div>
        ) : (
          <div className="text-slate-400 text-center py-8 font-sans">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No context recorded yet.</p>
            <p className="text-xs mt-1">
              Agent activity and your messages will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Agent Responding Indicator */}
      {isAgentResponding && (
        <div className="px-3 py-2 bg-pink-50 border-t border-pink-200 flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-pink-600 animate-spin" />
          <span className="text-sm text-pink-700">Agent is responding...</span>
        </div>
      )}

      {/* Chat Input */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            value={contextMessage}
            onChange={(e) => setContextMessage(e.target.value)}
            placeholder="Send a message to the agents..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendContextMessage();
              }
            }}
            disabled={isSendingMessage || isAgentResponding}
          />
          <button
            onClick={handleSendContextMessage}
            disabled={!contextMessage.trim() || isSendingMessage || isAgentResponding}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSendingMessage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Press Enter to send. Messages are recorded in the card's context file.
        </p>
      </div>

      {/* Approval Section - Only shown for Review lane cards */}
      {isReviewCard && (
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          <div className="flex gap-2">
            <button
              onClick={onApproveReviewCard}
              disabled={isAgentResponding || isApproving}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isApproving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isApproving ? 'Approving...' : 'Approve & Advance'}
            </button>
            <button
              onClick={() => {
                // Focus the chat input for human to type feedback
                const input = document.querySelector('input[placeholder="Send a message to the agents..."]') as HTMLInputElement;
                input?.focus();
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors text-slate-700"
            >
              Request Changes
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Approve to move the card to Complete lane, or request changes to continue the conversation.
          </p>
        </div>
      )}
    </div>
  );
}
