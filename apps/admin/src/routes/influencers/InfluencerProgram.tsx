import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Search,
  ExternalLink,
  MoreVertical,
  Youtube,
  Twitter,
  Linkedin,
  Globe,
  Copy,
  CheckCircle,
  XCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';

// Types
interface Influencer {
  id: string;
  name: string;
  email: string;
  platform: string;
  handle?: string;
  accessCode: string;
  followers?: number;
  isActive: boolean;
  expiresAt?: string;
  notes?: string;
  contentLinks?: Array<{
    url: string;
    type?: string;
    title?: string;
    notes?: string;
    addedAt: string;
  }>;
  affiliate?: {
    id: string;
    name: string;
    code: string;
    status: string;
    conversions?: Array<{
      id: string;
      amount: number;
      commission: number;
      status: string;
    }>;
    rotatorEntry?: {
      isActive: boolean;
      rotatorPosition: number;
    };
  } | null;
  stats: {
    totalConversions: number;
    confirmedConversions: number;
    totalRevenue: number;
    totalCommission: number;
  };
  createdAt: string;
}

interface InfluencerStats {
  total: number;
  active: number;
  inactive: number;
  byPlatform: Array<{ platform: string; count: number }>;
  totalRevenue: number;
  totalCommission: number;
  totalConversions: number;
}

interface Platform {
  value: string;
  label: string;
}

// Platform icon mapping
const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'youtube':
      return <Youtube className="w-4 h-4" />;
    case 'twitter':
      return <Twitter className="w-4 h-4" />;
    case 'linkedin':
      return <Linkedin className="w-4 h-4" />;
    default:
      return <Globe className="w-4 h-4" />;
  }
};

export default function InfluencerProgram() {
  const toast = useToast();
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);
  const [showContentModal, setShowContentModal] = useState<string | null>(null);

  // Queries
  const { data: statsData } = useQuery({
    queryKey: ['influencer-stats'],
    queryFn: () => api.get<InfluencerStats>('/influencers/summary/stats'),
  });

  const { data: platformsData } = useQuery({
    queryKey: ['influencer-platforms'],
    queryFn: () => api.get<{ platforms: Platform[] }>('/influencers/meta/platforms'),
  });

  const { data: influencersData, isLoading } = useQuery({
    queryKey: ['influencers', search, platformFilter, activeFilter],
    queryFn: () =>
      api.get<{ influencers: Influencer[]; total: number }>('/influencers', {
        search: search || undefined,
        platform: platformFilter || undefined,
        active: activeFilter || undefined,
      }),
  });

  const stats = statsData;
  const platforms = platformsData?.platforms || [];
  const influencers = influencersData?.influencers || [];

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Influencer Program</h1>
          <p className="text-slate-500 mt-1">
            Manage influencer access, track content, and monitor conversions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Influencer
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Influencers</p>
                <p className="text-xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-green-600">{stats.active} active</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">{stats.inactive} inactive</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Conversions</p>
                <p className="text-xl font-bold text-slate-900">{stats.totalConversions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Revenue</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Commissions Paid</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.totalCommission)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Platform Breakdown */}
      {stats && stats.byPlatform.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">By Platform</h3>
          <div className="flex flex-wrap gap-2">
            {stats.byPlatform.map((p) => (
              <div
                key={p.platform}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100"
              >
                <PlatformIcon platform={p.platform} />
                <span className="text-sm font-medium text-slate-700 capitalize">
                  {p.platform.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded">
                  {p.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or handle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Platforms</option>
            {platforms.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Influencers Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Influencer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Platform
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Access Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Conversions
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Loading influencers...
                </td>
              </tr>
            ) : influencers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No influencers found
                </td>
              </tr>
            ) : (
              influencers.map((influencer) => (
                <tr key={influencer.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{influencer.name}</p>
                      <p className="text-sm text-slate-500">{influencer.email}</p>
                      {influencer.handle && (
                        <p className="text-xs text-slate-400">@{influencer.handle}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={influencer.platform} />
                      <span className="capitalize">{influencer.platform.replace('_', ' ')}</span>
                    </div>
                    {influencer.followers && (
                      <p className="text-xs text-slate-400">
                        {influencer.followers.toLocaleString()} followers
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono">
                        {influencer.accessCode}
                      </code>
                      <button
                        onClick={() => copyToClipboard(influencer.accessCode, 'Access code')}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {influencer.affiliate && (
                      <p className="text-xs text-slate-400 mt-1">
                        Affiliate: {influencer.affiliate.code}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{influencer.stats.confirmedConversions}</p>
                    {influencer.stats.totalConversions > influencer.stats.confirmedConversions && (
                      <p className="text-xs text-slate-400">
                        +{influencer.stats.totalConversions - influencer.stats.confirmedConversions} pending
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {formatCurrency(influencer.stats.totalRevenue)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatCurrency(influencer.stats.totalCommission)} commission
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {influencer.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-full">
                        <XCircle className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                    {influencer.expiresAt && (
                      <p className="text-xs text-slate-400 mt-1">
                        Expires {formatDate(influencer.expiresAt)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowContentModal(influencer.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Manage content"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowDetailModal(influencer.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateInfluencerModal
          platforms={platforms}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['influencers'] });
            queryClient.invalidateQueries({ queryKey: ['influencer-stats'] });
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Detail/Edit Modal */}
      {showDetailModal && (
        <InfluencerDetailModal
          influencerId={showDetailModal}
          platforms={platforms}
          onClose={() => setShowDetailModal(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['influencers'] });
            queryClient.invalidateQueries({ queryKey: ['influencer-stats'] });
          }}
        />
      )}

      {/* Content Modal */}
      {showContentModal && (
        <ContentLinksModal
          influencerId={showContentModal}
          onClose={() => setShowContentModal(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['influencers'] });
          }}
        />
      )}
    </div>
  );
}

// Create Influencer Modal
function CreateInfluencerModal({
  platforms,
  onClose,
  onSuccess,
}: {
  platforms: Platform[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    platform: 'youtube',
    handle: '',
    followers: '',
    notes: '',
    createAffiliate: true,
    affiliateTier: 'founding',
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.post<Influencer>('/influencers', {
        ...data,
        followers: data.followers ? parseInt(data.followers, 10) : undefined,
      }),
    onSuccess: () => {
      toast.success('Influencer created successfully');
      onSuccess();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create influencer');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Add Influencer</h2>
          <p className="text-sm text-slate-500 mt-1">
            Create a new influencer with platform access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="john@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Platform</label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {platforms.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Handle</label>
              <input
                type="text"
                value={formData.handle}
                onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="@username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Followers</label>
            <input
              type="number"
              value={formData.followers}
              onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="10000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes about this influencer..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createAffiliate"
              checked={formData.createAffiliate}
              onChange={(e) => setFormData({ ...formData, createAffiliate: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="createAffiliate" className="text-sm text-slate-700">
              Create affiliate account for commission tracking
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Influencer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Influencer Detail Modal
function InfluencerDetailModal({
  influencerId,
  // platforms is kept for future use if needed
  platforms: _platforms,
  onClose,
  onUpdate,
}: {
  influencerId: string;
  platforms: Platform[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  void _platforms; // suppress unused warning
  const toast = useToast();

  const { data: influencer, isLoading } = useQuery({
    queryKey: ['influencer', influencerId],
    queryFn: () => api.get<Influencer>(`/influencers/${influencerId}`),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Influencer>) => api.put<Influencer>(`/influencers/${influencerId}`, data),
    onSuccess: () => {
      toast.success('Influencer updated');
      onUpdate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update');
    },
  });

  const regenerateCodeMutation = useMutation({
    mutationFn: () => api.post<Influencer>(`/influencers/${influencerId}/regenerate-code`),
    onSuccess: () => {
      toast.success('Access code regenerated');
      onUpdate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate code');
    },
  });

  const addToRotatorMutation = useMutation({
    mutationFn: () => api.post<{ message: string }>(`/influencers/${influencerId}/add-to-rotator`),
    onSuccess: (data) => {
      toast.success(data.message);
      onUpdate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add to rotator');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete<{ message: string }>(`/influencers/${influencerId}`),
    onSuccess: () => {
      toast.success('Influencer deleted');
      onUpdate();
      onClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    },
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!influencer) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{influencer.name}</h2>
          <p className="text-sm text-slate-500">{influencer.email}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Access Code */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Access Code</p>
                <code className="text-lg font-mono">{influencer.accessCode}</code>
              </div>
              <button
                onClick={() => regenerateCodeMutation.mutate()}
                disabled={regenerateCodeMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
            </div>
          </div>

          {/* Affiliate Link */}
          {influencer.affiliate && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-700">Affiliate Account</p>
              <p className="text-sm text-green-600">Code: {influencer.affiliate.code}</p>
              {!influencer.affiliate.rotatorEntry?.isActive && (
                <button
                  onClick={() => addToRotatorMutation.mutate()}
                  disabled={addToRotatorMutation.isPending}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Add to rotator queue
                </button>
              )}
              {influencer.affiliate.rotatorEntry?.isActive && (
                <p className="mt-2 text-xs text-green-500">
                  In rotator (position {influencer.affiliate.rotatorEntry.rotatorPosition})
                </p>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-slate-900">{influencer.stats.confirmedConversions}</p>
              <p className="text-xs text-slate-500">Conversions</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(influencer.stats.totalRevenue)}</p>
              <p className="text-xs text-slate-500">Revenue</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => updateMutation.mutate({ isActive: !influencer.isActive })}
              disabled={updateMutation.isPending}
              className={`w-full px-4 py-2 rounded-lg transition-colors ${
                influencer.isActive
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {influencer.isActive ? 'Deactivate' : 'Activate'}
            </button>

            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this influencer?')) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="w-full px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
            >
              Delete Influencer
            </button>
          </div>

          {/* Notes */}
          {influencer.notes && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Notes</p>
              <p className="text-sm text-slate-600">{influencer.notes}</p>
            </div>
          )}

          {/* Dates */}
          <div className="text-xs text-slate-400 pt-4 border-t">
            <p>Created: {formatDate(influencer.createdAt)}</p>
            {influencer.expiresAt && <p>Expires: {formatDate(influencer.expiresAt)}</p>}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Content Links Modal
function ContentLinksModal({
  influencerId,
  onClose,
  onUpdate,
}: {
  influencerId: string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const toast = useToast();
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState('video');
  const [newTitle, setNewTitle] = useState('');

  const { data: influencer, isLoading, refetch } = useQuery({
    queryKey: ['influencer', influencerId],
    queryFn: () => api.get<Influencer>(`/influencers/${influencerId}`),
  });

  const addContentMutation = useMutation({
    mutationFn: (data: { url: string; type: string; title: string }) =>
      api.post(`/influencers/${influencerId}/content`, data),
    onSuccess: () => {
      toast.success('Content link added');
      setNewUrl('');
      setNewTitle('');
      refetch();
      onUpdate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add content');
    },
  });

  const removeContentMutation = useMutation({
    mutationFn: (index: number) => api.delete(`/influencers/${influencerId}/content/${index}`),
    onSuccess: () => {
      toast.success('Content link removed');
      refetch();
      onUpdate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to remove content');
    },
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!influencer) return null;

  const contentLinks = influencer.contentLinks || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Content Links</h2>
          <p className="text-sm text-slate-500">Track content created by {influencer.name}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Add New Link */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
            <p className="text-sm font-medium text-slate-700">Add Content Link</p>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="video">Video</option>
                <option value="tweet">Tweet</option>
                <option value="post">Post</option>
                <option value="article">Article</option>
                <option value="podcast">Podcast</option>
              </select>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title (optional)"
                className="px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <button
              onClick={() => addContentMutation.mutate({ url: newUrl, type: newType, title: newTitle })}
              disabled={!newUrl || addContentMutation.isPending}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {addContentMutation.isPending ? 'Adding...' : 'Add Link'}
            </button>
          </div>

          {/* Existing Links */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Tracked Content ({contentLinks.length})
            </p>
            {contentLinks.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No content tracked yet</p>
            ) : (
              contentLinks.map((link, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {link.title || link.url}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-slate-100 rounded capitalize">
                        {link.type}
                      </span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate"
                      >
                        {link.url}
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => removeContentMutation.mutate(index)}
                    disabled={removeContentMutation.isPending}
                    className="ml-2 p-1 text-slate-400 hover:text-red-600"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
