import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Lane, Card } from './types';
import KanbanCard from './KanbanCard';
import { Plus, Settings } from 'lucide-react';

interface KanbanLaneProps {
  lane: Lane;
  onCardClick: (card: Card) => void;
  onAddCard?: () => void;
  onLaneSettings?: () => void;
  cardNumbers?: Map<string, number>;
  onRunCard?: (cardId: string) => void;
}

export default function KanbanLane({
  lane,
  onCardClick,
  onAddCard,
  onLaneSettings,
  cardNumbers,
  onRunCard,
}: KanbanLaneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: lane.id,
  });

  const wipLimitReached = lane.wipLimit && lane.cards.length >= lane.wipLimit;
  const wipLimitWarning = lane.wipLimit && lane.cards.length >= lane.wipLimit * 0.8;

  const headerStyle = {
    backgroundColor: lane.color,
    opacity: 0.1,
  };

  const borderStyle = {
    borderTopColor: lane.color,
  };

  return (
    <div className="flex-shrink-0 w-72">
      <div className={`bg-white rounded-lg border-2 h-full flex flex-col ${
        isOver ? 'border-blue-300 bg-blue-50' : 'border-slate-200'
      }`}>
        {/* Lane Header */}
        <div 
          className="relative p-4 border-t-4 rounded-t-lg"
          style={borderStyle}
        >
          <div 
            className="absolute inset-0 rounded-t-lg"
            style={headerStyle}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span 
                  className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: lane.color }}
                >
                  {lane.position}
                </span>
                <h3 className="font-semibold text-slate-900 truncate text-sm">
                  {lane.name}
                </h3>
                <span className="text-xs text-slate-500 shrink-0">
                  {lane.cards.length}
                  {lane.wipLimit && `/${lane.wipLimit}`}
                </span>
              </div>
              {lane.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {lane.description}
                </p>
              )}
              {lane.agentTypes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {lane.agentTypes.slice(0, 2).map((agentType) => (
                    <span 
                      key={agentType}
                      className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded"
                    >
                      {agentType.replace('_', ' ')}
                    </span>
                  ))}
                  {lane.agentTypes.length > 2 && (
                    <span className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-500 rounded">
                      +{lane.agentTypes.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={onAddCard}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                title="Add card"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={onLaneSettings}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                title="Lane settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* WIP Limit Warning */}
          {wipLimitWarning && (
            <div className={`mt-2 px-2 py-1 text-xs rounded ${
              wipLimitReached 
                ? 'bg-red-100 text-red-700 border border-red-200' 
                : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
            }`}>
              {wipLimitReached 
                ? `WIP limit reached (${lane.wipLimit})` 
                : `Approaching WIP limit (${lane.wipLimit})`
              }
            </div>
          )}
        </div>

        {/* Cards Container */}
        <div 
          ref={setNodeRef}
          className={`flex-1 p-3 space-y-3 overflow-y-auto min-h-32 ${
            isOver ? 'bg-blue-25' : ''
          }`}
        >
          <SortableContext items={lane.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {lane.cards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                onClick={onCardClick}
                cardNumber={cardNumbers?.get(card.id)}
                onRunCard={onRunCard}
              />
            ))}
          </SortableContext>
          
          {/* Empty State */}
          {lane.cards.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <div className="text-sm">No cards in this lane</div>
              {onAddCard && (
                <button
                  onClick={onAddCard}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add a card
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}