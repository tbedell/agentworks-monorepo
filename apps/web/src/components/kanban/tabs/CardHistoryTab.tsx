import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';

interface HistoryEvent {
  date: string;
  action: string;
  details: string | null;
  lane: string;
  performedBy: string;
}

interface CardHistoryEntry {
  id: string;
  cardId: string;
  action: string;
  previousValue: string | null;
  newValue: string | null;
  performedBy: string;
  details: string | null;
  metadata: Record<string, any> | null;
  timestamp: string;
}

interface CardData {
  id: string;
  laneId: string;
  dates: {
    created: string;
    updated: string;
  };
}

interface CardHistoryTabProps {
  card: CardData;
  isActive: boolean;
}

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

export default function CardHistoryTab({ card, isActive }: CardHistoryTabProps) {
  const [cardHistory, setCardHistory] = useState<CardHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const isInitialFetch = useRef(true);

  // Compute history to display: use real history from DB if available, fall back to basic dates
  const displayHistory: HistoryEvent[] = cardHistory.length > 0
    ? cardHistory.map(h => ({
        date: h.timestamp,
        action: h.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        details: h.details,
        lane: h.newValue || card.laneId,
        performedBy: h.performedBy,
      }))
    : [
        { date: card.dates.created, action: 'Created', details: null, lane: 'lane-0', performedBy: 'system' },
        ...(card.dates.updated !== card.dates.created
          ? [{ date: card.dates.updated, action: 'Updated', details: null, lane: card.laneId, performedBy: 'system' }]
          : []),
      ];

  // Fetch card history when tab becomes active, with polling for real-time updates
  useEffect(() => {
    if (!isActive) {
      // Reset initial fetch flag when tab becomes inactive
      isInitialFetch.current = true;
      return;
    }

    const fetchHistory = async () => {
      // Only show loading spinner on initial load
      if (isInitialFetch.current) {
        setIsLoadingHistory(true);
      }
      try {
        const response = await api.cards.getHistory(card.id);
        setCardHistory(response.history);
        isInitialFetch.current = false;
      } catch (err) {
        console.error('Failed to fetch card history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    // Initial fetch
    fetchHistory();

    // Set up polling interval (every 3 seconds)
    const intervalId = setInterval(fetchHistory, 3000);

    // Cleanup on unmount or when tab becomes inactive
    return () => clearInterval(intervalId);
  }, [isActive, card.id]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Card History</h3>
      {isLoadingHistory ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
          <div className="space-y-4">
            {displayHistory.map((event, i) => (
              <div key={i} className="relative flex items-start gap-4 pl-10">
                <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${
                  event.action.toLowerCase().includes('approved') ? 'bg-green-500' :
                  event.action.toLowerCase().includes('rejected') ? 'bg-red-500' :
                  event.action.toLowerCase().includes('created') ? 'bg-blue-500' :
                  event.action.toLowerCase().includes('lane') ? 'bg-purple-500' :
                  'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">{event.action}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.lane && LANE_NAMES[event.lane] && (
                      <span className="text-xs text-slate-500">
                        {LANE_NAMES[event.lane]}
                      </span>
                    )}
                    {event.performedBy && event.performedBy !== 'system' && (
                      <span className="text-xs text-slate-400">
                        by {event.performedBy === 'copilot' ? 'CoPilot' : event.performedBy}
                      </span>
                    )}
                  </div>
                  {event.details && (
                    <p className="text-xs text-slate-600 mt-1">{event.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
