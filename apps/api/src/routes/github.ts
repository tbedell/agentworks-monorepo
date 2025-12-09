import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { lucia } from '../lib/auth.js';
import { z } from 'zod';
import crypto from 'crypto';

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3010/api/github/callback';
const GITHUB_API_BASE = 'https://api.github.com';

// Schemas
const SelectRepoSchema = z.object({
  projectId: z.string().uuid(),
  repoOwner: z.string(),
  repoName: z.string(),
  defaultBranch: z.string().optional().default('main'),
});

const CloneRepoSchema = z.object({
  projectId: z.string().uuid(),
  targetPath: z.string().optional(),
});

const CommitSchema = z.object({
  projectId: z.string().uuid(),
  message: z.string().min(1),
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
  })).optional(),
});

const PushSchema = z.object({
  projectId: z.string().uuid(),
  branch: z.string().optional(),
  force: z.boolean().optional().default(false),
});

const PullRequestSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().optional(),
  head: z.string(), // source branch
  base: z.string().optional().default('main'), // target branch
  draft: z.boolean().optional().default(false),
});

// Helper to encrypt/decrypt tokens
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

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
async function githubApi(endpoint: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
    throw new Error(`GitHub API error: ${errorData.message || response.statusText}`);
  }

  return response.json();
}

// GitHub API response types
interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
}

interface GitHubPullRequest {
  number: number;
  html_url: string;
  title: string;
  state: string;
}

interface GitHubBranch {
  name: string;
  protected: boolean;
}

export const githubRoutes: FastifyPluginAsync = async (app) => {
  // Auth hook for protected routes
  app.addHook('preHandler', async (request, reply) => {
    // Skip auth for OAuth callback
    if (request.url.includes('/callback')) {
      return;
    }

    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    (request as any).user = user;
  });

  // Helper to get user's GitHub connection
  async function getGitHubConnection(tenantId: string) {
    const connection = await prisma.gitHubConnection.findFirst({
      where: { tenantId },
    });

    if (!connection) {
      return null;
    }

    return {
      ...connection,
      accessToken: decryptToken(connection.accessToken),
    };
  }

  // Project type with workspace and repository relations
  interface ProjectWithRelations {
    id: string;
    name: string;
    status: string;
    slug: string | null;
    description: string | null;
    workspaceId: string;
    phase: string;
    localPath: string | null;
    createdAt: Date;
    updatedAt: Date;
    workspace: {
      id: string;
      members: Array<{ userId: string; role: string }>;
    };
    repository?: {
      id: string;
      projectId: string;
      githubConnId: string;
      repoOwner: string;
      repoName: string;
      repoFullName: string;
      defaultBranch: string;
    } | null;
  }

  // Helper to verify project access
  async function verifyProjectAccess(projectId: string, userId: string, requireWrite = false): Promise<
    | { error: string; status: number }
    | { project: ProjectWithRelations; membership: { userId: string; role: string } }
  > {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: { include: { members: true } },
        repository: true,
      },
    });

    if (!project) {
      return { error: 'Project not found', status: 404 };
    }

    const projectWithRelations = project as unknown as ProjectWithRelations;
    const membership = projectWithRelations.workspace.members.find((m: { userId: string }) => m.userId === userId);
    if (!membership) {
      return { error: 'Not authorized', status: 403 };
    }

    if (requireWrite && membership.role === 'viewer') {
      return { error: 'Write access required', status: 403 };
    }

    return { project: projectWithRelations, membership };
  }

  // OAuth: Initiate GitHub authorization
  app.get('/auth', async (request, reply) => {
    const user = (request as any).user;
    const { returnUrl } = request.query as { returnUrl?: string };

    if (!GITHUB_CLIENT_ID) {
      return reply.status(500).send({ error: 'GitHub OAuth not configured' });
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in a short-lived cookie
    reply.setCookie('github_oauth_state', state, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
    });

    if (returnUrl) {
      reply.setCookie('github_oauth_return', returnUrl, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600,
      });
    }

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GITHUB_REDIRECT_URI);
    authUrl.searchParams.set('scope', 'repo user:email');
    authUrl.searchParams.set('state', state);

    return reply.redirect(authUrl.toString());
  });

  // OAuth: Handle callback from GitHub
  app.get('/callback', async (request, reply) => {
    const { code, state } = request.query as { code?: string; state?: string };

    // Verify state
    const storedState = request.cookies['github_oauth_state'];
    if (!state || state !== storedState) {
      return reply.status(400).send({ error: 'Invalid OAuth state' });
    }

    if (!code) {
      return reply.status(400).send({ error: 'Missing authorization code' });
    }

    // Get session from cookie
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { user } = await lucia.validateSession(sessionId);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: GITHUB_REDIRECT_URI,
        }),
      });

      const tokenData = await tokenResponse.json() as {
        access_token?: string;
        refresh_token?: string;
        error?: string;
        error_description?: string;
      };

      if (tokenData.error) {
        return reply.status(400).send({ error: tokenData.error_description || tokenData.error });
      }

      const accessToken = tokenData.access_token!;
      const refreshToken = tokenData.refresh_token;

      // Get user info from GitHub
      const githubUser = await githubApi('/user', accessToken) as {
        id: number;
        login: string;
        email?: string;
        avatar_url?: string;
      };

      // Get tenant from user
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { tenantId: true },
      });

      if (!dbUser?.tenantId) {
        return reply.status(400).send({ error: 'User has no tenant' });
      }

      // Create or update GitHub connection
      await prisma.gitHubConnection.upsert({
        where: {
          tenantId_githubUserId: {
            tenantId: dbUser.tenantId,
            githubUserId: githubUser.id.toString(),
          },
        },
        create: {
          tenantId: dbUser.tenantId,
          githubUserId: githubUser.id.toString(),
          githubUsername: githubUser.login,
          accessToken: encryptToken(accessToken),
          refreshToken: refreshToken ? encryptToken(refreshToken) : null,
        },
        update: {
          accessToken: encryptToken(accessToken),
          refreshToken: refreshToken ? encryptToken(refreshToken) : null,
          githubUsername: githubUser.login,
        },
      });

      // Clear OAuth cookies
      reply.clearCookie('github_oauth_state');

      // Redirect back to app
      const returnUrl = request.cookies['github_oauth_return'] || '/settings/integrations';
      reply.clearCookie('github_oauth_return');

      return reply.redirect(returnUrl);
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      return reply.status(500).send({ error: 'Failed to complete GitHub authentication' });
    }
  });

  // Get current GitHub connection status
  app.get('/status', async (request, reply) => {
    const user = (request as any).user;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    const connection = await prisma.gitHubConnection.findFirst({
      where: { tenantId: dbUser.tenantId },
      select: {
        id: true,
        githubUsername: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      connected: !!connection,
      connection,
    };
  });

  // Disconnect GitHub
  app.delete('/disconnect', async (request, reply) => {
    const user = (request as any).user;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    await prisma.gitHubConnection.deleteMany({
      where: { tenantId: dbUser.tenantId },
    });

    return { success: true };
  });

  // List user's GitHub repositories
  app.get('/repos', async (request, reply) => {
    const user = (request as any).user;
    const { page = '1', per_page = '30', sort = 'updated' } = request.query as {
      page?: string;
      per_page?: string;
      sort?: string;
    };

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    const connection = await getGitHubConnection(dbUser.tenantId);
    if (!connection) {
      return reply.status(400).send({ error: 'GitHub not connected' });
    }

    try {
      const repos = await githubApi(
        `/user/repos?page=${page}&per_page=${per_page}&sort=${sort}&affiliation=owner,collaborator`,
        connection.accessToken
      );

      return { repos };
    } catch (error) {
      console.error('Failed to fetch repos:', error);
      return reply.status(500).send({ error: 'Failed to fetch repositories' });
    }
  });

  // Connect a repository to a project
  app.post('/repos/select', async (request, reply) => {
    const user = (request as any).user;
    const body = SelectRepoSchema.parse(request.body);

    const access = await verifyProjectAccess(body.projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    const connection = await prisma.gitHubConnection.findFirst({
      where: { tenantId: dbUser.tenantId },
    });

    if (!connection) {
      return reply.status(400).send({ error: 'GitHub not connected' });
    }

    // Create or update project repository
    const repository = await prisma.projectRepository.upsert({
      where: { projectId: body.projectId },
      create: {
        projectId: body.projectId,
        githubConnId: connection.id,
        repoOwner: body.repoOwner,
        repoName: body.repoName,
        repoFullName: `${body.repoOwner}/${body.repoName}`,
        defaultBranch: body.defaultBranch,
      },
      update: {
        githubConnId: connection.id,
        repoOwner: body.repoOwner,
        repoName: body.repoName,
        repoFullName: `${body.repoOwner}/${body.repoName}`,
        defaultBranch: body.defaultBranch,
      },
    });

    return { repository };
  });

  // Get repository info for a project
  app.get('/repos/:projectId', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    if (!access.project.repository) {
      return { connected: false };
    }

    return {
      connected: true,
      repository: access.project.repository,
    };
  });

  // Clone repository to dev environment
  app.post('/clone', async (request, reply) => {
    const user = (request as any).user;
    const body = CloneRepoSchema.parse(request.body);

    const access = await verifyProjectAccess(body.projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    if (!access.project.repository) {
      return reply.status(400).send({ error: 'No repository connected to this project' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    const connection = await getGitHubConnection(dbUser.tenantId);
    if (!connection) {
      return reply.status(400).send({ error: 'GitHub not connected' });
    }

    // Get the dev environment for this project
    const devEnv = await prisma.devEnvironment.findFirst({
      where: { projectId: body.projectId, status: 'running' },
    });

    if (!devEnv) {
      return reply.status(400).send({
        error: 'No running dev environment for this project. Please start one first.',
      });
    }

    // In a real implementation, this would send a clone command to the dev environment
    // For now, return success with the clone URL
    const repo = access.project.repository;
    const cloneUrl = `https://x-access-token:${connection.accessToken}@github.com/${repo.repoFullName}.git`;

    return {
      success: true,
      cloneUrl: `https://github.com/${repo.repoFullName}.git`,
      targetPath: body.targetPath || `/workspace/${repo.repoName}`,
      message: 'Clone command prepared. Execute in dev environment terminal.',
      command: `git clone ${cloneUrl} ${body.targetPath || `/workspace/${repo.repoName}`}`,
    };
  });

  // Commit changes (via GitHub API - for direct file commits)
  app.post('/commit', async (request, reply) => {
    const user = (request as any).user;
    const body = CommitSchema.parse(request.body);

    const access = await verifyProjectAccess(body.projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    if (!access.project.repository) {
      return reply.status(400).send({ error: 'No repository connected to this project' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    const connection = await getGitHubConnection(dbUser.tenantId);
    if (!connection) {
      return reply.status(400).send({ error: 'GitHub not connected' });
    }

    // For direct file commits via API (useful for single file changes)
    // More complex commits should be done via git commands in the terminal
    return {
      success: true,
      message: 'For multi-file commits, use git commands in the terminal',
      gitCommand: `git add . && git commit -m "${body.message}"`,
    };
  });

  // Push to remote
  app.post('/push', async (request, reply) => {
    const user = (request as any).user;
    const body = PushSchema.parse(request.body);

    const access = await verifyProjectAccess(body.projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    if (!access.project.repository) {
      return reply.status(400).send({ error: 'No repository connected to this project' });
    }

    const repo = access.project.repository;
    const branch = body.branch || repo.defaultBranch;

    return {
      success: true,
      message: 'Push command prepared. Execute in dev environment terminal.',
      gitCommand: body.force
        ? `git push -f origin ${branch}`
        : `git push origin ${branch}`,
    };
  });

  // Create pull request
  app.post('/pull-request', async (request, reply) => {
    const user = (request as any).user;
    const body = PullRequestSchema.parse(request.body);

    const access = await verifyProjectAccess(body.projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    if (!access.project.repository) {
      return reply.status(400).send({ error: 'No repository connected to this project' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    const connection = await getGitHubConnection(dbUser.tenantId);
    if (!connection) {
      return reply.status(400).send({ error: 'GitHub not connected' });
    }

    const repo = access.project.repository;

    try {
      const pr = await githubApi(
        `/repos/${repo.repoFullName}/pulls`,
        connection.accessToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: body.title,
            body: body.body || '',
            head: body.head,
            base: body.base,
            draft: body.draft,
          }),
        }
      ) as GitHubPullRequest;

      return {
        success: true,
        pullRequest: {
          number: pr.number,
          url: pr.html_url,
          title: pr.title,
          state: pr.state,
        },
      };
    } catch (error) {
      console.error('Failed to create PR:', error);
      return reply.status(500).send({ error: 'Failed to create pull request' });
    }
  });

  // List pull requests for a project's repository
  app.get('/pull-requests/:projectId', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { state = 'open' } = request.query as { state?: string };

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    if (!access.project.repository) {
      return reply.status(400).send({ error: 'No repository connected to this project' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    const connection = await getGitHubConnection(dbUser.tenantId);
    if (!connection) {
      return reply.status(400).send({ error: 'GitHub not connected' });
    }

    const repo = access.project.repository;

    try {
      const prs = await githubApi(
        `/repos/${repo.repoFullName}/pulls?state=${state}`,
        connection.accessToken
      );

      return { pullRequests: prs };
    } catch (error) {
      console.error('Failed to fetch PRs:', error);
      return reply.status(500).send({ error: 'Failed to fetch pull requests' });
    }
  });

  // Get branches for a project's repository
  app.get('/branches/:projectId', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    if (!access.project.repository) {
      return reply.status(400).send({ error: 'No repository connected to this project' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    const connection = await getGitHubConnection(dbUser.tenantId);
    if (!connection) {
      return reply.status(400).send({ error: 'GitHub not connected' });
    }

    const repo = access.project.repository;

    try {
      const branches = await githubApi(
        `/repos/${repo.repoFullName}/branches`,
        connection.accessToken
      );

      return { branches };
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      return reply.status(500).send({ error: 'Failed to fetch branches' });
    }
  });

  // Webhook handler for GitHub events
  app.post('/webhooks', async (request, reply) => {
    const signature = request.headers['x-hub-signature-256'] as string;
    const event = request.headers['x-github-event'] as string;
    const payload = request.body;

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        return reply.status(401).send({ error: 'Invalid signature' });
      }
    }

    // Handle different event types
    switch (event) {
      case 'push':
        // Handle push events (e.g., sync local state)
        console.log('GitHub push event received:', (payload as any).repository?.full_name);
        break;
      case 'pull_request':
        // Handle PR events (e.g., update card status)
        console.log('GitHub PR event:', (payload as any).action, (payload as any).pull_request?.number);
        break;
      default:
        console.log('Unhandled GitHub event:', event);
    }

    return { received: true };
  });
};
