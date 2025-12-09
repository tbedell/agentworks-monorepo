import type { StorageAdapter, StorageConfig } from './types.js';
import { LocalStorageAdapter } from './local.js';
import { GCSStorageAdapter } from './gcs.js';

let storageInstance: StorageAdapter | null = null;

export function createStorage(config?: StorageConfig): StorageAdapter {
  const type = config?.type || (process.env.NODE_ENV === 'production' ? 'gcs' : 'local');

  switch (type) {
    case 'gcs':
      return new GCSStorageAdapter(config?.gcs);
    case 'local':
    default:
      return new LocalStorageAdapter(config?.local);
  }
}

export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    storageInstance = createStorage();
  }
  return storageInstance;
}
