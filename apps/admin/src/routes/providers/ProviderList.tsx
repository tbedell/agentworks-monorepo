import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Key,
  Cpu,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { providersApi, type Provider } from '@/lib/api';
import { PROVIDER_MODELS, PROVIDERS } from '@agentworks/shared';

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  nanobanana: 'Nano Banana',
};

function formatContext(tokens: number): string {
  if (tokens === 0) return '-';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  return `${(tokens / 1000).toFixed(0)}K`;
}

function formatPrice(price: number): string {
  if (price === 0) return '-';
  if (price < 0.1) return `$${price.toFixed(4)}`;
  if (price < 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(2)}`;
}

function LLMModelsTable() {
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set(PROVIDERS));

  const toggleProvider = (provider: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  };

  return (
    <div className="admin-card overflow-hidden p-0">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">LLM Models & Pricing</h2>
        </div>
        <p className="text-sm text-slate-400 mt-1">Cost per 1M tokens across all providers</p>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th className="w-[280px]">Model</th>
            <th className="text-right">Input / 1M</th>
            <th className="text-right">Output / 1M</th>
            <th className="text-right">Context</th>
          </tr>
        </thead>
        <tbody>
          {PROVIDERS.filter(p => p !== 'nanobanana').map((provider) => {
            const models = PROVIDER_MODELS[provider] || [];
            const isExpanded = expandedProviders.has(provider);

            return (
              <>
                <tr
                  key={provider}
                  className="cursor-pointer hover:bg-slate-700/50"
                  onClick={() => toggleProvider(provider)}
                >
                  <td colSpan={4}>
                    <div className="flex items-center gap-2 font-medium text-white">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      {PROVIDER_DISPLAY_NAMES[provider] || provider}
                      <span className="text-xs text-slate-500 font-normal">
                        ({models.length} models)
                      </span>
                    </div>
                  </td>
                </tr>
                {isExpanded &&
                  models.map((model) => (
                    <tr key={model.id}>
                      <td className="pl-10">
                        <div className="text-white">{model.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{model.id}</div>
                      </td>
                      <td className="text-right text-slate-300">
                        {formatPrice(model.inputPer1M)}
                      </td>
                      <td className="text-right text-slate-300">
                        {formatPrice(model.outputPer1M)}
                      </td>
                      <td className="text-right text-slate-300">
                        {formatContext(model.contextWindow)}
                      </td>
                    </tr>
                  ))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusIndicator({ provider }: { provider: Provider }) {
  if (!provider.apiKeyConfigured) {
    return (
      <span className="flex items-center gap-1 text-amber-500 text-sm">
        <AlertTriangle className="w-4 h-4" />
        Not Configured
      </span>
    );
  }
  if (!provider.enabled) {
    return (
      <span className="flex items-center gap-1 text-slate-400 text-sm">
        <XCircle className="w-4 h-4" />
        Disabled
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-green-500 text-sm">
      <CheckCircle className="w-4 h-4" />
      Healthy
    </span>
  );
}

function ProviderActions({
  provider,
  onDelete,
  onTest,
}: {
  provider: Provider;
  onDelete: () => void;
  onTest: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-slate-700 rounded"
      >
        <MoreVertical className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg py-1">
            <Link
              to={`/providers/${provider.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={() => {
                onTest();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
              Test Connection
            </button>
            <button
              onClick={() => {
                onDelete();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function ProviderList() {
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: providersApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });

  const testMutation = useMutation({
    mutationFn: providersApi.testConnection,
    onSuccess: (result, id) => setTestResult({ id, ...result }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Providers</h1>
          <p className="text-slate-400">Manage LLM providers and API keys</p>
        </div>
        <Link to="/providers/new" className="admin-btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Provider
        </Link>
      </div>

      {testResult && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            testResult.success
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {testResult.success ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {testResult.message}
          <button
            onClick={() => setTestResult(null)}
            className="ml-auto text-sm hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="admin-card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : !providers?.length ? (
          <div className="p-8 text-center">
            <Key className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No providers configured</p>
            <Link
              to="/providers/new"
              className="inline-block mt-4 text-blue-400 hover:text-blue-300"
            >
              Add your first provider
            </Link>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Status</th>
                <th>Rate Limit</th>
                <th>Monthly Budget</th>
                <th>Current Spend</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.id}>
                  <td>
                    <div className="font-medium text-white">{provider.displayName}</div>
                    <p className="text-xs text-slate-500">{provider.provider}</p>
                  </td>
                  <td>
                    <StatusIndicator provider={provider} />
                  </td>
                  <td className="text-slate-300">
                    {provider.rateLimit
                      ? `${provider.rateLimit}/min`
                      : 'No limit'}
                  </td>
                  <td className="text-slate-300">
                    {provider.monthlyBudget
                      ? `$${provider.monthlyBudget.toLocaleString()}`
                      : 'No limit'}
                  </td>
                  <td>
                    <span className="text-white font-medium">
                      ${provider.currentMonthSpend.toFixed(2)}
                    </span>
                    {provider.monthlyBudget && (
                      <span className="text-slate-400">
                        {' / $'}
                        {provider.monthlyBudget.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td>
                    <ProviderActions
                      provider={provider}
                      onDelete={() => {
                        if (
                          confirm(
                            `Delete provider "${provider.displayName}"? This cannot be undone.`
                          )
                        ) {
                          deleteMutation.mutate(provider.id);
                        }
                      }}
                      onTest={() => testMutation.mutate(provider.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* LLM Models & Pricing Table */}
      <LLMModelsTable />
    </div>
  );
}
