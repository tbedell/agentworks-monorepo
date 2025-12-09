import { prisma } from '@agentworks/db';
import { gcpBillingService } from './gcp-billing.js';

interface TenantProfitability {
  tenantId: string;
  tenantName: string;
  plan: string;
  revenue: number;
  llmCost: number;
  infraCost: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
  status: 'healthy' | 'warning' | 'critical';
  anomalies: string[];
}

interface KPISummary {
  revenue: {
    total: number;
    subscription: number;
    usage: number;
    overage: number;
    mrr: number;
    arr: number;
    growth: number;
  };
  costs: {
    total: number;
    llm: number;
    infrastructure: number;
    affiliate: number;
    operations: number;
  };
  margins: {
    gross: number;
    net: number;
    target: number;
  };
  metrics: {
    totalTenants: number;
    activeTenants: number;
    totalApiCalls: number;
    avgCostPerCall: number;
    avgRevenuePerCall: number;
  };
  runway: {
    months: number;
    cashPosition: number;
    monthlyBurn: number;
  };
}

interface Anomaly {
  type: 'margin' | 'usage' | 'cost' | 'churn';
  severity: 'low' | 'medium' | 'high';
  tenantId?: string;
  tenantName?: string;
  message: string;
  value: number;
  threshold: number;
}

const THRESHOLDS = {
  MARGIN_CRITICAL: 20,
  MARGIN_WARNING: 40,
  MARGIN_TARGET: 50,
  USAGE_SPIKE_MULTIPLIER: 2.5,
  COST_PER_CALL_MAX: 0.05,
};

export class KPICalculator {
  async getSummary(startDate?: Date, endDate?: Date): Promise<KPISummary> {
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate || new Date();

    const [usageData, gcpCosts, tenantCount] = await Promise.all([
      this.getUsageData(start, end),
      gcpBillingService.getCurrentMonthCosts(),
      prisma.workspace.count(),
    ]);

    const totalRevenue = usageData.totalBilled;
    const llmCost = usageData.totalProviderCost;
    const infraCost = gcpCosts.totalCost;
    const affiliateCost = totalRevenue * 0.05;
    const operationsCost = 2000;
    const totalCost = llmCost + infraCost + affiliateCost + operationsCost;

    const grossProfit = totalRevenue - llmCost;
    const netProfit = totalRevenue - totalCost;

    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const avgCostPerCall = usageData.totalCalls > 0 ? llmCost / usageData.totalCalls : 0;
    const avgRevenuePerCall = usageData.totalCalls > 0 ? totalRevenue / usageData.totalCalls : 0;

    const monthlyBurn = totalCost - totalRevenue;
    const cashPosition = 150000;
    const runway = monthlyBurn > 0 ? cashPosition / monthlyBurn : 999;

    return {
      revenue: {
        total: totalRevenue,
        subscription: totalRevenue * 0.7,
        usage: totalRevenue * 0.25,
        overage: totalRevenue * 0.05,
        mrr: totalRevenue,
        arr: totalRevenue * 12,
        growth: 15.5,
      },
      costs: {
        total: totalCost,
        llm: llmCost,
        infrastructure: infraCost,
        affiliate: affiliateCost,
        operations: operationsCost,
      },
      margins: {
        gross: Math.round(grossMargin * 10) / 10,
        net: Math.round(netMargin * 10) / 10,
        target: THRESHOLDS.MARGIN_TARGET,
      },
      metrics: {
        totalTenants: tenantCount,
        activeTenants: Math.floor(tenantCount * 0.7),
        totalApiCalls: usageData.totalCalls,
        avgCostPerCall: Math.round(avgCostPerCall * 10000) / 10000,
        avgRevenuePerCall: Math.round(avgRevenuePerCall * 10000) / 10000,
      },
      runway: {
        months: Math.round(runway * 10) / 10,
        cashPosition,
        monthlyBurn: Math.round(monthlyBurn),
      },
    };
  }

  async getTenantProfitability(): Promise<TenantProfitability[]> {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const usage = await prisma.usageRecord.groupBy({
      by: ['workspaceId'],
      _sum: {
        inputTokens: true,
        outputTokens: true,
        providerCost: true,
        billedAmount: true,
      },
      _count: true,
      where: {
        createdAt: { gte: startOfMonth },
      },
    });

    const workspaceIds = usage.map((u) => u.workspaceId);
    const workspaces = await prisma.workspace.findMany({
      where: { id: { in: workspaceIds } },
    });
    const workspaceMap = new Map(workspaces.map((w) => [w.id, w]));

    const gcpCosts = await gcpBillingService.getCurrentMonthCosts();
    const infraCostPerTenant = workspaceIds.length > 0 
      ? gcpCosts.totalCost / workspaceIds.length 
      : 0;

    const results: TenantProfitability[] = [];

    for (const u of usage) {
      const workspace = workspaceMap.get(u.workspaceId);
      const revenue = u._sum.billedAmount || 0;
      const llmCost = u._sum.providerCost || 0;
      const infraCost = infraCostPerTenant;
      const totalCost = llmCost + infraCost;
      const grossProfit = revenue - totalCost;
      const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

      const anomalies: string[] = [];
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';

      if (margin < THRESHOLDS.MARGIN_CRITICAL) {
        status = 'critical';
        anomalies.push(`Margin ${margin.toFixed(1)}% below critical threshold (${THRESHOLDS.MARGIN_CRITICAL}%)`);
      } else if (margin < THRESHOLDS.MARGIN_WARNING) {
        status = 'warning';
        anomalies.push(`Margin ${margin.toFixed(1)}% below warning threshold (${THRESHOLDS.MARGIN_WARNING}%)`);
      }

      const avgCostPerCall = u._count > 0 ? llmCost / u._count : 0;
      if (avgCostPerCall > THRESHOLDS.COST_PER_CALL_MAX) {
        anomalies.push(`High cost per call: $${avgCostPerCall.toFixed(4)} (max: $${THRESHOLDS.COST_PER_CALL_MAX})`);
      }

      results.push({
        tenantId: u.workspaceId,
        tenantName: workspace?.name || 'Unknown',
        plan: 'Pro',
        revenue,
        llmCost,
        infraCost,
        totalCost,
        grossProfit,
        margin: Math.round(margin * 10) / 10,
        status,
        anomalies,
      });
    }

    return results.sort((a, b) => a.margin - b.margin);
  }

  async getAnomalies(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    const profitability = await this.getTenantProfitability();

    for (const tenant of profitability) {
      if (tenant.margin < THRESHOLDS.MARGIN_CRITICAL) {
        anomalies.push({
          type: 'margin',
          severity: 'high',
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          message: `Critical: ${tenant.tenantName} has ${tenant.margin.toFixed(1)}% margin`,
          value: tenant.margin,
          threshold: THRESHOLDS.MARGIN_CRITICAL,
        });
      } else if (tenant.margin < THRESHOLDS.MARGIN_WARNING) {
        anomalies.push({
          type: 'margin',
          severity: 'medium',
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          message: `Warning: ${tenant.tenantName} has ${tenant.margin.toFixed(1)}% margin`,
          value: tenant.margin,
          threshold: THRESHOLDS.MARGIN_WARNING,
        });
      }
    }

    const summary = await this.getSummary();
    if (summary.margins.gross < THRESHOLDS.MARGIN_TARGET) {
      anomalies.push({
        type: 'margin',
        severity: summary.margins.gross < THRESHOLDS.MARGIN_WARNING ? 'high' : 'medium',
        message: `Platform gross margin ${summary.margins.gross}% below target ${THRESHOLDS.MARGIN_TARGET}%`,
        value: summary.margins.gross,
        threshold: THRESHOLDS.MARGIN_TARGET,
      });
    }

    if (summary.runway.months < 6) {
      anomalies.push({
        type: 'cost',
        severity: 'high',
        message: `Low runway: ${summary.runway.months} months remaining`,
        value: summary.runway.months,
        threshold: 6,
      });
    }

    return anomalies.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  async estimate(params: {
    tenants: number;
    apiCallsPerTenant: number;
    modelMix: { economy: number; standard: number; premium: number };
    planMix: { starter: number; pro: number; enterprise: number };
    utilization: number;
  }): Promise<{
    revenue: number;
    costs: { llm: number; infra: number; total: number };
    margin: number;
    profitable: boolean;
    breakEvenTenants: number;
  }> {
    const costPerCallByTier = {
      economy: 0.005,
      standard: 0.025,
      premium: 0.075,
    };

    const blendedCostPerCall =
      costPerCallByTier.economy * (params.modelMix.economy / 100) +
      costPerCallByTier.standard * (params.modelMix.standard / 100) +
      costPerCallByTier.premium * (params.modelMix.premium / 100);

    const revenuePerTenant = {
      starter: 0,
      pro: 79,
      enterprise: 349,
    };

    const callsPerTier = {
      starter: 100,
      pro: 1500,
      enterprise: 8000,
    };

    const starterTenants = Math.round(params.tenants * (params.planMix.starter / 100));
    const proTenants = Math.round(params.tenants * (params.planMix.pro / 100));
    const enterpriseTenants = Math.round(params.tenants * (params.planMix.enterprise / 100));

    const totalRevenue =
      starterTenants * revenuePerTenant.starter +
      proTenants * revenuePerTenant.pro +
      enterpriseTenants * revenuePerTenant.enterprise;

    const totalCalls =
      (starterTenants * callsPerTier.starter +
        proTenants * callsPerTier.pro +
        enterpriseTenants * callsPerTier.enterprise) *
      (params.utilization / 100);

    const llmCost = totalCalls * blendedCostPerCall;
    const infraCost = 150 + params.tenants * 0.5;
    const totalCost = llmCost + infraCost;

    const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    const costPerTenant = totalCost / params.tenants;
    const avgRevenuePerTenant = totalRevenue / params.tenants;
    const breakEvenTenants = avgRevenuePerTenant > 0 
      ? Math.ceil(totalCost / avgRevenuePerTenant)
      : Infinity;

    return {
      revenue: Math.round(totalRevenue),
      costs: {
        llm: Math.round(llmCost),
        infra: Math.round(infraCost),
        total: Math.round(totalCost),
      },
      margin: Math.round(margin * 10) / 10,
      profitable: totalRevenue > totalCost,
      breakEvenTenants,
    };
  }

  private async getUsageData(startDate: Date, endDate: Date) {
    const records = await prisma.usageRecord.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    let totalBilled = 0;
    let totalProviderCost = 0;
    let totalCalls = 0;

    for (const record of records) {
      totalBilled += record.billedAmount;
      totalProviderCost += record.providerCost;
      totalCalls += 1;
    }

    return { totalBilled, totalProviderCost, totalCalls };
  }
}

export const kpiCalculator = new KPICalculator();
