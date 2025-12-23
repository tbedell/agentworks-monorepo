import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  Users,
  ArrowUp,
  ArrowDown,
  Pause,
  Play,
  Clock,
  Award,
  Shuffle,
  CheckCircle,
  ArrowUpDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';

interface RotatorEntry {
  id: string;
  affiliateId: string;
  affiliate: {
    id: string;
    name: string;
    email: string;
    code: string;
    tier: string;
  };
  rotatorPosition: number;
  lastAssigned: string | null;
  totalAssigned: number;
  isActive: boolean;
}

interface RotatorStats {
  totalInRotator: number;
  activeInRotator: number;
  totalAssignments: number;
  recentAssignments: {
    affiliateId: string;
    affiliateName: string;
    leadId: string;
    assignedAt: string;
  }[];
}

interface AssignmentHistory {
  leadId: string;
  affiliateId: string;
  affiliateName: string;
  rotatorPosition: number;
  assignedAt: string;
}

export default function RotatorDashboard() {
  const queryClient = useQueryClient();

  // Fetch rotator queue
  const { data: queue, isLoading: queueLoading } = useQuery<RotatorEntry[]>({
    queryKey: ['rotator', 'queue'],
    queryFn: () => api.get('/rotator'),
  });

  // Fetch rotator stats
  const { data: stats } = useQuery<RotatorStats>({
    queryKey: ['rotator', 'stats'],
    queryFn: () => api.get('/rotator/stats'),
  });

  // Fetch assignment history (kept for future use)
  useQuery<AssignmentHistory[]>({
    queryKey: ['rotator', 'history'],
    queryFn: () => api.get('/rotator/history'),
  });

  // Toggle active status
  const toggleMutation = useMutation({
    mutationFn: ({ affiliateId, isActive }: { affiliateId: string; isActive: boolean }) =>
      api.post(`/rotator/${affiliateId}/toggle`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotator'] });
    },
  });

  // Reorder rotator
  const reorderMutation = useMutation({
    mutationFn: (affiliateIds: string[]) =>
      api.post('/rotator/reorder', { affiliateIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotator'] });
    },
  });

  // Move position up or down
  const movePosition = (affiliateId: string, direction: 'up' | 'down') => {
    if (!queue) return;

    const currentIndex = queue.findIndex(e => e.affiliateId === affiliateId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= queue.length) return;

    const newOrder = [...queue];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    reorderMutation.mutate(newOrder.map(e => e.affiliateId));
  };

  const tierColors: Record<string, string> = {
    diamond: 'bg-cyan-100 text-cyan-800',
    gold: 'bg-amber-100 text-amber-800',
    silver: 'bg-slate-100 text-slate-800',
    standard: 'bg-gray-100 text-gray-800',
  };

  if (queueLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Shuffle className="w-7 h-7 text-purple-600" />
            Organic Lead Rotator
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automatically assign organic signups to founding members
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/launch"
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Launch
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">In Rotator</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.totalInRotator || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.activeInRotator || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-green-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Assignments</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.totalAssignments || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Paused</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {(stats?.totalInRotator || 0) - (stats?.activeInRotator || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-50 text-yellow-600">
              <Pause className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rotator Queue */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-slate-500" />
              Rotation Queue
            </h3>
            <p className="text-sm text-slate-500">
              Drag to reorder or use arrows
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {queue?.length ? (
              queue.map((entry, index) => (
                <div
                  key={entry.id}
                  className={cn(
                    'p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors',
                    !entry.isActive && 'opacity-60 bg-slate-50'
                  )}
                >
                  {/* Position */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => movePosition(entry.affiliateId, 'up')}
                      disabled={index === 0 || reorderMutation.isPending}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-bold text-slate-400 w-6 text-center">
                      {entry.rotatorPosition}
                    </span>
                    <button
                      onClick={() => movePosition(entry.affiliateId, 'down')}
                      disabled={index === queue.length - 1 || reorderMutation.isPending}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Affiliate Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/affiliates/${entry.affiliateId}`}
                        className="font-medium text-slate-900 hover:text-blue-600"
                      >
                        {entry.affiliate.name}
                      </Link>
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        tierColors[entry.affiliate.tier] || tierColors.standard
                      )}>
                        {entry.affiliate.tier}
                      </span>
                      {!entry.isActive && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {entry.affiliate.email} &bull; Code: {entry.affiliate.code}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {entry.totalAssigned} leads
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.lastAssigned
                        ? `Last: ${formatRelativeTime(entry.lastAssigned)}`
                        : 'Never assigned'}
                    </p>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleMutation.mutate({
                      affiliateId: entry.affiliateId,
                      isActive: !entry.isActive,
                    })}
                    disabled={toggleMutation.isPending}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      entry.isActive
                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    )}
                  >
                    {entry.isActive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No founding members in rotator</p>
                <p className="text-sm mt-1">
                  Founding members are automatically added when they purchase
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Assignments */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Recent Assignments
            </h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {stats?.recentAssignments?.length ? (
              stats.recentAssignments.map((assignment, index) => (
                <div key={`${assignment.leadId}-${index}`} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">
                      {assignment.affiliateName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatRelativeTime(assignment.assignedAt)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Lead: {assignment.leadId.slice(0, 8)}...
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No assignments yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">How the Rotator Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
              1
            </div>
            <div>
              <p className="font-medium text-slate-900">Organic Traffic</p>
              <p className="text-sm text-slate-600">
                Visitors who sign up without an affiliate code
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
              2
            </div>
            <div>
              <p className="font-medium text-slate-900">Round-Robin Assignment</p>
              <p className="text-sm text-slate-600">
                Next active founder in queue gets the lead
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
              3
            </div>
            <div>
              <p className="font-medium text-slate-900">Fair Distribution</p>
              <p className="text-sm text-slate-600">
                Prioritizes founders with fewer recent assignments
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
