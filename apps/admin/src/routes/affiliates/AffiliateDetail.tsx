import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Link2 } from 'lucide-react';
import { affiliatesApi } from '@/lib/api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AffiliateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: affiliate, isLoading } = useQuery({
    queryKey: ['affiliates', id],
    queryFn: () => affiliatesApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-slate-500">Affiliate not found</p>
        <Link to="/affiliates" className="mt-4 text-blue-600 hover:underline">
          Back to Affiliates
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/affiliates')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{affiliate.email}</h1>
            <StatusBadge status={affiliate.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {affiliate.name || 'Affiliate'} · Joined {formatDate(affiliate.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-500 mb-2">Conversions</p>
              <p className="text-2xl font-bold text-slate-900">
                {affiliate.totalConversions || 0}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-500 mb-2">Total Earnings</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(affiliate.lifetimeEarnings || 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-500 mb-2">Conversion Rate</p>
              <p className="text-2xl font-bold text-slate-900">
                {affiliate.conversionRate || '0%'}
              </p>
            </div>
          </div>

          {/* Referral Link */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-slate-400" />
              Referral Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Affiliate Code
                </label>
                <code className="block px-3 py-2 bg-slate-100 rounded-lg font-mono text-sm">
                  {affiliate.code}
                </code>
              </div>
            </div>
          </div>

          {/* Conversions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Recent Conversions
            </h2>
            {affiliate.conversions && affiliate.conversions.length > 0 ? (
              <div className="space-y-2">
                {affiliate.conversions.slice(0, 5).map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {conv.leadEmail}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(conv.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">
                        +{formatCurrency(conv.commission)}
                      </p>
                      <StatusBadge status={conv.status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No conversions yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Commission Tier */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Commission Tier
            </h2>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-lg font-bold capitalize">{affiliate.tier}</p>
              <p className="text-sm mt-1">
                {affiliate.commissionRate}% commission rate
              </p>
            </div>
          </div>

          {/* Balance */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Balance</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Pending</span>
                <span className="text-sm font-medium text-amber-600">
                  {formatCurrency(affiliate.pendingEarnings || 0)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-700">Total Paid</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(affiliate.paidEarnings || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
