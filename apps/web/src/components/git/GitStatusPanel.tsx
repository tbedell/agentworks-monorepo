import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

interface GitStatus {
  branch: string;
  isClean: boolean;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
}

interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
  refs?: string;
}

interface Branch {
  name: string;
  current: boolean;
  remote?: string;
}

interface GitStatusPanelProps {
  projectId: string;
  className?: string;
  onStatusChange?: (status: GitStatus | null) => void;
}

export default function GitStatusPanel({ projectId, className = '', onStatusChange }: GitStatusPanelProps) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI states
  const [activeTab, setActiveTab] = useState<'changes' | 'commits' | 'branches'>('changes');
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [showBranchCreate, setShowBranchCreate] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch git status
  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.git.getStatus(projectId);
      setStatus(data);
      onStatusChange?.(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch git status';
      // Don't show error for non-git projects
      if (message.includes('no git repository')) {
        setStatus(null);
        onStatusChange?.(null);
      } else {
        setError(message);
      }
    }
  }, [projectId, onStatusChange]);

  // Fetch commits
  const fetchCommits = useCallback(async () => {
    try {
      const data = await api.git.getLog(projectId, { limit: 10 });
      setCommits(data.commits || []);
    } catch (err) {
      console.error('Failed to fetch commits:', err);
    }
  }, [projectId]);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    try {
      const data = await api.git.getBranches(projectId);
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchCommits(), fetchBranches()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStatus, fetchCommits, fetchBranches]);

  // Auto-refresh status every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Clear action messages after 3 seconds
  useEffect(() => {
    if (actionError || actionSuccess) {
      const timer = setTimeout(() => {
        setActionError(null);
        setActionSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionError, actionSuccess]);

  // Stage all files
  const handleStageAll = async () => {
    try {
      await api.git.stage(projectId, {});
      setActionSuccess('Files staged successfully');
      await fetchStatus();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to stage files');
    }
  };

  // Commit changes
  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      setActionError('Please enter a commit message');
      return;
    }
    setIsCommitting(true);
    try {
      const result = await api.git.commit(projectId, { message: commitMessage.trim() });
      if (result.requiresApproval) {
        setActionSuccess('Commit requires approval. Request created.');
      } else {
        setActionSuccess('Changes committed successfully');
        setCommitMessage('');
      }
      await Promise.all([fetchStatus(), fetchCommits()]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to commit changes');
    } finally {
      setIsCommitting(false);
    }
  };

  // Push changes
  const handlePush = async () => {
    setIsPushing(true);
    try {
      const result = await api.git.push(projectId);
      if (result.requiresApproval) {
        setActionSuccess('Push requires approval. Request created.');
      } else {
        setActionSuccess('Changes pushed successfully');
      }
      await fetchStatus();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to push changes');
    } finally {
      setIsPushing(false);
    }
  };

  // Pull changes
  const handlePull = async () => {
    setIsPulling(true);
    try {
      await api.git.pull(projectId);
      setActionSuccess('Changes pulled successfully');
      await Promise.all([fetchStatus(), fetchCommits()]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to pull changes');
    } finally {
      setIsPulling(false);
    }
  };

  // Checkout branch
  const handleCheckout = async (branchName: string) => {
    try {
      await api.git.checkout(projectId, { branch: branchName });
      setActionSuccess(`Switched to branch: ${branchName}`);
      await Promise.all([fetchStatus(), fetchCommits(), fetchBranches()]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to checkout branch');
    }
  };

  // Create new branch
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      setActionError('Please enter a branch name');
      return;
    }
    try {
      await api.git.checkout(projectId, { branch: newBranchName.trim(), create: true });
      setActionSuccess(`Created and switched to branch: ${newBranchName}`);
      setNewBranchName('');
      setShowBranchCreate(false);
      await Promise.all([fetchStatus(), fetchBranches()]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create branch');
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center text-gray-400">
          <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading git status...
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

  if (!status) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
        <div className="text-gray-400 text-sm">No git repository configured for this project.</div>
      </div>
    );
  }

  const totalChanges = status.staged.length + status.modified.length + status.untracked.length + status.deleted.length;

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg flex flex-col ${className}`}>
      {/* Header with branch info */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-white font-medium">{status.branch}</span>
          {!status.isClean && (
            <span className="px-2 py-0.5 text-xs bg-yellow-600 text-white rounded">
              {totalChanges} change{totalChanges !== 1 ? 's' : ''}
            </span>
          )}
          {status.ahead > 0 && (
            <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded">
              {status.ahead} ahead
            </span>
          )}
          {status.behind > 0 && (
            <span className="px-2 py-0.5 text-xs bg-red-600 text-white rounded">
              {status.behind} behind
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePull}
            disabled={isPulling}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            title="Pull from remote"
          >
            <svg className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          <button
            onClick={handlePush}
            disabled={isPushing || status.ahead === 0}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            title="Push to remote"
          >
            <svg className={`w-4 h-4 ${isPushing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={fetchStatus}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Refresh status"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Action messages */}
      {(actionError || actionSuccess) && (
        <div className={`px-4 py-2 text-sm ${actionError ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
          {actionError || actionSuccess}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('changes')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'changes'
              ? 'text-white border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Changes ({totalChanges})
        </button>
        <button
          onClick={() => setActiveTab('commits')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'commits'
              ? 'text-white border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Commits
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'branches'
              ? 'text-white border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Branches ({branches.length})
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'changes' && (
          <div className="p-4 space-y-4">
            {totalChanges === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No changes to commit
              </div>
            ) : (
              <>
                {/* Staged files */}
                {status.staged.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 uppercase mb-2">Staged ({status.staged.length})</div>
                    <div className="space-y-1">
                      {status.staged.map((file) => (
                        <div key={file} className="flex items-center gap-2 text-sm text-green-400">
                          <span className="w-4 text-center">+</span>
                          <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modified files */}
                {status.modified.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 uppercase mb-2">Modified ({status.modified.length})</div>
                    <div className="space-y-1">
                      {status.modified.map((file) => (
                        <div key={file} className="flex items-center gap-2 text-sm text-yellow-400">
                          <span className="w-4 text-center">M</span>
                          <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Untracked files */}
                {status.untracked.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 uppercase mb-2">Untracked ({status.untracked.length})</div>
                    <div className="space-y-1">
                      {status.untracked.map((file) => (
                        <div key={file} className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="w-4 text-center">?</span>
                          <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deleted files */}
                {status.deleted.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 uppercase mb-2">Deleted ({status.deleted.length})</div>
                    <div className="space-y-1">
                      {status.deleted.map((file) => (
                        <div key={file} className="flex items-center gap-2 text-sm text-red-400">
                          <span className="w-4 text-center">-</span>
                          <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stage all button */}
                {(status.modified.length > 0 || status.untracked.length > 0 || status.deleted.length > 0) && (
                  <button
                    onClick={handleStageAll}
                    className="w-full py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Stage All Changes
                  </button>
                )}

                {/* Commit form */}
                {status.staged.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-700">
                    <textarea
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Commit message..."
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                      rows={3}
                    />
                    <button
                      onClick={handleCommit}
                      disabled={isCommitting || !commitMessage.trim()}
                      className="w-full py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCommitting ? 'Committing...' : 'Commit Changes'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'commits' && (
          <div className="divide-y divide-gray-700">
            {commits.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No commits yet
              </div>
            ) : (
              commits.map((commit) => (
                <div key={commit.hash} className="p-3 hover:bg-gray-800/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{commit.message}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>{commit.author}</span>
                        <span>-</span>
                        <span>{new Date(commit.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <code className="text-xs text-gray-500 font-mono">{commit.hash.substring(0, 7)}</code>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="p-4 space-y-4">
            {/* Create branch form */}
            {showBranchCreate ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="Branch name..."
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                />
                <button
                  onClick={handleCreateBranch}
                  className="px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowBranchCreate(false);
                    setNewBranchName('');
                  }}
                  className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowBranchCreate(true)}
                className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create new branch
              </button>
            )}

            {/* Branch list */}
            <div className="space-y-1">
              {branches.map((branch) => (
                <button
                  key={branch.name}
                  onClick={() => !branch.current && handleCheckout(branch.name)}
                  disabled={branch.current}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                    branch.current
                      ? 'bg-purple-900/30 text-purple-300 cursor-default'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {branch.current && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span>{branch.name}</span>
                  </div>
                  {branch.remote && (
                    <span className="text-xs text-gray-500">{branch.remote}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
