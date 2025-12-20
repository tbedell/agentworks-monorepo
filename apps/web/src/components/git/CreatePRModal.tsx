import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

interface CreatePRModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (prNumber: number, prUrl: string) => void;
  defaultHead?: string;
}

export default function CreatePRModal({ projectId, isOpen, onClose, onCreated, defaultHead }: CreatePRModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [head, setHead] = useState(defaultHead || '');
  const [base, setBase] = useState('main');
  const [draft, setDraft] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(true);

  // Fetch branches when modal opens
  const fetchBranches = useCallback(async () => {
    if (!isOpen) return;

    setBranchesLoading(true);
    try {
      // First try to get local git branches
      const gitBranches = await api.git.getBranches(projectId);
      if (gitBranches.branches && gitBranches.branches.length > 0) {
        setBranches(gitBranches.branches.map(b => b.name));
        // Set current branch as head if not set
        if (!head && gitBranches.current) {
          setHead(gitBranches.current);
        }
      }
    } catch {
      // Fallback: try GitHub branches API
      try {
        const response = await fetch(`/api/github/branches/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          setBranches(data.branches?.map((b: { name: string }) => b.name) || []);
        }
      } catch {
        console.error('Failed to fetch branches');
      }
    } finally {
      setBranchesLoading(false);
    }
  }, [projectId, isOpen, head]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (defaultHead) {
      setHead(defaultHead);
    }
  }, [defaultHead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!head) {
      setError('Source branch is required');
      return;
    }
    if (head === base) {
      setError('Source and target branches must be different');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.pullRequests.create(projectId, {
        title: title.trim(),
        body: body.trim() || undefined,
        head,
        base,
        draft,
      });

      if (result.success && result.pullRequest) {
        onCreated?.(result.pullRequest.number, result.pullRequest.url);
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pull request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setBody('');
    setHead(defaultHead || '');
    setBase('main');
    setDraft(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-medium text-white">Create Pull Request</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="px-3 py-2 text-sm bg-red-900/50 text-red-300 rounded">
              {error}
            </div>
          )}

          {/* Branch selectors */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">From (head)</label>
              <select
                value={head}
                onChange={(e) => setHead(e.target.value)}
                disabled={branchesLoading}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:border-purple-500 focus:outline-none disabled:opacity-50"
              >
                {branchesLoading ? (
                  <option value="">Loading branches...</option>
                ) : (
                  <>
                    <option value="">Select branch</option>
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div className="text-gray-500 pt-5">-&gt;</div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">To (base)</label>
              <select
                value={base}
                onChange={(e) => setBase(e.target.value)}
                disabled={branchesLoading}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:border-purple-500 focus:outline-none disabled:opacity-50"
              >
                {branchesLoading ? (
                  <option value="">Loading branches...</option>
                ) : (
                  branches.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pull request title..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your changes..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
            />
          </div>

          {/* Draft toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={draft}
              onChange={(e) => setDraft(e.target.checked)}
              className="w-4 h-4 bg-gray-800 border-gray-600 rounded text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm text-gray-300">Create as draft</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !head || head === base}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Pull Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
