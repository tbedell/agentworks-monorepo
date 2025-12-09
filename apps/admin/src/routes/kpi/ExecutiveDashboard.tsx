import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  DollarSign,
  Crown,
  Link2,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  Zap,
} from 'lucide-react';
import { extendedKpiApi } from '@/lib/api';
import { FunnelChart } from '@/components/kpi/FunnelChart';
import { RevenueBreakdownChart } from '@/components/kpi/RevenueBreakdownChart';
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

export default function ExecutiveDashboard() {
  // Fetch funnel data
  const { data: funnel, isLoading: funnelLoading } = useQuery({
    queryKey: ['kpi', 'funnel'],
    queryFn: extendedKpiApi.getFunnel,
  });

  // Fetch revenue breakdown
  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['kpi', 'revenue-breakdown'],
    queryFn: extendedKpiApi.getRevenueBreakdown,
  });

  // Fetch affiliate revenue
  const { data: affiliateRevenue } = useQuery({
    queryKey: ['kpi', 'affiliate-revenue'],
    queryFn: extendedKpiApi.getAffiliateRevenue,
  });

  // Fetch founder metrics
  const { data: founderMetrics } = useQuery({
    queryKey: ['kpi', 'founder-metrics'],
    queryFn: extendedKpiApi.getFounderMetrics,
  });


  // Transform funnel stages for chart
  const funnelStages = funnel?.stages?.map((stage, index) => ({
    name: stage.name,
    value: stage.count,
    conversionRate: stage.conversionRate ? parseFloat(stage.conversionRate) : undefined,
    color: ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-emerald-500'][index] || 'bg-slate-500',
  })) || [];

  // Transform revenue data for chart
  const revenueSegments = revenue ? [
    ...(revenue.founder?.byTier || []).map((tier) => ({
      name: `${tier.name} Founders`,
      value: tier.revenue,
      percentage: revenue.total?.revenue > 0
        ? (tier.revenue / revenue.total.revenue) * 100
        : 0,
      color: tier.tier === 'diamond' ? 'bg-cyan-500' :
             tier.tier === 'gold' ? 'bg-amber-500' : 'bg-slate-400',
      bgColor: tier.tier === 'diamond' ? 'bg-cyan-50' :
               tier.tier === 'gold' ? 'bg-amber-50' : 'bg-slate-50',
    })),
    {
      name: 'Subscriptions',
      value: revenue.subscription?.mrr || 0,
      percentage: revenue.total?.revenue > 0
        ? ((revenue.subscription?.mrr || 0) / revenue.total.revenue) * 100
        : 0,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Executive Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          High-level metrics and funnel performance
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Monthly Revenue"
          value={formatCurrency(revenue?.subscription?.mrr || revenue?.total?.revenue || 0)}
          change={funnel?.trends?.tenantGrowth}
          icon={DollarSign}
          color="green"
        />
        <KPICard
          title="Active Tenants"
          value={formatNumber(funnel?.summary?.totalTenants || 0)}
          change={funnel?.trends?.tenantGrowth}
          icon={Users}
          color="blue"
        />
        <KPICard
          title="Conversion Rate"
          value={funnel?.summary?.totalConversionRate || '0%'}
          subtitle="Waitlist → Active"
          icon={Target}
          color="purple"
        />
        <KPICard
          title="Founder Revenue"
          value={formatCurrency(funnel?.summary?.founderRevenue || 0)}
          subtitle="Lifetime total"
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Acquisition Funnel
              </h2>
              <p className="text-sm text-slate-500">
                User journey from waitlist to active
              </p>
            </div>
            <Link
              to="/waitlist"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View Waitlist
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {funnelLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Loading...
            </div>
          ) : (
            <FunnelChart stages={funnelStages} />
          )}
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Revenue Breakdown
              </h2>
              <p className="text-sm text-slate-500">MRR by customer segment</p>
            </div>
            <Link
              to="/billing"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View Billing
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {revenueLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Loading...
            </div>
          ) : (
            <RevenueBreakdownChart
              segments={revenueSegments}
              total={revenue?.total?.revenue || 0}
            />
          )}
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Founder Metrics */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Founders
            </h3>
            <Link
              to="/founders"
              className="text-sm text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Sold</span>
              <span className="text-lg font-bold text-slate-900">
                {founderMetrics?.summary?.totalSold || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Revenue</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(founderMetrics?.summary?.totalRevenue || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Fill Rate</span>
              <span className="text-lg font-bold text-slate-900">
                {founderMetrics?.summary?.overallFillRate || '0%'}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                {founderMetrics?.byTier?.map((tier) => (
                  <span
                    key={tier.tier}
                    className={cn(
                      'px-2 py-0.5 rounded',
                      tier.tier === 'diamond' ? 'bg-cyan-100 text-cyan-700' :
                      tier.tier === 'gold' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    )}
                  >
                    {tier.soldSpots} {tier.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Affiliate Metrics */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-purple-500" />
              Affiliates
            </h3>
            <Link
              to="/affiliates"
              className="text-sm text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Active Affiliates</span>
              <span className="text-lg font-bold text-slate-900">
                {affiliateRevenue?.summary?.totalAffiliates || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Lifetime Earnings</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(affiliateRevenue?.summary?.lifetimeEarnings || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">This Month</span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(affiliateRevenue?.thisMonth?.commissions || 0)}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Pending Payouts</span>
                <span className="font-medium text-amber-600">
                  {affiliateRevenue?.payouts?.pending?.count || 0} ({formatCurrency(affiliateRevenue?.payouts?.pending?.amount || 0)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Health */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Platform Health
            </h3>
            <Link to="/kpi" className="text-sm text-blue-600 hover:underline">
              All Metrics
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Active Users</span>
              <span className="text-lg font-bold text-slate-900">
                {formatNumber(funnel?.summary?.activeUsers || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">MRR</span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(funnel?.summary?.monthlyRecurringRevenue || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Waitlist Growth</span>
              <span
                className={cn(
                  'text-lg font-bold',
                  (funnel?.trends?.waitlistGrowth || 0) > 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {funnel?.trends?.waitlistGrowth ? formatPercent(funnel.trends.waitlistGrowth) : '0%'}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">
                  All systems operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/waitlist"
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Review Waitlist ({funnel?.summary?.totalWaitlist || 0})
          </Link>
          <Link
            to="/affiliates?status=pending"
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Pending Payouts ({affiliateRevenue?.payouts?.pending?.count || 0})
          </Link>
          <Link
            to="/affiliates/payouts"
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Process Payouts
          </Link>
          <Link
            to="/founders?status=waiting"
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Pending Founders
          </Link>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  change,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'blue' | 'purple' | 'amber';
}) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500">{title}</span>
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {change >= 0 ? (
            <ArrowUpRight className="w-3 h-3 text-green-500" />
          ) : (
            <ArrowDownRight className="w-3 h-3 text-red-500" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              change >= 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {formatPercent(Math.abs(change))}
          </span>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
      )}
      {subtitle && change === undefined && (
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
