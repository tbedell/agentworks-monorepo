import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Mail,
  Send,
  UserPlus,
  Trash2,
  ExternalLink,
  Clock,
  Globe,
  Users,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { waitlistApi } from '@/lib/api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FounderBadge } from '@/components/shared/FounderBadge';
import { cn, formatDateTime, formatRelativeTime } from '@/lib/utils';

export default function WaitlistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{ name?: string; position?: number }>({});

  const { data: lead, isLoading } = useQuery({
    queryKey: ['waitlist', id],
    queryFn: () => waitlistApi.get(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; position?: number }) => waitlistApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist', id] });
      setIsEditing(false);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () => waitlistApi.invite(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waitlist', id] }),
  });

  const convertMutation = useMutation({
    mutationFn: (data: { tenantName: string }) =>
      waitlistApi.convert(id!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      navigate(`/tenants/${data.tenant.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => waitlistApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      navigate('/waitlist');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-slate-500">Waitlist entry not found</p>
        <Link to="/waitlist" className="mt-4 text-blue-600 hover:underline">
          Back to Waitlist
        </Link>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditData({
      name: lead.name,
      position: lead.position,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate(editData);
  };

  const handleConvert = () => {
    const tenantName = prompt('Enter organization name for the new tenant:');
    if (tenantName) {
      convertMutation.mutate({ tenantName });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/waitlist')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{lead.email}</h1>
              <StatusBadge status={lead.status} />
              {lead.founderTier && <FounderBadge tier={lead.founderTier} />}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Position #{lead.position} · Joined {formatRelativeTime(lead.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              {lead.status === 'waiting' && (
                <button
                  onClick={() => inviteMutation.mutate()}
                  disabled={inviteMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  <Send className="w-4 h-4" />
                  Send Invite
                </button>
              )}
              {lead.status === 'invited' && (
                <button
                  onClick={handleConvert}
                  disabled={convertMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  <UserPlus className="w-4 h-4" />
                  Convert to Tenant
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm('Delete this waitlist entry?')) {
                    deleteMutation.mutate();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Contact Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Email
                </label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-900">{lead.email}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Position
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editData.position || ''}
                    onChange={(e) =>
                      setEditData((d) => ({ ...d, position: parseInt(e.target.value) }))
                    }
                    className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm"
                  />
                ) : (
                  <span className="text-sm text-slate-900">#{lead.position}</span>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) =>
                      setEditData((d) => ({ ...d, name: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm"
                  />
                ) : (
                  <span className="text-sm text-slate-900">
                    {lead.name || '-'}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Referral Code
                </label>
                <code className="text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {lead.referralCode}
                </code>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Referral Count
                </label>
                <span className="text-sm text-slate-900">{lead.referralCount}</span>
              </div>
            </div>
          </div>

          {/* UTM / Attribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-slate-400" />
              Attribution Data
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Source
                </label>
                <span className="text-sm text-slate-900">
                  {lead.utmSource || '-'}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Medium
                </label>
                <span className="text-sm text-slate-900">
                  {lead.utmMedium || '-'}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Campaign
                </label>
                <span className="text-sm text-slate-900">
                  {lead.utmCampaign || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Referral Chain */}
          {(lead.referrer || lead.affiliate || lead.referredByCode) && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" />
                Referral Information
              </h2>
              <div className="space-y-3">
                {lead.affiliate && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-purple-900">
                        Affiliate Referral
                      </p>
                      <p className="text-xs text-purple-600">
                        {lead.affiliate.name} ({lead.affiliate.code})
                      </p>
                    </div>
                    <Link
                      to={`/affiliates/${lead.affiliate.id}`}
                      className="flex items-center gap-1 text-sm text-purple-600 hover:underline"
                    >
                      View Affiliate
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
                {lead.referrer && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        User Referral
                      </p>
                      <p className="text-xs text-blue-600">
                        Referred by: {lead.referrer.email} ({lead.referrer.referralCode})
                      </p>
                    </div>
                    <Link
                      to={`/waitlist/${lead.referrer.id}`}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      View Referrer
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
                {!lead.referrer && lead.referredByCode && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      Referred by Code
                    </p>
                    <code className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                      {lead.referredByCode}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Referrals Made */}
          {lead.referrals && lead.referrals.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Referrals Made ({lead.referrals.length})
              </h2>
              <div className="space-y-2">
                {lead.referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {referral.email}
                      </p>
                      {referral.name && (
                        <p className="text-xs text-slate-500">{referral.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={referral.status} size="sm" />
                      <span className="text-xs text-slate-500">
                        {formatRelativeTime(referral.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
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
              <TimelineItem
                label="Joined Waitlist"
                date={lead.createdAt}
                active
              />
              {lead.convertedAt && (
                <TimelineItem label="Converted" date={lead.convertedAt} active />
              )}
              {lead.status === 'waiting' && (
                <TimelineItem label="Pending Invite" pending />
              )}
              {lead.status === 'invited' && (
                <TimelineItem label="Awaiting Conversion" pending />
              )}
            </div>
          </div>

          {/* Founder Interest */}
          {lead.founderTier && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Founder Interest
              </h2>
              <div className="flex items-center justify-center py-4">
                <FounderBadge tier={lead.founderTier} size="lg" />
              </div>
              <p className="text-sm text-slate-500 text-center mt-2">
                Interested in{' '}
                <span className="font-medium">{lead.founderPlanName || lead.founderTier}</span>{' '}
                founder tier
              </p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Quick Stats
            </h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Referrals Made</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {lead.referralCount || 0}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Days Waiting</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {Math.floor(
                    (Date.now() - new Date(lead.createdAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Converted Tenant Link */}
          {lead.status === 'converted' && lead.tenant && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-green-900 mb-2">
                Converted!
              </h2>
              <p className="text-sm text-green-700 mb-4">
                This lead has been converted to tenant: {lead.tenant.name}
              </p>
              <Link
                to={`/tenants/${lead.tenant.id}`}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                View Tenant
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          )}
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
}: {
  label: string;
  date?: string;
  active?: boolean;
  pending?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'w-2 h-2 rounded-full mt-1.5',
          active && 'bg-green-500',
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
        {date && (
          <p className="text-xs text-slate-500">{formatDateTime(date)}</p>
        )}
      </div>
    </div>
  );
}
