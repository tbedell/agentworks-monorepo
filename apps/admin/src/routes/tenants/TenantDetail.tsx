import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Pause,
  Play,
  Trash2,
  Users,
  FolderKanban,
  CreditCard,
  Activity,
  Gift,
  Plus,
} from 'lucide-react';
import { tenantsApi, settingsApi, type Tenant } from '@/lib/api';

function StatBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Tenant['status'] }) {
  const classes = {
    active: 'status-active',
    trial: 'status-trial',
    suspended: 'status-suspended',
    deleted: 'status-deleted',
  };

  return <span className={classes[status]}>{status}</span>;
}

export function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showAddTokensModal, setShowAddTokensModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [tokensToAdd, setTokensToAdd] = useState(100000);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantsApi.get(id!),
    enabled: !!id,
  });

  const { data: plans } = useQuery({
    queryKey: ['settings', 'plans'],
    queryFn: settingsApi.getPlans,
  });

  const suspendMutation = useMutation({
    mutationFn: () => tenantsApi.suspend(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant', id] }),
  });

  const activateMutation = useMutation({
    mutationFn: () => tenantsApi.activate(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => tenantsApi.delete(id!),
    onSuccess: () => navigate('/tenants'),
  });

  const adminGrantMutation = useMutation({
    mutationFn: (data: { planId: string; tokenBalance?: number }) => 
      tenantsApi.adminGrant(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      setShowGrantModal(false);
    },
  });

  const addTokensMutation = useMutation({
    mutationFn: (tokens: number) => tenantsApi.addTokens(id!, tokens),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      setShowAddTokensModal(false);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6">
        <div className="text-slate-400">Tenant not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/tenants"
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
            <StatusBadge status={tenant.status} />
          </div>
          <p className="text-slate-400">{tenant.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/tenants/${id}/edit`}
            className="admin-btn-secondary flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          {tenant.status === 'active' || tenant.status === 'trial' ? (
            <button
              onClick={() => suspendMutation.mutate()}
              className="admin-btn-secondary flex items-center gap-2 text-yellow-400"
            >
              <Pause className="w-4 h-4" />
              Suspend
            </button>
          ) : tenant.status === 'suspended' ? (
            <button
              onClick={() => activateMutation.mutate()}
              className="admin-btn-secondary flex items-center gap-2 text-green-400"
            >
              <Play className="w-4 h-4" />
              Activate
            </button>
          ) : null}
          <button
            onClick={() => setShowGrantModal(true)}
            className="admin-btn-primary flex items-center gap-2"
          >
            <Gift className="w-4 h-4" />
            Grant Access
          </button>
          <button
            onClick={() => setShowAddTokensModal(true)}
            className="admin-btn-secondary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Tokens
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete tenant "${tenant.name}"? This cannot be undone.`)) {
                deleteMutation.mutate();
              }
            }}
            className="admin-btn-secondary flex items-center gap-2 text-red-400"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {showGrantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Grant Access to Tenant</h3>
            <p className="text-sm text-slate-600 mb-4">
              Grant this tenant access to a plan without requiring payment.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Select a plan...</option>
                  {plans?.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - ${plan.monthlyPrice}/mo ({plan.tokenLimit?.toLocaleString() || 'Unlimited'} tokens)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowGrantModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => adminGrantMutation.mutate({ planId: selectedPlanId })}
                disabled={!selectedPlanId || adminGrantMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {adminGrantMutation.isPending ? 'Granting...' : 'Grant Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddTokensModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Tokens</h3>
            <p className="text-sm text-slate-600 mb-4">
              Add additional tokens to this tenant's balance.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tokens to Add</label>
                <input
                  type="number"
                  value={tokensToAdd}
                  onChange={(e) => setTokensToAdd(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  min="1000"
                  step="10000"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddTokensModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => addTokensMutation.mutate(tokensToAdd)}
                disabled={tokensToAdd <= 0 || addTokensMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {addTokensMutation.isPending ? 'Adding...' : 'Add Tokens'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Members" value={tenant.memberCount} icon={Users} />
        <StatBox label="Projects" value={tenant.projectCount} icon={FolderKanban} />
        <StatBox label="Plan" value={tenant.planName || 'Free'} icon={CreditCard} />
        <StatBox
          label="Token Usage"
          value={tenant.tokenUsageThisMonth.toLocaleString()}
          icon={Activity}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card">
          <h2 className="text-lg font-semibold text-white mb-4">Tenant Details</h2>
          <dl className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-700">
              <dt className="text-slate-400">ID</dt>
              <dd className="text-white font-mono text-sm">{tenant.id}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <dt className="text-slate-400">Slug</dt>
              <dd className="text-white">{tenant.slug}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <dt className="text-slate-400">Status</dt>
              <dd><StatusBadge status={tenant.status} /></dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <dt className="text-slate-400">Plan</dt>
              <dd className="text-white">{tenant.planName || 'Free'}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <dt className="text-slate-400">Token Limit</dt>
              <dd className="text-white">
                {tenant.tokenLimit ? tenant.tokenLimit.toLocaleString() : 'Unlimited'}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <dt className="text-slate-400">Created</dt>
              <dd className="text-white">
                {new Date(tenant.createdAt).toLocaleDateString()}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Updated</dt>
              <dd className="text-white">
                {new Date(tenant.updatedAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>

        <div className="admin-card">
          <h2 className="text-lg font-semibold text-white mb-4">Billing Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-700">
              <dt className="text-slate-400">Stripe Customer</dt>
              <dd className="text-white font-mono text-sm">
                {tenant.stripeCustomerId || 'Not connected'}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <dt className="text-slate-400">Current Usage</dt>
              <dd className="text-white">
                {tenant.tokenUsageThisMonth.toLocaleString()} tokens
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Usage Limit</dt>
              <dd className="text-white">
                {tenant.tokenLimit ? tenant.tokenLimit.toLocaleString() : 'Unlimited'}
              </dd>
            </div>
          </dl>
          {tenant.stripeCustomerId && (
            <a
              href={`https://dashboard.stripe.com/customers/${tenant.stripeCustomerId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-blue-400 hover:text-blue-300 text-sm"
            >
              View in Stripe Dashboard →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
