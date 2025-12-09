import { BigQuery } from '@google-cloud/bigquery';

interface GCPCostItem {
  service: string;
  sku: string;
  cost: number;
  usage: number;
  unit: string;
}

interface GCPCostSummary {
  totalCost: number;
  byService: Record<string, number>;
  byDate: Array<{ date: string; cost: number }>;
  items: GCPCostItem[];
  lastUpdated: Date;
}

const LLM_PROVIDER_PRICING = {
  openai: {
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
  },
  anthropic: {
    'claude-3-5-sonnet': { input: 3.0, output: 15.0 },
    'claude-3-opus': { input: 15.0, output: 75.0 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
  },
  google: {
    'gemini-1.5-pro': { input: 1.25, output: 10.0 },
    'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  },
} as const;

export class GCPBillingService {
  private bigquery: BigQuery | null = null;
  private projectId: string;
  private datasetId: string;
  private billingAccountId: string;

  constructor() {
    this.projectId = process.env.GCP_PROJECT_ID || '';
    this.datasetId = process.env.GCP_BILLING_DATASET || 'billing_export';
    this.billingAccountId = process.env.GCP_BILLING_ACCOUNT_ID || '';

    if (this.projectId && process.env.GCP_CREDENTIALS_JSON) {
      try {
        const credentials = JSON.parse(process.env.GCP_CREDENTIALS_JSON);
        this.bigquery = new BigQuery({
          projectId: this.projectId,
          credentials,
        });
      } catch {
        console.warn('GCP BigQuery not configured - using mock data');
      }
    }
  }

  async getInfrastructureCosts(startDate: Date, endDate: Date): Promise<GCPCostSummary> {
    if (!this.bigquery) {
      return this.getMockInfrastructureCosts(startDate, endDate);
    }

    const tableName = `${this.projectId}.${this.datasetId}.gcp_billing_export_v1_${this.billingAccountId.replace(/-/g, '_')}`;

    const query = `
      SELECT
        service.description as service,
        sku.description as sku,
        SUM(cost) as cost,
        SUM(usage.amount) as usage,
        usage.unit as unit,
        DATE(usage_start_time) as date
      FROM \`${tableName}\`
      WHERE 
        DATE(usage_start_time) >= @startDate
        AND DATE(usage_start_time) <= @endDate
        AND project.id = @projectId
      GROUP BY service.description, sku.description, usage.unit, DATE(usage_start_time)
      ORDER BY cost DESC
    `;

    try {
      const [rows] = await this.bigquery.query({
        query,
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          projectId: this.projectId,
        },
      });

      const byService: Record<string, number> = {};
      const byDateMap: Record<string, number> = {};
      const items: GCPCostItem[] = [];
      let totalCost = 0;

      for (const row of rows) {
        totalCost += row.cost;
        byService[row.service] = (byService[row.service] || 0) + row.cost;
        byDateMap[row.date] = (byDateMap[row.date] || 0) + row.cost;
        items.push({
          service: row.service,
          sku: row.sku,
          cost: row.cost,
          usage: row.usage,
          unit: row.unit,
        });
      }

      return {
        totalCost,
        byService,
        byDate: Object.entries(byDateMap)
          .map(([date, cost]) => ({ date, cost }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        items,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('BigQuery error:', error);
      return this.getMockInfrastructureCosts(startDate, endDate);
    }
  }

  private getMockInfrastructureCosts(startDate: Date, endDate: Date): GCPCostSummary {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyCost = 8.5;

    const byDate: Array<{ date: string; cost: number }> = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      byDate.push({
        date: date.toISOString().split('T')[0],
        cost: dailyCost + (Math.random() - 0.5) * 3,
      });
    }

    const totalCost = byDate.reduce((sum, d) => sum + d.cost, 0);

    return {
      totalCost,
      byService: {
        'Cloud Run': totalCost * 0.45,
        'Cloud SQL': totalCost * 0.35,
        'Cloud Storage': totalCost * 0.08,
        'Networking': totalCost * 0.07,
        'Secret Manager': totalCost * 0.02,
        'Other': totalCost * 0.03,
      },
      byDate,
      items: [
        { service: 'Cloud Run', sku: 'CPU Allocation Time', cost: totalCost * 0.25, usage: 1000, unit: 'vCPU-seconds' },
        { service: 'Cloud Run', sku: 'Memory Allocation Time', cost: totalCost * 0.20, usage: 2000, unit: 'GiB-seconds' },
        { service: 'Cloud SQL', sku: 'db-f1-micro', cost: totalCost * 0.35, usage: days * 24, unit: 'hours' },
        { service: 'Cloud Storage', sku: 'Standard Storage', cost: totalCost * 0.08, usage: 50, unit: 'GiB-month' },
        { service: 'Networking', sku: 'Network Egress', cost: totalCost * 0.07, usage: 100, unit: 'GiB' },
      ],
      lastUpdated: new Date(),
    };
  }

  async getCurrentMonthCosts(): Promise<GCPCostSummary> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.getInfrastructureCosts(startOfMonth, now);
  }

  async getLastMonthCosts(): Promise<GCPCostSummary> {
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    return this.getInfrastructureCosts(startOfLastMonth, endOfLastMonth);
  }

  getProviderPricing() {
    return LLM_PROVIDER_PRICING;
  }

  calculateLLMCost(
    provider: keyof typeof LLM_PROVIDER_PRICING,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const providerPricing = LLM_PROVIDER_PRICING[provider] as Record<string, { input: number; output: number }> | undefined;
    if (!providerPricing) return 0;

    const modelPricing = providerPricing[model];
    if (!modelPricing) return 0;

    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  }
}

export const gcpBillingService = new GCPBillingService();
