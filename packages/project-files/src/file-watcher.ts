import * as chokidar from 'chokidar';
import type { FSWatcher } from 'chokidar';
import * as path from 'path';
import * as fs from 'fs-extra';
import { createLogger } from '@agentworks/shared';
import { ProjectFileSystem } from './project-fs.js';

const logger = createLogger('project-files:watcher');

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  projectId: string;
  timestamp: Date;
}

export type FileChangeHandler = (event: FileChangeEvent) => void | Promise<void>;

export class ProjectFileWatcher {
  private watchers: Map<string, FSWatcher> = new Map();
  private projectFs: ProjectFileSystem;
  private changeHandlers: FileChangeHandler[] = [];

  constructor(projectFs?: ProjectFileSystem) {
    this.projectFs = projectFs || new ProjectFileSystem();
  }

  async watchProject(
    projectId: string,
    projectPath: string,
    options: { ignored?: string[] } = {}
  ): Promise<void> {
    if (this.watchers.has(projectId)) {
      logger.warn('Project already being watched', { projectId });
      return;
    }

    const ignored = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.agentworks/cache/**',
      ...(options.ignored || []),
    ];

    const watcher = chokidar.watch(projectPath, {
      ignored,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    watcher.on('add', (filePath) => this.handleFileEvent('add', filePath, projectId, projectPath));
    watcher.on('change', (filePath) => this.handleFileEvent('change', filePath, projectId, projectPath));
    watcher.on('unlink', (filePath) => this.handleFileEvent('unlink', filePath, projectId, projectPath));

    watcher.on('error', (error) => {
      logger.error('Watcher error', { projectId, error });
    });

    this.watchers.set(projectId, watcher);
    logger.info('Started watching project', { projectId, projectPath });
  }

  async unwatchProject(projectId: string): Promise<void> {
    const watcher = this.watchers.get(projectId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(projectId);
      logger.info('Stopped watching project', { projectId });
    }
  }

  onFileChange(handler: FileChangeHandler): void {
    this.changeHandlers.push(handler);
  }

  removeChangeHandler(handler: FileChangeHandler): void {
    const index = this.changeHandlers.indexOf(handler);
    if (index > -1) {
      this.changeHandlers.splice(index, 1);
    }
  }

  async close(): Promise<void> {
    for (const [projectId, watcher] of this.watchers) {
      await watcher.close();
      logger.info('Closed watcher', { projectId });
    }
    this.watchers.clear();
    this.changeHandlers = [];
  }

  private async handleFileEvent(
    type: 'add' | 'change' | 'unlink',
    absolutePath: string,
    projectId: string,
    projectPath: string
  ): Promise<void> {
    const relativePath = path.relative(projectPath, absolutePath);

    if (this.shouldIgnoreFile(relativePath)) {
      return;
    }

    const event: FileChangeEvent = {
      type,
      path: relativePath,
      projectId,
      timestamp: new Date(),
    };

    logger.debug('File event detected', { type, path: relativePath, projectId });

    try {
      if (type === 'add') {
        await this.handleFileAdd(projectId, absolutePath, relativePath);
      } else if (type === 'change') {
        await this.handleFileChange(projectId, absolutePath, relativePath);
      } else if (type === 'unlink') {
        await this.handleFileUnlink(projectId, relativePath);
      }

      for (const handler of this.changeHandlers) {
        try {
          await handler(event);
        } catch (error) {
          logger.error('Change handler error', { error });
        }
      }
    } catch (error) {
      logger.error('Error handling file event', { type, path: relativePath, error });
    }
  }

  private async handleFileAdd(
    projectId: string,
    absolutePath: string,
    relativePath: string
  ): Promise<void> {
    const stats = await fs.stat(absolutePath);
    if (stats.isDirectory()) {
      return;
    }

    const content = await fs.readFile(absolutePath, 'utf-8').catch(() => '');
    await this.projectFs.createFile(projectId, relativePath, content, {
      isGenerated: false,
    });
  }

  private async handleFileChange(
    projectId: string,
    absolutePath: string,
    relativePath: string
  ): Promise<void> {
    const content = await fs.readFile(absolutePath, 'utf-8').catch(() => '');
    await this.projectFs.updateFile(projectId, relativePath, content);
  }

  private async handleFileUnlink(projectId: string, relativePath: string): Promise<void> {
    try {
      await this.projectFs.deleteFile(projectId, relativePath);
    } catch {
      // File may not exist in database
    }
  }

  private shouldIgnoreFile(relativePath: string): boolean {
    const ignoredPatterns = [
      /^\.git\//,
      /^node_modules\//,
      /^dist\//,
      /^build\//,
      /^\.agentworks\/cache\//,
      /\.swp$/,
      /\.swo$/,
      /~$/,
      /^\.DS_Store$/,
      /^Thumbs\.db$/,
    ];

    return ignoredPatterns.some((pattern) => pattern.test(relativePath));
  }
}

export const projectWatcher = new ProjectFileWatcher();
