import { useState, useEffect } from 'react';
import {
  Search,
  Lock,
  Globe,
  Star,
  GitFork,
  Loader2,
  ChevronRight,
  RefreshCw,
  FolderGit2,
  ExternalLink
} from 'lucide-react';
import clsx from 'clsx';
import { useGitHub, GitHubRepo } from '../../hooks/useGitHub';
import GitHubConnect from './GitHubConnect';

interface RepoSelectorProps {
  projectId: string;
  onSelect?: (repo: { owner: string; repo: string; fullName: string }) => void;
  className?: string;
}

export default function RepoSelector({
  projectId,
  onSelect,
  className
}: RepoSelectorProps) {
  const { status, fetchRepos, selectRepo, getProjectRepo } = useGitHub();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [currentRepo, setCurrentRepo] = useState<{ owner: string; name: string; fullName: string } | null>(null);

  // Load repos when connected
  useEffect(() => {
    if (status?.connected) {
      loadRepos();
      checkCurrentRepo();
    }
  }, [status?.connected]);

  // Filter repos based on search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredRepos(repos);
      return;
    }

    const searchLower = search.toLowerCase();
    setFilteredRepos(
      repos.filter(
        (repo) =>
          repo.name.toLowerCase().includes(searchLower) ||
          repo.full_name.toLowerCase().includes(searchLower) ||
          repo.description?.toLowerCase().includes(searchLower)
      )
    );
  }, [search, repos]);

  const loadRepos = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchRepos();
      setRepos(result);
      setFilteredRepos(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const checkCurrentRepo = async () => {
    try {
      const repo = await getProjectRepo(projectId);
      if (repo) {
        setCurrentRepo({
          owner: repo.repoOwner,
          name: repo.repoName,
          fullName: repo.repoFullName
        });
        setSelectedRepo(repo.repoFullName);
      }
    } catch (err) {
      // Ignore - no repo connected
    }
  };

  const handleSelect = async (repo: GitHubRepo) => {
    try {
      setIsSelecting(true);
      setError(null);
      const [owner, name] = repo.full_name.split('/');
      await selectRepo(projectId, owner, name);
      setSelectedRepo(repo.full_name);
      setCurrentRepo({ owner, name, fullName: repo.full_name });
      onSelect?.({ owner, repo: name, fullName: repo.full_name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select repository');
    } finally {
      setIsSelecting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (!status?.connected) {
    return (
      <div className={clsx('p-6 bg-white rounded-lg border border-slate-200', className)}>
        <div className="text-center">
          <FolderGit2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-slate-900 mb-1">
            Connect to GitHub
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Connect your GitHub account to select a repository for this project
          </p>
          <GitHubConnect onConnected={loadRepos} />
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('bg-white rounded-lg border border-slate-200', className)}>
      {/* Header with current repo */}
      {currentRepo && (
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-900">
                {currentRepo.fullName}
              </span>
            </div>
            <a
              href={`https://github.com/${currentRepo.fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <span>View on GitHub</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Search and refresh */}
      <div className="p-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={loadRepos}
            disabled={isLoading}
            className={clsx(
              'p-2 rounded-md text-slate-600 hover:bg-slate-100',
              'transition-colors duration-150',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
            title="Refresh repositories"
          >
            <RefreshCw className={clsx('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 text-red-600 text-sm border-b border-red-100">
          {error}
        </div>
      )}

      {/* Repository list */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading && repos.length === 0 ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading repositories...</p>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-8 text-center">
            <FolderGit2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {search ? 'No repositories found' : 'No repositories available'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRepos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => handleSelect(repo)}
                disabled={isSelecting}
                className={clsx(
                  'w-full px-4 py-3 text-left hover:bg-slate-50',
                  'transition-colors duration-150',
                  selectedRepo === repo.full_name && 'bg-primary-50 hover:bg-primary-50',
                  isSelecting && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {repo.private ? (
                        <Lock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      )}
                      <span className={clsx(
                        'font-medium truncate',
                        selectedRepo === repo.full_name ? 'text-primary-700' : 'text-slate-900'
                      )}>
                        {repo.full_name}
                      </span>
                    </div>

                    {repo.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mb-1.5">
                        {repo.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-primary-500" />
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {repo.stargazers_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="h-3 w-3" />
                        {repo.forks_count}
                      </span>
                      <span>Updated {formatDate(repo.updated_at)}</span>
                    </div>
                  </div>

                  <ChevronRight className={clsx(
                    'h-4 w-4 flex-shrink-0 mt-1',
                    selectedRepo === repo.full_name ? 'text-primary-500' : 'text-slate-300'
                  )} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-500 text-center">
          Showing {filteredRepos.length} of {repos.length} repositories
        </p>
      </div>
    </div>
  );
}
