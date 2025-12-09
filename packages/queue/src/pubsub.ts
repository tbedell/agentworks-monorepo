import { PubSub, type Subscription, type Message } from '@google-cloud/pubsub';
import type { QueueAdapter, Job, JobHandler, QueueConfig } from './types.js';

export class PubSubQueueAdapter implements QueueAdapter {
  name = 'pubsub';
  private client: PubSub;
  private subscriptions = new Map<string, Subscription>();
  private projectId: string;

  constructor(config?: QueueConfig['pubsub']) {
    this.projectId = config?.projectId || process.env.GOOGLE_CLOUD_PROJECT || '';
    this.client = new PubSub({ projectId: this.projectId });
  }

  async publish<T>(topic: string, data: T): Promise<string> {
    const topicRef = this.client.topic(topic);
    
    const [exists] = await topicRef.exists();
    if (!exists) {
      await topicRef.create();
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const message = {
      json: {
        id: jobId,
        name: topic,
        data,
        timestamp: new Date().toISOString(),
        attempts: 0,
      },
      attributes: {
        jobId,
      },
    };

    await topicRef.publishMessage(message);
    return jobId;
  }

  async subscribe<T>(topic: string, handler: JobHandler<T>): Promise<void> {
    const subscriptionName = `${topic}-sub`;
    
    const topicRef = this.client.topic(topic);
    const [topicExists] = await topicRef.exists();
    if (!topicExists) {
      await topicRef.create();
    }

    let subscription = this.client.subscription(subscriptionName);
    const [subExists] = await subscription.exists();
    if (!subExists) {
      [subscription] = await topicRef.createSubscription(subscriptionName);
    }

    const messageHandler = async (message: Message) => {
      try {
        const jobData = JSON.parse(message.data.toString());
        const job: Job<T> = {
          id: jobData.id,
          name: jobData.name,
          data: jobData.data,
          timestamp: new Date(jobData.timestamp),
          attempts: jobData.attempts || 0,
        };

        const result = await handler(job);
        if (result.success) {
          message.ack();
        } else {
          message.nack();
        }
      } catch (err) {
        console.error('Error processing message:', err);
        message.nack();
      }
    };

    subscription.on('message', messageHandler);
    this.subscriptions.set(topic, subscription);
  }

  async unsubscribe(topic: string): Promise<void> {
    const subscription = this.subscriptions.get(topic);
    if (subscription) {
      subscription.removeAllListeners();
      this.subscriptions.delete(topic);
    }
  }

  async getJob(_jobId: string): Promise<Job | null> {
    return null;
  }

  async close(): Promise<void> {
    for (const subscription of this.subscriptions.values()) {
      subscription.removeAllListeners();
    }
    this.subscriptions.clear();
    await this.client.close();
  }
}
