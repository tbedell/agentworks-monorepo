import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { gitControlService, createGitOperations, BRANCH_STRATEGIES } from '@agentworks/git-service';
import type { BranchStrategyType } from '@agentworks/git-service';
import { lucia } from '../lib/auth.js';

export const gitRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
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

  // Helper to verify project access
  async function verifyProjectAccess(projectId: string, userId: string, requireWrite = false): Promise<
    | { error: string; status: number }
    | { project: NonNullable<Awaited<ReturnType<typeof prisma.project.findUnique>>>; membership: any }
  > {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: { include: { members: true } },
        gitConfig: true,
      },
    });

    if (!project) {
      return { error: 'Project not found', status: 404 };
    }

    const membership = project.workspace.members.find((m) => m.userId === userId);
    if (!membership) {
      return { error: 'Not authorized', status: 403 };
    }

    if (requireWrite && membership.role === 'viewer') {
      return { error: 'Write access required', status: 403 };
    }

    return { project, membership };
  }

  // Get git config for project
  app.get('/:projectId/git/config', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const gitConfig = await gitControlService.getGitConfig(projectId);

    if (!gitConfig) {
      return { configured: false, message: 'Git not configured for this project' };
    }

    return { configured: true, config: gitConfig };
  });

  // Create or update git config
  app.put('/:projectId/git/config', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const config = request.body as {
      repositoryUrl?: string;
      defaultBranch?: string;
      developmentBranch?: string;
      productionBranch?: string;
      autoCommit?: boolean;
      autoPush?: boolean;
      requireApproval?: boolean;
      branchPrefix?: string;
    };

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const gitConfig = await gitControlService.createOrUpdateGitConfig(projectId, config);
    return gitConfig;
  });

  // Get git status
  app.get('/:projectId/git/status', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const git = await gitControlService.getGitForProject(projectId);
    if (!git) {
      return reply.status(400).send({ error: 'Project has no git repository configured' });
    }

    const status = await git.getStatus();
    return status;
  });

  // Get git diff
  app.get('/:projectId/git/diff', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { staged } = request.query as { staged?: string };

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const git = await gitControlService.getGitForProject(projectId);
    if (!git) {
      return reply.status(400).send({ error: 'Project has no git repository configured' });
    }

    const diff = await git.diff(staged === 'true');
    return { diff };
  });

  // Get git log
  app.get('/:projectId/git/log', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { limit } = request.query as { limit?: string };

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const git = await gitControlService.getGitForProject(projectId);
    if (!git) {
      return reply.status(400).send({ error: 'Project has no git repository configured' });
    }

    const log = await git.getLog(limit ? parseInt(limit, 10) : 10);
    return log;
  });

  // List branches
  app.get('/:projectId/git/branches', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const git = await gitControlService.getGitForProject(projectId);
    if (!git) {
      return reply.status(400).send({ error: 'Project has no git repository configured' });
    }

    const branches = await git.listBranches();
    return branches;
  });

  // Create branch
  app.post('/:projectId/git/branches', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { name, baseBranch } = request.body as { name: string; baseBranch?: string };

    if (!name) {
      return reply.status(400).send({ error: 'Branch name is required' });
    }

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const git = await gitControlService.getGitForProject(projectId);
    if (!git) {
      return reply.status(400).send({ error: 'Project has no git repository configured' });
    }

    await git.createBranch(name, baseBranch);
    return { success: true, branch: name };
  });

  // Checkout branch
  app.post('/:projectId/git/checkout', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { branch } = request.body as { branch: string };

    if (!branch) {
      return reply.status(400).send({ error: 'Branch name is required' });
    }

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const git = await gitControlService.getGitForProject(projectId);
    if (!git) {
      return reply.status(400).send({ error: 'Project has no git repository configured' });
    }

    await git.checkout(branch);
    return { success: true, branch };
  });

  // Request git operation (commit, push, PR) - requires CoPilot approval
  app.post('/:projectId/git/request', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { operation, message, branch, title, description } = request.body as {
      operation: 'commit' | 'push' | 'create_pr' | 'merge';
      message?: string;
      branch?: string;
      title?: string;
      description?: string;
    };

    if (!operation) {
      return reply.status(400).send({ error: 'Operation is required' });
    }

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const requestResult = await gitControlService.requestOperation(
      operation,
      projectId,
      'human',
      {
        message,
        branch,
        title,
        description,
        requestedByUserId: user.id,
      }
    );

    return {
      requestId: requestResult.id,
      status: requestResult.status,
      message: requestResult.status === 'pending'
        ? 'Git operation request created. Awaiting CoPilot approval.'
        : 'Git operation executed.',
    };
  });

  // Get pending git operation requests
  app.get('/:projectId/git/requests', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const pendingRequests = await gitControlService.getPendingOperations(projectId);
    return { requests: pendingRequests };
  });

  // Approve git operation (only for CoPilot or owners)
  app.post('/:projectId/git/requests/:requestId/approve', async (request, reply) => {
    const user = (request as any).user;
    const { projectId, requestId } = request.params as { projectId: string; requestId: string };

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    // Only owners can approve
    if (access.membership.role !== 'owner') {
      return reply.status(403).send({ error: 'Only workspace owners can approve git operations' });
    }

    const result = await gitControlService.approveOperation(requestId, user.id);
    return result;
  });

  // Reject git operation
  app.post('/:projectId/git/requests/:requestId/reject', async (request, reply) => {
    const user = (request as any).user;
    const { projectId, requestId } = request.params as { projectId: string; requestId: string };
    const { reason } = request.body as { reason?: string };

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    // Only owners can reject
    if (access.membership.role !== 'owner') {
      return reply.status(403).send({ error: 'Only workspace owners can reject git operations' });
    }

    await gitControlService.rejectOperation(requestId, user.id, reason || 'Rejected by user');
    return { success: true, message: 'Git operation rejected' };
  });

  // Get git operation history
  app.get('/:projectId/git/history', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { limit } = request.query as { limit?: string };

    const access = await verifyProjectAccess(projectId, user.id);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const history = await gitControlService.getOperationHistory(projectId, limit ? parseInt(limit, 10) : 50);
    return { history };
  });

  // Get available branch strategies
  app.get('/branch-strategies', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    return {
      strategies: Object.entries(BRANCH_STRATEGIES).map(([key, value]) => ({
        name: key,
        ...value,
      })),
    };
  });

  // Direct commit (skips approval if user has permission)
  app.post('/:projectId/git/commit', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { message, files } = request.body as { message: string; files?: string[] };

    if (!message) {
      return reply.status(400).send({ error: 'Commit message is required' });
    }

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const git = await gitControlService.getGitForProject(projectId);
    if (!git) {
      return reply.status(400).send({ error: 'Project has no git repository configured' });
    }

    // Check if approval is required
    const config = await gitControlService.getGitConfig(projectId);
    if (config?.requireApproval && access.membership.role !== 'owner') {
      // Redirect to approval flow
      const requestResult = await gitControlService.requestOperation(
        'commit',
        projectId,
        'human',
        { message, requestedByUserId: user.id }
      );
      return {
        requiresApproval: true,
        requestId: requestResult.id,
        message: 'Commit requires approval. Request created.',
      };
    }

    // Direct commit (add files first if specified, then commit)
    if (files && files.length > 0) {
      await git.add(files);
    }
    await git.commit(message);
    return { success: true, message: 'Changes committed successfully' };
  });

  // Direct push (skips approval if user has permission)
  app.post('/:projectId/git/push', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { remote, branch, force } = request.body as { remote?: string; branch?: string; force?: boolean };

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const git = await gitControlService.getGitForProject(projectId);
    if (!git) {
      return reply.status(400).send({ error: 'Project has no git repository configured' });
    }

    // Check if approval is required
    const config = await gitControlService.getGitConfig(projectId);
    if (config?.requireApproval && access.membership.role !== 'owner') {
      const requestResult = await gitControlService.requestOperation(
        'push',
        projectId,
        'human',
        { branch, requestedByUserId: user.id }
      );
      return {
        requiresApproval: true,
        requestId: requestResult.id,
        message: 'Push requires approval. Request created.',
      };
    }

    // Direct push (note: force push not supported in GitOperations for safety)
    await git.push(branch, remote || 'origin');
    return { success: true, message: 'Changes pushed successfully' };
  });

  // Pull from remote
  app.post('/:projectId/git/pull', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { remote, branch, rebase } = request.body as { remote?: string; branch?: string; rebase?: boolean };

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const git = await gitControlService.getGitForProject(projectId);
    if (!git) {
      return reply.status(400).send({ error: 'Project has no git repository configured' });
    }

    // Note: rebase option not currently supported in GitOperations
    await git.pull(branch, remote || 'origin');
    return { success: true, message: 'Changes pulled successfully' };
  });

  // Stage files
  app.post('/:projectId/git/stage', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { files } = request.body as { files?: string[] };

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const git = await gitControlService.getGitForProject(projectId);
    if (!git) {
      return reply.status(400).send({ error: 'Project has no git repository configured' });
    }

    await git.add(files || ['.']);
    return { success: true, message: 'Files staged successfully' };
  });

  // Unstage files
  app.post('/:projectId/git/unstage', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { files } = request.body as { files?: string[] };

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    const git = await gitControlService.getGitForProject(projectId);
    if (!git) {
      return reply.status(400).send({ error: 'Project has no git repository configured' });
    }

    // Use git reset to unstage files
    // Note: GitOperations.reset() currently doesn't support file-specific unstaging
    // For now, we reset all staged files
    await git.reset('mixed');
    return { success: true, message: 'Files unstaged successfully' };
  });

  // Initialize git repository
  app.post('/:projectId/git/init', async (request, reply) => {
    const user = (request as any).user;
    const { projectId } = request.params as { projectId: string };
    const { strategy } = request.body as { strategy?: BranchStrategyType };

    const access = await verifyProjectAccess(projectId, user.id, true);
    if ('error' in access) {
      return reply.status(access.status).send({ error: access.error });
    }

    if (!access.project.localPath) {
      return reply.status(400).send({ error: 'Project has no local path configured' });
    }

    const gitOps = createGitOperations(access.project.localPath);
    await gitOps.init();

    // Apply branch strategy if specified
    if (strategy && BRANCH_STRATEGIES[strategy]) {
      const config = BRANCH_STRATEGIES[strategy];
      await gitControlService.createOrUpdateGitConfig(projectId, {
        defaultBranch: config.mainBranch,
        developmentBranch: config.developmentBranch || undefined,
        productionBranch: config.productionBranch || undefined,
        branchPrefix: config.featureBranchPrefix,
        requireApproval: config.requireReview,
      });
    }

    return { success: true, message: 'Git repository initialized' };
  });
};
