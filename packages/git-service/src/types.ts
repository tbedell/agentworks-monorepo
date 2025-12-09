export type BranchStrategyType = 'gitflow' | 'github-flow' | 'trunk-based';

export interface BranchStrategy {
  type: BranchStrategyType;
  mainBranch: string;
  developmentBranch: string | null;
  productionBranch: string | null;
  featureBranchPrefix: string;
  bugfixBranchPrefix: string;
  releaseBranchPrefix: string;
  hotfixBranchPrefix: string;
  requirePullRequest: boolean;
  requireReview: boolean;
  requireApproval: boolean;
}

export const BRANCH_STRATEGIES: Record<BranchStrategyType, BranchStrategy> = {
  gitflow: {
    type: 'gitflow',
    mainBranch: 'main',
    developmentBranch: 'development',
    productionBranch: 'production',
    featureBranchPrefix: 'feature/',
    bugfixBranchPrefix: 'bugfix/',
    releaseBranchPrefix: 'release/',
    hotfixBranchPrefix: 'hotfix/',
    requirePullRequest: true,
    requireReview: true,
    requireApproval: true,
  },
  'github-flow': {
    type: 'github-flow',
    mainBranch: 'main',
    developmentBranch: null,
    productionBranch: null,
    featureBranchPrefix: 'feature/',
    bugfixBranchPrefix: 'fix/',
    releaseBranchPrefix: 'release/',
    hotfixBranchPrefix: 'hotfix/',
    requirePullRequest: true,
    requireReview: true,
    requireApproval: false,
  },
  'trunk-based': {
    type: 'trunk-based',
    mainBranch: 'main',
    developmentBranch: null,
    productionBranch: null,
    featureBranchPrefix: '',
    bugfixBranchPrefix: '',
    releaseBranchPrefix: 'release/',
    hotfixBranchPrefix: '',
    requirePullRequest: false,
    requireReview: false,
    requireApproval: false,
  },
};

export interface GitStatus {
  branch: string;
  isClean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  email: string;
  date: Date;
  files: string[];
}

export type GitOperationType = 'commit' | 'push' | 'pull' | 'merge' | 'create_branch' | 'create_pr';

export interface GitOperationRequest {
  id: string;
  projectId: string;
  operation: GitOperationType;
  requestedBy: 'agent' | 'copilot' | 'human';
  agentName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  details: Record<string, unknown>;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  executedAt?: Date;
  executionResult?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommitRequest {
  projectId: string;
  message: string;
  files?: string[];
  requestedBy: 'agent' | 'copilot' | 'human';
  agentName?: string;
}

export interface CreateBranchRequest {
  projectId: string;
  branchName: string;
  baseBranch?: string;
  requestedBy: 'agent' | 'copilot' | 'human';
  agentName?: string;
}

export interface PushRequest {
  projectId: string;
  branch?: string;
  force?: boolean;
  requestedBy: 'agent' | 'copilot' | 'human';
  agentName?: string;
}

export interface MergeRequest {
  projectId: string;
  sourceBranch: string;
  targetBranch: string;
  message?: string;
  requestedBy: 'agent' | 'copilot' | 'human';
  agentName?: string;
}

export interface PullRequestDetails {
  title: string;
  body: string;
  sourceBranch: string;
  targetBranch: string;
  draft?: boolean;
  labels?: string[];
  reviewers?: string[];
}

export interface GitConfigInput {
  repositoryUrl?: string;
  defaultBranch?: string;
  developmentBranch?: string;
  productionBranch?: string;
  autoCommit?: boolean;
  autoPush?: boolean;
  requireApproval?: boolean;
  branchPrefix?: string;
  commitMessageTemplate?: string;
}
