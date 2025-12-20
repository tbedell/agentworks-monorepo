import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BaseLeftPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  title: string;
  agentButton?: ReactNode;
  bottomContent?: ReactNode;
  children: ReactNode;
}

export default function BaseLeftPanel({
  collapsed,
  onToggle,
  title,
  agentButton,
  bottomContent,
  children,
}: BaseLeftPanelProps) {
  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-r-lg shadow-lg hover:bg-blue-700 transition-all z-40 group"
      >
        <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
      </button>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full">
      {/* Header with optional agent badge */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          {agentButton}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title="Hide panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable accordion content */}
      <div className="overflow-auto shrink-0" style={{ maxHeight: bottomContent ? '40%' : undefined, flex: bottomContent ? undefined : 1 }}>
        {children}
      </div>

      {/* Bottom content - takes remaining space */}
      {bottomContent && (
        <div className="flex-1 border-t border-slate-200 flex flex-col min-h-0">
          {bottomContent}
        </div>
      )}
    </div>
  );
}
