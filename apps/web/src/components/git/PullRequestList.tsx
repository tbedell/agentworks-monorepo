import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

interface PullRequest {
  number: number;
  html_url: string;
  title: string;
  state: string;
  draft: boolean;
  user: { login: string; avatar_url: string };
  head: { ref: string };
  base: { ref: string };
  created_at: string;
  updated_at: string;
}

interface PullRequestListProps {
  projectId: string;
  className?: string;
  onCreatePR?: () => void;
}

export default function PullRequestList({ projectId, className = '', onCreatePR }: PullRequestListProps) {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [mergingPR, setMergingPR] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPullRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.pullRequests.list(projectId, { state: stateFilter });
      setPullRequests(data.pullRequests || []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch pull requests';
      if (message.includes('No repository connected') || message.includes('GitHub not connected')) {
        setPullRequests([]);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, stateFilter]);

  useEffect(() => {
    fetchPullRequests();
  }, [fetchPullRequests]);

  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  const handleMerge = async (prNumber: number) => {
    setMergingPR(prNumber);
    try {
      await api.pullRequests.merge(projectId, prNumber, { mergeMethod: 'merge' });
      setActionMessage({ type: 'success', text: `PR #${prNumber} merged successfully` });
      await fetchPullRequests();
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to merge' });
    } finally {
      setMergingPR(null);
    }
  };

  const handleClose = async (prNumber: number) => {
    try {
      await api.pullRequests.update(projectId, prNumber, { state: 'closed' });
      setActionMessage({ type: 'success', text: `PR #${prNumber} closed` });
      await fetchPullRequests();
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to close' });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center text-gray-400">
          <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading pull requests...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-900 border border-red-700 rounded-lg p-4 ${className}`}>
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="text-white font-medium">Pull Requests</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as 'open' | 'closed' | 'all')}
            className="px-2 py-1 text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded focus:border-purple-500 focus:outline-none"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
          {onCreatePR && (
            <button
              onClick={onCreatePR}
              className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              New PR
            </button>
          )}
          <button
            onClick={fetchPullRequests}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Action message */}
      {actionMessage && (
        <div className={`px-4 py-2 text-sm ${actionMessage.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
          {actionMessage.text}
        </div>
      )}

      {/* PR List */}
      <div className="flex-1 overflow-auto">
        {pullRequests.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No {stateFilter === 'all' ? '' : stateFilter} pull requests
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {pullRequests.map((pr) => (
              <div key={pr.number} className="p-4 hover:bg-gray-800/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={pr.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-white hover:text-purple-400 truncate"
                      >
                        {pr.title}
                      </a>
                      {pr.draft && (
                        <span className="px-1.5 py-0.5 text-xs bg-gray-600 text-gray-200 rounded">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <span className={`px-1.5 py-0.5 rounded ${
                        pr.state === 'open' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                      }`}>
                        #{pr.number}
                      </span>
                      <span>{pr.head.ref} -&gt; {pr.base.ref}</span>
                      <span>by {pr.user.login}</span>
                      <span>{formatDate(pr.updated_at)}</span>
                    </div>
                  </div>
                  {pr.state === 'open' && !pr.draft && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMerge(pr.number)}
                        disabled={mergingPR === pr.number}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {mergingPR === pr.number ? 'Merging...' : 'Merge'}
                      </button>
                      <button
                        onClick={() => handleClose(pr.number)}
                        className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
