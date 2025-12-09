import { ReactNode } from 'react';
import { FolderPlus, Bot } from 'lucide-react';
import clsx from 'clsx';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  tourTarget?: string;
  large?: boolean;
  className?: string;
  children?: ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  tourTarget,
  large = false,
  className,
  children
}: EmptyStateProps) {
  return (
    <div className={clsx(
      'text-center',
      large ? 'py-20' : 'py-12',
      className
    )}>
      {Icon && (
        <div className={clsx(
          'bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6',
          large ? 'h-20 w-20' : 'h-12 w-12'
        )}>
          <Icon className={clsx(
            'text-blue-600',
            large ? 'h-10 w-10' : 'h-6 w-6'
          )} />
        </div>
      )}
      
      <h3 className={clsx(
        'font-bold text-slate-900 mb-2',
        large ? 'text-2xl' : 'text-lg'
      )}>{title}</h3>
      
      {description && (
        <p className={clsx(
          'text-slate-600 mb-6 mx-auto',
          large ? 'max-w-lg text-base' : 'max-w-sm'
        )}>{description}</p>
      )}

      {children}

      <div className="flex items-center justify-center gap-3">
        {action && (
          <button
            onClick={action.onClick}
            data-tour={tourTarget}
            className={clsx(
              'inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg',
              large ? 'px-6 py-3 font-semibold' : 'px-4 py-2'
            )}
          >
            <FolderPlus className={large ? 'h-5 w-5' : 'h-4 w-4'} />
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="inline-flex items-center gap-2 text-slate-600 font-medium hover:text-slate-900 transition-colors"
          >
            <Bot className="h-5 w-5" />
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}