import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Contact,
  Search,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react';
import { crmApi, type CrmContact, type CrmDeal } from '@/lib/api';
import { ContactFormModal } from '@/components/crm/ContactFormModal';
import { CreateOpportunityModal } from '@/components/crm/CreateOpportunityModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function ContactsDashboard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{ type?: string; status?: string; page: number; limit: number }>({
    page: 1,
    limit: 20,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContact, setEditingContact] = useState<CrmContact | null>(null);
  const [opportunityContact, setOpportunityContact] = useState<CrmContact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingOpportunity, setIsCreatingOpportunity] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['crm', 'stats'],
    queryFn: crmApi.getStats,
  });

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['crm', 'contacts', filters, searchQuery],
    queryFn: () => crmApi.listContacts({ ...filters, search: searchQuery || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CrmContact>) => crmApi.createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setShowCreateModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CrmContact> }) => crmApi.updateContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setEditingContact(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setDeleteConfirm(null);
    },
  });

  const createDealMutation = useMutation({
    mutationFn: (data: Partial<CrmDeal>) => crmApi.createDeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      setOpportunityContact(null);
    },
  });

  const handleCreate = async (data: Partial<CrmContact>) => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: Partial<CrmContact>) => {
    if (!editingContact) return;
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync({ id: editingContact.id, data });
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

  const contacts = contactsData?.contacts || [];
  const pagination = {
    page: filters.page,
    limit: filters.limit,
    total: contactsData?.total || 0,
    totalPages: Math.ceil((contactsData?.total || 0) / filters.limit),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500">Manage your contacts and relationships</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Contact
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500">
              <Contact className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Contacts</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.contacts?.total || 0}</p>
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
                placeholder="Search contacts..."
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
            <option value="contact">Contact</option>
            <option value="lead">Lead</option>
            <option value="customer">Customer</option>
            <option value="partner">Partner</option>
          </select>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value || undefined, page: 1 }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No contacts found</td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {contact.firstName[0]}{contact.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {contact.firstName} {contact.lastName}
                        </div>
                        {contact.jobTitle && (
                          <div className="text-sm text-gray-500">{contact.jobTitle}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contact.company ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{contact.company.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                        <Mail className="w-4 h-4" />
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contact.phone ? (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-gray-600 hover:underline">
                        <Phone className="w-4 h-4" />
                        {contact.phone}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                      {contact.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setOpportunityContact(contact)}
                        className="p-1 text-gray-400 hover:text-green-600"
                        title="Create Opportunity"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingContact(contact)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(contact.id)}
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
      <ContactFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isLoading={isSubmitting}
      />

      {/* Edit Modal */}
      <ContactFormModal
        isOpen={!!editingContact}
        onClose={() => setEditingContact(null)}
        onSubmit={handleUpdate}
        contact={editingContact}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Contact"
        message="Are you sure you want to delete this contact? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Create Opportunity Modal */}
      <CreateOpportunityModal
        isOpen={!!opportunityContact}
        onClose={() => setOpportunityContact(null)}
        onSubmit={handleCreateOpportunity}
        contact={opportunityContact}
        isLoading={isCreatingOpportunity}
      />
    </div>
  );
}
