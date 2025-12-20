import { prisma, Prisma } from '@agentworks/db';
import { createLogger } from '@agentworks/shared';
import { GitOperations, createGitOperations } from './git-operations.js';
import { BranchManager, createBranchManager } from './branch-manager.js';
import { createGitHubPullRequest, getCurrentBranchForProject } from './github-api.js';
import {
  GitOperationRequest,
  GitOperationType,
  CreateCommitRequest,
  CreateBranchRequest,
  PushRequest,
  MergeRequest,
  GitConfigInput,
  BranchStrategyType,
  BRANCH_STRATEGIES,
} from './types.js';

const logger = createLogger('git-service:control');

export class GitControlService {
  private gitInstances: Map<string, GitOperations> = new Map();
  private branchManagers: Map<string, BranchManager> = new Map();

  async getGitForProject(projectId: string): Promise<GitOperations | null> {
    if (this.gitInstances.has(projectId)) {
      return this.gitInstances.get(projectId)!;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project?.localPath) {
      return null;
    }

    const git = createGitOperations(project.localPath);
    this.gitInstances.set(projectId, git);

    return git;
  }

  async getBranchManagerForProject(projectId: string): Promise<BranchManager | null> {
    if (this.branchManagers.has(projectId)) {
      return this.branchManagers.get(projectId)!;
    }

    const git = await this.getGitForProject(projectId);
    if (!git) {
      return null;
    }

    const config = await this.getGitConfig(projectId);
    const strategyType: BranchStrategyType = config?.developmentBranch ? 'gitflow' : 'github-flow';

    const branchManager = createBranchManager(git, strategyType);
    this.branchManagers.set(projectId, branchManager);

    return branchManager;
  }

  async getGitConfig(projectId: string) {
    return prisma.projectGitConfig.findUnique({
      where: { projectId },
    });
  }

  async createOrUpdateGitConfig(projectId: string, config: GitConfigInput) {
    return prisma.projectGitConfig.upsert({
      where: { projectId },
      update: {
        ...config,
        updatedAt: new Date(),
      },
      create: {
        projectId,
        ...config,
      },
    });
  }

  async requestOperation(
    operation: GitOperationType,
    projectId: string,
    requestedBy: 'agent' | 'copilot' | 'human',
    details: Record<string, unknown>,
    agentName?: string
  ): Promise<GitOperationRequest> {
    logger.info('Git operation requested', { operation, projectId, requestedBy, agentName });

    const config = await this.getGitConfig(projectId);
    const requiresApproval = config?.requireApproval ?? true;

    const request = await prisma.gitOperationRequest.create({
      data: {
        projectId,
        operation,
        requestedBy: agentName ? `${requestedBy}:${agentName}` : requestedBy,
        status: requiresApproval && requestedBy === 'agent' ? 'pending' : 'approved',
        details: details as Prisma.InputJsonValue,
      },
    });

    if (!requiresApproval || requestedBy !== 'agent') {
      return this.executeOperation(request.id);
    }

    logger.info('Git operation pending approval', { requestId: request.id, operation });

    return this.toGitOperationRequest(request);
  }

  async approveOperation(
    requestId: string,
    approvedBy: string
  ): Promise<GitOperationRequest> {
    const request = await prisma.gitOperationRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
      },
    });

    logger.info('Git operation approved', { requestId, approvedBy });

    return this.executeOperation(requestId);
  }

  async rejectOperation(
    requestId: string,
    rejectedBy: string,
    reason: string
  ): Promise<GitOperationRequest> {
    const request = await prisma.gitOperationRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    logger.info('Git operation rejected', { requestId, rejectedBy, reason });

    return this.toGitOperationRequest(request);
  }

  async executeOperation(requestId: string): Promise<GitOperationRequest> {
    const request = await prisma.gitOperationRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error(`Operation request not found: ${requestId}`);
    }

    if (request.status === 'rejected') {
      throw new Error('Cannot execute rejected operation');
    }

    const git = await this.getGitForProject(request.projectId);
    if (!git) {
      return this.failOperation(requestId, 'Project has no git repository configured');
    }

    try {
      let result: Record<string, unknown> = {};
      const details = request.details as Record<string, unknown>;

      switch (request.operation) {
        case 'commit':
          const commitHash = await git.addAndCommit(
            details.message as string,
            (details.files as string[]) || '.'
          );
          result = { commitHash };
          break;

        case 'push':
          await git.push(
            details.branch as string | undefined,
            details.remote as string | undefined,
            details.setUpstream as boolean | undefined
          );
          result = { pushed: true };
          break;

        case 'pull':
          await git.pull(
            details.branch as string | undefined,
            details.remote as string | undefined
          );
          result = { pulled: true };
          break;

        case 'merge':
          await git.merge(
            details.sourceBranch as string,
            details.message as string | undefined
          );
          result = { merged: true };
          break;

        case 'create_branch':
          await git.createBranch(
            details.branchName as string,
            details.baseBranch as string | undefined
          );
          result = { branchCreated: details.branchName };
          break;

        case 'create_pr':
          // Get the head branch - use provided one or get current branch
          let headBranch = details.head as string | undefined;
          if (!headBranch) {
            const currentBranch = await getCurrentBranchForProject(request.projectId);
            if (!currentBranch) {
              throw new Error('Could not determine current branch');
            }
            headBranch = currentBranch;
          }

          const prResult = await createGitHubPullRequest(request.projectId, {
            title: details.title as string,
            body: details.body as string | undefined,
            head: headBranch,
            base: details.base as string | undefined,
            draft: details.draft as boolean | undefined,
          });

          result = {
            prCreated: true,
            prNumber: prResult.number,
            prUrl: prResult.url,
            prTitle: prResult.title,
            prState: prResult.state,
          };
          break;

        default:
          throw new Error(`Unknown operation: ${request.operation}`);
      }

      const updated = await prisma.gitOperationRequest.update({
        where: { id: requestId },
        data: {
          status: 'executed',
          executedAt: new Date(),
          executionResult: result as Prisma.InputJsonValue,
        },
      });

      logger.info('Git operation executed', { requestId, operation: request.operation, result });

      return this.toGitOperationRequest(updated);
    } catch (error) {
      return this.failOperation(
        requestId,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async failOperation(
    requestId: string,
    error: string
  ): Promise<GitOperationRequest> {
    const updated = await prisma.gitOperationRequest.update({
      where: { id: requestId },
      data: {
        status: 'failed',
        executionResult: { error } as Prisma.InputJsonValue,
      },
    });

    logger.error('Git operation failed', { requestId, error });

    return this.toGitOperationRequest(updated);
  }

  async requestCommit(request: CreateCommitRequest): Promise<GitOperationRequest> {
    return this.requestOperation(
      'commit',
      request.projectId,
      request.requestedBy,
      { message: request.message, files: request.files },
      request.agentName
    );
  }

  async requestPush(request: PushRequest): Promise<GitOperationRequest> {
    return this.requestOperation(
      'push',
      request.projectId,
      request.requestedBy,
      { branch: request.branch, force: request.force },
      request.agentName
    );
  }

  async requestCreateBranch(request: CreateBranchRequest): Promise<GitOperationRequest> {
    return this.requestOperation(
      'create_branch',
      request.projectId,
      request.requestedBy,
      { branchName: request.branchName, baseBranch: request.baseBranch },
      request.agentName
    );
  }

  async requestMerge(request: MergeRequest): Promise<GitOperationRequest> {
    return this.requestOperation(
      'merge',
      request.projectId,
      request.requestedBy,
      {
        sourceBranch: request.sourceBranch,
        targetBranch: request.targetBranch,
        message: request.message,
      },
      request.agentName
    );
  }

  async getPendingOperations(projectId?: string): Promise<GitOperationRequest[]> {
    const where: Prisma.GitOperationRequestWhereInput = { status: 'pending' };
    if (projectId) {
      where.projectId = projectId;
    }

    const requests = await prisma.gitOperationRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => this.toGitOperationRequest(r));
  }

  async getOperationHistory(
    projectId: string,
    limit = 50
  ): Promise<GitOperationRequest[]> {
    const requests = await prisma.gitOperationRequest.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return requests.map((r) => this.toGitOperationRequest(r));
  }

  private toGitOperationRequest(record: {
    id: string;
    projectId: string;
    operation: string;
    requestedBy: string;
    status: string;
    details: Prisma.JsonValue;
    approvedBy: string | null;
    approvedAt: Date | null;
    rejectedBy: string | null;
    rejectedAt: Date | null;
    rejectionReason: string | null;
    executedAt: Date | null;
    executionResult: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): GitOperationRequest {
    const [requestedByType, agentName] = record.requestedBy.includes(':')
      ? record.requestedBy.split(':')
      : [record.requestedBy, undefined];

    return {
      id: record.id,
      projectId: record.projectId,
      operation: record.operation as GitOperationType,
      requestedBy: requestedByType as 'agent' | 'copilot' | 'human',
      agentName,
      status: record.status as GitOperationRequest['status'],
      details: (record.details as Record<string, unknown>) || {},
      approvedBy: record.approvedBy || undefined,
      approvedAt: record.approvedAt || undefined,
      rejectedBy: record.rejectedBy || undefined,
      rejectedAt: record.rejectedAt || undefined,
      rejectionReason: record.rejectionReason || undefined,
      executedAt: record.executedAt || undefined,
      executionResult: (record.executionResult as Record<string, unknown>) || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

export const gitControlService = new GitControlService();
