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
} from 'lucide-react';
import { api } from '../../lib/api';
import { useWorkspaceStore } from '../../stores/workspace';
import { PRICING_MULTIPLIER } from '@agentworks/shared';
import clsx from 'clsx';

interface UsageAnalyticsProps {
  className?: string;
}

const TIME_PERIODS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'This month', value: 'month' },
  { label: 'This year', value: 'year' }
];

export default function UsageAnalytics({ className }: UsageAnalyticsProps) {
  const { currentWorkspaceId, currentProjectId } = useWorkspaceStore();
  const [timePeriod, setTimePeriod] = useState('30d');
  const [view, setView] = useState<'overview' | 'providers' | 'agents' | 'trends'>('overview');

  const { data: usageData, isLoading, refetch } = useQuery({
    queryKey: ['usage', currentWorkspaceId, currentProjectId, timePeriod],
    queryFn: async () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - (parseInt(timePeriod) || 30) * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      if (currentProjectId) {
        return api.usage.project(currentProjectId, { startDate, endDate });
      } else if (currentWorkspaceId) {
        return api.usage.workspace(currentWorkspaceId, { startDate, endDate });
      }
      return null;
    },
    enabled: !!(currentWorkspaceId || currentProjectId)
  });

  const { data: dailyData } = useQuery({
    queryKey: ['usage-daily', currentWorkspaceId, timePeriod],
    queryFn: () => currentWorkspaceId ? api.usage.daily(currentWorkspaceId, parseInt(timePeriod) || 30) : null,
    enabled: !!currentWorkspaceId
  });

  const metrics = useMemo(() => {
    if (!usageData) return null;

    const totalCost = usageData.totalCost || 0;
    const billedCost = totalCost * PRICING_MULTIPLIER;
    const previousPeriodCost = usageData.previousPeriodCost || 0;
    const costChange = previousPeriodCost > 0 ? ((totalCost - previousPeriodCost) / previousPeriodCost) * 100 : 0;

    return {
      totalCost,
      billedCost,
      costChange,
      totalRequests: usageData.totalRequests || 0,
      totalTokens: usageData.totalTokens || 0,
      avgResponseTime: usageData.avgResponseTime || 0,
      topProvider: usageData.byProvider?.[0],
      topAgent: usageData.byAgent?.[0],
      efficiency: usageData.totalRequests > 0 ? (usageData.successfulRequests || 0) / usageData.totalRequests * 100 : 0
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

  return (
    <div className={clsx("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Usage & Analytics</h2>
          <p className="text-slate-600 mt-1">
            {currentProjectId ? 'Project-level' : 'Workspace-level'} usage with 5x markup pricing
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            {TIME_PERIODS.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Billed Cost</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ${metrics.billedCost.toFixed(2)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-slate-500">
                  ${metrics.totalCost.toFixed(4)} actual cost
                </span>
              </div>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          {metrics.costChange !== 0 && (
            <div className={clsx(
              "flex items-center gap-1 mt-2",
              metrics.costChange > 0 ? "text-red-600" : "text-green-600"
            )}>
              {metrics.costChange > 0 ? 
                <TrendingUp className="h-3 w-3" /> : 
                <TrendingDown className="h-3 w-3" />
              }
              <span className="text-sm font-medium">
                {Math.abs(metrics.costChange).toFixed(1)}% vs last period
              </span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Requests</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {metrics.totalRequests.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-xs text-slate-500">
                  {metrics.efficiency.toFixed(1)}% success rate
                </span>
              </div>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Tokens</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {(metrics.totalTokens / 1000).toFixed(1)}K
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-slate-500">
                  {metrics.totalTokens.toLocaleString()} tokens
                </span>
              </div>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg Response</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {metrics.avgResponseTime.toFixed(1)}s
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-slate-500">
                  Average response time
                </span>
              </div>
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
          { id: 'trends', label: 'Trends', icon: TrendingUp }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id as any)}
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
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Provider Usage</h3>
            <div className="space-y-3">
              {usageData?.byProvider?.slice(0, 5).map((provider: { name: string; requests: number; cost: number }, index: number) => (
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
                      ${(provider.cost * PRICING_MULTIPLIER).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      ${provider.cost.toFixed(4)} actual
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-slate-500 text-center py-4">No provider data</p>
              )}
            </div>
          </div>

          {/* Top Agents */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Agent Performance</h3>
            <div className="space-y-3">
              {usageData?.byAgent?.slice(0, 5).map((agent: { name: string; displayName?: string; requests: number; cost: number; avgResponseTime?: number }, index: number) => (
                <div key={agent.name} className="flex items-center justify-between">
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
                        {agent.requests} runs • {(agent.avgResponseTime || 0).toFixed(1)}s avg
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      ${(agent.cost * PRICING_MULTIPLIER).toFixed(2)}
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

      {view === 'trends' && dailyData && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Usage Trends</h3>
          <div className="space-y-4">
            {dailyData.map((day: any) => (
              <div key={day.date} className="flex items-center gap-4">
                <div className="w-16 text-sm text-slate-600">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">
                      ${(day.cost * PRICING_MULTIPLIER).toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {day.requests} requests
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                      style={{
                        width: `${Math.min(100, (day.cost / Math.max(...dailyData.map((d: any) => d.cost))) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}