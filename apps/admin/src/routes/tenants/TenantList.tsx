import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Pause,
  Play,
  Trash2,
  Users,
} from 'lucide-react';
import { tenantsApi, type Tenant } from '@/lib/api';

function StatusBadge({ status }: { status: Tenant['status'] }) {
  const classes = {
    active: 'status-active',
    trial: 'status-trial',
    suspended: 'status-suspended',
    deleted: 'status-deleted',
  };

  return <span className={classes[status]}>{status}</span>;
}

function TenantActions({
  tenant,
  onSuspend,
  onActivate,
  onDelete,
}: {
  tenant: Tenant;
  onSuspend: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-slate-200 rounded"
      >
        <MoreVertical className="w-4 h-4 text-slate-500" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
            <Link
              to={`/tenants/${tenant.id}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Eye className="w-4 h-4" />
              View Details
            </Link>
            <Link
              to={`/tenants/${tenant.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            {tenant.status === 'active' || tenant.status === 'trial' ? (
              <button
                onClick={() => {
                  onSuspend();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-600 hover:bg-slate-100"
              >
                <Pause className="w-4 h-4" />
                Suspend
              </button>
            ) : tenant.status === 'suspended' ? (
              <button
                onClick={() => {
                  onActivate();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-slate-100"
              >
                <Play className="w-4 h-4" />
                Activate
              </button>
            ) : null}
            <button
              onClick={() => {
                onDelete();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-slate-100"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function TenantList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [founderFilter, setFounderFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', { search, status: statusFilter, page, limit }],
    queryFn: () => tenantsApi.list({ search, status: statusFilter || undefined, page, limit }),
  });

  const suspendMutation = useMutation({
    mutationFn: tenantsApi.suspend,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const activateMutation = useMutation({
    mutationFn: tenantsApi.activate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: tenantsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const tenants = data?.tenants || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
          <p className="text-slate-600">Manage all platform tenants</p>
        </div>
        <Link to="/tenants/new" className="admin-btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Tenant
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="admin-input w-40"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="deleted">Deleted</option>
        </select>
        <select
          value={founderFilter}
          onChange={(e) => setFounderFilter(e.target.value)}
          className="admin-input w-40"
        >
          <option value="">All Types</option>
          <option value="founder">Founders Only</option>
          <option value="diamond">Diamond</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="regular">Regular Users</option>
        </select>
      </div>

      <div className="admin-card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : tenants.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No tenants found</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Status</th>
                <th>Plan</th>
                <th>Members</th>
                <th>Usage</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/tenants/${tenant.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600"
                      >
                        {tenant.name}
                      </Link>
                    </div>
                    <p className="text-xs text-slate-500">{tenant.slug}</p>
                  </td>
                  <td>
                    <StatusBadge status={tenant.status} />
                  </td>
                  <td>
                    {tenant.planName || 'Free'}
                  </td>
                  <td>{tenant.memberCount}</td>
                  <td>
                    <span className="text-slate-700">
                      {tenant.tokenUsageThisMonth.toLocaleString()}
                    </span>
                    {tenant.tokenLimit && (
                      <span className="text-slate-500">
                        {' / '}
                        {tenant.tokenLimit.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="text-slate-400">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <TenantActions
                      tenant={tenant}
                      onSuspend={() => suspendMutation.mutate(tenant.id)}
                      onActivate={() => activateMutation.mutate(tenant.id)}
                      onDelete={() => {
                        if (confirm(`Delete tenant "${tenant.name}"? This cannot be undone.`)) {
                          deleteMutation.mutate(tenant.id);
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="admin-btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="admin-btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
