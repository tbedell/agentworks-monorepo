import { Queue, Worker, type Job as BullJob } from 'bullmq';
import { Redis } from 'ioredis';
import type { QueueAdapter, Job, JobHandler, JobResult, QueueConfig } from './types.js';

export class LocalQueueAdapter implements QueueAdapter {
  name = 'local';
  private connection: Redis | null = null;
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();
  private useMemory: boolean;
  private memoryJobs = new Map<string, Job[]>();
  private memoryHandlers = new Map<string, JobHandler>();

  constructor(config?: QueueConfig['redis']) {
    this.useMemory = !config;
    if (config) {
      this.connection = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        maxRetriesPerRequest: null,
      });
    }
  }

  async publish<T>(topic: string, data: T): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    if (this.useMemory) {
      const job: Job<T> = {
        id: jobId,
        name: topic,
        data,
        timestamp: new Date(),
        attempts: 0,
      };

      const jobs = this.memoryJobs.get(topic) || [];
      jobs.push(job as Job);
      this.memoryJobs.set(topic, jobs);

      const handler = this.memoryHandlers.get(topic);
      if (handler) {
        setImmediate(async () => {
          try {
            await handler(job as Job);
          } catch (err) {
            console.error(`Job ${jobId} failed:`, err);
          }
        });
      }

      return jobId;
    }

    let queue = this.queues.get(topic);
    if (!queue) {
      queue = new Queue(topic, { connection: this.connection! });
      this.queues.set(topic, queue);
    }

    const job = await queue.add(topic, data, { jobId });
    return job.id!;
  }

  async subscribe<T>(topic: string, handler: JobHandler<T>): Promise<void> {
    if (this.useMemory) {
      this.memoryHandlers.set(topic, handler as JobHandler);
      return;
    }

    if (this.workers.has(topic)) {
      return;
    }

    const worker = new Worker<T>(
      topic,
      async (bullJob: BullJob<T>) => {
        const job: Job<T> = {
          id: bullJob.id!,
          name: bullJob.name,
          data: bullJob.data,
          timestamp: new Date(bullJob.timestamp),
          attempts: bullJob.attemptsMade,
        };

        const result = await handler(job);
        if (!result.success) {
          throw new Error(result.error || 'Job failed');
        }
        return result.data;
      },
      { connection: this.connection! }
    );

    this.workers.set(topic, worker);
  }

  async unsubscribe(topic: string): Promise<void> {
    if (this.useMemory) {
      this.memoryHandlers.delete(topic);
      return;
    }

    const worker = this.workers.get(topic);
    if (worker) {
      await worker.close();
      this.workers.delete(topic);
    }
  }

  async getJob(jobId: string): Promise<Job | null> {
    if (this.useMemory) {
      for (const jobs of this.memoryJobs.values()) {
        const job = jobs.find((j) => j.id === jobId);
        if (job) return job;
      }
      return null;
    }

    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job) {
        return {
          id: job.id!,
          name: job.name,
          data: job.data,
          timestamp: new Date(job.timestamp),
          attempts: job.attemptsMade,
        };
      }
    }
    return null;
  }

  async close(): Promise<void> {
    if (this.useMemory) {
      this.memoryJobs.clear();
      this.memoryHandlers.clear();
      return;
    }

    for (const worker of this.workers.values()) {
      await worker.close();
    }
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    if (this.connection) {
      await this.connection.quit();
    }
  }
}
