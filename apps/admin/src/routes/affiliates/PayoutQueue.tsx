import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  DollarSign,
  Clock,
  Send,
  Eye,
} from 'lucide-react';
import { affiliatesApi } from '@/lib/api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BulkActionBar } from '@/components/shared/BulkActionBar';
import { cn, formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';

export default function PayoutQueue() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch pending payouts
  const { data: payoutsData, isLoading } = useQuery({
    queryKey: ['affiliates', 'pending-payouts'],
    queryFn: affiliatesApi.getPendingPayouts,
  });

  const pendingPayouts = payoutsData?.pendingPayouts || [];
  const totalPendingAmount = payoutsData?.totalPendingAmount || 0;

  // Process payouts mutation
  const processMutation = useMutation({
    mutationFn: (ids: string[]) => affiliatesApi.processPayouts({ ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] });
      setSelectedIds([]);
    },
  });

  const handleSelectAll = () => {
    if (selectedIds.length === pendingPayouts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingPayouts.filter(p => p.status === 'pending').map(p => p.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedTotal = pendingPayouts
    .filter((p) => selectedIds.includes(p.id))
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/affiliates')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Payout Queue</h1>
            <p className="text-sm text-slate-500 mt-1">
              Review and process affiliate payouts
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending Payouts</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {pendingPayouts.length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Pending Amount</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalPendingAmount)}
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
              <p className="text-sm text-slate-500">Selected for Processing</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {selectedIds.length > 0 ? formatCurrency(selectedTotal) : '-'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-green-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          {selectedIds.length > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              {selectedIds.length} payouts selected
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {selectedIds.length > 0
              ? `${selectedIds.length} payouts selected`
              : 'Select payouts to process'}
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={() => processMutation.mutate(selectedIds)}
              disabled={processMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              <Send className="w-4 h-4" />
              Process Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === pendingPayouts.filter(p => p.status === 'pending').length &&
                      pendingPayouts.filter(p => p.status === 'pending').length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Affiliate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Created
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
              ) : pendingPayouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No pending payouts
                  </td>
                </tr>
              ) : (
                pendingPayouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className={cn('hover:bg-slate-50', selectedIds.includes(payout.id) && 'bg-blue-50')}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(payout.id)}
                        onChange={() => handleSelectOne(payout.id)}
                        disabled={payout.status !== 'pending'}
                        className="rounded border-slate-300 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {payout.affiliate.email}
                        </p>
                        <p className="text-xs text-slate-500">{payout.affiliate.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(payout.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600 capitalize">
                        {payout.method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={payout.status} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500" title={formatDate(payout.createdAt)}>
                        {formatRelativeTime(payout.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/affiliates/${payout.affiliateId}`}
                        className="p-1 hover:bg-slate-100 rounded inline-flex"
                        title="View affiliate"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            label: `Process (${formatCurrency(selectedTotal)})`,
            icon: <Send className="w-4 h-4" />,
            onClick: () => processMutation.mutate(selectedIds),
            disabled: processMutation.isPending,
          },
        ]}
      />
    </div>
  );
}
