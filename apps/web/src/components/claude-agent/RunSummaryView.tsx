import {
  FileText,
  FileEdit,
  Terminal,
  BookOpen,
  CheckSquare,
  Layout,
  Database,
  GitBranch,
  AlertCircle,
} from 'lucide-react';
import type { RunSummaryViewProps } from './types';

function SummarySection({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
        <span className="text-gray-400">({items.length})</span>
      </div>
      <ul className="space-y-1">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RunSummaryView({ summary, className = '' }: RunSummaryViewProps) {
  const hasCardUpdates =
    summary.cardUpdates?.status ||
    summary.cardUpdates?.lane ||
    (summary.cardUpdates?.fieldsUpdated && summary.cardUpdates.fieldsUpdated.length > 0);

  const hasBuilderChanges =
    summary.builderChanges?.ui ||
    summary.builderChanges?.db ||
    summary.builderChanges?.workflow;

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      {/* Summary text */}
      {summary.summary && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="text-sm font-medium text-blue-800 mb-1">Summary</div>
          <p className="text-sm text-blue-700">{summary.summary}</p>
        </div>
      )}

      {/* Files Read */}
      <SummarySection
        title="Files Read"
        icon={FileText}
        items={summary.filesRead}
      />

      {/* Files Written */}
      <SummarySection
        title="Files Written"
        icon={FileEdit}
        items={summary.filesWritten}
      />

      {/* Commands Run */}
      <SummarySection
        title="Commands Run"
        icon={Terminal}
        items={summary.commandsRun}
      />

      {/* Docs Updated */}
      <SummarySection
        title="Documentation Updated"
        icon={BookOpen}
        items={summary.docsUpdated}
      />

      {/* Card Updates */}
      {hasCardUpdates && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <CheckSquare className="h-4 w-4" />
            <span>Card Updates</span>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            {summary.cardUpdates.status && (
              <div className="text-sm">
                <span className="text-gray-500">Status:</span>{' '}
                <span className="font-medium text-gray-700">{summary.cardUpdates.status}</span>
              </div>
            )}
            {summary.cardUpdates.lane && (
              <div className="text-sm">
                <span className="text-gray-500">Lane:</span>{' '}
                <span className="font-medium text-gray-700">{summary.cardUpdates.lane}</span>
              </div>
            )}
            {summary.cardUpdates.fieldsUpdated && summary.cardUpdates.fieldsUpdated.length > 0 && (
              <div className="text-sm">
                <span className="text-gray-500">Fields:</span>{' '}
                <span className="font-mono text-gray-700">
                  {summary.cardUpdates.fieldsUpdated.join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Todo Changes */}
      {(summary.todoChanges?.added?.length > 0 || summary.todoChanges?.completed?.length > 0) && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <CheckSquare className="h-4 w-4" />
            <span>Todo Changes</span>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            {summary.todoChanges.added?.length > 0 && (
              <div>
                <span className="text-sm text-gray-500">Added:</span>
                <ul className="mt-1 space-y-1">
                  {summary.todoChanges.added.map((todo, idx) => (
                    <li key={idx} className="text-sm text-green-700 flex items-center gap-1">
                      <span className="text-green-500">+</span> {todo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.todoChanges.completed?.length > 0 && (
              <div>
                <span className="text-sm text-gray-500">Completed:</span>
                <ul className="mt-1 space-y-1">
                  {summary.todoChanges.completed.map((todo, idx) => (
                    <li key={idx} className="text-sm text-blue-700 flex items-center gap-1">
                      <CheckSquare className="h-3 w-3 text-blue-500" /> {todo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Builder Changes */}
      {hasBuilderChanges && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Layout className="h-4 w-4" />
            <span>Builder Changes</span>
          </div>
          <div className="flex gap-2">
            {summary.builderChanges.ui && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded flex items-center gap-1">
                <Layout className="h-3 w-3" /> UI Builder
              </span>
            )}
            {summary.builderChanges.db && (
              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded flex items-center gap-1">
                <Database className="h-3 w-3" /> DB Builder
              </span>
            )}
            {summary.builderChanges.workflow && (
              <span className="px-2 py-1 text-xs bg-teal-100 text-teal-700 rounded flex items-center gap-1">
                <GitBranch className="h-3 w-3" /> Workflow Builder
              </span>
            )}
          </div>
        </div>
      )}

      {/* Follow-up Items */}
      {summary.followUpItems?.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-orange-700 mb-2">
            <AlertCircle className="h-4 w-4" />
            <span>Follow-up Items</span>
          </div>
          <ul className="space-y-1">
            {summary.followUpItems.map((item, idx) => (
              <li
                key={idx}
                className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded flex items-start gap-2"
              >
                <span className="text-orange-400 mt-0.5">-</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {!summary.summary &&
        summary.filesRead.length === 0 &&
        summary.filesWritten.length === 0 &&
        summary.commandsRun.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No activity recorded in this run summary.
          </div>
        )}
    </div>
  );
}
