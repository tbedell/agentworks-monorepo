import type { QueueAdapter, QueueConfig } from './types.js';
import { LocalQueueAdapter } from './local.js';
import { PubSubQueueAdapter } from './pubsub.js';

let queueInstance: QueueAdapter | null = null;

export function createQueue(config?: QueueConfig): QueueAdapter {
  const type = config?.type || (process.env.NODE_ENV === 'production' ? 'pubsub' : 'memory');

  switch (type) {
    case 'pubsub':
      return new PubSubQueueAdapter(config?.pubsub);
    case 'local':
      return new LocalQueueAdapter(config?.redis);
    case 'memory':
    default:
      return new LocalQueueAdapter();
  }
}

export function getQueue(): QueueAdapter {
  if (!queueInstance) {
    queueInstance = createQueue();
  }
  return queueInstance;
}

export async function closeQueue(): Promise<void> {
  if (queueInstance) {
    await queueInstance.close();
    queueInstance = null;
  }
}
