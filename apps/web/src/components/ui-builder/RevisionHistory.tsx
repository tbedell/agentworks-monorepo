import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  History,
  Clock,
  User,
  Image,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Bot,
} from 'lucide-react';
import { api } from '../../lib/api';

interface Revision {
  id: string;
  version: number;
  screenshot: string | null;
  createdBy: string | null;
  description: string | null;
  createdAt: string;
}

interface RevisionHistoryProps {
  projectId: string;
  builderType: 'ui' | 'db' | 'workflow';
  onSelectRevision: (revisionId: string) => void;
  onRestoreRevision?: (revisionId: string) => void;
  currentVersion?: number;
  className?: string;
}

/**
 * RevisionHistory displays a list of builder state revisions with thumbnails.
 * Allows users to preview and restore previous states.
 */
export function RevisionHistory({
  projectId,
  builderType,
  onSelectRevision,
  onRestoreRevision,
  currentVersion,
  className = '',
}: RevisionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const queryClient = useQueryClient();

  // Fetch revisions
  const { data, isLoading, error } = useQuery({
    queryKey: ['builder-revisions', projectId, builderType],
    queryFn: async () => {
      const response = await api.projects.getBuilderRevisions(projectId, builderType);
      return response;
    },
    enabled: !!projectId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (revisionId: string) => {
      return api.projects.restoreBuilderRevision(projectId, builderType, revisionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-revisions', projectId, builderType] });
      queryClient.invalidateQueries({ queryKey: ['builder-state', projectId, builderType] });
    },
  });

  const handleRestore = async (revisionId: string) => {
    if (onRestoreRevision) {
      onRestoreRevision(revisionId);
    } else {
      await restoreMutation.mutateAsync(revisionId);
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  };

  const isAgentCreated = (createdBy: string | null): boolean => {
    if (!createdBy) return false;
    // Check if createdBy looks like an agent name (contains underscore or is a known agent)
    return createdBy.includes('_') || createdBy.includes('agent') || createdBy.includes('copilot');
  };

  const revisions = data?.revisions || [];

  return (
    <div className={`bg-white border-l border-gray-200 flex flex-col ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-900">Revisions</span>
          {revisions.length > 0 && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
              {revisions.length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Revision List */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500 text-sm">
              Failed to load revisions
            </div>
          ) : revisions.length === 0 ? (
            <div className="p-8 text-center">
              <History className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No revisions yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Changes will be saved automatically
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {revisions.map((revision) => (
                <RevisionCard
                  key={revision.id}
                  revision={revision}
                  isCurrent={revision.version === currentVersion}
                  isAgentCreated={isAgentCreated(revision.createdBy)}
                  onSelect={() => onSelectRevision(revision.id)}
                  onRestore={() => handleRestore(revision.id)}
                  isRestoring={restoreMutation.isPending}
                  formatRelativeTime={formatRelativeTime}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface RevisionCardProps {
  revision: Revision;
  isCurrent: boolean;
  isAgentCreated: boolean;
  onSelect: () => void;
  onRestore: () => void;
  isRestoring: boolean;
  formatRelativeTime: (dateString: string) => string;
}

function RevisionCard({
  revision,
  isCurrent,
  isAgentCreated,
  onSelect,
  onRestore,
  isRestoring,
  formatRelativeTime,
}: RevisionCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`relative rounded-lg border transition-all ${
        isCurrent
          ? 'border-blue-300 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-blue-200'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <button
        onClick={onSelect}
        className="w-full p-2 text-left"
      >
        {/* Screenshot Thumbnail */}
        {revision.screenshot ? (
          <div className="mb-2 rounded overflow-hidden border border-gray-100">
            <img
              src={revision.screenshot}
              alt={`Version ${revision.version}`}
              className="w-full h-16 object-cover object-top"
            />
          </div>
        ) : (
          <div className="mb-2 h-16 bg-gray-100 rounded flex items-center justify-center">
            <Image className="h-6 w-6 text-gray-300" />
          </div>
        )}

        {/* Version & Meta */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-900">v{revision.version}</span>
            {isCurrent && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-medium">
                Current
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            {isAgentCreated ? (
              <Bot className="h-3 w-3" />
            ) : (
              <User className="h-3 w-3" />
            )}
          </div>
        </div>

        {/* Description */}
        {revision.description && (
          <p className="text-xs text-gray-600 truncate mb-1">{revision.description}</p>
        )}

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(revision.createdAt)}</span>
        </div>
      </button>

      {/* Restore Button */}
      {showActions && !isCurrent && (
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestore();
            }}
            disabled={isRestoring}
            className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Restore this version"
          >
            {isRestoring ? (
              <Loader2 className="h-3 w-3 animate-spin text-gray-500" />
            ) : (
              <RotateCcw className="h-3 w-3 text-gray-500" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default RevisionHistory;
