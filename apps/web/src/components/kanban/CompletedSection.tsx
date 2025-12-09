import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { Card } from './types';

interface CompletedSectionProps {
  cards: Card[];
  onCardClick: (card: Card) => void;
}

export default function CompletedSection({ cards, onCardClick }: CompletedSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (cards.length === 0) {
    return null;
  }

  // Sort by completion date (newest first)
  const sortedCards = [...cards].sort((a, b) => {
    const dateA = a.dates?.completedDate ? new Date(a.dates.completedDate).getTime() : 0;
    const dateB = b.dates?.completedDate ? new Date(b.dates.completedDate).getTime() : 0;
    return dateB - dateA;
  });

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex-shrink-0 w-72 bg-green-50 rounded-lg border border-green-200">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 bg-green-100 rounded-t-lg hover:bg-green-150 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-green-800">Completed</span>
          <span className="text-sm text-green-600 bg-green-200 px-2 py-0.5 rounded-full">
            {cards.length}
          </span>
        </div>
        {collapsed ? (
          <ChevronRight className="h-5 w-5 text-green-600" />
        ) : (
          <ChevronDown className="h-5 w-5 text-green-600" />
        )}
      </button>

      {!collapsed && (
        <div className="p-2 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {sortedCards.map((card) => (
            <div
              key={card.id}
              onClick={() => onCardClick(card)}
              className="bg-white rounded-lg border border-green-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {card.title}
                  </h4>
                  {card.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {card.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(card.dates?.completedDate)}</span>
                  </div>
                </div>
              </div>

              {card.assignedAgents && card.assignedAgents.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {card.assignedAgents.map((agent) => (
                    <span
                      key={agent}
                      className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
