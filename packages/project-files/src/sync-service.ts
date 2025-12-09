import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { prisma } from '@agentworks/db';
import { createLogger } from '@agentworks/shared';
import { ProjectFileSystem } from './project-fs.js';
import { SyncResult, FileType, LANGUAGE_EXTENSIONS, FILE_TYPE_PATTERNS } from './types.js';

const logger = createLogger('project-files:sync');

export class ProjectSyncService {
  private projectFs: ProjectFileSystem;

  constructor(projectFs?: ProjectFileSystem) {
    this.projectFs = projectFs || new ProjectFileSystem();
  }

  async syncToDatabase(projectId: string): Promise<SyncResult> {
    const result: SyncResult = {
      added: [],
      modified: [],
      deleted: [],
      errors: [],
    };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || !project.localPath) {
      throw new Error(`Project ${projectId} does not have a local path configured`);
    }

    const projectPath = project.localPath;

    const existingFiles = await prisma.projectFile.findMany({
      where: { projectId },
    });
    const existingFileMap = new Map(existingFiles.map((f) => [f.path, f]));

    const fsFiles = await this.scanDirectory(projectPath);

    for (const [relativePath, fileInfo] of fsFiles) {
      const existing = existingFileMap.get(relativePath);

      try {
        if (!existing) {
          await prisma.projectFile.create({
            data: {
              projectId,
              path: relativePath,
              type: fileInfo.type,
              language: fileInfo.language,
              size: fileInfo.size,
              hash: fileInfo.hash,
              isGenerated: false,
              gitStatus: 'untracked',
            },
          });
          result.added.push(relativePath);
        } else if (existing.hash !== fileInfo.hash) {
          await prisma.projectFile.update({
            where: { id: existing.id },
            data: {
              size: fileInfo.size,
              hash: fileInfo.hash,
              gitStatus: existing.gitStatus === 'committed' ? 'modified' : existing.gitStatus,
              updatedAt: new Date(),
            },
          });
          result.modified.push(relativePath);
        }

        existingFileMap.delete(relativePath);
      } catch (error) {
        result.errors.push({
          path: relativePath,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    for (const [relativePath, file] of existingFileMap) {
      try {
        await prisma.projectFile.delete({ where: { id: file.id } });
        result.deleted.push(relativePath);
      } catch (error) {
        result.errors.push({
          path: relativePath,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Sync completed', {
      projectId,
      added: result.added.length,
      modified: result.modified.length,
      deleted: result.deleted.length,
      errors: result.errors.length,
    });

    return result;
  }

  async syncFromDatabase(projectId: string): Promise<SyncResult> {
    const result: SyncResult = {
      added: [],
      modified: [],
      deleted: [],
      errors: [],
    };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || !project.localPath) {
      throw new Error(`Project ${projectId} does not have a local path configured`);
    }

    logger.info('Sync from database is typically not needed as files are authoritative', { projectId });

    return result;
  }

  async getProjectStats(projectId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<string, number>;
    byLanguage: Record<string, number>;
    generatedCount: number;
    manualCount: number;
  }> {
    const files = await prisma.projectFile.findMany({
      where: { projectId },
    });

    const stats = {
      totalFiles: files.length,
      totalSize: 0,
      byType: {} as Record<string, number>,
      byLanguage: {} as Record<string, number>,
      generatedCount: 0,
      manualCount: 0,
    };

    for (const file of files) {
      stats.totalSize += file.size;

      stats.byType[file.type] = (stats.byType[file.type] || 0) + 1;

      if (file.language) {
        stats.byLanguage[file.language] = (stats.byLanguage[file.language] || 0) + 1;
      }

      if (file.isGenerated) {
        stats.generatedCount++;
      } else {
        stats.manualCount++;
      }
    }

    return stats;
  }

  async validateProjectIntegrity(projectId: string): Promise<{
    valid: boolean;
    issues: Array<{ type: string; path: string; message: string }>;
  }> {
    const issues: Array<{ type: string; path: string; message: string }> = [];

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || !project.localPath) {
      return { valid: false, issues: [{ type: 'error', path: '', message: 'Project path not configured' }] };
    }

    const projectPath = project.localPath;

    if (!(await fs.pathExists(projectPath))) {
      return { valid: false, issues: [{ type: 'error', path: projectPath, message: 'Project directory does not exist' }] };
    }

    const dbFiles = await prisma.projectFile.findMany({
      where: { projectId },
    });

    for (const dbFile of dbFiles) {
      const fullPath = path.join(projectPath, dbFile.path);

      if (!(await fs.pathExists(fullPath))) {
        issues.push({
          type: 'missing',
          path: dbFile.path,
          message: 'File exists in database but not on disk',
        });
        continue;
      }

      const content = await fs.readFile(fullPath, 'utf-8').catch(() => null);
      if (content !== null) {
        const currentHash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
        if (dbFile.hash && dbFile.hash !== currentHash) {
          issues.push({
            type: 'hash_mismatch',
            path: dbFile.path,
            message: 'File hash mismatch - file was modified outside of AgentWorks',
          });
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private async scanDirectory(
    dirPath: string,
    basePath?: string
  ): Promise<Map<string, { type: FileType; language: string | null; size: number; hash: string }>> {
    const base = basePath || dirPath;
    const files = new Map<string, { type: FileType; language: string | null; size: number; hash: string }>();

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(base, fullPath);

      if (this.shouldIgnore(entry.name, relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = await this.scanDirectory(fullPath, base);
        for (const [subPath, subInfo] of subFiles) {
          files.set(subPath, subInfo);
        }
      } else if (entry.isFile()) {
        try {
          const stats = await fs.stat(fullPath);
          const content = await fs.readFile(fullPath, 'utf-8').catch(() => '');
          const hash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);

          files.set(relativePath, {
            type: this.detectFileType(relativePath),
            language: this.detectLanguage(relativePath),
            size: stats.size,
            hash,
          });
        } catch {
          // Skip files we can't read
        }
      }
    }

    return files;
  }

  private shouldIgnore(name: string, relativePath: string): boolean {
    const ignoredNames = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      'out',
      '.DS_Store',
      'Thumbs.db',
      '.cache',
      'coverage',
      '.nyc_output',
    ];

    if (ignoredNames.includes(name)) {
      return true;
    }

    if (name.startsWith('.') && name !== '.agentworks' && name !== '.gitignore') {
      return true;
    }

    if (relativePath.startsWith('.agentworks/cache')) {
      return true;
    }

    return false;
  }

  private detectFileType(filePath: string): FileType {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();

    if (basename.includes('.test.') || basename.includes('.spec.')) {
      return 'test';
    }

    for (const [type, patterns] of Object.entries(FILE_TYPE_PATTERNS)) {
      for (const pattern of patterns) {
        const patternExt = pattern.replace('*', '');
        if (ext === patternExt || basename === pattern) {
          return type as FileType;
        }
      }
    }

    return 'source';
  }

  private detectLanguage(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    return LANGUAGE_EXTENSIONS[ext] || null;
  }
}

export const syncService = new ProjectSyncService();
