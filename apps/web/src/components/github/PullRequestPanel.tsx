import { useState, useEffect, useCallback } from 'react';
import {
  GitPullRequest,
  GitBranch,
  Plus,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  GitMerge,
  RefreshCw,
  AlertCircle,
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import clsx from 'clsx';
import { useGitHub, GitHubPullRequest, GitHubBranch } from '../../hooks/useGitHub';

interface PullRequestPanelProps {
  projectId: string;
  className?: string;
}

export default function PullRequestPanel({
  projectId,
  className
}: PullRequestPanelProps) {
  const { status, fetchPullRequests, fetchBranches, createPullRequest } = useGitHub();
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedPR, setExpandedPR] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [headBranch, setHeadBranch] = useState('');
  const [baseBranch, setBaseBranch] = useState('');

  const loadData = useCallback(async () => {
    if (!status?.connected) return;

    try {
      setIsLoading(true);
      setError(null);
      const [prs, branchList] = await Promise.all([
        fetchPullRequests(projectId),
        fetchBranches(projectId)
      ]);
      setPullRequests(prs);
      setBranches(branchList);

      // Set default base branch
      if (branchList.length > 0) {
        const defaultBranch = branchList.find(b => b.name === 'main' || b.name === 'master');
        if (defaultBranch) {
          setBaseBranch(defaultBranch.name);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [status?.connected, projectId, fetchPullRequests, fetchBranches]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePR = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    if (!headBranch) {
      setError('Please select a source branch');
      return;
    }
    if (!baseBranch) {
      setError('Please select a target branch');
      return;
    }
    if (headBranch === baseBranch) {
      setError('Source and target branches must be different');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      const pr = await createPullRequest(projectId, title, body, baseBranch, headBranch);
      setPullRequests([pr, ...pullRequests]);
      setShowCreateForm(false);
      setTitle('');
      setBody('');
      setHeadBranch('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PR');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusIcon = (pr: GitHubPullRequest) => {
    if (pr.merged_at) {
      return <GitMerge className="h-4 w-4 text-purple-500" />;
    }
    switch (pr.state) {
      case 'open':
        return <GitPullRequest className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (pr: GitHubPullRequest) => {
    if (pr.merged_at) {
      return (
        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">
          Merged
        </span>
      );
    }
    switch (pr.state) {
      case 'open':
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700">
            Open
          </span>
        );
      case 'closed':
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  if (!status?.connected) {
    return null;
  }

  return (
    <div className={clsx('bg-white rounded-lg border border-slate-200', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitPullRequest className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">Pull Requests</h3>
          {pullRequests.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
              {pullRequests.filter(pr => pr.state === 'open').length} open
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            title="Refresh"
          >
            <RefreshCw className={clsx('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md',
              'text-xs font-medium',
              showCreateForm
                ? 'bg-slate-200 text-slate-700'
                : 'bg-primary-600 text-white hover:bg-primary-700',
              'transition-colors duration-150'
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New PR</span>
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="PR title..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  From Branch
                </label>
                <select
                  value={headBranch}
                  onChange={(e) => setHeadBranch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select branch...</option>
                  {branches
                    .filter(b => b.name !== baseBranch)
                    .map(branch => (
                      <option key={branch.name} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Into Branch
                </label>
                <select
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select branch...</option>
                  {branches
                    .filter(b => b.name !== headBranch)
                    .map(branch => (
                      <option key={branch.name} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe your changes..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setError(null);
                }}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePR}
                disabled={isCreating}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md',
                  'text-sm font-medium',
                  'bg-primary-600 text-white hover:bg-primary-700',
                  'transition-colors duration-150',
                  isCreating && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isCreating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <GitPullRequest className="h-3.5 w-3.5" />
                )}
                Create Pull Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PR List */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading pull requests...</p>
          </div>
        ) : pullRequests.length === 0 ? (
          <div className="p-8 text-center">
            <GitPullRequest className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No pull requests yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Create your first pull request above
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pullRequests.map((pr) => (
              <div key={pr.number} className="hover:bg-slate-50">
                <button
                  onClick={() => setExpandedPR(expandedPR === pr.number ? null : pr.number)}
                  className="w-full px-4 py-3 text-left"
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(pr)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-slate-900 truncate">
                          {pr.title}
                        </span>
                        {getStatusBadge(pr)}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          {pr.head.ref}
                          <span className="mx-0.5">→</span>
                          {pr.base.ref}
                        </span>
                        <span>#{pr.number}</span>
                        <span>{formatDate(pr.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {pr.user?.avatar_url && (
                        <img
                          src={pr.user.avatar_url}
                          alt={pr.user.login}
                          className="h-5 w-5 rounded-full"
                          title={pr.user.login}
                        />
                      )}
                      {expandedPR === pr.number ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                {expandedPR === pr.number && (
                  <div className="px-4 pb-3 pl-11">
                    {pr.body && (
                      <p className="text-xs text-slate-600 mb-3 whitespace-pre-wrap line-clamp-4">
                        {pr.body}
                      </p>
                    )}

                    <div className="flex items-center gap-3">
                      <a
                        href={pr.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View on GitHub
                      </a>

                      {pr.user && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <User className="h-3 w-3" />
                          {pr.user.login}
                        </span>
                      )}

                      {pr.merged_at && (
                        <span className="flex items-center gap-1.5 text-xs text-purple-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Merged {formatDate(pr.merged_at)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
