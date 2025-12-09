import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Crown,
  CheckCircle,
  XCircle,
  ExternalLink,
  Clock,
  CreditCard,
  User,
  Building,
  Mail,
} from 'lucide-react';
import { foundersApi } from '@/lib/api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

export default function FounderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: purchase, isLoading } = useQuery({
    queryKey: ['founders', id],
    queryFn: () => foundersApi.get(id!),
    enabled: !!id,
  });

  const activateMutation = useMutation({
    mutationFn: () => foundersApi.activate(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['founders', id] }),
  });

  const refundMutation = useMutation({
    mutationFn: (reason: string) => foundersApi.refund(id!, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founders'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-slate-500">Founder purchase not found</p>
        <Link to="/founders" className="mt-4 text-blue-600 hover:underline">
          Back to Founders
        </Link>
      </div>
    );
  }

  const tierBenefits: Record<string, string[]> = {
    diamond: [
      'Lifetime Pro access',
      'Priority support',
      'Early access to all features',
      'Exclusive Discord channel',
      'Annual strategy call',
      'Custom agent training',
    ],
    gold: [
      'Lifetime Pro access',
      'Priority support',
      'Early access to features',
      'Exclusive Discord channel',
    ],
    silver: [
      'Lifetime Pro access',
      'Priority support',
      'Early access to features',
    ],
  };

  // Use actual features from the API if available
  const benefits = purchase.features || tierBenefits[purchase.tier] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/founders')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{purchase.email}</h1>
              <StatusBadge status={purchase.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Purchased {formatDate(purchase.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {purchase.status === 'waiting' && (
            <button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              Activate Founder
            </button>
          )}
          {purchase.status !== 'expired' && (
            <button
              onClick={() => {
                const reason = prompt('Enter refund reason:');
                if (reason) refundMutation.mutate(reason);
              }}
              disabled={refundMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
            >
              <XCircle className="w-4 h-4" />
              Process Refund
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Founder Tier Card */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div
              className={cn(
                'px-6 py-8 text-white bg-gradient-to-r',
                purchase.tier === 'diamond' && 'from-cyan-500 to-blue-600',
                purchase.tier === 'gold' && 'from-amber-500 to-yellow-600',
                purchase.tier === 'silver' && 'from-slate-400 to-slate-500'
              )}
            >
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-xl">
                  <Crown className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold capitalize">
                    {purchase.tierName || `${purchase.tier} Founder`}
                  </h2>
                  <p className="text-white/80 mt-1">
                    {formatCurrency(purchase.price)} · Lifetime Access
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                Included Benefits
              </h3>
              <ul className="space-y-2">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Contact Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Mail className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-medium text-slate-900">
                    {purchase.email}
                  </p>
                </div>
              </div>
              {purchase.name && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="text-sm font-medium text-slate-900">
                      {purchase.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-slate-400" />
              Payment Details
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">Amount</p>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(purchase.price)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Position</p>
                <p className="text-sm text-slate-900">
                  #{purchase.position}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Referral Code</p>
                <p className="text-sm text-slate-900 font-mono">
                  {purchase.referralCode || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <StatusBadge status={purchase.status} size="sm" />
              </div>
            </div>
          </div>

          {/* Attribution */}
          {(purchase.affiliate || purchase.affiliateConversion) && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Attribution
              </h2>
              <div className="space-y-3">
                {purchase.affiliate && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-purple-900">
                        Affiliate Referral
                      </p>
                      <p className="text-xs text-purple-600">
                        {purchase.affiliate.name} ({purchase.affiliate.code})
                      </p>
                    </div>
                    <Link
                      to={`/affiliates/${purchase.affiliate.id}`}
                      className="flex items-center gap-1 text-sm text-purple-600 hover:underline"
                    >
                      View Affiliate
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
                {purchase.affiliateConversion && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Affiliate Commission
                      </p>
                      <p className="text-xs text-green-600">
                        {formatCurrency(purchase.affiliateConversion.commission)} + {formatCurrency(purchase.affiliateConversion.bonus)} bonus
                      </p>
                    </div>
                    <StatusBadge status={purchase.affiliateConversion.status} size="sm" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              Timeline
            </h2>
            <div className="space-y-4">
              <TimelineItem label="Purchased" date={purchase.createdAt} active />
              {purchase.convertedAt && (
                <TimelineItem label="Converted" date={purchase.convertedAt} active />
              )}
              {purchase.status === 'waiting' && (
                <TimelineItem label="Awaiting Activation" pending />
              )}
              {purchase.status === 'invited' && (
                <TimelineItem label="Invite Sent" active />
              )}
              {purchase.status === 'expired' && (
                <TimelineItem label="Expired" active variant="error" />
              )}
            </div>
          </div>

          {/* Linked Tenant */}
          {purchase.tenant ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-green-900">
                  Linked Tenant
                </h2>
              </div>
              <p className="text-sm text-green-700 mb-2">
                {purchase.tenant.name}
              </p>
              <p className="text-xs text-green-600 mb-4">
                {purchase.tenant.userCount} users · {purchase.tenant.workspaceCount} workspaces
              </p>
              <Link
                to={`/tenants/${purchase.tenant.id}`}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                View Tenant
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ) : purchase.tenantId ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-green-900">
                  Linked Tenant
                </h2>
              </div>
              <p className="text-sm text-green-700 mb-4">
                This founder has an active tenant account.
              </p>
              <Link
                to={`/tenants/${purchase.tenantId}`}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                View Tenant
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-amber-900">
                  No Linked Tenant
                </h2>
              </div>
              <p className="text-sm text-amber-700">
                This founder has not yet created a tenant account.
              </p>
            </div>
          )}

          {/* Referral Stats */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Referral Stats
            </h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Referrals Made</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {purchase.referralCount || 0}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Days Since Purchase</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {Math.floor(
                    (Date.now() - new Date(purchase.createdAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  date,
  active,
  pending,
  variant,
}: {
  label: string;
  date?: string;
  active?: boolean;
  pending?: boolean;
  variant?: 'error';
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'w-2 h-2 rounded-full mt-1.5',
          active && variant !== 'error' && 'bg-green-500',
          active && variant === 'error' && 'bg-red-500',
          pending && 'bg-slate-300',
          !active && !pending && 'bg-slate-200'
        )}
      />
      <div className="flex-1">
        <p
          className={cn(
            'text-sm font-medium',
            active && 'text-slate-900',
            pending && 'text-slate-400'
          )}
        >
          {label}
        </p>
        {date && <p className="text-xs text-slate-500">{formatDateTime(date)}</p>}
      </div>
    </div>
  );
}
