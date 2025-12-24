import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Globe,
  Users,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react';
import { crmApi, type CrmCompany, type CrmDeal } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CompanyFormModal } from '@/components/crm/CompanyFormModal';
import { CreateOpportunityModal } from '@/components/crm/CreateOpportunityModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const typeColors: Record<string, string> = {
  prospect: 'bg-blue-100 text-blue-800',
  customer: 'bg-green-100 text-green-800',
  vendor: 'bg-purple-100 text-purple-800',
  partner: 'bg-yellow-100 text-yellow-800',
};

export default function CompaniesDashboard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{ type?: string; status?: string; page: number; limit: number }>({
    page: 1,
    limit: 20,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CrmCompany | null>(null);
  const [opportunityCompany, setOpportunityCompany] = useState<CrmCompany | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingOpportunity, setIsCreatingOpportunity] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['crm', 'stats'],
    queryFn: crmApi.getStats,
  });

  const { data: companiesData, isLoading } = useQuery({
    queryKey: ['crm', 'companies', filters, searchQuery],
    queryFn: () => crmApi.listCompanies({ ...filters, search: searchQuery || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CrmCompany>) => crmApi.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setShowCreateModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CrmCompany> }) => crmApi.updateCompany(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setEditingCompany(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setDeleteConfirm(null);
    },
  });

  const createDealMutation = useMutation({
    mutationFn: (data: Partial<CrmDeal>) => crmApi.createDeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setOpportunityCompany(null);
    },
  });

  const handleCreate = async (data: Partial<CrmCompany>) => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: Partial<CrmCompany>) => {
    if (!editingCompany) return;
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync({ id: editingCompany.id, data });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm);
  };

  const handleCreateOpportunity = async (data: Partial<CrmDeal>) => {
    setIsCreatingOpportunity(true);
    try {
      await createDealMutation.mutateAsync(data);
    } finally {
      setIsCreatingOpportunity(false);
    }
  };

  const companies = companiesData?.companies || [];
  const pagination = {
    page: filters.page,
    limit: filters.limit,
    total: companiesData?.total || 0,
    totalPages: Math.ceil((companiesData?.total || 0) / filters.limit),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-500">Manage companies and organizations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Company
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Companies</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.companies?.total || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <select
            value={filters.type || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value || undefined, page: 1 }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="prospect">Prospect</option>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
            <option value="partner">Partner</option>
          </select>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacts</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deals</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No companies found</td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{company.name}</div>
                        {company.website && (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            {company.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium capitalize', typeColors[company.type])}>
                      {company.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {company.industry || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="w-4 h-4" />
                      {company.contactCount || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {company.dealCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setOpportunityCompany(company)}
                        className="p-1 text-gray-400 hover:text-green-600"
                        title="Create Opportunity"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingCompany(company)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(company.id)}
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
      <CompanyFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isLoading={isSubmitting}
      />

      {/* Edit Modal */}
      <CompanyFormModal
        isOpen={!!editingCompany}
        onClose={() => setEditingCompany(null)}
        onSubmit={handleUpdate}
        company={editingCompany}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Company"
        message="Are you sure you want to delete this company? This will also remove associated contacts and deals."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Create Opportunity Modal */}
      <CreateOpportunityModal
        isOpen={!!opportunityCompany}
        onClose={() => setOpportunityCompany(null)}
        onSubmit={handleCreateOpportunity}
        company={opportunityCompany}
        isLoading={isCreatingOpportunity}
      />
    </div>
  );
}
