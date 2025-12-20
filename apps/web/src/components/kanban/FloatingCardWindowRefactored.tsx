import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Minus, Maximize2, Bot } from 'lucide-react';
import { api } from '../../lib/api';
import { useFloatingCardsStore, FloatingCardState } from '../../stores/floatingCards';
import { useQueryClient } from '@tanstack/react-query';
import {
  CardDetailsTab,
  CardAgentsTab,
  CardTerminalTab,
  CardReviewTab,
  CardHistoryTab,
  CardContextTab,
} from './tabs';

interface FloatingCardWindowProps {
  floatingState: FloatingCardState;
  onRunAgent?: (cardId: string, agentName: string) => void;
  onReviewContext?: (cardId: string) => void;
  onApprove?: (cardId: string, data: { notes?: string; advance?: boolean }) => void;
  onReject?: (cardId: string, data: { notes?: string; returnToPrevious?: boolean }) => void;
  onDelete?: (cardId: string) => void;
}

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

export default function FloatingCardWindowRefactored({
  floatingState,
  onRunAgent,
  onReviewContext,
  onApprove,
  onReject,
  onDelete,
}: FloatingCardWindowProps) {
  const { card, position, size, minimized, zIndex } = floatingState;
  const { closeCard, updatePosition, updateSize, minimizeCard, restoreCard, bringToFront, updateCardData } =
    useFloatingCardsStore();
  const queryClient = useQueryClient();

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [activeSection, setActiveSection] = useState<'details' | 'agents' | 'review' | 'history' | 'context' | 'terminal'>('details');
  const [isApproving, setIsApproving] = useState(false);
  const [activeAgents, setActiveAgents] = useState<{name: string; status: string}[]>([]);
  const windowRef = useRef<HTMLDivElement>(null);

  const currentLaneNumber = parseInt(card.laneId.replace('lane-', ''));
  const projectId = (card as any).projectId;
  const documentType = (card.metadata as any)?.documentType as 'blueprint' | 'prd' | 'mvp' | 'playbook' | undefined;
  const isReviewCard = currentLaneNumber === 6 && documentType;

  // Extended card type for review properties
  const cardWithReview = card as typeof card & {
    reviewStatus?: string | null;
    approvedAt?: string | null;
    rejectedAt?: string | null;
    reviewNotes?: string | null;
  };

  // Handle card approval - directly calls API and updates state
  const handleApproveCard = async () => {
    if (!projectId || !documentType || isApproving) return;

    setIsApproving(true);
    try {
      // 1. Log approval to context file
      await api.copilot.contextChat({
        cardId: card.id,
        message: `APPROVED - Human approved this ${documentType} document`,
      });

      // 2. Call the approve-review endpoint
      const result = await api.copilot.approveReviewCard({
        projectId,
        documentType,
      });

      // 3. Update card in floating cards store to reflect new lane
      if (result.card) {
        updateCardData(card.id, {
          ...card,
          laneId: 'lane-7', // Complete lane
        });
      }

      // 4. Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['todos'] });

      // 5. Also call onApprove callback if provided (for backwards compatibility)
      onApprove?.(card.id, { notes: 'Approved via FloatingCardWindow', advance: true });

      // 6. Close the card window
      closeCard(card.id);
    } catch (error) {
      console.error('Failed to approve card:', error);
    } finally {
      setIsApproving(false);
    }
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

  // Update active agents from card's agentStatus
  useEffect(() => {
    if (card.agentStatus) {
      setActiveAgents(
        card.agentStatus.map((s) => ({ name: s.agentName, status: s.status }))
      );
    }
  }, [card.agentStatus]);

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
          <CardDetailsTab card={card} onDelete={onDelete} />
        )}

        {activeSection === 'agents' && (
          <CardAgentsTab
            card={card}
            onRunAgent={onRunAgent}
            onReviewContext={onReviewContext}
          />
        )}

        {/* Terminal - Always rendered but hidden when not active to preserve state */}
        <CardTerminalTab
          card={{ id: card.id, projectId }}
          isActive={activeSection === 'terminal'}
        />

        {activeSection === 'review' && (
          <CardReviewTab
            card={{
              ...card,
              projectId,
              reviewStatus: cardWithReview.reviewStatus,
              approvedAt: cardWithReview.approvedAt,
              rejectedAt: cardWithReview.rejectedAt,
              reviewNotes: cardWithReview.reviewNotes,
              metadata: { documentType },
            }}
            onApprove={onApprove}
            onReject={onReject}
            onApproveReviewCard={isReviewCard ? handleApproveCard : undefined}
            isApproving={isApproving}
          />
        )}

        {activeSection === 'history' && (
          <CardHistoryTab
            card={{
              id: card.id,
              laneId: card.laneId,
              dates: card.dates,
            }}
            isActive={activeSection === 'history'}
          />
        )}

        {activeSection === 'context' && (
          <CardContextTab
            card={{
              id: card.id,
              laneId: card.laneId,
              projectId,
              assignedAgents: card.assignedAgents,
              agentStatus: card.agentStatus,
              metadata: { documentType },
            }}
            isActive={activeSection === 'context'}
            onApproveReviewCard={isReviewCard ? handleApproveCard : undefined}
            isApproving={isApproving}
          />
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
