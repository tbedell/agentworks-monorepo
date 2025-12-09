import type { UsageRecord } from '../types.js';
import { applyBillingMarkup } from '../utils/billing.js';

export interface UsageTrackerConfig {
  billingMarkup?: number;
  billingIncrement?: number;
  flushInterval?: number;
  batchSize?: number;
  onFlush?: (records: UsageRecord[]) => Promise<void>;
}

export interface UsageSummary {
  totalProviderCost: number;
  totalBilledAmount: number;
  totalTokens: {
    input: number;
    output: number;
  };
  byProvider: Record<string, {
    cost: number;
    billed: number;
    count: number;
  }>;
  byOperation: Record<string, {
    cost: number;
    billed: number;
    count: number;
  }>;
  recordCount: number;
}

export class UsageTracker {
  private buffer: UsageRecord[] = [];
  private config: Required<UsageTrackerConfig>;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: UsageTrackerConfig = {}) {
    this.config = {
      billingMarkup: config.billingMarkup ?? 5.0,
      billingIncrement: config.billingIncrement ?? 0.25,
      flushInterval: config.flushInterval ?? 5000,
      batchSize: config.batchSize ?? 100,
      onFlush: config.onFlush ?? (async () => {}),
    };

    this.startFlushTimer();
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  async track(record: Omit<UsageRecord, 'billedAmount' | 'timestamp'>): Promise<UsageRecord> {
    const billing = applyBillingMarkup(
      record.providerCost,
      this.config.billingMarkup,
      this.config.billingIncrement
    );

    const fullRecord: UsageRecord = {
      ...record,
      billedAmount: billing.billedAmount,
      timestamp: new Date(),
    };

    this.buffer.push(fullRecord);

    if (this.buffer.length >= this.config.batchSize) {
      await this.flush();
    }

    return fullRecord;
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const records = [...this.buffer];
    this.buffer = [];

    try {
      await this.config.onFlush(records);
    } catch (error) {
      this.buffer = [...records, ...this.buffer];
      throw error;
    }
  }

  getSummary(records?: UsageRecord[]): UsageSummary {
    const data = records ?? this.buffer;

    const summary: UsageSummary = {
      totalProviderCost: 0,
      totalBilledAmount: 0,
      totalTokens: { input: 0, output: 0 },
      byProvider: {},
      byOperation: {},
      recordCount: data.length,
    };

    for (const record of data) {
      summary.totalProviderCost += record.providerCost;
      summary.totalBilledAmount += record.billedAmount;
      summary.totalTokens.input += record.inputTokens ?? 0;
      summary.totalTokens.output += record.outputTokens ?? 0;

      if (!summary.byProvider[record.provider]) {
        summary.byProvider[record.provider] = { cost: 0, billed: 0, count: 0 };
      }
      summary.byProvider[record.provider].cost += record.providerCost;
      summary.byProvider[record.provider].billed += record.billedAmount;
      summary.byProvider[record.provider].count += 1;

      if (!summary.byOperation[record.operation]) {
        summary.byOperation[record.operation] = { cost: 0, billed: 0, count: 0 };
      }
      summary.byOperation[record.operation].cost += record.providerCost;
      summary.byOperation[record.operation].billed += record.billedAmount;
      summary.byOperation[record.operation].count += 1;
    }

    return summary;
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

export function createUsageTracker(config?: UsageTrackerConfig): UsageTracker {
  return new UsageTracker(config);
}

export interface WorkspaceUsageQuery {
  workspaceId: string;
  startDate?: Date;
  endDate?: Date;
  providers?: string[];
  operations?: string[];
}

export interface ProjectUsageQuery {
  projectId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AgentUsageQuery {
  agentId: string;
  startDate?: Date;
  endDate?: Date;
}

export async function calculateWorkspaceBilling(
  records: UsageRecord[],
  query: WorkspaceUsageQuery
): Promise<{
  totalBilled: number;
  byProject: Record<string, number>;
  byAgent: Record<string, number>;
  byProvider: Record<string, number>;
}> {
  const filtered = records.filter((r) => {
    if (r.workspaceId !== query.workspaceId) return false;
    if (query.startDate && r.timestamp < query.startDate) return false;
    if (query.endDate && r.timestamp > query.endDate) return false;
    if (query.providers && !query.providers.includes(r.provider)) return false;
    if (query.operations && !query.operations.includes(r.operation)) return false;
    return true;
  });

  const result = {
    totalBilled: 0,
    byProject: {} as Record<string, number>,
    byAgent: {} as Record<string, number>,
    byProvider: {} as Record<string, number>,
  };

  for (const record of filtered) {
    result.totalBilled += record.billedAmount;

    if (record.projectId) {
      result.byProject[record.projectId] = (result.byProject[record.projectId] ?? 0) + record.billedAmount;
    }

    if (record.agentId) {
      result.byAgent[record.agentId] = (result.byAgent[record.agentId] ?? 0) + record.billedAmount;
    }

    result.byProvider[record.provider] = (result.byProvider[record.provider] ?? 0) + record.billedAmount;
  }

  return result;
}
