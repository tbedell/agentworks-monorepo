import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
  className?: string;
}

export function BulkActionBar({ selectedCount, onClear, actions, className }: BulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-slate-900 text-white rounded-lg shadow-xl',
        'flex items-center gap-4 px-4 py-3',
        'animate-in slide-in-from-bottom-4 fade-in duration-200',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="bg-blue-600 text-white text-sm font-medium px-2.5 py-1 rounded-md">
          {selectedCount}
        </span>
        <span className="text-sm text-slate-300">
          {selectedCount === 1 ? 'item selected' : 'items selected'}
        </span>
      </div>

      <div className="h-6 w-px bg-slate-700" />

      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              action.disabled && 'opacity-50 cursor-not-allowed',
              action.variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            )}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      <div className="h-6 w-px bg-slate-700" />

      <button
        onClick={onClear}
        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <X className="w-4 h-4" />
        Clear
      </button>
    </div>
  );
}
