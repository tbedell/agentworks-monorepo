import { simpleGit, SimpleGit, StatusResult, LogResult } from 'simple-git';
import { createLogger } from '@agentworks/shared';
import { GitStatus, CommitInfo } from './types.js';

const logger = createLogger('git-service:operations');

export class GitOperations {
  private git: SimpleGit;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.git = simpleGit(projectPath);
  }

  async init(): Promise<void> {
    await this.git.init();
    logger.info('Git repository initialized', { path: this.projectPath });
  }

  async isRepo(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<GitStatus> {
    const status: StatusResult = await this.git.status();

    return {
      branch: status.current || 'main',
      isClean: status.isClean(),
      staged: status.staged,
      unstaged: status.modified,
      untracked: status.not_added,
      ahead: status.ahead,
      behind: status.behind,
    };
  }

  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current || 'main';
  }

  async listBranches(): Promise<{ current: string; all: string[]; local: string[]; remote: string[] }> {
    const branches = await this.git.branch();
    return {
      current: branches.current,
      all: branches.all,
      local: Object.keys(branches.branches).filter((b) => !b.startsWith('remotes/')),
      remote: Object.keys(branches.branches).filter((b) => b.startsWith('remotes/')),
    };
  }

  async createBranch(branchName: string, baseBranch?: string): Promise<void> {
    if (baseBranch) {
      await this.git.checkoutBranch(branchName, baseBranch);
    } else {
      await this.git.checkoutLocalBranch(branchName);
    }
    logger.info('Branch created', { branchName, baseBranch, path: this.projectPath });
  }

  async checkout(branchName: string): Promise<void> {
    await this.git.checkout(branchName);
    logger.info('Checked out branch', { branchName, path: this.projectPath });
  }

  async deleteBranch(branchName: string, force = false): Promise<void> {
    if (force) {
      await this.git.branch(['-D', branchName]);
    } else {
      await this.git.branch(['-d', branchName]);
    }
    logger.info('Branch deleted', { branchName, force, path: this.projectPath });
  }

  async add(files: string[] | string = '.'): Promise<void> {
    const filesToAdd = Array.isArray(files) ? files : [files];
    await this.git.add(filesToAdd);
    logger.info('Files staged', { files: filesToAdd, path: this.projectPath });
  }

  async commit(message: string): Promise<string> {
    const result = await this.git.commit(message);
    logger.info('Commit created', {
      hash: result.commit,
      message,
      path: this.projectPath,
    });
    return result.commit;
  }

  async addAndCommit(message: string, files: string[] | string = '.'): Promise<string> {
    await this.add(files);
    return this.commit(message);
  }

  async push(branch?: string, remote = 'origin', setUpstream = false): Promise<void> {
    const currentBranch = branch || (await this.getCurrentBranch());
    const options = setUpstream ? ['-u', remote, currentBranch] : [remote, currentBranch];
    await this.git.push(options);
    logger.info('Pushed to remote', {
      branch: currentBranch,
      remote,
      setUpstream,
      path: this.projectPath,
    });
  }

  async pull(branch?: string, remote = 'origin'): Promise<void> {
    const currentBranch = branch || (await this.getCurrentBranch());
    await this.git.pull(remote, currentBranch);
    logger.info('Pulled from remote', { branch: currentBranch, remote, path: this.projectPath });
  }

  async fetch(remote = 'origin'): Promise<void> {
    await this.git.fetch(remote);
    logger.info('Fetched from remote', { remote, path: this.projectPath });
  }

  async merge(sourceBranch: string, message?: string): Promise<void> {
    const options = message ? [sourceBranch, '-m', message] : [sourceBranch];
    await this.git.merge(options);
    logger.info('Merged branch', { sourceBranch, message, path: this.projectPath });
  }

  async rebase(baseBranch: string): Promise<void> {
    await this.git.rebase([baseBranch]);
    logger.info('Rebased onto branch', { baseBranch, path: this.projectPath });
  }

  async getLog(maxCount = 10): Promise<CommitInfo[]> {
    const log: LogResult = await this.git.log({ maxCount });

    return log.all.map((entry) => ({
      hash: entry.hash,
      message: entry.message,
      author: entry.author_name,
      email: entry.author_email,
      date: new Date(entry.date),
      files: [],
    }));
  }

  async getCommitDetails(hash: string): Promise<CommitInfo> {
    const log = await this.git.log({ from: hash, to: hash, maxCount: 1 });
    const show = await this.git.show([hash, '--name-only', '--format=']);

    const entry = log.latest;
    if (!entry) {
      throw new Error(`Commit not found: ${hash}`);
    }

    const files = show
      .split('\n')
      .filter((line) => line.trim())
      .slice(1);

    return {
      hash: entry.hash,
      message: entry.message,
      author: entry.author_name,
      email: entry.author_email,
      date: new Date(entry.date),
      files,
    };
  }

  async diff(staged = false): Promise<string> {
    if (staged) {
      return this.git.diff(['--cached']);
    }
    return this.git.diff();
  }

  async diffBranches(branch1: string, branch2: string): Promise<string> {
    return this.git.diff([branch1, branch2]);
  }

  async stash(message?: string): Promise<void> {
    if (message) {
      await this.git.stash(['push', '-m', message]);
    } else {
      await this.git.stash(['push']);
    }
    logger.info('Changes stashed', { message, path: this.projectPath });
  }

  async stashPop(): Promise<void> {
    await this.git.stash(['pop']);
    logger.info('Stash popped', { path: this.projectPath });
  }

  async reset(mode: 'soft' | 'mixed' | 'hard' = 'mixed', ref = 'HEAD'): Promise<void> {
    await this.git.reset([`--${mode}`, ref]);
    logger.info('Reset performed', { mode, ref, path: this.projectPath });
  }

  async clean(force = false, directories = false): Promise<void> {
    const options = ['-f'];
    if (directories) options.push('-d');
    if (!force) options.push('-n');
    await this.git.clean(options);
    logger.info('Clean performed', { force, directories, path: this.projectPath });
  }

  async addRemote(name: string, url: string): Promise<void> {
    await this.git.addRemote(name, url);
    logger.info('Remote added', { name, url, path: this.projectPath });
  }

  async removeRemote(name: string): Promise<void> {
    await this.git.removeRemote(name);
    logger.info('Remote removed', { name, path: this.projectPath });
  }

  async getRemotes(): Promise<Array<{ name: string; refs: { fetch: string; push: string } }>> {
    const remotes = await this.git.getRemotes(true);
    return remotes.map((r) => ({
      name: r.name,
      refs: {
        fetch: r.refs.fetch,
        push: r.refs.push,
      },
    }));
  }

  async setConfig(key: string, value: string, append = false): Promise<void> {
    if (append) {
      await this.git.addConfig(key, value);
    } else {
      await this.git.addConfig(key, value, false, 'local');
    }
    logger.info('Git config set', { key, path: this.projectPath });
  }

  async getConfig(key: string): Promise<string | null> {
    try {
      const config = await this.git.getConfig(key);
      return config.value;
    } catch {
      return null;
    }
  }
}

export function createGitOperations(projectPath: string): GitOperations {
  return new GitOperations(projectPath);
}
