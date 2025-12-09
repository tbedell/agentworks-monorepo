import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Users,
  RefreshCw,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { analyticsApi, billingApi } from '@/lib/api';

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="admin-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {trend === 'up' ? (
                <ArrowUpRight className="w-4 h-4 text-green-400" />
              ) : trend === 'down' ? (
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              ) : null}
              <span
                className={`text-sm ${
                  trend === 'up'
                    ? 'text-green-400'
                    : trend === 'down'
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {change > 0 ? '+' : ''}
                {change}%
              </span>
              {changeLabel && (
                <span className="text-sm text-slate-500">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className="p-3 bg-blue-500/20 rounded-lg">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
      </div>
    </div>
  );
}

export function BillingDashboard() {
  const { data: revenue } = useQuery({
    queryKey: ['analytics', 'revenue'],
    queryFn: analyticsApi.getRevenueMetrics,
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['billing', 'subscriptions'],
    queryFn: () => billingApi.getSubscriptions(),
  });

  const syncMutation = useQuery({
    queryKey: ['billing', 'sync'],
    queryFn: billingApi.syncStripe,
    enabled: false,
  });

  const activeSubscriptions = subscriptions?.filter((s) => s.status === 'active').length || 0;
  const mrr = revenue?.mrr || 0;
  const arr = revenue?.arr || 0;
  const growth = revenue?.growth || 0;
  const churn = revenue?.churn || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing</h1>
          <p className="text-slate-400">Revenue metrics and subscription management</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => syncMutation.refetch()}
            disabled={syncMutation.isFetching}
            className="admin-btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isFetching ? 'animate-spin' : ''}`} />
            Sync Stripe
          </button>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn-primary flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Stripe Dashboard
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={`$${mrr.toLocaleString()}`}
          change={growth}
          changeLabel="vs last month"
          icon={DollarSign}
          trend={growth > 0 ? 'up' : growth < 0 ? 'down' : undefined}
        />
        <MetricCard
          title="Annual Recurring Revenue"
          value={`$${arr.toLocaleString()}`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Active Subscriptions"
          value={activeSubscriptions.toString()}
          icon={Users}
        />
        <MetricCard
          title="Churn Rate"
          value={`${churn}%`}
          icon={ArrowDownRight}
          trend={churn > 5 ? 'down' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Subscriptions</h2>
            <Link
              to="/billing/subscriptions"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {subscriptions?.slice(0, 5).map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-white">{sub.planName}</p>
                  <p className="text-xs text-slate-500">
                    Tenant: {sub.tenantId.slice(0, 8)}...
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      sub.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : sub.status === 'canceled'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>
              </div>
            ))}
            {!subscriptions?.length && (
              <p className="text-slate-400 text-sm">No subscriptions yet</p>
            )}
          </div>
        </div>

        <div className="admin-card">
          <h2 className="text-lg font-semibold text-white mb-4">Billing Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-700">
              <div>
                <p className="text-sm font-medium text-white">Stripe Integration</p>
                <p className="text-xs text-slate-500">Connected to Stripe for payments</p>
              </div>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-700">
              <div>
                <p className="text-sm font-medium text-white">Usage Billing</p>
                <p className="text-xs text-slate-500">5× markup with $0.25 minimum</p>
              </div>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-white">Crypto Payments</p>
                <p className="text-xs text-slate-500">Bitcoin, Ethereum, USDC</p>
              </div>
              <span className="px-2 py-1 bg-slate-500/20 text-slate-400 text-xs rounded">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
