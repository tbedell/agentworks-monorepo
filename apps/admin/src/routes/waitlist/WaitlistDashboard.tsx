import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Mail,
  UserCheck,
  Clock,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Send,
  UserPlus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { waitlistApi, type WaitlistLead, type WaitlistQuery } from '@/lib/api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FounderBadge } from '@/components/shared/FounderBadge';
import { BulkActionBar } from '@/components/shared/BulkActionBar';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';

export default function WaitlistDashboard() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<WaitlistQuery>({
    page: 1,
    limit: 20,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['waitlist', 'stats'],
    queryFn: waitlistApi.getStats,
  });

  // Fetch leads list
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['waitlist', 'list', filters, searchQuery],
    queryFn: () => waitlistApi.list({ ...filters, search: searchQuery || undefined }),
  });

  // Bulk action mutation
  const bulkMutation = useMutation({
    mutationFn: ({ action, ids }: { action: 'invite' | 'updateStatus' | 'delete'; ids: string[] }) =>
      waitlistApi.bulk({ ids, action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      setSelectedIds([]);
    },
  });

  // Export function
  const handleExport = async () => {
    try {
      const response = await waitlistApi.export(filters);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `waitlist-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const leads = leadsData?.leads || [];
  const pagination = {
    page: leadsData?.page || 1,
    limit: leadsData?.limit || 20,
    total: leadsData?.total || 0,
    totalPages: leadsData?.totalPages || 1,
  };

  const handleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const statCards = [
    {
      label: 'Total Waitlist',
      value: stats?.total || 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Pending Invites',
      value: stats?.byStatus?.invited || 0,
      icon: Mail,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Converted',
      value: stats?.byStatus?.converted || 0,
      icon: UserCheck,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Waiting',
      value: stats?.byStatus?.waiting || 0,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Waitlist Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage waitlist signups, send invites, and convert to tenants
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div className={cn('p-3 rounded-lg', stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Founder Tier Breakdown */}
      {stats?.tierBreakdown && stats.tierBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Founder Interest</h3>
          <div className="flex flex-wrap gap-4">
            {stats.tierBreakdown.map((tier) => (
              <div key={tier.tier} className="flex items-center gap-2">
                <FounderBadge tier={tier.tier} size="sm" />
                <span className="text-sm font-medium text-slate-900">{tier.count}</span>
                <span className="text-xs text-slate-500">
                  ({tier.remainingSpots} spots left)
                </span>
              </div>
            ))}
          </div>
        </div>
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
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors',
              showFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    status: (e.target.value || undefined) as WaitlistQuery['status'],
                    page: 1,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">All Statuses</option>
                <option value="waiting">Waiting</option>
                <option value="invited">Invited</option>
                <option value="converted">Converted</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Founder Tier
              </label>
              <select
                value={filters.founderTier || ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    founderTier: (e.target.value || undefined) as WaitlistQuery['founderTier'],
                    page: 1,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">All Tiers</option>
                <option value="diamond">Diamond</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Has Referrals
              </label>
              <select
                value={filters.hasReferrals || ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    hasReferrals: (e.target.value || undefined) as WaitlistQuery['hasReferrals'],
                    page: 1,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">All</option>
                <option value="true">Has Referrals</option>
                <option value="false">No Referrals</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Sort By
              </label>
              <select
                value={filters.sortBy || 'createdAt'}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, sortBy: e.target.value as WaitlistQuery['sortBy'], page: 1 }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="createdAt">Join Date</option>
                <option value="position">Position</option>
                <option value="email">Email</option>
                <option value="referralCount">Referral Count</option>
              </select>
            </div>
          </div>
        )}
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
                    checked={selectedIds.length === leads.length && leads.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Founder Tier
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Source
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
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No waitlist entries found
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <WaitlistRow
                    key={lead.id}
                    lead={lead}
                    selected={selectedIds.includes(lead.id)}
                    onSelect={() => handleSelectOne(lead.id)}
                  />
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
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            label: 'Send Invites',
            icon: <Send className="w-4 h-4" />,
            onClick: () => bulkMutation.mutate({ action: 'invite', ids: selectedIds }),
          },
          {
            label: 'Delete',
            icon: <Trash2 className="w-4 h-4" />,
            variant: 'danger',
            onClick: () => {
              if (confirm(`Delete ${selectedIds.length} waitlist entries?`)) {
                bulkMutation.mutate({ action: 'delete', ids: selectedIds });
              }
            },
          },
        ]}
      />
    </div>
  );
}

// Individual row component
function WaitlistRow({
  lead,
  selected,
  onSelect,
}: {
  lead: WaitlistLead;
  selected: boolean;
  onSelect: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: () => waitlistApi.invite(lead.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waitlist'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => waitlistApi.delete(lead.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waitlist'] }),
  });

  return (
    <tr className={cn('hover:bg-slate-50', selected && 'bg-blue-50')}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="rounded border-slate-300"
        />
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-slate-900">#{lead.position}</span>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-900">{lead.email}</p>
          {lead.name && (
            <p className="text-xs text-slate-500">{lead.name}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={lead.status} size="sm" />
      </td>
      <td className="px-4 py-3">
        {lead.founderTier ? (
          <FounderBadge tier={lead.founderTier} size="sm" showLabel={false} />
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-slate-500">
          {lead.utmSource ? (
            <span className="px-2 py-0.5 bg-slate-100 rounded">
              {lead.utmSource}
            </span>
          ) : lead.affiliate ? (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
              Affiliate
            </span>
          ) : lead.referredByCode ? (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
              Referral
            </span>
          ) : (
            <span className="text-slate-400">Direct</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-500" title={formatDate(lead.createdAt)}>
          {formatRelativeTime(lead.createdAt)}
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
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
              <Link
                to={`/waitlist/${lead.id}`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Eye className="w-4 h-4" />
                View Details
              </Link>
              {lead.status === 'waiting' && (
                <button
                  onClick={() => {
                    inviteMutation.mutate();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Send className="w-4 h-4" />
                  Send Invite
                </button>
              )}
              {lead.status === 'invited' && (
                <Link
                  to={`/waitlist/${lead.id}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <UserPlus className="w-4 h-4" />
                  Convert to Tenant
                </Link>
              )}
              <button
                onClick={() => {
                  if (confirm('Delete this waitlist entry?')) {
                    deleteMutation.mutate();
                    setShowMenu(false);
                  }
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </td>
    </tr>
  );
}
