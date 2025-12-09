import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  CreditCard,
  Cpu,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  AlertCircle,
  UserPlus,
  Crown,
  Link2,
  ArrowRight,
  DollarSign,
} from 'lucide-react';
import { dashboardApi, waitlistApi, foundersApi, affiliatesApi, providersApi, type ProviderStatus as ProviderStatusType } from '@/lib/api';

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="admin-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {change && (
            <p
              className={`text-sm mt-1 ${
                trend === 'up'
                  ? 'text-green-600'
                  : trend === 'down'
                  ? 'text-red-600'
                  : 'text-slate-500'
              }`}
            >
              {change}
            </p>
          )}
        </div>
        <div className="p-3 bg-blue-100 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </div>
  );
}

function ProviderStatusRow({ provider }: { provider: ProviderStatusType }) {
  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'healthy' },
    not_configured: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Not Configured' },
    error: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', label: 'error' },
  };

  const config = statusConfig[provider.status] || statusConfig.not_configured;
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-slate-700">{provider.displayName}</span>
      <div className={`flex items-center gap-1 px-2 py-1 rounded ${config.bg}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
    retry: false,
  });

  const { data: providerStatus, isLoading: providersLoading } = useQuery({
    queryKey: ['dashboard', 'provider-status'],
    queryFn: dashboardApi.getProviderStatus,
    retry: false,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: dashboardApi.getRecentActivity,
    retry: false,
  });

  const { data: usageByProvider, isLoading: usageLoading } = useQuery({
    queryKey: ['dashboard', 'usage-by-provider'],
    queryFn: dashboardApi.getUsageByProvider,
    retry: false,
  });

  // Growth & Marketing stats
  const { data: waitlistStats } = useQuery({
    queryKey: ['waitlist', 'stats'],
    queryFn: waitlistApi.getStats,
    retry: false,
  });

  const { data: founderStats } = useQuery({
    queryKey: ['founders', 'stats'],
    queryFn: foundersApi.getStats,
    retry: false,
  });

  const { data: affiliateStats } = useQuery({
    queryKey: ['affiliates', 'stats'],
    queryFn: affiliatesApi.getStats,
    retry: false,
  });

  // Provider costs for burn rate tracking
  const { data: providers, isLoading: providersListLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.list,
    retry: false,
  });

  const formatChange = (change: number) => {
    if (change === 0) return 'No change';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change}% from last month`;
  };

  const getTrend = (change: number): 'up' | 'down' | 'neutral' => {
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'neutral';
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Platform overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tenants"
          value={statsLoading ? '...' : stats?.totalTenants || 0}
          change={stats ? formatChange(stats.tenantChange) : undefined}
          icon={Users}
          trend={stats ? getTrend(stats.tenantChange) : 'neutral'}
        />
        <StatCard
          title="Monthly Revenue"
          value={statsLoading ? '...' : `$${(stats?.monthlyRevenue || 0).toLocaleString()}`}
          change={stats ? formatChange(stats.revenueChange) : undefined}
          icon={CreditCard}
          trend={stats ? getTrend(stats.revenueChange) : 'neutral'}
        />
        <StatCard
          title="Active Providers"
          value={statsLoading ? '...' : stats?.activeProviders || 0}
          icon={Cpu}
        />
        <StatCard
          title="Tokens This Month"
          value={statsLoading ? '...' : (stats?.tokensThisMonth || 0).toLocaleString()}
          change={stats ? formatChange(stats.tokenChange) : undefined}
          icon={TrendingUp}
          trend={stats ? getTrend(stats.tokenChange) : 'neutral'}
        />
      </div>

      {/* Provider Burn Rate / Cost Cards */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-slate-900">AI Provider Costs (This Month)</h2>
          </div>
          <Link to="/providers" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {providersListLoading ? (
          <p className="text-slate-500">Loading provider costs...</p>
        ) : providers && providers.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {providers.map((provider) => {
              const totalSpend = providers.reduce((sum, p) => sum + (p.currentMonthSpend || 0), 0);
              const percentage = totalSpend > 0 ? ((provider.currentMonthSpend || 0) / totalSpend) * 100 : 0;
              const hasSpend = (provider.currentMonthSpend || 0) > 0;

              return (
                <div
                  key={provider.id}
                  className={`rounded-lg p-4 border ${
                    hasSpend
                      ? 'bg-green-50 border-green-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-700">{provider.displayName}</p>
                  <p className={`text-2xl font-bold mt-1 ${hasSpend ? 'text-green-700' : 'text-slate-400'}`}>
                    ${(provider.currentMonthSpend || 0).toFixed(2)}
                  </p>
                  {hasSpend && (
                    <div className="mt-2">
                      <div className="w-full bg-green-200 rounded-full h-1.5">
                        <div
                          className="bg-green-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{percentage.toFixed(1)}% of total</p>
                    </div>
                  )}
                  {!provider.apiKeyConfigured && (
                    <p className="text-xs text-amber-600 mt-1">Not configured</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500">No providers configured</p>
        )}
        {providers && providers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-600">Total Burn Rate</span>
            <span className="text-xl font-bold text-slate-900">
              ${providers.reduce((sum, p) => sum + (p.currentMonthSpend || 0), 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Growth & Marketing Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/waitlist" className="admin-card hover:border-blue-300 transition-colors group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Waitlist</p>
                <p className="text-xl font-bold text-slate-900">
                  {waitlistStats?.total || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {waitlistStats?.byStatus?.invited ? (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                  {waitlistStats.byStatus.invited} pending
                </span>
              ) : null}
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>
        </Link>

        <Link to="/founders" className="admin-card hover:border-purple-300 transition-colors group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Crown className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Founders</p>
                <p className="text-xl font-bold text-slate-900">
                  {founderStats?.summary?.totalFounders || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {founderStats?.tierStats?.find(t => t.tier === 'diamond')?.soldSpots ? (
                  <span className="text-xs px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded">
                    {founderStats.tierStats.find(t => t.tier === 'diamond')?.soldSpots}D
                  </span>
                ) : null}
                {founderStats?.tierStats?.find(t => t.tier === 'gold')?.soldSpots ? (
                  <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded ml-1">
                    {founderStats.tierStats.find(t => t.tier === 'gold')?.soldSpots}G
                  </span>
                ) : null}
                {founderStats?.tierStats?.find(t => t.tier === 'silver')?.soldSpots ? (
                  <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded ml-1">
                    {founderStats.tierStats.find(t => t.tier === 'silver')?.soldSpots}S
                  </span>
                ) : null}
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </div>
          </div>
        </Link>

        <Link to="/affiliates" className="admin-card hover:border-green-300 transition-colors group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Link2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Affiliates</p>
                <p className="text-xl font-bold text-slate-900">
                  {affiliateStats?.summary?.totalAffiliates || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {affiliateStats?.byStatus?.pending ? (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                  {affiliateStats.byStatus.pending} pending
                </span>
              ) : null}
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-green-600 transition-colors" />
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Provider Status</h2>
          <div className="space-y-2">
            {providersLoading ? (
              <p className="text-slate-500">Loading providers...</p>
            ) : providerStatus && providerStatus.length > 0 ? (
              providerStatus.map((provider) => (
                <ProviderStatusRow key={provider.provider} provider={provider} />
              ))
            ) : (
              <p className="text-slate-500">No providers configured</p>
            )}
          </div>
        </div>

        <div className="admin-card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activityLoading ? (
              <p className="text-slate-500">Loading activity...</p>
            ) : recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 py-2 border-b border-slate-200 last:border-0">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{activity.title}</p>
                    <p className="text-xs text-slate-500">{activity.description}</p>
                  </div>
                  <span className="text-xs text-slate-500">{formatTimestamp(activity.timestamp)}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Usage by Provider</h2>
        {usageLoading ? (
          <p className="text-slate-500">Loading usage data...</p>
        ) : usageByProvider && usageByProvider.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {usageByProvider.map((usage) => (
              <div key={usage.provider} className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500 capitalize">{usage.provider}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {usage.totalTokens.toLocaleString()}
                </p>
                <p className="text-sm text-green-600">${usage.billedAmount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No usage data available</p>
        )}
      </div>
    </div>
  );
}
