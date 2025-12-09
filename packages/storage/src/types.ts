export interface StorageFile {
  name: string;
  path: string;
  size: number;
  contentType: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, string>;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  public?: boolean;
}

export interface ListOptions {
  prefix?: string;
  maxResults?: number;
  pageToken?: string;
}

export interface ListResult {
  files: StorageFile[];
  nextPageToken?: string;
}

export interface StorageAdapter {
  name: string;
  
  upload(path: string, data: Buffer | string, options?: UploadOptions): Promise<StorageFile>;
  
  download(path: string): Promise<Buffer>;
  
  delete(path: string): Promise<void>;
  
  exists(path: string): Promise<boolean>;
  
  getMetadata(path: string): Promise<StorageFile>;
  
  list(options?: ListOptions): Promise<ListResult>;
  
  getSignedUrl(path: string, expiresInSeconds?: number): Promise<string>;
}

export interface StorageConfig {
  type: 'local' | 'gcs';
  local?: {
    basePath: string;
  };
  gcs?: {
    projectId: string;
    bucket: string;
  };
}
