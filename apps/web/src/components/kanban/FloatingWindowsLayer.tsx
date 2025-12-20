import { useFloatingCardsStore } from '../../stores/floatingCards';
import FloatingCardWindow from './FloatingCardWindow';

interface FloatingWindowsLayerProps {
  onRunAgent?: (cardId: string, agentName: string) => void;
  onReviewContext?: (cardId: string) => void;
  onApprove?: (cardId: string, data: { notes?: string; advance?: boolean }) => void;
  onReject?: (cardId: string, data: { notes?: string; returnToPrevious?: boolean }) => void;
  onMarkComplete?: (cardId: string) => void;
  onDelete?: (cardId: string) => void;
  agentLogs?: Record<string, { agentName: string; status: string; logs: string[] }[]>;
}

export default function FloatingWindowsLayer({
  onRunAgent,
  onReviewContext,
  onApprove,
  onReject,
  onMarkComplete,
  onDelete,
  agentLogs = {},
}: FloatingWindowsLayerProps) {
  const openCards = useFloatingCardsStore((state) => state.openCards);

  const floatingWindows = Object.values(openCards);

  if (floatingWindows.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[1000]">
      {floatingWindows.map((floatingState) => (
        <div key={floatingState.cardId} className="pointer-events-auto">
          <FloatingCardWindow
            floatingState={floatingState}
            onRunAgent={onRunAgent}
            onReviewContext={onReviewContext}
            onApprove={onApprove}
            onReject={onReject}
            onMarkComplete={onMarkComplete}
            onDelete={onDelete}
            agentLogs={agentLogs[floatingState.cardId]}
          />
        </div>
      ))}
    </div>
  );
}
