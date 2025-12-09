import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from './types';
import { Clock, User, AlertCircle, CheckCircle, Play, Pause, Loader2 } from 'lucide-react';

interface KanbanCardProps {
  card: Card;
  onClick: (card: Card) => void;
  isDragging?: boolean;
  cardNumber?: number;
  onRunCard?: (cardId: string) => void;
}

// Execution state types and helpers
type ExecutionState = 'not_started' | 'running' | 'done' | 'error';

function getCardExecutionState(card: Card): ExecutionState {
  const agentStatus = card.agentStatus;
  if (!agentStatus || agentStatus.length === 0) return 'not_started';

  // Check for any error first
  if (agentStatus.some(s => s.status === 'error')) return 'error';
  // Check for any running
  if (agentStatus.some(s => s.status === 'running')) return 'running';
  // Check for any success (means at least one agent has completed)
  if (agentStatus.some(s => s.status === 'success')) return 'done';

  return 'not_started';
}

const executionStateColors = {
  not_started: 'bg-white border-slate-200 hover:border-slate-300',
  running: 'bg-pink-50 border-pink-300 hover:border-pink-400',
  done: 'bg-lime-50 border-lime-300 hover:border-lime-400',
  error: 'bg-red-50 border-red-300 hover:border-red-400',
};

const priorityColors = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const typeColors = {
  feature: 'bg-green-100 text-green-700',
  bug: 'bg-red-100 text-red-700',
  task: 'bg-blue-100 text-blue-700',
  epic: 'bg-purple-100 text-purple-700',
  story: 'bg-indigo-100 text-indigo-700',
};

const AgentStatusIndicator: React.FC<{ agentStatus?: Card['agentStatus'] }> = ({ agentStatus }) => {
  if (!agentStatus || agentStatus.length === 0) return null;

  const activeAgent = agentStatus.find(status => status.status !== 'idle') || agentStatus[0];

  const statusIcon = {
    idle: <Pause className="w-3 h-3" />,
    running: <Play className="w-3 h-3 animate-pulse" />,
    success: <CheckCircle className="w-3 h-3" />,
    error: <AlertCircle className="w-3 h-3" />,
  };

  const statusColors = {
    idle: 'text-slate-400',
    running: 'text-blue-500',
    success: 'text-green-500',
    error: 'text-red-500',
  };

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className={statusColors[activeAgent.status]}>
        {statusIcon[activeAgent.status]}
      </span>
      <span className="text-slate-600 truncate">{activeAgent.agentName}</span>
      {activeAgent.progress !== undefined && activeAgent.status === 'running' && (
        <div className="w-8 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${activeAgent.progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default function KanbanCard({ card, onClick, isDragging = false, cardNumber, onRunCard }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const executionState = getCardExecutionState(card);

  const cardClasses = `
    group relative rounded-lg border p-3 cursor-pointer
    hover:shadow-sm transition-all duration-200
    ${executionStateColors[executionState]}
    ${isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''}
  `;

  const handleRunClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRunCard?.(card.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cardClasses}
      onClick={() => onClick(card)}
    >
      {/* Card number badge */}
      {cardNumber !== undefined && (
        <span className="absolute top-2 left-2 text-xs text-slate-400 font-mono bg-white/80 px-1.5 py-0.5 rounded z-10">
          #{cardNumber}
        </span>
      )}

      {/* Run button - visible on hover */}
      {onRunCard && (
        <button
          onClick={handleRunClick}
          disabled={executionState === 'running'}
          className={`absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
            executionState === 'running'
              ? 'bg-pink-200 text-pink-600 cursor-not-allowed'
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          }`}
          title={executionState === 'running' ? 'Agent running...' : 'Run all assigned agents'}
        >
          {executionState === 'running' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
      )}
      <div className="flex items-start justify-between mb-2">
        <div className="flex gap-1">
          <span className={`px-2 py-1 text-xs font-medium rounded ${typeColors[card.type]}`}>
            {card.type}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded ${priorityColors[card.priority]}`}>
            {card.priority}
          </span>
        </div>
        {card.metadata?.estimatedPoints && (
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {card.metadata.estimatedPoints}pts
          </span>
        )}
      </div>

      <h4 className="font-medium text-slate-900 mb-1 line-clamp-2">
        {card.title}
      </h4>

      {card.description && (
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
          {card.description}
        </p>
      )}

      <AgentStatusIndicator agentStatus={card.agentStatus} />

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {(card.assignedAgents?.length > 0 || (card as any).assignedAgent) && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <User className="w-3 h-3" />
              <span>{card.assignedAgents?.length || ((card as any).assignedAgent ? 1 : 0)}</span>
            </div>
          )}
          {card.metadata?.comments && card.metadata.comments > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span>💬</span>
              <span>{card.metadata.comments}</span>
            </div>
          )}
          {card.metadata?.attachments && card.metadata.attachments > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span>📎</span>
              <span>{card.metadata.attachments}</span>
            </div>
          )}
        </div>

        {card.dates?.dueDate && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            <span>
              {new Date(card.dates.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        )}
      </div>

      {card.metadata?.labels && card.metadata.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {card.metadata.labels.slice(0, 3).map((label) => (
            <span 
              key={label}
              className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded"
            >
              {label}
            </span>
          ))}
          {card.metadata.labels.length > 3 && (
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">
              +{card.metadata.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {card.metadata?.blockers && card.metadata.blockers.length > 0 && (
        <div className="mt-2 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          {card.metadata.blockers.length} blocker{card.metadata.blockers.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}