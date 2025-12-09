import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, Download, AlertTriangle } from 'lucide-react';
import { ProfitabilityTable } from '@/components/kpi/ProfitabilityTable';
import { KPICard, KPIGrid } from '@/components/kpi/KPICard';
import { kpiApi } from '@/lib/api';

export function TenantProfitability() {
  const navigate = useNavigate();
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'margin' | 'revenue' | 'cost'>('margin');

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['kpi', 'tenants'],
    queryFn: kpiApi.getTenantProfitability,
  });

  const sortedTenants = tenants
    ? [...tenants].sort((a, b) => {
        switch (sortBy) {
          case 'margin':
            return a.margin - b.margin;
          case 'revenue':
            return b.revenue - a.revenue;
          case 'cost':
            return b.totalCost - a.totalCost;
          default:
            return 0;
        }
      })
    : [];

  const stats = {
    totalTenants: tenants?.length || 0,
    healthyCount: tenants?.filter((t) => t.status === 'healthy').length || 0,
    warningCount: tenants?.filter((t) => t.status === 'warning').length || 0,
    criticalCount: tenants?.filter((t) => t.status === 'critical').length || 0,
    totalRevenue: tenants?.reduce((sum, t) => sum + t.revenue, 0) || 0,
    totalCost: tenants?.reduce((sum, t) => sum + t.totalCost, 0) || 0,
    avgMargin:
      tenants && tenants.length > 0
        ? tenants.reduce((sum, t) => sum + t.margin, 0) / tenants.length
        : 0,
  };

  const exportCSV = () => {
    if (!tenants) return;

    const headers = [
      'Tenant ID',
      'Tenant Name',
      'Plan',
      'Revenue',
      'LLM Cost',
      'Infra Cost',
      'Total Cost',
      'Gross Profit',
      'Margin',
      'Status',
    ];

    const rows = tenants.map((t) => [
      t.tenantId,
      t.tenantName,
      t.plan,
      t.revenue.toFixed(2),
      t.llmCost.toFixed(2),
      t.infraCost.toFixed(2),
      t.totalCost.toFixed(2),
      t.grossProfit.toFixed(2),
      t.margin.toFixed(1),
      t.status,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenant-profitability-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/kpi"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Tenant Profitability</h1>
            <p className="text-slate-400">Per-tenant cost and margin analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="admin-btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <KPIGrid columns={4}>
        <KPICard
          title="Total Tenants"
          value={stats.totalTenants}
          subtitle={`${stats.healthyCount} healthy`}
        />
        <KPICard
          title="Total Revenue"
          value={stats.totalRevenue}
          format="currency"
        />
        <KPICard
          title="Total Cost"
          value={stats.totalCost}
          format="currency"
        />
        <KPICard
          title="Avg Margin"
          value={stats.avgMargin.toFixed(1)}
          format="percent"
          status={
            stats.avgMargin >= 50
              ? 'healthy'
              : stats.avgMargin >= 40
              ? 'warning'
              : 'critical'
          }
          target={50}
        />
      </KPIGrid>

      {stats.criticalCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <div>
            <p className="text-red-400 font-medium">
              {stats.criticalCount} tenant{stats.criticalCount > 1 ? 's' : ''} with critical margin
            </p>
            <p className="text-slate-400 text-sm">
              These tenants are operating below the 20% margin threshold
            </p>
          </div>
        </div>
      )}

      <div className="admin-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">All Tenants</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAnomaliesOnly}
                onChange={(e) => setShowAnomaliesOnly(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-400">Show anomalies only</span>
            </label>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="admin-input w-32"
              >
                <option value="margin">Margin (asc)</option>
                <option value="revenue">Revenue (desc)</option>
                <option value="cost">Cost (desc)</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-slate-400">Loading tenant data...</div>
        ) : (
          <ProfitabilityTable
            tenants={sortedTenants}
            showAnomaliesOnly={showAnomaliesOnly}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="admin-card">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Status Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-slate-300">Healthy (≥50%)</span>
              </div>
              <span className="text-white font-bold">{stats.healthyCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-slate-300">Warning (40-50%)</span>
              </div>
              <span className="text-white font-bold">{stats.warningCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-300">Critical (&lt;40%)</span>
              </div>
              <span className="text-white font-bold">{stats.criticalCount}</span>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Margin Distribution</h3>
          <div className="h-24 flex items-end gap-1">
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((threshold) => {
              const count =
                tenants?.filter(
                  (t) => t.margin >= threshold && t.margin < threshold + 10
                ).length || 0;
              const maxCount = Math.max(
                ...(tenants?.map((t) => {
                  const bucket = Math.floor(t.margin / 10) * 10;
                  return tenants.filter(
                    (x) => x.margin >= bucket && x.margin < bucket + 10
                  ).length;
                }) || [1])
              );
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

              return (
                <div
                  key={threshold}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className={`w-full rounded-t ${
                      threshold < 20
                        ? 'bg-red-500'
                        : threshold < 40
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                  />
                  <span className="text-xs text-slate-500">{threshold}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="admin-card">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                const critical = tenants?.filter((t) => t.status === 'critical');
                if (critical && critical.length > 0) {
                  navigate(`/tenants/${critical[0].tenantId}`);
                }
              }}
              disabled={stats.criticalCount === 0}
              className="w-full admin-btn-secondary text-sm disabled:opacity-50"
            >
              Review Critical Tenants
            </button>
            <Link to="/kpi/estimator" className="block">
              <button className="w-full admin-btn-secondary text-sm">
                Run Cost Simulation
              </button>
            </Link>
            <button onClick={exportCSV} className="w-full admin-btn-secondary text-sm">
              Download Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
