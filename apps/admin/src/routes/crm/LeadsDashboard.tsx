import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Target,
  Search,
  Plus,
  Edit,
  Trash2,
  ThermometerSun,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  ArrowRightCircle,
} from 'lucide-react';
import { crmApi, type CrmLead } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LeadFormModal } from '@/components/crm/LeadFormModal';
import { ConvertLeadModal } from '@/components/crm/ConvertLeadModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const stageColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  converted: 'bg-green-100 text-green-800',
};

const tempColors: Record<string, string> = {
  cold: 'text-blue-500',
  warm: 'text-yellow-500',
  hot: 'text-red-500',
};

export default function LeadsDashboard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{ stage?: string; temperature?: string; page: number; limit: number }>({
    page: 1,
    limit: 20,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [convertingLead, setConvertingLead] = useState<CrmLead | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['crm', 'stats'],
    queryFn: crmApi.getStats,
  });

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['crm', 'leads', filters, searchQuery],
    queryFn: () => crmApi.listLeads({ ...filters, search: searchQuery || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CrmLead>) => crmApi.createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setShowCreateModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CrmLead> }) => crmApi.updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setEditingLead(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setDeleteConfirm(null);
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof crmApi.convertLead>[1] }) =>
      crmApi.convertLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setConvertingLead(null);
    },
  });

  const handleCreate = async (data: Partial<CrmLead>) => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: Partial<CrmLead>) => {
    if (!editingLead) return;
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync({ id: editingLead.id, data });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm);
  };

  const handleConvert = async (data: {
    createContact: boolean;
    contactData?: { firstName: string; lastName: string; email?: string; phone?: string; jobTitle?: string };
    createCompany: boolean;
    companyData?: { name: string; industry?: string; website?: string; phone?: string };
    createDeal: boolean;
    dealData?: { name: string; value: number; probability: number; expectedCloseDate?: string };
  }) => {
    if (!convertingLead) return;
    setIsConverting(true);
    try {
      await convertMutation.mutateAsync({ id: convertingLead.id, data });
    } finally {
      setIsConverting(false);
    }
  };

  const leads = leadsData?.leads || [];
  const pagination = {
    page: filters.page,
    limit: filters.limit,
    total: leadsData?.total || 0,
    totalPages: Math.ceil((leadsData?.total || 0) / filters.limit),
  };

  const statCards = [
    { label: 'Total Leads', value: stats?.leads?.total || 0, icon: Target, color: 'bg-blue-500' },
    { label: 'New This Week', value: stats?.leads?.thisWeek || 0, icon: UserPlus, color: 'bg-green-500' },
    { label: 'Converted', value: stats?.leads?.converted || 0, icon: ThermometerSun, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500">Track and manage your sales leads</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Lead
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

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <select
            value={filters.stage || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value || undefined, page: 1 }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Stages</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
          </select>
          <select
            value={filters.temperature || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, temperature: e.target.value || undefined, page: 1 }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Temperatures</option>
            <option value="cold">Cold</option>
            <option value="warm">Warm</option>
            <option value="hot">Hot</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No leads found</td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{lead.title}</div>
                      {lead.contact && (
                        <div className="text-sm text-gray-500">
                          {lead.contact.firstName} {lead.contact.lastName}
                          {lead.contact.email && ` · ${lead.contact.email}`}
                        </div>
                      )}
                      {lead.company && <div className="text-sm text-gray-400">{lead.company.name}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', stageColors[lead.stage])}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <ThermometerSun className={cn('w-4 h-4', tempColors[lead.temperature])} />
                      <span className="capitalize text-sm">{lead.temperature}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${lead.score}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{lead.score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.source || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      {lead.stage !== 'converted' && (
                        <button
                          onClick={() => setConvertingLead(lead)}
                          className="p-1 text-gray-400 hover:text-green-600"
                          title="Convert Lead"
                        >
                          <ArrowRightCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingLead(lead)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(lead.id)}
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
      <LeadFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isLoading={isSubmitting}
      />

      {/* Edit Modal */}
      <LeadFormModal
        isOpen={!!editingLead}
        onClose={() => setEditingLead(null)}
        onSubmit={handleUpdate}
        lead={editingLead}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Lead"
        message="Are you sure you want to delete this lead? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Convert Lead Modal */}
      <ConvertLeadModal
        isOpen={!!convertingLead}
        onClose={() => setConvertingLead(null)}
        onConvert={handleConvert}
        lead={convertingLead}
        isLoading={isConverting}
      />
    </div>
  );
}
