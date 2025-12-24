import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Ticket,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { ticketsApi, type SupportTicket } from '@/lib/api';
import { cn } from '@/lib/utils';
import { TicketFormModal } from '@/components/tickets/TicketFormModal';
import { TicketDetailModal } from '@/components/tickets/TicketDetailModal';
import { TicketCard } from '@/components/tickets/TicketCard';
import { TicketKanbanBoard } from '@/components/tickets/TicketKanbanBoard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ViewToggle, type ViewMode } from '@/components/shared/ViewToggle';

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  open: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const slaStatusIcons: Record<string, { icon: typeof CheckCircle; color: string }> = {
  on_track: { icon: CheckCircle, color: 'text-green-500' },
  at_risk: { icon: AlertCircle, color: 'text-yellow-500' },
  breached: { icon: XCircle, color: 'text-red-500' },
};

const VIEW_STORAGE_KEY = 'tickets-view-preference';

export default function TicketsDashboard() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    return (stored as ViewMode) || 'list';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    status?: string;
    priority?: string;
    slaStatus?: string;
    page: number;
    limit: number;
  }>({
    page: 1,
    limit: 20,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDefaultStatus, setCreateDefaultStatus] = useState<string | undefined>();
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
  const [viewingTicketId, setViewingTicketId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Persist view preference
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  const { data: stats } = useQuery({
    queryKey: ['tickets', 'stats'],
    queryFn: ticketsApi.getStats,
  });

  // For kanban view, fetch all tickets without pagination
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['tickets', 'list', view === 'kanban' ? {} : filters, searchQuery],
    queryFn: () => ticketsApi.listTickets(
      view === 'kanban'
        ? { limit: 500, search: searchQuery || undefined }
        : { ...filters, search: searchQuery || undefined }
    ),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<SupportTicket>) => ticketsApi.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowCreateModal(false);
      setCreateDefaultStatus(undefined);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SupportTicket> }) =>
      ticketsApi.updateTicket(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setEditingTicket(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ticketsApi.deleteTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setDeleteConfirm(null);
    },
  });

  const handleCreate = async (data: Partial<SupportTicket>) => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({ ...data, status: createDefaultStatus || data.status });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: Partial<SupportTicket>) => {
    if (!editingTicket) return;
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync({ id: editingTicket.id, data });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    await updateMutation.mutateAsync({ id: ticketId, data: { status: newStatus } });
  };

  const handleOpenCreateWithStatus = (status: string) => {
    setCreateDefaultStatus(status);
    setShowCreateModal(true);
  };

  const tickets = ticketsData?.tickets || [];
  const pagination = {
    page: filters.page,
    limit: filters.limit,
    total: ticketsData?.total || 0,
    totalPages: Math.ceil((ticketsData?.total || 0) / filters.limit),
  };

  const statCards = [
    { label: 'Open Tickets', value: stats?.openCount || 0, icon: Ticket, color: 'bg-blue-500' },
    { label: 'Avg Resolution', value: `${stats?.avgResolutionHours?.toFixed(1) || 0}h`, icon: Clock, color: 'bg-green-500' },
  ];

  // Render List View
  const renderListView = () => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
            </tr>
          ) : tickets.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No tickets found</td>
            </tr>
          ) : (
            tickets.map((ticket) => {
              const SlaIcon = slaStatusIcons[ticket.slaStatus]?.icon || CheckCircle;
              const slaColor = slaStatusIcons[ticket.slaStatus]?.color || 'text-gray-400';
              return (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-xs text-gray-400 font-mono">{ticket.ticketNumber}</div>
                      <div className="font-medium text-gray-900">{ticket.subject}</div>
                      {ticket.reporterName && (
                        <div className="text-sm text-gray-500">{ticket.reporterName}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium capitalize', statusColors[ticket.status])}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium capitalize', priorityColors[ticket.priority])}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <SlaIcon className={cn('w-4 h-4', slaColor)} />
                      <span className="text-sm capitalize">{ticket.slaStatus.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {ticket.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-900">{ticket.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewingTicketId(ticket.id)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingTicket(ticket)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(ticket.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
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
  );

  // Render Card View
  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {isLoading ? (
        <div className="col-span-full text-center py-8 text-gray-500">Loading...</div>
      ) : tickets.length === 0 ? (
        <div className="col-span-full text-center py-8 text-gray-500">No tickets found</div>
      ) : (
        tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onClick={() => setViewingTicketId(ticket.id)}
          />
        ))
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-500">Manage customer support requests</p>
        </div>
        <div className="flex items-center gap-4">
          <ViewToggle view={view} onChange={setView} />
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Search & Filters (not for Kanban view) */}
      {view !== 'kanban' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value || undefined, page: 1 }))}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={filters.priority || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value || undefined, page: 1 }))}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filters.slaStatus || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, slaStatus: e.target.value || undefined, page: 1 }))}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All SLA</option>
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="breached">Breached</option>
            </select>
          </div>
        </div>
      )}

      {/* View Content */}
      {view === 'list' && renderListView()}
      {view === 'card' && renderCardView()}
      {view === 'kanban' && (
        <TicketKanbanBoard
          tickets={tickets}
          onTicketClick={(ticket) => setViewingTicketId(ticket.id)}
          onStatusChange={handleStatusChange}
          onCreateTicket={handleOpenCreateWithStatus}
          isLoading={isLoading}
        />
      )}

      {/* Create Modal */}
      <TicketFormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateDefaultStatus(undefined);
        }}
        onSubmit={handleCreate}
        isLoading={isSubmitting}
        defaultStatus={createDefaultStatus}
      />

      {/* Edit Modal */}
      <TicketFormModal
        isOpen={!!editingTicket}
        onClose={() => setEditingTicket(null)}
        onSubmit={handleUpdate}
        ticket={editingTicket}
        isLoading={isSubmitting}
      />

      {/* Detail Modal */}
      <TicketDetailModal
        isOpen={!!viewingTicketId}
        onClose={() => setViewingTicketId(null)}
        ticketId={viewingTicketId}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Ticket"
        message="Are you sure you want to delete this ticket? All comments will also be deleted."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
