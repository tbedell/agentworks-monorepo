import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Calendar, TrendingUp, Cpu, DollarSign } from 'lucide-react';
import { analyticsApi } from '@/lib/api';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="admin-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
        </div>
        <div className="p-3 bg-blue-500/20 rounded-lg">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('30d');

  const { data: usage } = useQuery({
    queryKey: ['analytics', 'usage', dateRange],
    queryFn: () => analyticsApi.getUsageSummary(),
  });

  const { data: topTenants } = useQuery({
    queryKey: ['analytics', 'top-tenants'],
    queryFn: () => analyticsApi.getTopTenants(10),
  });

  const providerData = Object.entries(usage?.byProvider || {}).map(([name, data]) => ({
    name,
    tokens: data.tokens,
    cost: data.cost,
    billed: data.billed,
  }));

  const tenantData =
    topTenants?.tenants.map((t) => ({
      name: t.name.length > 15 ? t.name.slice(0, 15) + '...' : t.name,
      usage: t.usage,
      revenue: t.revenue,
    })) || [];

  const totalTokens = usage?.totalTokens || 0;
  const totalCost = usage?.totalCost || 0;
  const totalBilled = usage?.totalBilled || 0;
  const margin = totalBilled > 0 ? ((totalBilled - totalCost) / totalBilled) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400">Usage metrics and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="admin-input w-40"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="ytd">Year to date</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tokens"
          value={totalTokens.toLocaleString()}
          icon={Cpu}
        />
        <StatCard
          title="Provider Cost"
          value={`$${totalCost.toFixed(2)}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Revenue Billed"
          value={`$${totalBilled.toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard
          title="Gross Margin"
          value={`${margin.toFixed(1)}%`}
          subValue="Target: ≥50%"
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card">
          <h2 className="text-lg font-semibold text-white mb-4">Usage by Provider</h2>
          <div className="h-80">
            {providerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={providerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="tokens"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {providerData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No usage data available
              </div>
            )}
          </div>
        </div>

        <div className="admin-card">
          <h2 className="text-lg font-semibold text-white mb-4">Top Tenants by Usage</h2>
          <div className="h-80">
            {tenantData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tenantData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
                  />
                  <Bar dataKey="usage" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No tenant data available
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="text-lg font-semibold text-white mb-4">Provider Cost Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th className="text-right">Tokens</th>
                <th className="text-right">Provider Cost</th>
                <th className="text-right">Billed Amount</th>
                <th className="text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {providerData.map((provider) => {
                const providerMargin =
                  provider.billed > 0
                    ? ((provider.billed - provider.cost) / provider.billed) * 100
                    : 0;
                return (
                  <tr key={provider.name}>
                    <td className="font-medium text-white">{provider.name}</td>
                    <td className="text-right text-slate-300">
                      {provider.tokens.toLocaleString()}
                    </td>
                    <td className="text-right text-slate-300">${provider.cost.toFixed(2)}</td>
                    <td className="text-right text-slate-300">
                      ${provider.billed.toFixed(2)}
                    </td>
                    <td className="text-right">
                      <span
                        className={
                          providerMargin >= 50 ? 'text-green-400' : 'text-yellow-400'
                        }
                      >
                        {providerMargin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {providerData.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
