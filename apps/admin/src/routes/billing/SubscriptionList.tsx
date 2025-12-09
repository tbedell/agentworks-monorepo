import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, XCircle, ExternalLink } from 'lucide-react';
import { billingApi, type Subscription } from '@/lib/api';

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    canceled: 'bg-red-500/20 text-red-400',
    past_due: 'bg-yellow-500/20 text-yellow-400',
    trialing: 'bg-blue-500/20 text-blue-400',
    incomplete: 'bg-slate-500/20 text-slate-400',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded ${classes[status] || classes.incomplete}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function SubscriptionList() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['billing', 'subscriptions', { status: statusFilter }],
    queryFn: () => billingApi.getSubscriptions({ status: statusFilter || undefined }),
  });

  const cancelMutation = useMutation({
    mutationFn: billingApi.cancelSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['billing', 'subscriptions'] }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/billing"
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
          <p className="text-slate-400">Manage tenant subscriptions</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="admin-input w-40"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="canceled">Canceled</option>
          <option value="past_due">Past Due</option>
          <option value="trialing">Trialing</option>
        </select>
      </div>

      <div className="admin-card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : !subscriptions?.length ? (
          <div className="p-8 text-center text-slate-400">No subscriptions found</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Current Period</th>
                <th>Cancel at End</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub: Subscription) => (
                <tr key={sub.id}>
                  <td>
                    <Link
                      to={`/tenants/${sub.tenantId}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {sub.tenantId.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="text-white font-medium">{sub.planName}</td>
                  <td>
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="text-slate-300">
                    {new Date(sub.currentPeriodStart).toLocaleDateString()} -{' '}
                    {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </td>
                  <td>
                    {sub.cancelAtPeriodEnd ? (
                      <span className="text-yellow-400 text-sm">Yes</span>
                    ) : (
                      <span className="text-slate-500 text-sm">No</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://dashboard.stripe.com/subscriptions/${sub.stripeSubscriptionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-slate-700 rounded"
                        title="View in Stripe"
                      >
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </a>
                      {sub.status === 'active' && !sub.cancelAtPeriodEnd && (
                        <button
                          onClick={() => {
                            if (confirm('Cancel this subscription at period end?')) {
                              cancelMutation.mutate(sub.id);
                            }
                          }}
                          className="p-1 hover:bg-slate-700 rounded"
                          title="Cancel subscription"
                        >
                          <XCircle className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
