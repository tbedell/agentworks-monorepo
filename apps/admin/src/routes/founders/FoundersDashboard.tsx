import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Crown,
  DollarSign,
  Users,
  TrendingUp,
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { foundersApi, type FounderPurchase, type FounderPlan } from '@/lib/api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FounderBadge } from '@/components/shared/FounderBadge';
import { cn, formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';

export default function FoundersDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showPlanConfig, setShowPlanConfig] = useState(false);

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['founders', 'stats'],
    queryFn: foundersApi.getStats,
  });

  // Fetch plans
  const { data: plans } = useQuery({
    queryKey: ['founders', 'plans'],
    queryFn: foundersApi.getPlans,
  });

  // Fetch purchases list
  const { data: purchasesData, isLoading } = useQuery({
    queryKey: ['founders', 'list', page, filterTier, filterStatus, searchQuery],
    queryFn: () =>
      foundersApi.list({
        page,
        limit: 20,
        tier: filterTier as 'diamond' | 'gold' | 'silver' | undefined,
        status: filterStatus as 'waiting' | 'invited' | 'converted' | 'expired' | undefined,
        search: searchQuery || undefined,
      }),
  });

  const purchases = purchasesData?.founders || [];
  const pagination = {
    page: purchasesData?.page || 1,
    limit: purchasesData?.limit || 20,
    total: purchasesData?.total || 0,
    totalPages: purchasesData?.totalPages || 1,
  };

  const tierColors: Record<string, string> = {
    diamond: 'from-cyan-500 to-blue-600',
    gold: 'from-amber-500 to-yellow-600',
    silver: 'from-slate-400 to-slate-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Founders Program</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage founder purchases, track revenue, and configure plans
          </p>
        </div>
        <button
          onClick={() => setShowPlanConfig(!showPlanConfig)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Settings className="w-4 h-4" />
          Configure Plans
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Founders</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.summary?.totalFounders || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Crown className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(stats?.summary?.totalRevenue || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-green-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Spots Sold</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.summary?.totalSold || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.summary?.conversionRate || '0%'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tier Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(stats?.tierStats || []).map((tierStat) => {
          const spotsRemaining = tierStat.remainingSpots || 0;

          return (
            <div
              key={tierStat.tier}
              className={cn(
                'rounded-xl border border-slate-200 overflow-hidden'
              )}
            >
              <div
                className={cn(
                  'px-5 py-4 text-white bg-gradient-to-r',
                  tierColors[tierStat.tier.toLowerCase()] || 'from-slate-400 to-slate-500'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    <span className="font-semibold">{tierStat.name}</span>
                  </div>
                  <span className="text-sm opacity-90">
                    {formatCurrency(tierStat.price)}
                  </span>
                </div>
              </div>
              <div className="bg-white p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Sold</p>
                    <p className="text-xl font-bold text-slate-900">
                      {tierStat.soldSpots}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Revenue</p>
                    <p className="text-xl font-bold text-slate-900">
                      {formatCurrency(tierStat.revenue)}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Spots Remaining</span>
                    <span>
                      {spotsRemaining} / {tierStat.totalSpots}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full bg-gradient-to-r',
                        tierColors[tierStat.tier.toLowerCase()] || 'from-slate-400 to-slate-500'
                      )}
                      style={{
                        width: `${
                          tierStat.totalSpots > 0
                            ? (tierStat.soldSpots / tierStat.totalSpots) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Plan Configuration Modal */}
      {showPlanConfig && plans && (
        <PlanConfigModal
          plans={plans}
          onClose={() => setShowPlanConfig(false)}
        />
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterTier}
            onChange={(e) => {
              setFilterTier(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All Tiers</option>
            <option value="diamond">Diamond</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All Statuses</option>
            <option value="waiting">Waiting</option>
            <option value="invited">Invited</option>
            <option value="converted">Converted</option>
            <option value="expired">Expired</option>
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
                  Founder
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Purchased
                </th>
                <th className="w-12 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No founder purchases found
                  </td>
                </tr>
              ) : (
                purchases.map((purchase: FounderPurchase) => (
                  <FounderRow key={purchase.id} purchase={purchase} />
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

function FounderRow({ purchase }: { purchase: FounderPurchase }) {
  const [showMenu, setShowMenu] = useState(false);
  const queryClient = useQueryClient();

  const activateMutation = useMutation({
    mutationFn: () => foundersApi.activate(purchase.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['founders'] }),
  });

  const refundMutation = useMutation({
    mutationFn: () => foundersApi.refund(purchase.id, { reason: 'Admin initiated refund' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['founders'] }),
  });

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-900">{purchase.email}</p>
          {purchase.name && (
            <p className="text-xs text-slate-500">{purchase.name}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <FounderBadge tier={purchase.tier} size="sm" />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={purchase.status} size="sm" />
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-slate-900">
          {formatCurrency(purchase.price)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-slate-500">
          {purchase.affiliate ? (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
              Affiliate
            </span>
          ) : purchase.referralCode ? (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
              Referral
            </span>
          ) : (
            <span className="text-slate-400">Direct</span>
          )}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-500" title={formatDate(purchase.createdAt)}>
          {formatRelativeTime(purchase.createdAt)}
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
                to={`/founders/${purchase.id}`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Eye className="w-4 h-4" />
                View Details
              </Link>
              {purchase.status === 'waiting' && (
                <button
                  onClick={() => {
                    activateMutation.mutate();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Activate
                </button>
              )}
              {purchase.status !== 'expired' && (
                <button
                  onClick={() => {
                    if (confirm('Process refund for this founder purchase?')) {
                      refundMutation.mutate();
                      setShowMenu(false);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4" />
                  Refund
                </button>
              )}
            </div>
          </>
        )}
      </td>
    </tr>
  );
}

function PlanConfigModal({
  plans,
  onClose,
}: {
  plans: FounderPlan[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [editedPlans, setEditedPlans] = useState<Record<string, Partial<FounderPlan>>>({});

  const updateMutation = useMutation({
    mutationFn: ({ tier, data }: { tier: string; data: Partial<FounderPlan> }) =>
      foundersApi.updatePlan(tier, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founders', 'plans'] });
    },
  });

  const handleSave = (tier: string) => {
    const changes = editedPlans[tier];
    if (changes) {
      updateMutation.mutate({ tier, data: changes });
      setEditedPlans((prev) => {
        const next = { ...prev };
        delete next[tier];
        return next;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Configure Founder Plans
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Adjust pricing and availability for each tier
          </p>
        </div>
        <div className="p-6 space-y-6">
          {plans.map((plan) => {
            const edited = editedPlans[plan.tier] || {};
            const hasChanges = Object.keys(edited).length > 0;

            return (
              <div
                key={plan.tier}
                className="border border-slate-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <FounderBadge tier={plan.tier} size="md" />
                  {hasChanges && (
                    <button
                      onClick={() => handleSave(plan.tier)}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      value={edited.price ?? plan.price}
                      onChange={(e) =>
                        setEditedPlans((prev) => ({
                          ...prev,
                          [plan.tier]: {
                            ...prev[plan.tier],
                            price: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Total Spots
                    </label>
                    <input
                      type="number"
                      value={edited.totalSpots ?? plan.totalSpots}
                      onChange={(e) =>
                        setEditedPlans((prev) => ({
                          ...prev,
                          [plan.tier]: {
                            ...prev[plan.tier],
                            totalSpots: parseInt(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Sold
                    </label>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600">
                      {plan.soldSpots || 0}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`active-${plan.tier}`}
                    checked={edited.active ?? plan.active}
                    onChange={(e) =>
                      setEditedPlans((prev) => ({
                        ...prev,
                        [plan.tier]: {
                          ...prev[plan.tier],
                          active: e.target.checked,
                        },
                      }))
                    }
                    className="rounded border-slate-300"
                  />
                  <label
                    htmlFor={`active-${plan.tier}`}
                    className="text-sm text-slate-700"
                  >
                    Plan is active and available for purchase
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
