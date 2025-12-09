import { createLogger } from '@agentworks/shared';
import { gitControlService } from '@agentworks/git-service';
import type { AgentTool, ToolContext, ToolResult } from '../types.js';

const logger = createLogger('agent-tools:git-tools');

export const gitStatusTool: AgentTool = {
  name: 'git_status',
  description: 'Get the current Git status of the project, including branch, staged/unstaged changes, and untracked files.',
  category: 'git',
  parameters: [],
  execute: async (_args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    try {
      const git = await gitControlService.getGitForProject(context.projectId);
      if (!git) {
        return {
          success: false,
          error: 'Git is not configured for this project',
        };
      }

      const status = await git.getStatus();

      logger.info('Git status retrieved', {
        projectId: context.projectId,
        branch: status.branch,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          branch: status.branch,
          isClean: status.isClean,
          staged: status.staged,
          unstaged: status.unstaged,
          untracked: status.untracked,
          ahead: status.ahead,
          behind: status.behind,
        },
      };
    } catch (error) {
      logger.error('Failed to get git status', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get git status',
      };
    }
  },
};

export const gitDiffTool: AgentTool = {
  name: 'git_diff',
  description: 'Get the diff of changes in the working directory or staged changes.',
  category: 'git',
  parameters: [
    {
      name: 'staged',
      type: 'boolean',
      description: 'If true, shows diff of staged changes. If false, shows diff of unstaged changes.',
      required: false,
      default: false,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const staged = (args.staged as boolean) ?? false;

    try {
      const git = await gitControlService.getGitForProject(context.projectId);
      if (!git) {
        return {
          success: false,
          error: 'Git is not configured for this project',
        };
      }

      const diff = await git.diff(staged);

      logger.info('Git diff retrieved', {
        projectId: context.projectId,
        staged,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          diff,
          staged,
          isEmpty: diff.trim() === '',
        },
      };
    } catch (error) {
      logger.error('Failed to get git diff', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get git diff',
      };
    }
  },
};

export const gitLogTool: AgentTool = {
  name: 'git_log',
  description: 'Get the recent commit history for the project.',
  category: 'git',
  parameters: [
    {
      name: 'maxCount',
      type: 'number',
      description: 'Maximum number of commits to return (default: 10)',
      required: false,
      default: 10,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const maxCount = (args.maxCount as number) ?? 10;

    try {
      const git = await gitControlService.getGitForProject(context.projectId);
      if (!git) {
        return {
          success: false,
          error: 'Git is not configured for this project',
        };
      }

      const log = await git.getLog(maxCount);

      logger.info('Git log retrieved', {
        projectId: context.projectId,
        count: log.length,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          commits: log.map((commit) => ({
            hash: commit.hash,
            message: commit.message,
            author: commit.author,
            date: commit.date.toISOString(),
          })),
        },
      };
    } catch (error) {
      logger.error('Failed to get git log', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get git log',
      };
    }
  },
};

export const gitCommitTool: AgentTool = {
  name: 'git_commit',
  description: 'Request to commit changes to the repository. Commits by agents require CoPilot/human approval.',
  category: 'git',
  requiresApproval: true,
  parameters: [
    {
      name: 'message',
      type: 'string',
      description: 'The commit message describing the changes',
      required: true,
    },
    {
      name: 'files',
      type: 'array',
      description: 'Specific files to include in the commit. If not specified, all changed files will be committed.',
      required: false,
      items: { type: 'string' },
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const message = args.message as string;
    const files = args.files as string[] | undefined;

    if (!message) {
      return { success: false, error: 'Commit message is required' };
    }

    try {
      const request = await gitControlService.requestCommit({
        projectId: context.projectId,
        message,
        files,
        requestedBy: 'agent',
        agentName: context.agentName,
      });

      logger.info('Commit requested', {
        projectId: context.projectId,
        requestId: request.id,
        status: request.status,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          requestId: request.id,
          status: request.status,
          operation: 'commit',
          message: request.status === 'pending'
            ? 'Commit request submitted for approval'
            : request.status === 'executed'
              ? 'Commit completed successfully'
              : `Commit ${request.status}`,
          result: request.executionResult,
        },
      };
    } catch (error) {
      logger.error('Failed to request commit', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request commit',
      };
    }
  },
};

export const gitPushTool: AgentTool = {
  name: 'git_push',
  description: 'Request to push commits to the remote repository. Pushes by agents require CoPilot/human approval.',
  category: 'git',
  requiresApproval: true,
  parameters: [
    {
      name: 'branch',
      type: 'string',
      description: 'The branch to push. If not specified, the current branch will be used.',
      required: false,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const branch = args.branch as string | undefined;

    try {
      const request = await gitControlService.requestPush({
        projectId: context.projectId,
        branch,
        requestedBy: 'agent',
        agentName: context.agentName,
      });

      logger.info('Push requested', {
        projectId: context.projectId,
        requestId: request.id,
        status: request.status,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          requestId: request.id,
          status: request.status,
          operation: 'push',
          message: request.status === 'pending'
            ? 'Push request submitted for approval'
            : request.status === 'executed'
              ? 'Push completed successfully'
              : `Push ${request.status}`,
        },
      };
    } catch (error) {
      logger.error('Failed to request push', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request push',
      };
    }
  },
};

export const gitCreateBranchTool: AgentTool = {
  name: 'git_create_branch',
  description: 'Request to create a new branch. Branch creation by agents may require approval.',
  category: 'git',
  parameters: [
    {
      name: 'branchName',
      type: 'string',
      description: 'The name of the new branch to create',
      required: true,
    },
    {
      name: 'baseBranch',
      type: 'string',
      description: 'The base branch to create from. If not specified, uses the current branch.',
      required: false,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const branchName = args.branchName as string;
    const baseBranch = args.baseBranch as string | undefined;

    if (!branchName) {
      return { success: false, error: 'Branch name is required' };
    }

    try {
      const request = await gitControlService.requestCreateBranch({
        projectId: context.projectId,
        branchName,
        baseBranch,
        requestedBy: 'agent',
        agentName: context.agentName,
      });

      logger.info('Branch creation requested', {
        projectId: context.projectId,
        requestId: request.id,
        branchName,
        status: request.status,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          requestId: request.id,
          status: request.status,
          operation: 'create_branch',
          branchName,
          message: request.status === 'pending'
            ? 'Branch creation request submitted for approval'
            : request.status === 'executed'
              ? `Branch ${branchName} created successfully`
              : `Branch creation ${request.status}`,
        },
      };
    } catch (error) {
      logger.error('Failed to request branch creation', {
        projectId: context.projectId,
        branchName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request branch creation',
      };
    }
  },
};

export const gitListBranchesTool: AgentTool = {
  name: 'git_list_branches',
  description: 'List all branches in the repository.',
  category: 'git',
  parameters: [],
  execute: async (_args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    try {
      const git = await gitControlService.getGitForProject(context.projectId);
      if (!git) {
        return {
          success: false,
          error: 'Git is not configured for this project',
        };
      }

      const branches = await git.listBranches();

      logger.info('Branches listed', {
        projectId: context.projectId,
        current: branches.current,
        count: branches.all.length,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          current: branches.current,
          local: branches.local,
          remote: branches.remote,
        },
      };
    } catch (error) {
      logger.error('Failed to list branches', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list branches',
      };
    }
  },
};

export const gitTools = [
  gitStatusTool,
  gitDiffTool,
  gitLogTool,
  gitCommitTool,
  gitPushTool,
  gitCreateBranchTool,
  gitListBranchesTool,
];
