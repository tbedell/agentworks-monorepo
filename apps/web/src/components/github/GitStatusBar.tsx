import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  GitCommit,
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  FolderGit2,
  Plus
} from 'lucide-react';
import clsx from 'clsx';
import { useGitHub, ProjectRepository } from '../../hooks/useGitHub';

interface GitStatusBarProps {
  projectId: string;
  compact?: boolean;
  className?: string;
}

type GitOperation = 'clone' | 'commit' | 'push' | 'none';

export default function GitStatusBar({
  projectId,
  compact = false,
  className
}: GitStatusBarProps) {
  const { status, getProjectRepo, cloneRepo, commit, push } = useGitHub();
  const [repo, setRepo] = useState<ProjectRepository | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOperation, setCurrentOperation] = useState<GitOperation>('none');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Commit modal state
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');

  const loadRepo = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getProjectRepo(projectId);
      setRepo(result);
    } catch (err) {
      // Ignore - no repo connected
    } finally {
      setIsLoading(false);
    }
  }, [projectId, getProjectRepo]);

  useEffect(() => {
    if (status?.connected) {
      loadRepo();
    }
  }, [status?.connected, loadRepo]);

  const handleClone = async () => {
    try {
      setCurrentOperation('clone');
      setError(null);
      await cloneRepo(projectId);
      setSuccess('Repository cloned successfully');
      setTimeout(() => setSuccess(null), 3000);
      await loadRepo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone');
    } finally {
      setCurrentOperation('none');
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      setError('Please enter a commit message');
      return;
    }

    try {
      setCurrentOperation('commit');
      setError(null);
      await commit(projectId, commitMessage);
      setCommitMessage('');
      setShowCommitModal(false);
      setSuccess('Changes committed successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit');
    } finally {
      setCurrentOperation('none');
    }
  };

  const handlePush = async () => {
    try {
      setCurrentOperation('push');
      setError(null);
      await push(projectId);
      setSuccess('Changes pushed successfully');
      setTimeout(() => setSuccess(null), 3000);
      await loadRepo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to push');
    } finally {
      setCurrentOperation('none');
    }
  };

  if (!status?.connected) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={clsx('flex items-center gap-2 text-slate-400', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {!compact && <span className="text-xs">Loading...</span>}
      </div>
    );
  }

  if (!repo) {
    return (
      <div className={clsx(
        'flex items-center gap-2 px-2 py-1 rounded-md bg-slate-100 text-slate-500',
        className
      )}>
        <FolderGit2 className="h-3.5 w-3.5" />
        {!compact && <span className="text-xs">No repo connected</span>}
      </div>
    );
  }

  return (
    <>
      <div className={clsx(
        'flex items-center gap-2 flex-wrap',
        className
      )}>
        {/* Repository info */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100">
          <GitBranch className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs font-medium text-slate-700">
            {repo.defaultBranch}
          </span>
        </div>

        {/* Clone status / button */}
        {repo.cloneStatus === 'not_cloned' && (
          <button
            onClick={handleClone}
            disabled={currentOperation !== 'none'}
            className={clsx(
              'flex items-center gap-1.5 px-2 py-1 rounded-md',
              'text-xs font-medium',
              'bg-primary-100 text-primary-700 hover:bg-primary-200',
              'transition-colors duration-150',
              currentOperation !== 'none' && 'opacity-50 cursor-not-allowed'
            )}
          >
            {currentOperation === 'clone' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            <span>Clone</span>
          </button>
        )}

        {repo.cloneStatus === 'cloned' && (
          <>
            {/* Commit button */}
            <button
              onClick={() => setShowCommitModal(true)}
              disabled={currentOperation !== 'none'}
              className={clsx(
                'flex items-center gap-1.5 px-2 py-1 rounded-md',
                'text-xs font-medium',
                'bg-slate-100 text-slate-700 hover:bg-slate-200',
                'transition-colors duration-150',
                currentOperation !== 'none' && 'opacity-50 cursor-not-allowed'
              )}
            >
              {currentOperation === 'commit' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <GitCommit className="h-3 w-3" />
              )}
              <span>Commit</span>
            </button>

            {/* Push button */}
            <button
              onClick={handlePush}
              disabled={currentOperation !== 'none'}
              className={clsx(
                'flex items-center gap-1.5 px-2 py-1 rounded-md',
                'text-xs font-medium',
                'bg-green-100 text-green-700 hover:bg-green-200',
                'transition-colors duration-150',
                currentOperation !== 'none' && 'opacity-50 cursor-not-allowed'
              )}
            >
              {currentOperation === 'push' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              <span>Push</span>
            </button>
          </>
        )}

        {repo.cloneStatus === 'cloning' && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-100">
            <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Cloning...</span>
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={loadRepo}
          disabled={currentOperation !== 'none'}
          className={clsx(
            'p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100',
            'transition-colors duration-150'
          )}
          title="Refresh status"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        {/* Success message */}
        {success && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-100 text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-xs">{success}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-100 text-red-700">
            <XCircle className="h-3.5 w-3.5" />
            <span className="text-xs">{error}</span>
          </div>
        )}
      </div>

      {/* Commit Modal */}
      {showCommitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <GitCommit className="h-4 w-4" />
                Commit Changes
              </h3>
            </div>

            <div className="p-4">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Commit Message
              </label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Describe your changes..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                autoFocus
              />

              {error && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCommitModal(false);
                  setCommitMessage('');
                  setError(null);
                }}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={currentOperation === 'commit' || !commitMessage.trim()}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md',
                  'text-sm font-medium',
                  'bg-primary-600 text-white hover:bg-primary-700',
                  'transition-colors duration-150',
                  (currentOperation === 'commit' || !commitMessage.trim()) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {currentOperation === 'commit' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Commit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Compact status indicator for headers
export function GitStatusIndicator({ projectId }: { projectId: string }) {
  const { status, getProjectRepo } = useGitHub();
  const [repo, setRepo] = useState<ProjectRepository | null>(null);

  useEffect(() => {
    if (status?.connected) {
      getProjectRepo(projectId).then(setRepo).catch(() => {});
    }
  }, [status?.connected, projectId, getProjectRepo]);

  if (!status?.connected || !repo) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-slate-500">
      <GitBranch className="h-3 w-3" />
      <span>{repo.defaultBranch}</span>
      {repo.cloneStatus === 'cloned' && (
        <CheckCircle2 className="h-3 w-3 text-green-500" />
      )}
    </div>
  );
}
