import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Rocket,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Target,
  Zap,
  Trophy,
  Settings,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface LaunchStats {
  isLive: boolean;
  phase: string;
  launchDate: string;
  timeToLaunch: number;
  spots: {
    total: number;
    remaining: number;
    sold: number;
    percentSold: number;
  };
  revenue: {
    total: number;
    formatted: string;
  };
  byTier: {
    tier: string;
    name: string;
    sold: number;
    remaining: number;
    total: number;
    revenue: number;
  }[];
  velocity: {
    salesPerHour: string;
    last24hPurchases: number;
  };
  fomo: {
    currentMilestone: number;
    nextMilestone: number;
    message: string | null;
  };
  waitlist: {
    total: number;
  };
  recentPurchases: {
    id: string;
    tier: string;
    planName: string;
    amount: number;
    affiliate: string;
    affiliateCode: string;
    createdAt: string;
  }[];
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Launch time!';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export default function LaunchDashboard() {
  const queryClient = useQueryClient();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Fetch launch stats
  const { data: stats, isLoading, refetch } = useQuery<LaunchStats>({
    queryKey: ['launch', 'stats'],
    queryFn: () => api.get('/admin/launch/stats'),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch launch config (kept for future use)
  useQuery({
    queryKey: ['launch', 'config'],
    queryFn: () => api.get('/admin/launch/config'),
  });

  // Open doors mutation
  const openDoorsMutation = useMutation({
    mutationFn: () => api.post('/admin/launch/open-doors'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch'] });
    },
  });

  // Close doors mutation
  const closeDoorsMutation = useMutation({
    mutationFn: () => api.post('/admin/launch/close-doors'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch'] });
    },
  });

  // Countdown timer
  useEffect(() => {
    if (stats?.timeToLaunch) {
      setTimeRemaining(stats.timeToLaunch);

      const interval = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [stats?.timeToLaunch]);

  const tierColors: Record<string, string> = {
    diamond: 'from-cyan-500 to-blue-600',
    gold: 'from-amber-500 to-yellow-600',
    silver: 'from-slate-400 to-slate-500',
  };

  const phaseColors: Record<string, string> = {
    pre_launch: 'bg-yellow-100 text-yellow-800',
    live: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-800',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Live Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Rocket className="w-7 h-7 text-blue-600" />
              Launch Control
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Founding Member Launch Dashboard
            </p>
          </div>
          <span className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            phaseColors[stats?.phase || 'pre_launch']
          )}>
            {stats?.phase === 'live' ? '🔴 LIVE' : stats?.phase === 'closed' ? 'CLOSED' : 'PRE-LAUNCH'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <Link
            to="/launch/settings"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          {stats?.phase === 'pre_launch' ? (
            <button
              onClick={() => openDoorsMutation.mutate()}
              disabled={openDoorsMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Open Doors
            </button>
          ) : stats?.phase === 'live' ? (
            <button
              onClick={() => closeDoorsMutation.mutate()}
              disabled={closeDoorsMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              <Square className="w-4 h-4" />
              Close Doors
            </button>
          ) : null}
        </div>
      </div>

      {/* Countdown Timer (when not live) */}
      {stats?.phase === 'pre_launch' && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Time Until Launch</p>
              <p className="text-4xl font-bold mt-2 font-mono">
                {formatTimeRemaining(timeRemaining)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm">Launch Date</p>
              <p className="text-xl font-semibold mt-2">
                {stats?.launchDate ? new Date(stats.launchDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }) : 'Not set'}
              </p>
            </div>
            <Clock className="w-16 h-16 text-white/30" />
          </div>
        </div>
      )}

      {/* Live Banner */}
      {stats?.phase === 'live' && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full bg-white animate-ping" />
              <div>
                <p className="text-green-100 text-sm">Launch Status</p>
                <p className="text-3xl font-bold mt-1">DOORS ARE OPEN!</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-green-100 text-sm">Sales Velocity</p>
              <p className="text-2xl font-bold mt-1">
                {stats?.velocity?.salesPerHour || '0'}/hour
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FOMO Alert */}
      {stats?.fomo?.message && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
          <div>
            <p className="font-medium text-orange-800">{stats.fomo.message}</p>
            <p className="text-sm text-orange-600">
              {stats.fomo.nextMilestone ? `Next milestone: ${stats.fomo.nextMilestone}%` : 'Final milestone reached!'}
            </p>
          </div>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Spots Sold */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Spots Sold</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.spots?.sold || 0} / {stats?.spots?.total || 1000}
              </p>
              <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all"
                  style={{ width: `${stats?.spots?.percentSold || 0}%` }}
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Target className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.revenue?.formatted || '$0'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Lifetime founder sales
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-green-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Waitlist Size */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Waitlist Size</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.waitlist?.total?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Potential customers
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 24h Purchases */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Last 24 Hours</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.velocity?.last24hPurchases || 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                purchases
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tier Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Tier Breakdown
          </h3>
          <div className="space-y-4">
            {stats?.byTier?.map((tier) => (
              <div key={tier.tier} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold',
                      tierColors[tier.tier] || 'from-slate-400 to-slate-500'
                    )}>
                      {tier.tier.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{tier.name}</p>
                      <p className="text-xs text-slate-500">
                        {tier.sold} sold / {tier.remaining} remaining
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-slate-900">
                    ${tier.revenue.toLocaleString()}
                  </p>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full bg-gradient-to-r transition-all',
                      tierColors[tier.tier] || 'from-slate-400 to-slate-500'
                    )}
                    style={{ width: `${tier.total > 0 ? (tier.sold / tier.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Recent Purchases
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats?.recentPurchases?.length ? (
              stats.recentPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-6 h-6 rounded bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold',
                      tierColors[purchase.tier] || 'from-slate-400 to-slate-500'
                    )}>
                      {purchase.tier?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {purchase.planName}
                      </p>
                      {purchase.affiliate && (
                        <p className="text-xs text-slate-500">
                          via {purchase.affiliate}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      ${purchase.amount}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(purchase.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                No recent purchases
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/waitlist"
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Manage Waitlist
        </Link>
        <Link
          to="/founders"
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          View Founders
        </Link>
        <Link
          to="/launch/rotator"
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Rotator Queue
        </Link>
        <Link
          to="/affiliates"
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Affiliates
        </Link>
      </div>
    </div>
  );
}
