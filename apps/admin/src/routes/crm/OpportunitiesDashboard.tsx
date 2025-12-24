import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { crmApi, type CrmDeal } from '@/lib/api';
import { cn } from '@/lib/utils';
import { DealFormModal } from '@/components/crm/DealFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const stageColors: Record<string, string> = {
  discovery: 'bg-blue-100 text-blue-800',
  qualification: 'bg-cyan-100 text-cyan-800',
  proposal: 'bg-yellow-100 text-yellow-800',
  negotiation: 'bg-purple-100 text-purple-800',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-red-100 text-red-800',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function OpportunitiesDashboard() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ stage?: string; page: number; limit: number }>({
    page: 1,
    limit: 20,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<CrmDeal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['crm', 'stats'],
    queryFn: crmApi.getStats,
  });

  const { data: dealsData, isLoading } = useQuery({
    queryKey: ['crm', 'deals', filters],
    queryFn: () => crmApi.listDeals(filters),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CrmDeal>) => crmApi.createDeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setShowCreateModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CrmDeal> }) => crmApi.updateDeal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setEditingDeal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteDeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setDeleteConfirm(null);
    },
  });

  const handleCreate = async (data: Partial<CrmDeal>) => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: Partial<CrmDeal>) => {
    if (!editingDeal) return;
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync({ id: editingDeal.id, data });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm);
  };

  const deals = dealsData?.deals || [];
  const pagination = {
    page: filters.page,
    limit: filters.limit,
    total: dealsData?.total || 0,
    totalPages: Math.ceil((dealsData?.total || 0) / filters.limit),
  };

  const statCards = [
    { label: 'Total Deals', value: stats?.deals?.total || 0, icon: DollarSign, color: 'bg-green-500' },
    { label: 'Pipeline Value', value: formatCurrency(stats?.deals?.totalValue || 0), icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'Avg Deal Size', value: formatCurrency(stats?.deals?.avgValue || 0), icon: DollarSign, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
          <p className="text-gray-500">Manage your sales pipeline</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Opportunity
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', stat.color)}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={filters.stage || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value || undefined, page: 1 }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Stages</option>
            <option value="discovery">Discovery</option>
            <option value="qualification">Qualification</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="closed_won">Closed Won</option>
            <option value="closed_lost">Closed Lost</option>
          </select>
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Probability</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Close Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : deals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No deals found</td>
              </tr>
            ) : (
              deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{deal.name}</div>
                      {deal.company && (
                        <div className="text-sm text-gray-500">{deal.company.name}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium capitalize', stageColors[deal.stage])}>
                      {deal.stage.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-semibold text-gray-900">{formatCurrency(deal.value)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', deal.probability >= 70 ? 'bg-green-500' : deal.probability >= 40 ? 'bg-yellow-500' : 'bg-red-500')}
                          style={{ width: `${deal.probability}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{deal.probability}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {deal.expectedCloseDate ? (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(deal.expectedCloseDate).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingDeal(deal)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(deal.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <DealFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isLoading={isSubmitting}
      />

      {/* Edit Modal */}
      <DealFormModal
        isOpen={!!editingDeal}
        onClose={() => setEditingDeal(null)}
        onSubmit={handleUpdate}
        deal={editingDeal}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Deal"
        message="Are you sure you want to delete this deal? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
