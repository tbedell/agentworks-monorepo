import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Shield, Bell, Database, Globe, CreditCard, Wallet, Loader2 } from 'lucide-react';
import { settingsApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

function SettingSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-card">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-blue-100 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
        disabled={disabled}
      />
      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
    </label>
  );
}

export function Settings() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll,
  });

  const { data: plans } = useQuery({
    queryKey: ['settings', 'plans'],
    queryFn: settingsApi.getPlans,
  });

  const { data: paymentProviders } = useQuery({
    queryKey: ['settings', 'payment-providers'],
    queryFn: settingsApi.getPaymentProviders,
  });

  const { data: cryptoWallets } = useQuery({
    queryKey: ['settings', 'crypto-wallets'],
    queryFn: settingsApi.getCryptoWallets,
  });

  useEffect(() => {
    if (settings) {
      const vals: Record<string, string> = {};
      for (const [key, data] of Object.entries(settings)) {
        vals[key] = data.value;
      }
      setLocalSettings(vals);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: settingsApi.bulkUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setHasChanges(false);
      toast.success('Settings saved successfully');
    },
    onError: (err: Error) => {
      toast.error(`Failed to save settings: ${err.message}`);
    },
  });

  const updatePaymentProviderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { enabled?: boolean; testMode?: boolean } }) =>
      settingsApi.updatePaymentProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'payment-providers'] });
      toast.success('Payment provider updated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update payment provider: ${err.message}`);
    },
  });

  const updateCryptoWalletMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { walletAddress?: string; enabled?: boolean } }) =>
      settingsApi.updateCryptoWallet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'crypto-wallets'] });
      toast.success('Crypto wallet updated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update crypto wallet: ${err.message}`);
    },
  });

  const handleChange = (key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(localSettings);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500">Configure platform settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saveMutation.isPending}
          className="admin-btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </div>

      <SettingSection
        title="Security"
        description="Authentication and access control settings"
        icon={Shield}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-900">Enable New Sign-ups</p>
              <p className="text-xs text-slate-500">Allow new tenants to register</p>
            </div>
            <Toggle
              checked={localSettings.enableNewSignups === 'true'}
              onChange={(v) => handleChange('enableNewSignups', v ? 'true' : 'false')}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-900">Require Email Verification</p>
              <p className="text-xs text-slate-500">New users must verify their email</p>
            </div>
            <Toggle
              checked={localSettings.requireEmailVerification === 'true'}
              onChange={(v) => handleChange('requireEmailVerification', v ? 'true' : 'false')}
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Default Trial Period</p>
              <p className="text-xs text-slate-500">Days for new tenant trials</p>
            </div>
            <input
              type="number"
              value={localSettings.defaultTrialDays || '14'}
              onChange={(e) => handleChange('defaultTrialDays', e.target.value)}
              className="admin-input w-24 text-center"
              min="0"
              max="90"
            />
          </div>
        </div>
      </SettingSection>

      <SettingSection
        title="Usage Limits"
        description="Default resource limits for tenants"
        icon={Database}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-900">Max Tokens per Tenant</p>
              <p className="text-xs text-slate-500">Default monthly token limit</p>
            </div>
            <input
              type="number"
              value={localSettings.maxTokensPerTenant || '1000000'}
              onChange={(e) => handleChange('maxTokensPerTenant', e.target.value)}
              className="admin-input w-32 text-right"
              min="0"
              step="100000"
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-900">Enable Usage Alerts</p>
              <p className="text-xs text-slate-500">Alert when usage approaches limit</p>
            </div>
            <Toggle
              checked={localSettings.enableUsageAlerts === 'true'}
              onChange={(v) => handleChange('enableUsageAlerts', v ? 'true' : 'false')}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-900">Alert Threshold</p>
              <p className="text-xs text-slate-500">Percentage of limit to trigger alert</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localSettings.usageAlertThreshold || '80'}
                onChange={(e) => handleChange('usageAlertThreshold', e.target.value)}
                className="admin-input w-20 text-right"
                min="50"
                max="100"
              />
              <span className="text-slate-500">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Markup Multiplier</p>
              <p className="text-xs text-slate-500">Billing markup on provider costs</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localSettings.markupMultiplier || '2'}
                onChange={(e) => handleChange('markupMultiplier', e.target.value)}
                className="admin-input w-20 text-right"
                min="1"
                max="10"
                step="0.5"
              />
              <span className="text-slate-500">×</span>
            </div>
          </div>
        </div>
      </SettingSection>

      <SettingSection
        title="Plans"
        description="Subscription plans and pricing"
        icon={CreditCard}
      >
        <div className="space-y-4">
          {plans?.map((plan) => (
            <div key={plan.id} className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-900">{plan.name}</p>
                <p className="text-xs text-slate-500">
                  ${plan.monthlyPrice}/mo • {plan.tokenLimit?.toLocaleString() || 'Unlimited'} tokens
                </p>
              </div>
              <div className="text-xs text-slate-500">
                {plan.features.slice(0, 2).join(', ')}
                {plan.features.length > 2 && ` +${plan.features.length - 2} more`}
              </div>
            </div>
          ))}
          {!plans?.length && <p className="text-slate-500 text-sm">No plans configured</p>}
        </div>
      </SettingSection>

      <SettingSection
        title="Payment Providers"
        description="Configure payment gateways"
        icon={CreditCard}
      >
        <div className="space-y-4">
          {paymentProviders?.map((provider) => (
            <div key={provider.id} className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-900">{provider.displayName}</p>
                <p className="text-xs text-slate-500">
                  {provider.apiKeyConfigured ? 'Configured' : 'Not Configured'}
                  {provider.testMode && ' • Test Mode'}
                </p>
              </div>
              <Toggle
                checked={provider.enabled}
                onChange={(enabled) =>
                  updatePaymentProviderMutation.mutate({ id: provider.id, data: { enabled } })
                }
                disabled={!provider.apiKeyConfigured}
              />
            </div>
          ))}
          {!paymentProviders?.length && <p className="text-slate-500 text-sm">No payment providers configured</p>}
        </div>
      </SettingSection>

      <SettingSection
        title="Crypto Wallets"
        description="Cryptocurrency payment addresses"
        icon={Wallet}
      >
        <div className="space-y-4">
          {cryptoWallets?.map((wallet) => (
            <div key={wallet.id} className="py-3 border-b border-slate-200 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{wallet.displayName} ({wallet.currency})</p>
                </div>
                <Toggle
                  checked={wallet.enabled}
                  onChange={(enabled) =>
                    updateCryptoWalletMutation.mutate({ id: wallet.id, data: { enabled } })
                  }
                  disabled={!wallet.walletAddress}
                />
              </div>
              <input
                type="text"
                value={wallet.walletAddress}
                onChange={(e) =>
                  updateCryptoWalletMutation.mutate({ id: wallet.id, data: { walletAddress: e.target.value } })
                }
                placeholder={`Enter ${wallet.currency} wallet address`}
                className="admin-input text-sm"
              />
            </div>
          ))}
          {!cryptoWallets?.length && <p className="text-slate-500 text-sm">No crypto wallets configured</p>}
        </div>
      </SettingSection>

      <SettingSection
        title="Maintenance"
        description="Platform maintenance settings"
        icon={Globe}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-900">Maintenance Mode</p>
              <p className="text-xs text-slate-500">
                Disable tenant access during maintenance
              </p>
            </div>
            <Toggle
              checked={localSettings.maintenanceMode === 'true'}
              onChange={(v) => handleChange('maintenanceMode', v ? 'true' : 'false')}
            />
          </div>
          {localSettings.maintenanceMode === 'true' && (
            <div className="py-3">
              <label className="admin-label">Maintenance Message</label>
              <textarea
                value={localSettings.maintenanceMessage || ''}
                onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
                className="admin-input h-24 resize-none"
                placeholder="We're performing scheduled maintenance. We'll be back soon!"
              />
            </div>
          )}
        </div>
      </SettingSection>

      <SettingSection
        title="Notifications"
        description="Configure admin notifications"
        icon={Bell}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-900">Slack Notifications</p>
              <p className="text-xs text-slate-500">Send alerts to Slack channel</p>
            </div>
            <Toggle
              checked={localSettings.enableSlackNotifications === 'true'}
              onChange={(v) => handleChange('enableSlackNotifications', v ? 'true' : 'false')}
            />
          </div>
          {localSettings.enableSlackNotifications === 'true' && (
            <div className="py-3">
              <label className="admin-label">Slack Webhook URL</label>
              <input
                type="url"
                value={localSettings.slackWebhookUrl || ''}
                onChange={(e) => handleChange('slackWebhookUrl', e.target.value)}
                className="admin-input"
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
          )}
        </div>
      </SettingSection>
    </div>
  );
}
