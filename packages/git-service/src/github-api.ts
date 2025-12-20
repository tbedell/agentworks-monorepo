/**
 * GitHub API integration for git-service
 *
 * Provides direct GitHub API calls for operations that require
 * GitHub integration (PR creation, etc.)
 */

import { prisma } from '@agentworks/db';
import { createLogger } from '@agentworks/shared';
import crypto from 'crypto';

const logger = createLogger('git-service:github-api');

const GITHUB_API_BASE = 'https://api.github.com';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Token decryption (must match the API's encryption)
function decryptToken(encryptedToken: string): string {
  const [ivHex, encrypted] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// GitHub API helper
async function githubApi<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ message: 'Unknown error' }))) as {
      message?: string;
    };
    throw new Error(`GitHub API error: ${errorData.message || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// Get GitHub connection for a project
async function getGitHubConnectionForProject(
  projectId: string
): Promise<{ accessToken: string; repoFullName: string; defaultBranch: string } | null> {
  // Get the project's repository info
  const projectRepo = await prisma.projectRepository.findUnique({
    where: { projectId },
    include: {
      githubConnection: true,
    },
  });

  if (!projectRepo || !projectRepo.githubConnection) {
    return null;
  }

  try {
    const accessToken = decryptToken(projectRepo.githubConnection.accessToken);
    return {
      accessToken,
      repoFullName: projectRepo.repoFullName,
      defaultBranch: projectRepo.defaultBranch,
    };
  } catch (error) {
    logger.error('Failed to decrypt GitHub token', { projectId, error });
    return null;
  }
}

export interface CreatePRParams {
  title: string;
  body?: string;
  head: string;
  base?: string;
  draft?: boolean;
}

export interface PRResult {
  number: number;
  url: string;
  title: string;
  state: string;
}

/**
 * Create a GitHub pull request for a project
 */
export async function createGitHubPullRequest(
  projectId: string,
  params: CreatePRParams
): Promise<PRResult> {
  const connection = await getGitHubConnectionForProject(projectId);

  if (!connection) {
    throw new Error('No GitHub connection found for this project');
  }

  const { accessToken, repoFullName, defaultBranch } = connection;
  const base = params.base || defaultBranch;

  logger.info('Creating GitHub PR', {
    projectId,
    repo: repoFullName,
    head: params.head,
    base,
  });

  const pr = await githubApi<{
    number: number;
    html_url: string;
    title: string;
    state: string;
  }>(`/repos/${repoFullName}/pulls`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: params.title,
      body: params.body || '',
      head: params.head,
      base,
      draft: params.draft || false,
    }),
  });

  logger.info('GitHub PR created', {
    projectId,
    prNumber: pr.number,
    url: pr.html_url,
  });

  return {
    number: pr.number,
    url: pr.html_url,
    title: pr.title,
    state: pr.state,
  };
}

/**
 * Get the current branch from the local git repository
 */
export async function getCurrentBranchForProject(projectId: string): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { localPath: true },
  });

  if (!project?.localPath) {
    return null;
  }

  try {
    // Use simple-git to get the current branch
    const { simpleGit } = await import('simple-git');
    const git = simpleGit(project.localPath);
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  } catch (error) {
    logger.error('Failed to get current branch', { projectId, error });
    return null;
  }
}
