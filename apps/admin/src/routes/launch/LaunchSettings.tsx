import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Calendar,
  Target,
  AlertTriangle,
  Save,
  RefreshCw,
  ChevronLeft,
  Bell,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface LaunchConfig {
  id: string;
  name: string;
  launchDate: string;
  countdownEnabled: boolean;
  doorsOpen: boolean;
  totalSpots: number;
  spotsSold: number;
  phase: string;
  settings: {
    fomoThresholds?: number[];
    autoCloseWhenSoldOut?: boolean;
    showCountdown?: boolean;
    showSpotsRemaining?: boolean;
    urgencyMessages?: Record<string, string>;
  } | null;
  founderPlans: {
    id: string;
    tier: string;
    name: string;
    price: number;
    totalSpots: number;
    remainingSpots: number;
  }[];
  computed: {
    totalSpots: number;
    remainingSpots: number;
    soldSpots: number;
    percentSold: number;
    timeToLaunch: number;
    isLive: boolean;
  };
}

interface MilestoneConfig {
  currentPercent: number;
  milestones: {
    threshold: number;
    reached: boolean;
    message: string;
    spotsAtThreshold: number;
  }[];
}

export default function LaunchSettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    launchDate: '',
    countdownEnabled: false,
    showCountdown: true,
    showSpotsRemaining: true,
    autoCloseWhenSoldOut: true,
  });
  const [milestoneMessages, setMilestoneMessages] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch launch config
  const { data: config, isLoading: configLoading } = useQuery<LaunchConfig>({
    queryKey: ['launch', 'config'],
    queryFn: () => api.get('/launch/config'),
  });

  // Initialize form data when config loads
  useEffect(() => {
    if (config && !initialized) {
      setFormData({
        launchDate: config.launchDate ? new Date(config.launchDate).toISOString().slice(0, 16) : '',
        countdownEnabled: config.countdownEnabled,
        showCountdown: config.settings?.showCountdown ?? true,
        showSpotsRemaining: config.settings?.showSpotsRemaining ?? true,
        autoCloseWhenSoldOut: config.settings?.autoCloseWhenSoldOut ?? true,
      });
      if (config.settings?.urgencyMessages) {
        setMilestoneMessages(config.settings.urgencyMessages);
      }
      setInitialized(true);
    }
  }, [config, initialized]);

  // Fetch milestones
  const { data: milestones } = useQuery<MilestoneConfig>({
    queryKey: ['launch', 'milestones'],
    queryFn: () => api.get('/launch/milestones'),
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: (updates: Partial<LaunchConfig>) =>
      api.put('/launch/config', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch'] });
      setHasChanges(false);
    },
  });

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateConfigMutation.mutate({
      launchDate: formData.launchDate,
      countdownEnabled: formData.countdownEnabled,
      settings: {
        showCountdown: formData.showCountdown,
        showSpotsRemaining: formData.showSpotsRemaining,
        autoCloseWhenSoldOut: formData.autoCloseWhenSoldOut,
        urgencyMessages: milestoneMessages,
        fomoThresholds: [25, 50, 75, 90, 95],
      },
    });
  };

  const handleMilestoneMessageChange = (threshold: string, message: string) => {
    setMilestoneMessages(prev => ({ ...prev, [threshold]: message }));
    setHasChanges(true);
  };

  const phaseColors: Record<string, string> = {
    pre_launch: 'bg-yellow-100 text-yellow-800',
    live: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-800',
  };

  if (configLoading) {
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
            <Settings className="w-7 h-7 text-slate-600" />
            Launch Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure your founding member launch
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/launch"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Launch
          </Link>
          <button
            onClick={handleSave}
            disabled={!hasChanges || updateConfigMutation.isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              hasChanges
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            <Save className="w-4 h-4" />
            {updateConfigMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-slate-500" />
          Current Status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-slate-500">Phase</p>
            <span className={cn(
              'inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium',
              phaseColors[config?.phase || 'pre_launch']
            )}>
              {config?.phase === 'live' ? 'LIVE' : config?.phase === 'closed' ? 'CLOSED' : 'PRE-LAUNCH'}
            </span>
          </div>
          <div>
            <p className="text-sm text-slate-500">Doors</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">
              {config?.doorsOpen ? 'Open' : 'Closed'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Spots Sold</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">
              {config?.computed?.soldSpots || 0} / {config?.computed?.totalSpots || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Progress</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">
              {config?.computed?.percentSold || 0}%
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Launch Date & Time */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-500" />
            Launch Date & Time
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Launch Date/Time
              </label>
              <input
                type="datetime-local"
                value={formData.launchDate}
                onChange={(e) => handleInputChange('launchDate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Set when the launch countdown will reach zero
              </p>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <div>
                <p className="font-medium text-slate-900">Enable Countdown</p>
                <p className="text-sm text-slate-500">Show countdown timer publicly</p>
              </div>
              <button
                onClick={() => handleInputChange('countdownEnabled', !formData.countdownEnabled)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  formData.countdownEnabled ? 'bg-blue-600' : 'bg-slate-200'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    formData.countdownEnabled ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-500" />
            Display Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-900">Show Countdown</p>
                <p className="text-sm text-slate-500">Display countdown on marketing page</p>
              </div>
              <button
                onClick={() => handleInputChange('showCountdown', !formData.showCountdown)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  formData.showCountdown ? 'bg-blue-600' : 'bg-slate-200'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    formData.showCountdown ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-900">Show Spots Remaining</p>
                <p className="text-sm text-slate-500">Display live counter of available spots</p>
              </div>
              <button
                onClick={() => handleInputChange('showSpotsRemaining', !formData.showSpotsRemaining)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  formData.showSpotsRemaining ? 'bg-blue-600' : 'bg-slate-200'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    formData.showSpotsRemaining ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">Auto-Close When Sold Out</p>
                <p className="text-sm text-slate-500">Automatically close doors when all spots are sold</p>
              </div>
              <button
                onClick={() => handleInputChange('autoCloseWhenSoldOut', !formData.autoCloseWhenSoldOut)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  formData.autoCloseWhenSoldOut ? 'bg-blue-600' : 'bg-slate-200'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    formData.autoCloseWhenSoldOut ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FOMO Milestones */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          FOMO Milestone Messages
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Customize the urgency messages shown when sales reach each milestone
        </p>
        <div className="space-y-4">
          {milestones?.milestones.map((milestone) => (
            <div
              key={milestone.threshold}
              className={cn(
                'flex items-start gap-4 p-4 rounded-lg border transition-colors',
                milestone.reached
                  ? 'bg-green-50 border-green-200'
                  : 'bg-slate-50 border-slate-200'
              )}
            >
              <div className="shrink-0">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg',
                  milestone.reached
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                )}>
                  {milestone.threshold}%
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-medium text-slate-900">
                    {milestone.threshold}% Sold
                  </p>
                  {milestone.reached && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                      Reached
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    ({milestone.spotsAtThreshold} spots)
                  </span>
                </div>
                <input
                  type="text"
                  value={milestoneMessages[milestone.threshold] || milestone.message}
                  onChange={(e) => handleMilestoneMessageChange(String(milestone.threshold), e.target.value)}
                  placeholder="Enter milestone message..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Founder Plans Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            Founder Plans
          </h3>
          <Link
            to="/founders"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage Plans →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {config?.founderPlans?.map((plan: { id: string; tier: string; name: string; price: number; totalSpots: number; remainingSpots: number }) => (
            <div
              key={plan.id}
              className="p-4 rounded-lg border border-slate-200 bg-slate-50"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-slate-900">{plan.name}</p>
                <p className="font-semibold text-slate-900">${plan.price}</p>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Remaining</span>
                <span>{plan.remainingSpots} / {plan.totalSpots}</span>
              </div>
              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{
                    width: `${((plan.totalSpots - plan.remainingSpots) / plan.totalSpots) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
