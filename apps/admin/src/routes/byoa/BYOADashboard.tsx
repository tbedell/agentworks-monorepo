import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Key,
  Users,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  ExternalLink,
  Info,
} from 'lucide-react';

interface BYOATenant {
  tenantId: string;
  tenantName: string;
  provider: string;
  subscriptionTier: string | null;
  assignedAgents: string[];
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface BYOAStats {
  totalTenants: number;
  byoaEnabledTenants: number;
  byProvider: Record<string, number>;
  byTier: Record<string, number>;
  activeToday: number;
}

async function fetchBYOAStats(): Promise<BYOAStats> {
  const res = await fetch('/api/admin/byoa/stats');
  if (!res.ok) {
    throw new Error('Failed to fetch BYOA stats');
  }
  return res.json();
}

async function fetchBYOATenants(): Promise<BYOATenant[]> {
  const res = await fetch('/api/admin/byoa/tenants');
  if (!res.ok) {
    throw new Error('Failed to fetch BYOA tenants');
  }
  return res.json();
}

export function BYOADashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin', 'byoa', 'stats'],
    queryFn: fetchBYOAStats,
  });

  const { data: tenants } = useQuery({
    queryKey: ['admin', 'byoa', 'tenants'],
    queryFn: fetchBYOATenants,
  });

  const adoptionRate = stats
    ? ((stats.byoaEnabledTenants / stats.totalTenants) * 100).toFixed(1)
    : '0';

  const statCards = [
    {
      label: 'Total Tenants',
      value: stats?.totalTenants || 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'BYOA Enabled',
      value: stats?.byoaEnabledTenants || 0,
      icon: Key,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Adoption Rate',
      value: `${adoptionRate}%`,
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Active Today',
      value: stats?.activeToday || 0,
      icon: Zap,
      color: 'text-amber-600 bg-amber-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">BYOA Monitoring</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track Bring Your Own API adoption and usage across tenants
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Provider & Tier Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">By Provider</h2>
          <div className="space-y-3">
            {stats?.byProvider &&
              Object.entries(stats.byProvider).map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        provider === 'anthropic'
                          ? 'bg-orange-500'
                          : provider === 'openai'
                          ? 'bg-green-500'
                          : provider === 'google'
                          ? 'bg-blue-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span className="text-slate-700 capitalize font-medium">
                      {provider.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-slate-900 font-bold">{count}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Subscription Tiers</h2>
          <div className="space-y-3">
            {stats?.byTier &&
              Object.entries(stats.byTier).map(([tier, count]) => (
                <div key={tier} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        tier === 'enterprise'
                          ? 'bg-amber-500'
                          : tier === 'team'
                          ? 'bg-purple-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <span className="text-slate-700 capitalize font-medium">{tier}</span>
                  </div>
                  <span className="text-slate-900 font-bold">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">BYOA-Enabled Tenants</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                  Tenant
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                  Provider
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                  Tier
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                  Assigned Agents
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                  Last Used
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tenants?.map((tenant) => (
                <tr key={tenant.tenantId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-slate-900 font-medium">{tenant.tenantName}</p>
                      <p className="text-xs text-slate-500">{tenant.tenantId.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        tenant.provider === 'anthropic'
                          ? 'bg-orange-100 text-orange-700'
                          : tenant.provider === 'openai'
                          ? 'bg-green-100 text-green-700'
                          : tenant.provider === 'google'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tenant.provider}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {tenant.subscriptionTier ? (
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          tenant.subscriptionTier === 'max' || tenant.subscriptionTier === 'enterprise'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tenant.subscriptionTier}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {tenant.assignedAgents.slice(0, 3).map((agent) => (
                        <span
                          key={agent}
                          className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full"
                        >
                          {agent.replace('_', ' ')}
                        </span>
                      ))}
                      {tenant.assignedAgents.length > 3 && (
                        <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded-full">
                          +{tenant.assignedAgents.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {tenant.status === 'active' ? (
                      <div className="flex items-center gap-1.5 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium capitalize">{tenant.status}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {tenant.lastUsedAt ? (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-sm">
                          {new Date(tenant.lastUsedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">Never</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      to={`/tenants/${tenant.tenantId}`}
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {(!tenants || tenants.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No BYOA-enabled tenants yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-blue-900 font-semibold">BYOA Revenue Impact</h3>
            <p className="text-blue-700 text-sm mt-1">
              BYOA tenants use their own API credits, reducing platform revenue from AI calls. However,
              BYOA increases platform stickiness and enables power users who might otherwise hit usage
              limits. Monitor adoption to balance revenue vs. user retention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
