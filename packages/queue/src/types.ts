export interface Job<T = unknown> {
  id: string;
  name: string;
  data: T;
  timestamp: Date;
  attempts: number;
}

export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type JobHandler<T = unknown, R = unknown> = (job: Job<T>) => Promise<JobResult<R>>;

export interface QueueAdapter {
  name: string;
  
  publish<T>(topic: string, data: T): Promise<string>;
  
  subscribe<T>(topic: string, handler: JobHandler<T>): Promise<void>;
  
  unsubscribe(topic: string): Promise<void>;
  
  getJob(jobId: string): Promise<Job | null>;
  
  close(): Promise<void>;
}

export interface QueueConfig {
  type: 'local' | 'pubsub' | 'memory';
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  pubsub?: {
    projectId: string;
  };
}
