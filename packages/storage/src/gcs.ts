import { Storage, type Bucket } from '@google-cloud/storage';
import type { StorageAdapter, StorageFile, UploadOptions, ListOptions, ListResult, StorageConfig } from './types.js';

export class GCSStorageAdapter implements StorageAdapter {
  name = 'gcs';
  private storage: Storage;
  private bucket: Bucket;
  private bucketName: string;

  constructor(config?: StorageConfig['gcs']) {
    const projectId = config?.projectId || process.env.GOOGLE_CLOUD_PROJECT;
    this.bucketName = config?.bucket || process.env.GCS_BUCKET || 'agentworks-storage';
    
    this.storage = new Storage({ projectId });
    this.bucket = this.storage.bucket(this.bucketName);
  }

  async upload(filePath: string, data: Buffer | string, options?: UploadOptions): Promise<StorageFile> {
    const file = this.bucket.file(filePath);
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;

    await file.save(buffer, {
      contentType: options?.contentType || 'application/octet-stream',
      metadata: options?.metadata,
      public: options?.public,
    });

    return this.getMetadata(filePath);
  }

  async download(filePath: string): Promise<Buffer> {
    const file = this.bucket.file(filePath);
    const [contents] = await file.download();
    return contents;
  }

  async delete(filePath: string): Promise<void> {
    const file = this.bucket.file(filePath);
    await file.delete({ ignoreNotFound: true });
  }

  async exists(filePath: string): Promise<boolean> {
    const file = this.bucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  }

  async getMetadata(filePath: string): Promise<StorageFile> {
    const file = this.bucket.file(filePath);
    const [metadata] = await file.getMetadata();

    return {
      name: filePath.split('/').pop() || filePath,
      path: filePath,
      size: parseInt(metadata.size as string, 10) || 0,
      contentType: metadata.contentType || 'application/octet-stream',
      createdAt: new Date(metadata.timeCreated as string),
      updatedAt: new Date(metadata.updated as string),
      metadata: metadata.metadata as Record<string, string>,
    };
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const [files, , apiResponse] = await this.bucket.getFiles({
      prefix: options?.prefix,
      maxResults: options?.maxResults || 1000,
      pageToken: options?.pageToken,
    });

    return {
      files: files.map((file) => ({
        name: file.name.split('/').pop() || file.name,
        path: file.name,
        size: parseInt(file.metadata.size as string, 10) || 0,
        contentType: file.metadata.contentType || 'application/octet-stream',
        createdAt: new Date(file.metadata.timeCreated as string),
        updatedAt: new Date(file.metadata.updated as string),
        metadata: file.metadata.metadata as Record<string, string>,
      })),
      nextPageToken: (apiResponse as any)?.nextPageToken || undefined,
    };
  }

  async getSignedUrl(filePath: string, expiresInSeconds: number = 3600): Promise<string> {
    const file = this.bucket.file(filePath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInSeconds * 1000,
    });
    return url;
  }
}
