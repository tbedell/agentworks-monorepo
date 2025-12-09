import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Link2,
  DollarSign,
  Users,
  TrendingUp,
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  PauseCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from 'lucide-react';
import { affiliatesApi, type Affiliate, type AffiliateQuery } from '@/lib/api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn, formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';

export default function AffiliateDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<AffiliateQuery['status'] | ''>('');
  const [filterTier, setFilterTier] = useState<AffiliateQuery['tier'] | ''>('');
  const [page, setPage] = useState(1);

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['affiliates', 'stats'],
    queryFn: affiliatesApi.getStats,
  });

  // Fetch affiliates list
  const { data: affiliatesData, isLoading } = useQuery({
    queryKey: ['affiliates', 'list', page, filterStatus, filterTier, searchQuery],
    queryFn: () =>
      affiliatesApi.list({
        page,
        limit: 20,
        status: filterStatus || undefined,
        tier: filterTier || undefined,
        search: searchQuery || undefined,
      }),
  });

  // Fetch fraud alerts
  const { data: fraudAlertsData } = useQuery({
    queryKey: ['affiliates', 'fraud-alerts'],
    queryFn: affiliatesApi.getFraudAlerts,
  });

  const affiliates = affiliatesData?.affiliates || [];
  const pagination = {
    page: affiliatesData?.page || 1,
    limit: affiliatesData?.limit || 20,
    total: affiliatesData?.total || 0,
    totalPages: affiliatesData?.totalPages || 1,
  };
  const fraudAlerts = fraudAlertsData?.alerts || [];

  const tierCommissions: Record<string, number> = {
    standard: 30,
    silver: 35,
    gold: 40,
    platinum: 50,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Affiliate Program</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage affiliates, track conversions, and process payouts
          </p>
        </div>
        <Link
          to="/affiliates/payouts"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Wallet className="w-4 h-4" />
          Payout Queue ({stats?.summary?.totalPendingPayouts || 0})
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Affiliates</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.summary?.totalAffiliates || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="text-green-600">
              {stats?.summary?.approvedAffiliates || 0} active
            </span>
            <span className="text-yellow-600">
              {stats?.summary?.pendingApplications || 0} pending
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Conversions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.topPerformers?.reduce((sum, p) => sum + p.totalConversions, 0) || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Paid Out</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(stats?.summary?.totalPaidOut || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending Payouts</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.summary?.totalPendingPayouts || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <Link2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Fraud Alerts */}
      {fraudAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-medium text-red-900">
              Fraud Alerts ({fraudAlerts.length})
            </h3>
          </div>
          <div className="space-y-2">
            {fraudAlerts.slice(0, 3).map((alert) => (
              <div
                key={`${alert.affiliateId}-${alert.type}`}
                className="flex items-center justify-between bg-white rounded-lg p-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {alert.affiliateName}
                  </p>
                  <p className="text-xs text-red-600">{alert.details}</p>
                </div>
                <Link
                  to={`/affiliates/${alert.affiliateId}`}
                  className="text-sm text-red-600 hover:underline"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['standard', 'silver', 'gold', 'platinum'].map((tier) => {
          const tierData = stats?.byTier?.find(t => t.tier === tier);
          const count = tierData?.count || 0;
          const commission = tierCommissions[tier];

          return (
            <div
              key={tier}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 capitalize">
                  {tier}
                </span>
                <span className="text-xs text-slate-500">{commission}%</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-500 mt-1">affiliates</p>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email, name, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as AffiliateQuery['status'] | '');
              setPage(1);
            }}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={filterTier}
            onChange={(e) => {
              setFilterTier(e.target.value as AffiliateQuery['tier'] | '');
              setPage(1);
            }}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All Tiers</option>
            <option value="standard">Standard (30%)</option>
            <option value="silver">Silver (35%)</option>
            <option value="gold">Gold (40%)</option>
            <option value="platinum">Platinum (50%)</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Affiliate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Conversions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Earnings
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="w-12 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : affiliates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No affiliates found
                  </td>
                </tr>
              ) : (
                affiliates.map((affiliate) => (
                  <AffiliateRow key={affiliate.id} affiliate={affiliate} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={pagination.page === 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AffiliateRow({ affiliate }: { affiliate: Affiliate }) {
  const [showMenu, setShowMenu] = useState(false);
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: () => affiliatesApi.approve(affiliate.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['affiliates'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => affiliatesApi.reject(affiliate.id, { reason: 'Not approved' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['affiliates'] }),
  });

  const suspendMutation = useMutation({
    mutationFn: () => affiliatesApi.suspend(affiliate.id, { reason: 'Suspended by admin' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['affiliates'] }),
  });

  const tierColors: Record<string, string> = {
    standard: 'bg-slate-100 text-slate-700',
    silver: 'bg-slate-200 text-slate-800',
    gold: 'bg-amber-100 text-amber-800',
    platinum: 'bg-purple-100 text-purple-800',
  };

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-900">{affiliate.email}</p>
          {affiliate.name && (
            <p className="text-xs text-slate-500">{affiliate.name}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <code className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded">
          {affiliate.code}
        </code>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={affiliate.status} size="sm" />
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'px-2 py-0.5 text-xs font-medium rounded capitalize',
            tierColors[affiliate.tier] || tierColors.standard
          )}
        >
          {affiliate.tier} ({affiliate.commissionRate}%)
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-slate-900">
          {affiliate.totalConversions || 0}
        </span>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {formatCurrency(affiliate.lifetimeEarnings || 0)}
          </p>
          {affiliate.pendingEarnings > 0 && (
            <p className="text-xs text-amber-600">
              {formatCurrency(affiliate.pendingEarnings)} pending
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-500" title={formatDate(affiliate.createdAt)}>
          {formatRelativeTime(affiliate.createdAt)}
        </span>
      </td>
      <td className="px-4 py-3 relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-slate-100 rounded"
        >
          <MoreHorizontal className="w-4 h-4 text-slate-500" />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
              <Link
                to={`/affiliates/${affiliate.id}`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Eye className="w-4 h-4" />
                View Details
              </Link>
              {affiliate.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      approveMutation.mutate();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      rejectMutation.mutate();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </>
              )}
              {affiliate.status === 'approved' && (
                <button
                  onClick={() => {
                    if (confirm('Suspend this affiliate?')) {
                      suspendMutation.mutate();
                      setShowMenu(false);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"
                >
                  <PauseCircle className="w-4 h-4" />
                  Suspend
                </button>
              )}
            </div>
          </>
        )}
      </td>
    </tr>
  );
}
