import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { providersApi, type Provider } from '@/lib/api';

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'] },
  { value: 'google', label: 'Google AI', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  { value: 'elevenlabs', label: 'ElevenLabs', models: ['eleven_multilingual_v2'] },
  { value: 'fal', label: 'fal.ai', models: ['fal-ai/flux-pro'] },
  { value: 'stability', label: 'Stability AI', models: ['stable-diffusion-xl-1024-v1-0'] },
];

export function ProviderForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    provider: '',
    displayName: '',
    apiKey: '',
    enabled: true,
    rateLimitPerMinute: '',
    monthlyBudget: '',
  });
  const [error, setError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider', id],
    queryFn: () => providersApi.get(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (provider) {
      setFormData({
        provider: provider.provider,
        displayName: provider.displayName,
        apiKey: '',
        enabled: provider.enabled,
        rateLimitPerMinute: provider.rateLimit?.toString() || '',
        monthlyBudget: provider.monthlyBudget?.toString() || '',
      });
    }
  }, [provider]);

  const createMutation = useMutation({
    mutationFn: (data: { provider: string; displayName: string; apiKey: string }) =>
      providersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      navigate('/providers');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create provider'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Provider>) => providersApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['provider', id] });
      navigate('/providers');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update provider'),
  });

  const rotateKeyMutation = useMutation({
    mutationFn: (apiKey: string) => providersApi.updateKey(id!, apiKey),
    onSuccess: () => {
      setFormData((prev) => ({ ...prev, apiKey: '' }));
      queryClient.invalidateQueries({ queryKey: ['provider', id] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to rotate key'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.provider) {
      setError('Provider is required');
      return;
    }
    if (!formData.displayName.trim()) {
      setError('Display name is required');
      return;
    }
    if (!isEditing && !formData.apiKey.trim()) {
      setError('API key is required');
      return;
    }

    if (isEditing) {
      updateMutation.mutate({
        displayName: formData.displayName,
        enabled: formData.enabled,
        rateLimit: formData.rateLimitPerMinute
          ? parseInt(formData.rateLimitPerMinute, 10)
          : undefined,
        monthlyBudget: formData.monthlyBudget
          ? parseFloat(formData.monthlyBudget)
          : undefined,
      });
    } else {
      createMutation.mutate({
        provider: formData.provider,
        displayName: formData.displayName,
        apiKey: formData.apiKey,
      });
    }
  };

  const handleRotateKey = () => {
    if (!formData.apiKey.trim()) {
      setError('Enter new API key to rotate');
      return;
    }
    if (confirm('Rotate API key? The old key will stop working immediately.')) {
      rotateKeyMutation.mutate(formData.apiKey);
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="p-6">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  const selectedProvider = PROVIDER_OPTIONS.find((p) => p.value === formData.provider);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/providers"
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditing ? 'Edit Provider' : 'Add Provider'}
          </h1>
          <p className="text-slate-400">
            {isEditing ? 'Update provider configuration' : 'Configure a new AI provider'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="admin-card max-w-2xl space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label htmlFor="provider" className="admin-label">
            Provider
          </label>
          <select
            id="provider"
            value={formData.provider}
            onChange={(e) => {
              const provider = e.target.value;
              const option = PROVIDER_OPTIONS.find((p) => p.value === provider);
              setFormData((prev) => ({
                ...prev,
                provider,
                displayName: option?.label || prev.displayName,
              }));
            }}
            className="admin-input"
            disabled={isEditing}
            required
          >
            <option value="">Select a provider</option>
            {PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {selectedProvider && (
            <p className="text-xs text-slate-500 mt-1">
              Available models: {selectedProvider.models.join(', ')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="displayName" className="admin-label">
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
            className="admin-input"
            placeholder="OpenAI Production"
            required
          />
        </div>

        <div>
          <label htmlFor="apiKey" className="admin-label">
            API Key {isEditing && '(leave empty to keep current)'}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => setFormData((prev) => ({ ...prev, apiKey: e.target.value }))}
                className="admin-input pr-10"
                placeholder={isEditing ? '••••••••••••••••' : 'sk-...'}
                required={!isEditing}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={handleRotateKey}
                disabled={rotateKeyMutation.isPending}
                className="admin-btn-secondary flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${rotateKeyMutation.isPending ? 'animate-spin' : ''}`} />
                Rotate
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Keys are encrypted and stored securely in GCP Secret Manager.
          </p>
        </div>

        {isEditing && (
          <div className="flex items-center gap-3">
            <input
              id="enabled"
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
            />
            <label htmlFor="enabled" className="text-sm text-slate-300">
              Provider enabled
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="rateLimitPerMinute" className="admin-label">
              Rate Limit (per minute)
            </label>
            <input
              id="rateLimitPerMinute"
              type="number"
              value={formData.rateLimitPerMinute}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, rateLimitPerMinute: e.target.value }))
              }
              className="admin-input"
              placeholder="60"
              min="1"
            />
          </div>
          <div>
            <label htmlFor="monthlyBudget" className="admin-label">
              Monthly Budget ($)
            </label>
            <input
              id="monthlyBudget"
              type="number"
              value={formData.monthlyBudget}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, monthlyBudget: e.target.value }))
              }
              className="admin-input"
              placeholder="1000"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="admin-btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : isEditing
              ? 'Save Changes'
              : 'Add Provider'}
          </button>
          <Link to="/providers" className="admin-btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
