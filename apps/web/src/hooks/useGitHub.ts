import { useState, useCallback, useEffect } from 'react';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  updated_at: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubPullRequest {
  number: number;
  html_url: string;
  title: string;
  state: string;
  body: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
}

export interface GitHubStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
}

export interface ProjectRepository {
  id: string;
  projectId: string;
  githubConnId: string;
  repoOwner: string;
  repoName: string;
  repoFullName: string;
  defaultBranch: string;
  cloneStatus: string;
  lastSyncAt: string | null;
}

export interface UseGitHubReturn {
  // Connection status
  status: GitHubStatus | null;
  isLoading: boolean;
  error: string | null;

  // Auth actions
  connect: () => void;
  disconnect: () => Promise<void>;
  checkStatus: () => Promise<void>;

  // Repository actions
  fetchRepos: () => Promise<GitHubRepo[]>;
  selectRepo: (projectId: string, owner: string, repo: string) => Promise<void>;
  getProjectRepo: (projectId: string) => Promise<ProjectRepository | null>;

  // Git operations
  cloneRepo: (projectId: string) => Promise<void>;
  commit: (projectId: string, message: string, files?: string[]) => Promise<void>;
  push: (projectId: string, branch?: string) => Promise<void>;
  createPullRequest: (projectId: string, title: string, body?: string, baseBranch?: string, headBranch?: string) => Promise<GitHubPullRequest>;

  // Branch & PR info
  fetchBranches: (projectId: string) => Promise<GitHubBranch[]>;
  fetchPullRequests: (projectId: string) => Promise<GitHubPullRequest[]>;
}

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// GitHub API methods
const githubApi = {
  getStatus: () =>
    request<{ connected: boolean; username?: string; avatarUrl?: string }>('/github/status'),

  disconnect: () =>
    request<{ success: boolean }>('/github/disconnect', { method: 'POST' }),

  getRepos: () =>
    request<{ repos: GitHubRepo[] }>('/github/repos'),

  selectRepo: (projectId: string, owner: string, repo: string) =>
    request<{ repository: ProjectRepository }>('/github/repos/select', {
      method: 'POST',
      body: JSON.stringify({ projectId, owner, repo }),
    }),

  getProjectRepo: (projectId: string) =>
    request<{ repository: ProjectRepository | null }>(`/github/repos/${projectId}`),

  clone: (projectId: string) =>
    request<{ success: boolean; path: string }>('/github/clone', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    }),

  commit: (projectId: string, message: string, files?: string[]) =>
    request<{ success: boolean; sha: string }>('/github/commit', {
      method: 'POST',
      body: JSON.stringify({ projectId, message, files }),
    }),

  push: (projectId: string, branch?: string) =>
    request<{ success: boolean }>('/github/push', {
      method: 'POST',
      body: JSON.stringify({ projectId, branch }),
    }),

  createPullRequest: (projectId: string, title: string, body?: string, baseBranch?: string, headBranch?: string) =>
    request<{ pullRequest: GitHubPullRequest }>('/github/pull-request', {
      method: 'POST',
      body: JSON.stringify({ projectId, title, body, baseBranch, headBranch }),
    }),

  getBranches: (projectId: string) =>
    request<{ branches: GitHubBranch[] }>(`/github/branches/${projectId}`),

  getPullRequests: (projectId: string) =>
    request<{ pullRequests: GitHubPullRequest[] }>(`/github/pull-requests/${projectId}`),
};

export function useGitHub(): UseGitHubReturn {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await githubApi.getStatus();
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check GitHub status');
      setStatus({ connected: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const connect = useCallback(() => {
    // Open OAuth flow in new window
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      '/api/github/auth',
      'github-oauth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Listen for OAuth completion
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'github-oauth-success') {
        checkStatus();
        popup?.close();
        window.removeEventListener('message', handleMessage);
      } else if (event.data?.type === 'github-oauth-error') {
        setError(event.data.error || 'OAuth failed');
        popup?.close();
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    // Also poll for popup close
    const pollTimer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(pollTimer);
        window.removeEventListener('message', handleMessage);
        checkStatus();
      }
    }, 500);
  }, [checkStatus]);

  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      await githubApi.disconnect();
      setStatus({ connected: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRepos = useCallback(async (): Promise<GitHubRepo[]> => {
    try {
      const result = await githubApi.getRepos();
      return result.repos;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repos');
      throw err;
    }
  }, []);

  const selectRepo = useCallback(async (projectId: string, owner: string, repo: string) => {
    try {
      await githubApi.selectRepo(projectId, owner, repo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select repo');
      throw err;
    }
  }, []);

  const getProjectRepo = useCallback(async (projectId: string): Promise<ProjectRepository | null> => {
    try {
      const result = await githubApi.getProjectRepo(projectId);
      return result.repository;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get project repo');
      throw err;
    }
  }, []);

  const cloneRepo = useCallback(async (projectId: string) => {
    try {
      await githubApi.clone(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone repo');
      throw err;
    }
  }, []);

  const commit = useCallback(async (projectId: string, message: string, files?: string[]) => {
    try {
      await githubApi.commit(projectId, message, files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit');
      throw err;
    }
  }, []);

  const push = useCallback(async (projectId: string, branch?: string) => {
    try {
      await githubApi.push(projectId, branch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to push');
      throw err;
    }
  }, []);

  const createPullRequest = useCallback(async (
    projectId: string,
    title: string,
    body?: string,
    baseBranch?: string,
    headBranch?: string
  ): Promise<GitHubPullRequest> => {
    try {
      const result = await githubApi.createPullRequest(projectId, title, body, baseBranch, headBranch);
      return result.pullRequest;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PR');
      throw err;
    }
  }, []);

  const fetchBranches = useCallback(async (projectId: string): Promise<GitHubBranch[]> => {
    try {
      const result = await githubApi.getBranches(projectId);
      return result.branches;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch branches');
      throw err;
    }
  }, []);

  const fetchPullRequests = useCallback(async (projectId: string): Promise<GitHubPullRequest[]> => {
    try {
      const result = await githubApi.getPullRequests(projectId);
      return result.pullRequests;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PRs');
      throw err;
    }
  }, []);

  return {
    status,
    isLoading,
    error,
    connect,
    disconnect,
    checkStatus,
    fetchRepos,
    selectRepo,
    getProjectRepo,
    cloneRepo,
    commit,
    push,
    createPullRequest,
    fetchBranches,
    fetchPullRequests,
  };
}
