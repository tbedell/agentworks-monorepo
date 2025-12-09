import * as fs from 'fs/promises';
import * as path from 'path';
import type { StorageAdapter, StorageFile, UploadOptions, ListOptions, ListResult, StorageConfig } from './types.js';

export class LocalStorageAdapter implements StorageAdapter {
  name = 'local';
  private basePath: string;

  constructor(config?: StorageConfig['local']) {
    this.basePath = config?.basePath || path.join(process.cwd(), '.storage');
  }

  private getFullPath(filePath: string): string {
    return path.join(this.basePath, filePath);
  }

  async upload(filePath: string, data: Buffer | string, options?: UploadOptions): Promise<StorageFile> {
    const fullPath = this.getFullPath(filePath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });

    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    await fs.writeFile(fullPath, buffer);

    if (options?.metadata) {
      const metaPath = `${fullPath}.meta.json`;
      await fs.writeFile(metaPath, JSON.stringify({
        contentType: options.contentType || 'application/octet-stream',
        metadata: options.metadata,
        createdAt: new Date().toISOString(),
      }));
    }

    return this.getMetadata(filePath);
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(filePath);
    return fs.readFile(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    await fs.unlink(fullPath).catch(() => {});
    await fs.unlink(`${fullPath}.meta.json`).catch(() => {});
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(filePath: string): Promise<StorageFile> {
    const fullPath = this.getFullPath(filePath);
    const stats = await fs.stat(fullPath);

    let contentType = 'application/octet-stream';
    let metadata: Record<string, string> = {};

    try {
      const metaPath = `${fullPath}.meta.json`;
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);
      contentType = meta.contentType || contentType;
      metadata = meta.metadata || {};
    } catch {
    }

    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      contentType,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
      metadata,
    };
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const searchPath = options?.prefix 
      ? this.getFullPath(options.prefix)
      : this.basePath;

    const files: StorageFile[] = [];

    async function walkDir(dir: string, basePath: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walkDir(fullPath, basePath);
          } else if (!entry.name.endsWith('.meta.json')) {
            const relativePath = path.relative(basePath, fullPath);
            const stats = await fs.stat(fullPath);
            files.push({
              name: entry.name,
              path: relativePath,
              size: stats.size,
              contentType: 'application/octet-stream',
              createdAt: stats.birthtime,
              updatedAt: stats.mtime,
            });
          }
        }
      } catch {
      }
    }

    await walkDir(searchPath, this.basePath);

    const maxResults = options?.maxResults || 1000;
    return {
      files: files.slice(0, maxResults),
      nextPageToken: files.length > maxResults ? 'more' : undefined,
    };
  }

  async getSignedUrl(filePath: string, _expiresInSeconds?: number): Promise<string> {
    return `file://${this.getFullPath(filePath)}`;
  }
}
