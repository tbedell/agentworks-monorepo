import { List, Grid2x2, KanbanSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'list' | 'card' | 'kanban';

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  availableViews?: ViewMode[];
}

const viewConfig: Record<ViewMode, { icon: typeof List; label: string }> = {
  list: { icon: List, label: 'List' },
  card: { icon: Grid2x2, label: 'Card' },
  kanban: { icon: KanbanSquare, label: 'Kanban' },
};

export function ViewToggle({
  view,
  onChange,
  availableViews = ['list', 'card', 'kanban'],
}: ViewToggleProps) {
  return (
    <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
      {availableViews.map((v) => {
        const { icon: Icon, label } = viewConfig[v];
        const isActive = view === v;

        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
            title={label}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
