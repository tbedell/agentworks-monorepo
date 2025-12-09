import { createLogger } from '@agentworks/shared';
import { GitOperations } from './git-operations.js';
import { BranchStrategy, BRANCH_STRATEGIES, BranchStrategyType } from './types.js';

const logger = createLogger('git-service:branch-manager');

export class BranchManager {
  private git: GitOperations;
  private strategy: BranchStrategy;

  constructor(git: GitOperations, strategyType: BranchStrategyType = 'gitflow') {
    this.git = git;
    this.strategy = BRANCH_STRATEGIES[strategyType];
  }

  getStrategy(): BranchStrategy {
    return this.strategy;
  }

  setStrategy(strategyType: BranchStrategyType): void {
    this.strategy = BRANCH_STRATEGIES[strategyType];
    logger.info('Branch strategy changed', { strategyType });
  }

  async createFeatureBranch(featureName: string, baseBranch?: string): Promise<string> {
    const branchName = `${this.strategy.featureBranchPrefix}${featureName}`;
    const base = baseBranch || this.strategy.developmentBranch || this.strategy.mainBranch;

    await this.git.createBranch(branchName, base);
    logger.info('Feature branch created', { branchName, base });

    return branchName;
  }

  async createBugfixBranch(bugName: string, baseBranch?: string): Promise<string> {
    const branchName = `${this.strategy.bugfixBranchPrefix}${bugName}`;
    const base = baseBranch || this.strategy.developmentBranch || this.strategy.mainBranch;

    await this.git.createBranch(branchName, base);
    logger.info('Bugfix branch created', { branchName, base });

    return branchName;
  }

  async createReleaseBranch(version: string): Promise<string> {
    const branchName = `${this.strategy.releaseBranchPrefix}${version}`;
    const base = this.strategy.developmentBranch || this.strategy.mainBranch;

    await this.git.createBranch(branchName, base);
    logger.info('Release branch created', { branchName, base });

    return branchName;
  }

  async createHotfixBranch(hotfixName: string): Promise<string> {
    const branchName = `${this.strategy.hotfixBranchPrefix}${hotfixName}`;
    const base = this.strategy.productionBranch || this.strategy.mainBranch;

    await this.git.createBranch(branchName, base);
    logger.info('Hotfix branch created', { branchName, base });

    return branchName;
  }

  async finishFeature(featureBranch: string, deleteBranch = true): Promise<void> {
    const targetBranch = this.strategy.developmentBranch || this.strategy.mainBranch;

    await this.git.checkout(targetBranch);
    await this.git.merge(featureBranch, `Merge ${featureBranch} into ${targetBranch}`);

    if (deleteBranch) {
      await this.git.deleteBranch(featureBranch);
    }

    logger.info('Feature finished', { featureBranch, targetBranch, deleted: deleteBranch });
  }

  async finishRelease(releaseBranch: string, version: string): Promise<void> {
    const mainBranch = this.strategy.mainBranch;
    const devBranch = this.strategy.developmentBranch;
    const prodBranch = this.strategy.productionBranch;

    await this.git.checkout(mainBranch);
    await this.git.merge(releaseBranch, `Release ${version}`);

    if (prodBranch && prodBranch !== mainBranch) {
      await this.git.checkout(prodBranch);
      await this.git.merge(mainBranch, `Release ${version}`);
    }

    if (devBranch) {
      await this.git.checkout(devBranch);
      await this.git.merge(releaseBranch, `Merge release ${version} back to development`);
    }

    await this.git.deleteBranch(releaseBranch);

    logger.info('Release finished', { releaseBranch, version });
  }

  async finishHotfix(hotfixBranch: string, version: string): Promise<void> {
    const mainBranch = this.strategy.mainBranch;
    const prodBranch = this.strategy.productionBranch || mainBranch;
    const devBranch = this.strategy.developmentBranch;

    await this.git.checkout(prodBranch);
    await this.git.merge(hotfixBranch, `Hotfix ${version}`);

    if (prodBranch !== mainBranch) {
      await this.git.checkout(mainBranch);
      await this.git.merge(hotfixBranch, `Hotfix ${version}`);
    }

    if (devBranch) {
      await this.git.checkout(devBranch);
      await this.git.merge(hotfixBranch, `Merge hotfix ${version} to development`);
    }

    await this.git.deleteBranch(hotfixBranch);

    logger.info('Hotfix finished', { hotfixBranch, version });
  }

  getBranchType(branchName: string): 'feature' | 'bugfix' | 'release' | 'hotfix' | 'main' | 'development' | 'production' | 'unknown' {
    if (branchName === this.strategy.mainBranch) return 'main';
    if (branchName === this.strategy.developmentBranch) return 'development';
    if (branchName === this.strategy.productionBranch) return 'production';
    if (branchName.startsWith(this.strategy.featureBranchPrefix)) return 'feature';
    if (branchName.startsWith(this.strategy.bugfixBranchPrefix)) return 'bugfix';
    if (branchName.startsWith(this.strategy.releaseBranchPrefix)) return 'release';
    if (branchName.startsWith(this.strategy.hotfixBranchPrefix)) return 'hotfix';
    return 'unknown';
  }

  getTargetBranchForMerge(sourceBranch: string): string {
    const branchType = this.getBranchType(sourceBranch);

    switch (branchType) {
      case 'feature':
      case 'bugfix':
        return this.strategy.developmentBranch || this.strategy.mainBranch;
      case 'release':
        return this.strategy.mainBranch;
      case 'hotfix':
        return this.strategy.productionBranch || this.strategy.mainBranch;
      default:
        return this.strategy.mainBranch;
    }
  }

  async validateBranchName(branchName: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (branchName.includes(' ')) {
      errors.push('Branch name cannot contain spaces');
    }

    if (branchName.includes('..')) {
      errors.push('Branch name cannot contain ".."');
    }

    if (/[~^:?*\[\]\\]/.test(branchName)) {
      errors.push('Branch name contains invalid characters');
    }

    if (branchName.startsWith('-') || branchName.endsWith('/') || branchName.endsWith('.')) {
      errors.push('Branch name has invalid start or end character');
    }

    if (branchName.includes('@{')) {
      errors.push('Branch name cannot contain "@{"');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  generateBranchName(type: 'feature' | 'bugfix' | 'release' | 'hotfix', name: string): string {
    const sanitized = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    switch (type) {
      case 'feature':
        return `${this.strategy.featureBranchPrefix}${sanitized}`;
      case 'bugfix':
        return `${this.strategy.bugfixBranchPrefix}${sanitized}`;
      case 'release':
        return `${this.strategy.releaseBranchPrefix}${sanitized}`;
      case 'hotfix':
        return `${this.strategy.hotfixBranchPrefix}${sanitized}`;
    }
  }
}

export function createBranchManager(
  git: GitOperations,
  strategyType: BranchStrategyType = 'gitflow'
): BranchManager {
  return new BranchManager(git, strategyType);
}
