import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Cpu,
  Server,
  Users,
  AlertTriangle,
  RefreshCw,
  Calculator,
  BarChart3,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { KPICard, KPIGrid } from '@/components/kpi/KPICard';
import { AnomalyList } from '@/components/kpi/AnomalyAlert';
import { kpiApi } from '@/lib/api';

export function KPIDashboard() {
  const { data: summary, isLoading: summaryLoading, refetch } = useQuery({
    queryKey: ['kpi', 'summary'],
    queryFn: kpiApi.getSummary,
    refetchInterval: 60000,
  });

  const { data: anomalies } = useQuery({
    queryKey: ['kpi', 'anomalies'],
    queryFn: kpiApi.getAnomalies,
  });

  const { data: gcpCosts } = useQuery({
    queryKey: ['kpi', 'gcp'],
    queryFn: () => kpiApi.getGCPCosts(),
  });

  const costBreakdownData = summary
    ? [
        { name: 'LLM API', value: summary.costs.llm, color: '#3b82f6' },
        { name: 'Infrastructure', value: summary.costs.infrastructure, color: '#8b5cf6' },
        { name: 'Affiliate', value: summary.costs.affiliate, color: '#06b6d4' },
        { name: 'Operations', value: summary.costs.operations, color: '#10b981' },
      ]
    : [];

  const gcpServiceData = gcpCosts
    ? Object.entries(gcpCosts.byService).map(([name, value]) => ({
        name: name.replace('Cloud ', ''),
        cost: value,
      }))
    : [];

  const marginStatus = summary
    ? summary.margins.gross >= 50
      ? 'healthy'
      : summary.margins.gross >= 40
      ? 'warning'
      : 'critical'
    : 'healthy';

  const runwayStatus = summary
    ? summary.runway.months >= 12
      ? 'healthy'
      : summary.runway.months >= 6
      ? 'warning'
      : 'critical'
    : 'healthy';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">KPI Dashboard</h1>
          <p className="text-slate-400">Real-time platform metrics and profitability</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="admin-btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link to="/kpi/estimator" className="admin-btn-primary flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Estimator
          </Link>
        </div>
      </div>

      <KPIGrid columns={4}>
        <KPICard
          title="Monthly Revenue"
          value={summaryLoading ? '...' : summary?.revenue.total || 0}
          format="currency"
          change={summary?.revenue.growth}
          changeLabel="vs last month"
          trend={summary?.revenue.growth && summary.revenue.growth > 0 ? 'up' : 'down'}
          icon={DollarSign}
        />
        <KPICard
          title="Total Costs"
          value={summaryLoading ? '...' : summary?.costs.total || 0}
          format="currency"
          icon={TrendingUp}
        />
        <KPICard
          title="Gross Margin"
          value={summaryLoading ? '...' : summary?.margins.gross || 0}
          format="percent"
          target={50}
          status={marginStatus}
          icon={BarChart3}
        />
        <KPICard
          title="Runway"
          value={summaryLoading ? '...' : `${summary?.runway.months || 0} mo`}
          subtitle={`$${(summary?.runway.cashPosition || 0).toLocaleString()} cash`}
          status={runwayStatus}
          icon={AlertTriangle}
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="admin-card">
            <h2 className="text-lg font-semibold text-white mb-4">P&L Summary</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Subscription Revenue</span>
                  <span className="text-white">
                    ${(summary?.revenue.subscription || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Usage Revenue</span>
                  <span className="text-white">
                    ${(summary?.revenue.usage || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Overage Revenue</span>
                  <span className="text-white">
                    ${(summary?.revenue.overage || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 font-bold">
                  <span className="text-white">Total Revenue</span>
                  <span className="text-green-400">
                    ${(summary?.revenue.total || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">LLM API Costs</span>
                  <span className="text-white">
                    ${(summary?.costs.llm || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Infrastructure</span>
                  <span className="text-white">
                    ${(summary?.costs.infrastructure || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Affiliate + Ops</span>
                  <span className="text-white">
                    ${((summary?.costs.affiliate || 0) + (summary?.costs.operations || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 font-bold">
                  <span className="text-white">Total Costs</span>
                  <span className="text-red-400">
                    ${(summary?.costs.total || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-white">Net Income</span>
                <span
                  className={`text-2xl font-bold ${
                    (summary?.revenue.total || 0) - (summary?.costs.total || 0) >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  ${((summary?.revenue.total || 0) - (summary?.costs.total || 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-slate-400">Net Margin</span>
                <span className={summary?.margins.net && summary.margins.net >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {summary?.margins.net || 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="admin-card">
              <h2 className="text-lg font-semibold text-white mb-4">Cost Breakdown</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {costBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="admin-card">
              <h2 className="text-lg font-semibold text-white mb-4">GCP Infrastructure</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gcpServiceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                    />
                    <Bar dataKey="cost" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="admin-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Anomalies</h2>
              <Link to="/kpi/tenants" className="text-sm text-blue-400 hover:text-blue-300">
                View all →
              </Link>
            </div>
            <AnomalyList anomalies={anomalies || []} maxItems={4} />
          </div>

          <div className="admin-card">
            <h2 className="text-lg font-semibold text-white mb-4">Key Metrics</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">Active Tenants</span>
                </div>
                <span className="text-white font-bold">
                  {summary?.metrics.activeTenants || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">API Calls (MTD)</span>
                </div>
                <span className="text-white font-bold">
                  {(summary?.metrics.totalApiCalls || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">Avg Cost/Call</span>
                </div>
                <span className="text-white font-bold">
                  ${summary?.metrics.avgCostPerCall.toFixed(4) || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">Avg Revenue/Call</span>
                </div>
                <span className="text-white font-bold">
                  ${summary?.metrics.avgRevenuePerCall.toFixed(4) || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">GCP Cost (MTD)</span>
                </div>
                <span className="text-white font-bold">
                  ${gcpCosts?.totalCost.toFixed(2) || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Links</h2>
            <div className="space-y-2">
              <Link
                to="/kpi/tenants"
                className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <span className="text-slate-300">Tenant Profitability</span>
                <span className="text-slate-500">→</span>
              </Link>
              <Link
                to="/kpi/estimator"
                className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <span className="text-slate-300">Cost Estimator</span>
                <span className="text-slate-500">→</span>
              </Link>
              <Link
                to="/analytics"
                className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <span className="text-slate-300">Usage Analytics</span>
                <span className="text-slate-500">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
