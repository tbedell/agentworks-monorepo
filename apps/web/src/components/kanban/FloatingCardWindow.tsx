import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Play,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle,
  Bot,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Loader2,
  Send,
  MessageSquare,
  Pencil,
  RefreshCw,
  Save,
  XCircle,
  FileText,
  Trash2,
  Terminal,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useFloatingCardsStore, FloatingCardState } from '../../stores/floatingCards';
import { XTerminal } from '../terminal';

interface FloatingCardWindowProps {
  floatingState: FloatingCardState;
  onRunAgent?: (cardId: string, agentName: string) => void;
  onReviewContext?: (cardId: string) => void;
  onApprove?: (cardId: string, data: { notes?: string; advance?: boolean }) => void;
  onReject?: (cardId: string, data: { notes?: string; returnToPrevious?: boolean }) => void;
  onDelete?: (cardId: string) => void;
  agentLogs?: { agentName: string; status: string; logs: string[] }[];
}

const AGENT_INFO: Record<string, { displayName: string; provider: string; model: string }> = {
  ceo_copilot: { displayName: 'CEO CoPilot', provider: 'OpenAI', model: 'gpt-4o' },
  strategy: { displayName: 'Strategy Agent', provider: 'OpenAI', model: 'gpt-4o' },
  storyboard_ux: { displayName: 'Storyboard/UX', provider: 'OpenAI', model: 'gpt-4o' },
  prd: { displayName: 'PRD Agent', provider: 'OpenAI', model: 'gpt-4o' },
  mvp_scope: { displayName: 'MVP Scope', provider: 'OpenAI', model: 'gpt-4o' },
  research: { displayName: 'Research Agent', provider: 'OpenAI', model: 'gpt-4o' },
  architect: { displayName: 'Architect', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
  planner: { displayName: 'Planner', provider: 'OpenAI', model: 'gpt-4o' },
  devops: { displayName: 'DevOps', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
  dev_backend: { displayName: 'Dev Backend', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
  dev_frontend: { displayName: 'Dev Frontend', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
  qa: { displayName: 'QA Agent', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
  troubleshooter: { displayName: 'Troubleshooter', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
  docs: { displayName: 'Docs Agent', provider: 'OpenAI', model: 'gpt-4o' },
  refactor: { displayName: 'Refactor', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
};

const LANE_NAMES: Record<string, string> = {
  'lane-0': 'Vision & CoPilot',
  'lane-1': 'PRD / MVP',
  'lane-2': 'Research',
  'lane-3': 'Architecture',
  'lane-4': 'Planning',
  'lane-5': 'Scaffolding',
  'lane-6': 'Build',
  'lane-7': 'Test & QA',
  'lane-8': 'Deploy',
  'lane-9': 'Docs & Training',
  'lane-10': 'Learn & Optimize',
};

const priorityStyles = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const typeStyles = {
  feature: 'bg-green-100 text-green-700',
  bug: 'bg-red-100 text-red-700',
  task: 'bg-blue-100 text-blue-700',
  epic: 'bg-purple-100 text-purple-700',
  story: 'bg-indigo-100 text-indigo-700',
};

const MIN_WIDTH = 400;
const MIN_HEIGHT = 350;

export default function FloatingCardWindow({
  floatingState,
  onRunAgent,
  onReviewContext,
  onApprove,
  onReject,
  onDelete,
}: FloatingCardWindowProps) {
  const { card, position, size, minimized, zIndex } = floatingState;
  const { closeCard, updatePosition, updateSize, minimizeCard, restoreCard, bringToFront } =
    useFloatingCardsStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [activeSection, setActiveSection] = useState<'details' | 'agents' | 'review' | 'history' | 'context' | 'terminal'>('details');
  const [terminalSessionId, setTerminalSessionId] = useState<string | undefined>();
  const [reviewNotes, setReviewNotes] = useState('');
  const [advanceOnApprove, setAdvanceOnApprove] = useState(true);
  const [returnOnReject, setReturnOnReject] = useState(true);
  const [isReviewPending, setIsReviewPending] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);

  // Context tab state
  const [contextContent, setContextContent] = useState('');
  const [contextMessage, setContextMessage] = useState('');
  const [activeAgents, setActiveAgents] = useState<{name: string; status: string}[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
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
  const availableAgents = (card.assignedAgents?.length > 0)
    ? card.assignedAgents
    : Object.keys(AGENT_INFO).slice(0, 3);

  const mockHistory = [
    { date: card.dates.created, action: 'Created', lane: 'lane-0' },
    ...(card.dates.updated !== card.dates.created ? [{ date: card.dates.updated, action: 'Updated', lane: card.laneId }] : []),
  ];

  // Extended card type for review properties
  const cardWithReview = card as typeof card & {
    reviewStatus?: string | null;
    approvedAt?: string | null;
    rejectedAt?: string | null;
    reviewNotes?: string | null;
  };

  // Handle mouse down for dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.no-drag')) return;
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      bringToFront(card.id);
    },
    [position, card.id, bringToFront]
  );

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
      });
      bringToFront(card.id);
    },
    [size, card.id, bringToFront]
  );

  // Handle mouse move for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(card.id, {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, card.id, updatePosition]);

  // Handle mouse move for resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const newWidth = Math.max(MIN_WIDTH, resizeStart.width + deltaX);
      const newHeight = Math.max(MIN_HEIGHT, resizeStart.height + deltaY);
      updateSize(card.id, { width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, card.id, updateSize]);

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

  // State for agent responding
  const [isAgentResponding, setIsAgentResponding] = useState(false);

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
      const agentName = card.assignedAgents?.[0] || (card as any).assignedAgent || 'ceo_copilot';

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

        // Poll for updates or rely on WebSocket
        // WebSocket will update the context when agent completes
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
      // Note: isAgentResponding will be updated by WebSocket when agent completes
    }
  };

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
    if (activeSection !== 'context') return;

    // Fetch initial content and instructions
    fetchContextContent();
    fetchInstructions();

    // Update active agents from card's agentStatus
    if (card.agentStatus) {
      setActiveAgents(
        card.agentStatus.map((s) => ({ name: s.agentName, status: s.status }))
      );
    }

    // Connect to WebSocket
    const ws = new WebSocket(`ws://localhost:3010/ws`);
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
  }, [activeSection, card.id, card.agentStatus, fetchContextContent, fetchInstructions]);

  if (minimized) {
    return (
      <div
        className="fixed bottom-4 bg-white rounded-lg shadow-lg border border-slate-200 px-4 py-2 cursor-pointer hover:bg-slate-50"
        style={{ left: `${position.x}px`, zIndex }}
        onClick={() => restoreCard(card.id)}
      >
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium truncate max-w-[200px]">{card.title}</span>
          <Maximize2 className="h-3 w-3 text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={windowRef}
      className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex,
      }}
      onClick={() => bringToFront(card.id)}
    >
      {/* Header - Draggable */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-200 cursor-move select-none bg-white"
        onMouseDown={handleMouseDown}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${typeStyles[card.type]}`}>
              {card.type}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${priorityStyles[card.priority]}`}>
              {card.priority}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600">
              Lane {currentLaneNumber}
            </span>
          </div>
          <h2 className="text-sm font-semibold text-slate-900 truncate">{card.title}</h2>
        </div>
        <div className="flex items-center gap-1 no-drag ml-2">
          <button
            onClick={() => minimizeCard(card.id)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => closeCard(card.id)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        {(['details', 'agents', 'terminal', 'review', 'history', 'context'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeSection === section
                ? 'text-blue-600 border-blue-600 bg-white'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
            {section === 'review' && cardWithReview.reviewStatus === 'pending' && (
              <span className="ml-1 w-2 h-2 rounded-full bg-orange-500 inline-block" />
            )}
            {section === 'context' && activeAgents.some(a => a.status === 'running') && (
              <span className="ml-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 bg-white">
        {activeSection === 'details' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {card.description || 'No description provided.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created:</span>
                    <span className="text-slate-700">
                      {new Date(card.dates.created).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Updated:</span>
                    <span className="text-slate-700">
                      {new Date(card.dates.updated).toLocaleDateString()}
                    </span>
                  </div>
                  {card.dates.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Due:</span>
                      <span className="text-orange-600 font-medium">
                        {new Date(card.dates.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Metadata
                </h3>
                <div className="space-y-1.5 text-sm">
                  {card.metadata?.estimatedPoints && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estimate:</span>
                      <span className="text-slate-700">{card.metadata.estimatedPoints} pts</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Comments:</span>
                    <span className="text-slate-700">{card.metadata?.comments || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Attachments:</span>
                    <span className="text-slate-700">{card.metadata?.attachments || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {card.metadata?.labels && card.metadata.labels.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Labels</h3>
                <div className="flex flex-wrap gap-2">
                  {card.metadata.labels.map((label) => (
                    <span
                      key={label}
                      className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {card.metadata?.blockers && card.metadata.blockers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Blockers
                </h3>
                <div className="space-y-2">
                  {card.metadata.blockers.map((blocker, i) => (
                    <div
                      key={i}
                      className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700"
                    >
                      {blocker}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delete Card Section */}
            <div className="pt-4 mt-4 border-t border-slate-200">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Card
                </button>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 mb-3">
                    Are you sure you want to delete this card? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (onDelete) {
                          setIsDeleting(true);
                          onDelete(card.id);
                        }
                      }}
                      disabled={isDeleting}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === 'agents' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Available Agents for Lane {currentLaneNumber}
              </h3>
              <div className="space-y-2">
                {availableAgents.map((agentName) => {
                  const info = AGENT_INFO[agentName] || { displayName: agentName, provider: 'Unknown', model: 'Unknown' };
                  const status = card.agentStatus?.find(s => s.agentName === agentName);

                  return (
                    <div
                      key={agentName}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          status?.status === 'running' ? 'bg-blue-100' :
                          status?.status === 'success' ? 'bg-green-100' :
                          status?.status === 'error' ? 'bg-red-100' : 'bg-slate-100'
                        }`}>
                          <Bot className={`h-5 w-5 ${
                            status?.status === 'running' ? 'text-blue-600 animate-pulse' :
                            status?.status === 'success' ? 'text-green-600' :
                            status?.status === 'error' ? 'text-red-600' : 'text-slate-500'
                          }`} />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-slate-900">{info.displayName}</div>
                          <div className="text-xs text-slate-500">{info.provider} • {info.model}</div>
                        </div>
                      </div>
                      {/* Status indicator instead of Run button */}
                      <div className="flex items-center gap-2">
                        {status?.status === 'running' ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${status.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-blue-600">{status.progress || 0}%</span>
                          </div>
                        ) : status?.status === 'success' ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-xs text-green-600 font-medium">Complete</span>
                          </div>
                        ) : status?.status === 'error' ? (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <span className="text-xs text-red-600 font-medium">Error</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded-full bg-slate-300" />
                            <span className="text-xs text-slate-500">Idle</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Start Agent Button - triggers first idle agent */}
            {(() => {
              const isAnyRunning = availableAgents.some(
                (agentName) => card.agentStatus?.find(s => s.agentName === agentName)?.status === 'running'
              );
              const firstIdleAgent = availableAgents.find(
                (agentName) => {
                  const status = card.agentStatus?.find(s => s.agentName === agentName);
                  return !status || (status.status !== 'running' && status.status !== 'success');
                }
              );

              return (
                <div className="pt-2 border-t border-slate-200">
                  <button
                    onClick={() => firstIdleAgent && onRunAgent?.(card.id, firstIdleAgent)}
                    disabled={isAnyRunning || !firstIdleAgent}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isAnyRunning
                        ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                        : !firstIdleAgent
                        ? 'bg-green-100 text-green-600 cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isAnyRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Agent Running...
                      </>
                    ) : !firstIdleAgent ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        All Agents Complete
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Start Agent
                      </>
                    )}
                  </button>
                  {firstIdleAgent && !isAnyRunning && (
                    <p className="text-xs text-slate-500 text-center mt-1.5">
                      Will run: {AGENT_INFO[firstIdleAgent]?.displayName || firstIdleAgent}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Review with CoPilot Button */}
            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={() => onReviewContext?.(card.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Bot className="h-4 w-4" />
                Review with CoPilot
              </button>
            </div>

            {card.agentStatus && card.agentStatus.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Agent Activity</h3>
                <div className="space-y-2">
                  {card.agentStatus.map((status, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm text-slate-700">{status.agentName}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${
                          status.status === 'running' ? 'text-blue-600' :
                          status.status === 'success' ? 'text-green-600' :
                          status.status === 'error' ? 'text-red-600' : 'text-slate-500'
                        }`}>
                          {status.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(status.lastUpdate).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terminal - Always rendered but hidden when not active to preserve state */}
        <div className={`h-full -m-4 flex flex-col ${activeSection === 'terminal' ? '' : 'hidden'}`}>
          {/* Terminal placeholder - will connect to Terminal Gateway */}
          <XTerminal
            sessionId={terminalSessionId}
            projectId={(card as any).projectId || card.id}
          />
          {!terminalSessionId && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1a1b26]/90 z-10">
              <div className="text-center p-6">
                <Terminal className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400 text-sm mb-3">Dev Environment Terminal</p>
                <button
                  onClick={async () => {
                    console.log('[Terminal] Button clicked - starting session creation');
                    try {
                      const projectId = (card as any).projectId || card.id;
                      console.log('[Terminal] Project ID:', projectId);
                      // Use same hostname as current page to avoid CORS issues
                      const terminalGatewayUrl = `http://${window.location.hostname}:8005/api/terminal/sessions`;
                      console.log('[Terminal] Fetching', terminalGatewayUrl);
                      const response = await fetch(terminalGatewayUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          projectId,
                          userId: 'current-user',
                        }),
                      });
                      console.log('[Terminal] Response status:', response.status);
                      if (response.ok) {
                        const data = await response.json();
                        console.log('[Terminal] Session created successfully:', data);
                        setTerminalSessionId(data.id);
                        console.log('[Terminal] Set session ID to:', data.id);
                      } else {
                        const errorText = await response.text();
                        console.error('[Terminal] Failed to create session:', response.status, errorText);
                        alert(`Failed to create terminal session: ${response.status} - ${errorText}`);
                      }
                    } catch (error) {
                      console.error('[Terminal] Error creating session:', error);
                      alert(`Terminal gateway error: ${error instanceof Error ? error.message : String(error)}`);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Start Terminal Session
                </button>
                <p className="text-xs text-gray-500 mt-3">
                  Requires Terminal Gateway service (port 8005)
                </p>
              </div>
            </div>
          )}
        </div>

        {activeSection === 'review' && (
          <div className="space-y-4">
            {/* Review Status Banner */}
            {cardWithReview.reviewStatus && (
              <div className={`p-4 rounded-lg border ${
                cardWithReview.reviewStatus === 'pending' ? 'bg-orange-50 border-orange-200' :
                cardWithReview.reviewStatus === 'approved' ? 'bg-green-50 border-green-200' :
                cardWithReview.reviewStatus === 'rejected' ? 'bg-red-50 border-red-200' :
                cardWithReview.reviewStatus === 'needs_revision' ? 'bg-amber-50 border-amber-200' :
                'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  {cardWithReview.reviewStatus === 'pending' && <Clock className="h-5 w-5 text-orange-600" />}
                  {cardWithReview.reviewStatus === 'approved' && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {cardWithReview.reviewStatus === 'rejected' && <AlertCircle className="h-5 w-5 text-red-600" />}
                  {cardWithReview.reviewStatus === 'needs_revision' && <RotateCcw className="h-5 w-5 text-amber-600" />}
                  <div>
                    <div className={`font-medium ${
                      cardWithReview.reviewStatus === 'pending' ? 'text-orange-700' :
                      cardWithReview.reviewStatus === 'approved' ? 'text-green-700' :
                      cardWithReview.reviewStatus === 'rejected' ? 'text-red-700' :
                      cardWithReview.reviewStatus === 'needs_revision' ? 'text-amber-700' :
                      'text-slate-700'
                    }`}>
                      {cardWithReview.reviewStatus === 'pending' && 'Pending Review'}
                      {cardWithReview.reviewStatus === 'approved' && 'Approved'}
                      {cardWithReview.reviewStatus === 'rejected' && 'Rejected'}
                      {cardWithReview.reviewStatus === 'needs_revision' && 'Needs Revision'}
                    </div>
                    {cardWithReview.reviewNotes && (
                      <div className="text-sm text-slate-600 mt-1">{cardWithReview.reviewNotes}</div>
                    )}
                    {cardWithReview.approvedAt && (
                      <div className="text-xs text-slate-500 mt-1">
                        Approved on {new Date(cardWithReview.approvedAt).toLocaleString()}
                      </div>
                    )}
                    {cardWithReview.rejectedAt && (
                      <div className="text-xs text-slate-500 mt-1">
                        Rejected on {new Date(cardWithReview.rejectedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Review Actions */}
            {(!cardWithReview.reviewStatus || cardWithReview.reviewStatus === 'pending') && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Review Actions</h3>

                <div>
                  <label className="block text-sm text-slate-600 mb-2">Review Notes (optional)</label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about your review decision..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows={3}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  {/* Approve Section */}
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm text-green-700">Approve</span>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-green-700">
                        <input
                          type="checkbox"
                          checked={advanceOnApprove}
                          onChange={(e) => setAdvanceOnApprove(e.target.checked)}
                          className="rounded text-green-600"
                        />
                        Advance to next lane
                      </label>
                    </div>
                    <button
                      onClick={() => {
                        setIsReviewPending(true);
                        onApprove?.(card.id, { notes: reviewNotes, advance: advanceOnApprove });
                        setTimeout(() => setIsReviewPending(false), 1000);
                      }}
                      disabled={isReviewPending}
                      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                    >
                      {isReviewPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                      Approve Card
                    </button>
                  </div>

                  {/* Reject Section */}
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-sm text-red-700">Reject</span>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-red-700">
                        <input
                          type="checkbox"
                          checked={returnOnReject}
                          onChange={(e) => setReturnOnReject(e.target.checked)}
                          className="rounded text-red-600"
                        />
                        Return to previous lane
                      </label>
                    </div>
                    <button
                      onClick={() => {
                        setIsReviewPending(true);
                        onReject?.(card.id, { notes: reviewNotes, returnToPrevious: returnOnReject });
                        setTimeout(() => setIsReviewPending(false), 1000);
                      }}
                      disabled={isReviewPending}
                      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                    >
                      {isReviewPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                      Reject Card
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {activeSection === 'history' && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Card History</h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
              <div className="space-y-4">
                {mockHistory.map((event, i) => (
                  <div key={i} className="relative flex items-start gap-4 pl-10">
                    <div className="absolute left-2.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">{event.action}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {LANE_NAMES[event.lane]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'context' && (
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

            {/* Approval Section */}
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onApprove?.(card.id, {
                      notes: 'Approved via Context tab',
                      advance: true,
                    });
                  }}
                  disabled={isAgentResponding}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve & Advance
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
                Approve to move the card to the next lane, or request changes to continue the conversation.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Resize Handle - Bottom Right Corner */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-200/50 rounded-tl"
        onMouseDown={handleResizeStart}
        style={{ touchAction: 'none' }}
      >
        <svg
          className="w-4 h-4 text-slate-400"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M14 14H10L14 10V14ZM14 7L7 14H10L14 10V7ZM14 4L4 14H7L14 7V4Z" />
        </svg>
      </div>

      {/* Resize Handles - Edges */}
      <div
        className="absolute bottom-0 left-4 right-4 h-1 cursor-s-resize hover:bg-blue-200/30"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsResizing(true);
          setResizeStart({ x: e.clientX, y: e.clientY, width: size.width, height: size.height });
        }}
      />
      <div
        className="absolute top-12 bottom-4 right-0 w-1 cursor-e-resize hover:bg-blue-200/30"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsResizing(true);
          setResizeStart({ x: e.clientX, y: e.clientY, width: size.width, height: size.height });
        }}
      />
    </div>
  );
}
