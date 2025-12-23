import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Bot,
  Zap,
  Clock,
  BarChart3,
  Download,
  CheckCircle,
  RefreshCw,
  CreditCard,
  Layers,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useWorkspaceStore } from '../../stores/workspace';
import { PRICING_MULTIPLIER } from '@agentworks/shared';
import clsx from 'clsx';

interface UsageAnalyticsProps {
  className?: string;
}

const TIME_PERIODS = [
  { label: 'Last 7 days', value: '7', days: 7 },
  { label: 'Last 30 days', value: '30', days: 30 },
  { label: 'Last 90 days', value: '90', days: 90 },
];

type ViewType = 'overview' | 'providers' | 'agents' | 'projects' | 'trends' | 'billing';

export default function UsageAnalytics({ className }: UsageAnalyticsProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [timePeriod, setTimePeriod] = useState('30');
  const [view, setView] = useState<ViewType>('overview');

  const days = parseInt(timePeriod) || 30;
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: usageData, isLoading, refetch } = useQuery({
    queryKey: ['usage', currentWorkspaceId, startDate, endDate],
    queryFn: async () => {
      if (!currentWorkspaceId) return null;
      return api.usage.workspace(currentWorkspaceId, { startDate, endDate });
    },
    enabled: !!currentWorkspaceId,
  });

  const { data: billingData } = useQuery({
    queryKey: ['billing', currentWorkspaceId],
    queryFn: async () => {
      if (!currentWorkspaceId) return null;
      return api.usage.billing(currentWorkspaceId);
    },
    enabled: !!currentWorkspaceId && view === 'billing',
  });

  const metrics = useMemo(() => {
    if (!usageData?.current) return null;

    const current = usageData.current;
    const previous = usageData.previous || {};

    const costChange = previous.totalCost > 0
      ? ((current.totalCost - previous.totalCost) / previous.totalCost) * 100
      : 0;
    const requestChange = previous.totalRequests > 0
      ? ((current.totalRequests - previous.totalRequests) / previous.totalRequests) * 100
      : 0;
    const tokenChange = previous.totalTokens > 0
      ? ((current.totalTokens - previous.totalTokens) / previous.totalTokens) * 100
      : 0;

    return {
      totalCost: current.totalCost || 0,
      totalBilled: current.totalBilled || current.totalCost * PRICING_MULTIPLIER || 0,
      costChange,
      totalRequests: current.totalRequests || 0,
      requestChange,
      totalTokens: current.totalTokens || 0,
      tokenChange,
      avgResponseTime: current.avgResponseTime || 0,
      successRate: current.successRate || 100,
    };
  }, [usageData]);

  if (isLoading) {
    return (
      <div className={clsx("flex items-center justify-center h-64", className)}>
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={clsx("flex items-center justify-center h-64 text-slate-500", className)}>
        <div className="text-center">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-slate-400" />
          <p>No usage data available</p>
          <p className="text-sm mt-1">Start using agents to see analytics</p>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const renderChangeIndicator = (change: number, inverse = false) => {
    if (change === 0) return null;
    const isPositive = inverse ? change < 0 : change > 0;
    const Icon = change > 0 ? TrendingUp : TrendingDown;
    return (
      <div className={clsx(
        "flex items-center gap-1 mt-1",
        isPositive ? "text-green-600" : "text-red-600"
      )}>
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium">
          {Math.abs(change).toFixed(1)}% vs prev period
        </span>
      </div>
    );
  };

  return (
    <div className={clsx("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usage & Analytics</h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {TIME_PERIODS.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => refetch()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Billed</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ${metrics.totalBilled.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ${metrics.totalCost.toFixed(4)} actual cost
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          {renderChangeIndicator(metrics.costChange)}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">API Requests</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatNumber(metrics.totalRequests)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-xs text-slate-500">
                  {metrics.successRate.toFixed(1)}% success rate
                </span>
              </div>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          {renderChangeIndicator(metrics.requestChange)}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Tokens</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatNumber(metrics.totalTokens)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {metrics.totalTokens.toLocaleString()} tokens
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          {renderChangeIndicator(metrics.tokenChange)}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg Response</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {metrics.avgResponseTime.toFixed(1)}s
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Average response time
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'providers', label: 'Providers', icon: Zap },
          { id: 'agents', label: 'Agents', icon: Bot },
          { id: 'projects', label: 'Projects', icon: Layers },
          { id: 'trends', label: 'Trends', icon: Activity },
          { id: 'billing', label: 'Billing', icon: CreditCard },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id as ViewType)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              view === id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content based on view */}
      {view === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Providers */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Providers</h3>
            <div className="space-y-3">
              {usageData?.byProvider?.slice(0, 5).map((provider: any, index: number) => (
                <div key={provider.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold",
                      index === 0 ? "bg-yellow-100 text-yellow-700" :
                      index === 1 ? "bg-slate-100 text-slate-700" :
                      index === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-slate-50 text-slate-600"
                    )}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 capitalize">{provider.name}</p>
                      <p className="text-xs text-slate-500">
                        {provider.requests.toLocaleString()} requests
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      ${(provider.billed || provider.cost * PRICING_MULTIPLIER).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatNumber(provider.tokens)} tokens
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-slate-500 text-center py-4">No provider data</p>
              )}
            </div>
          </div>

          {/* Top Agents */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Agents</h3>
            <div className="space-y-3">
              {usageData?.byAgent?.slice(0, 5).map((agent: any, index: number) => (
                <div key={agent.id || agent.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      index === 0 ? "bg-blue-100" :
                      index === 1 ? "bg-green-100" :
                      index === 2 ? "bg-purple-100" :
                      "bg-slate-50"
                    )}>
                      <Bot className={clsx(
                        "h-4 w-4",
                        index === 0 ? "text-blue-600" :
                        index === 1 ? "text-green-600" :
                        index === 2 ? "text-purple-600" :
                        "text-slate-600"
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{agent.displayName || agent.name}</p>
                      <p className="text-xs text-slate-500">
                        {agent.requests} runs
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      ${(agent.billed || agent.cost * PRICING_MULTIPLIER).toFixed(2)}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-slate-500 text-center py-4">No agent data</p>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'providers' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Provider Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Provider</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Requests</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Tokens</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Cost</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Billed</th>
                </tr>
              </thead>
              <tbody>
                {usageData?.byProvider?.map((provider: any) => (
                  <tr key={provider.name} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-900 capitalize">{provider.name}</span>
                    </td>
                    <td className="text-right py-3 px-4 text-slate-700">
                      {provider.requests.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-slate-700">
                      {formatNumber(provider.tokens)}
                    </td>
                    <td className="text-right py-3 px-4 text-slate-500">
                      ${provider.cost.toFixed(4)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-slate-900">
                      ${(provider.billed || provider.cost * PRICING_MULTIPLIER).toFixed(2)}
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      No provider data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'agents' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Agent Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Agent</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Runs</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Tokens</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Cost</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Billed</th>
                </tr>
              </thead>
              <tbody>
                {usageData?.byAgent?.map((agent: any) => (
                  <tr key={agent.id || agent.name} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-900">{agent.displayName || agent.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-slate-700">
                      {agent.requests.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-slate-700">
                      {formatNumber(agent.tokens)}
                    </td>
                    <td className="text-right py-3 px-4 text-slate-500">
                      ${agent.cost.toFixed(4)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-slate-900">
                      ${(agent.billed || agent.cost * PRICING_MULTIPLIER).toFixed(2)}
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      No agent data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'projects' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Usage</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Project</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Requests</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Tokens</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Billed</th>
                </tr>
              </thead>
              <tbody>
                {usageData?.byProject?.map((project: any) => (
                  <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-900">{project.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-slate-700">
                      {project.requests.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-slate-700">
                      {formatNumber(project.tokens)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-slate-900">
                      ${(project.billed || project.cost * PRICING_MULTIPLIER).toFixed(2)}
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-500">
                      No project data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'trends' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Usage Trends</h3>
          <div className="space-y-4">
            {usageData?.dailyTrend?.length > 0 ? (
              usageData.dailyTrend.map((day: any) => {
                const maxCost = Math.max(...usageData.dailyTrend.map((d: any) => d.cost || 0));
                const barWidth = maxCost > 0 ? ((day.cost || 0) / maxCost) * 100 : 0;
                return (
                  <div key={day.date} className="flex items-center gap-4">
                    <div className="w-20 text-sm text-slate-600">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">
                          ${((day.price || day.cost * PRICING_MULTIPLIER) || 0).toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {day.requests} requests / {formatNumber(day.tokens || 0)} tokens
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-500 text-center py-8">No trend data available</p>
            )}
          </div>
        </div>
      )}

      {view === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Plan */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Plan</h3>
            {billingData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{billingData.plan?.name}</p>
                    <p className="text-slate-500">${billingData.plan?.monthlyPrice}/month</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                {billingData.subscription && (
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={clsx(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        billingData.subscription.status === 'active' ? "bg-green-100 text-green-700" :
                        billingData.subscription.status === 'trialing' ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {billingData.subscription.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Current period: {new Date(billingData.subscription.currentPeriodStart).toLocaleDateString()} - {new Date(billingData.subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            )}
          </div>

          {/* Token Usage */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Token Usage This Month</h3>
            {billingData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">
                    {formatNumber(billingData.usage?.tokensUsed || 0)} / {formatNumber(billingData.usage?.tokenLimit || 0)}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {(billingData.usage?.usagePercent || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all",
                      (billingData.usage?.usagePercent || 0) >= 90 ? "bg-red-500" :
                      (billingData.usage?.usagePercent || 0) >= 75 ? "bg-yellow-500" :
                      "bg-blue-500"
                    )}
                    style={{ width: `${Math.min(billingData.usage?.usagePercent || 0, 100)}%` }}
                  />
                </div>

                {billingData.alerts?.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">{billingData.alerts[0].message}</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total Cost</span>
                    <span className="font-medium text-slate-900">${(billingData.usage?.totalCost || 0).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-600">Total Billed</span>
                    <span className="font-medium text-slate-900">${(billingData.usage?.totalBilled || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-600">Requests</span>
                    <span className="font-medium text-slate-900">{billingData.usage?.requestCount || 0}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
