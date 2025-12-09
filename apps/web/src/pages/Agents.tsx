import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Settings,
  X,
  Key,
  Trash2,
  Star,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { PROVIDERS, PROVIDER_MODELS } from '@agentworks/shared';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspace';

interface BYOAProvider {
  id: string;
  name: string;
  description: string;
  authType: 'oauth' | 'api_key';
  subscriptionTiers?: string[];
  features: string[];
}

interface StoredCredential {
  provider: string;
  credentialType: string;
  subscriptionTier: string | null;
  isDefault: boolean;
  assignedAgents: string[];
  status: string;
  lastUsedAt: string | null;
}

async function fetchBYOAProviders(): Promise<{ providers: BYOAProvider[] }> {
  const res = await fetch('/api/byoa/providers');
  if (!res.ok) {
    // Fallback providers - API key only (no OAuth)
    return {
      providers: [
        {
          id: 'anthropic',
          name: 'Anthropic API',
          description: 'Bring your own Anthropic API key',
          authType: 'api_key',
          features: ['Use your own API credits', 'Direct billing from Anthropic', 'Access to Claude models'],
        },
        {
          id: 'openai',
          name: 'OpenAI',
          description: 'Bring your own OpenAI API key',
          authType: 'api_key',
          features: ['Use your own API credits', 'Direct billing from OpenAI', 'Access to GPT-4, GPT-4o'],
        },
        {
          id: 'google',
          name: 'Google AI',
          description: 'Bring your own Google AI API key',
          authType: 'api_key',
          features: ['Use your own API credits', 'Direct billing from Google', 'Access to Gemini models'],
        },
      ],
    };
  }
  return res.json();
}

async function fetchCredentials(): Promise<{ credentials: StoredCredential[] }> {
  const res = await fetch('/api/byoa/credentials', { credentials: 'include' });
  if (!res.ok) return { credentials: [] };
  return res.json();
}

interface ProviderStatus {
  provider: string;
  displayName: string;
  enabled: boolean;
  apiKeyConfigured: boolean;
}

async function fetchProviderStatus(): Promise<ProviderStatus[]> {
  const res = await fetch('/api/providers/status', { credentials: 'include' });
  if (!res.ok) return [];
  return res.json();
}

async function connectApiKey(provider: string, apiKey: string): Promise<void> {
  await fetch('/api/byoa/connect/api-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ provider, apiKey, isDefault: true }),
  });
}

async function updateBYOAAgents(provider: string, agents: string[]): Promise<void> {
  await fetch('/api/byoa/update-agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ provider, assignedAgents: agents }),
  });
}

async function revokeCredential(provider: string): Promise<void> {
  await fetch('/api/byoa/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ provider }),
  });
}

async function updateAgentSettings(agentName: string, settings: { temperature?: number; maxTokens?: number; systemPrompt?: string }): Promise<void> {
  await fetch(`/api/agent-orchestrator/agents/${agentName}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(settings),
  });
}

export default function AgentsPage() {
  const { currentProjectId } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState<Record<string, string>>({});
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [agentSettings, setAgentSettings] = useState<Record<string, { temperature: number; maxTokens: number; systemPrompt: string }>>({});

  const { data: serverAgents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: api.agents.list,
  });

  const { data: configs } = useQuery({
    queryKey: ['agentConfigs', currentProjectId],
    queryFn: () => api.agents.getConfig(currentProjectId!),
    enabled: !!currentProjectId,
  });

  const { data: byoaProviders } = useQuery({
    queryKey: ['byoa-providers'],
    queryFn: fetchBYOAProviders,
  });

  const { data: credentialsData, refetch: refetchCredentials } = useQuery({
    queryKey: ['byoa-credentials'],
    queryFn: fetchCredentials,
  });

  // Fetch provider configuration status (Admin Panel keys)
  const { data: providerStatus } = useQuery({
    queryKey: ['provider-status'],
    queryFn: fetchProviderStatus,
  });

  const updateConfig = useMutation({
    mutationFn: ({ agentName, provider, model }: { agentName: string; provider: string; model: string }) =>
      api.agents.setConfig(currentProjectId!, { agentName, provider, model }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentConfigs', currentProjectId] });
    },
  });

  const connectApiKeyMutation = useMutation({
    mutationFn: ({ provider, apiKey }: { provider: string; apiKey: string }) =>
      connectApiKey(provider, apiKey),
    onSuccess: () => {
      refetchCredentials();
      setApiKeyInput({});
    },
  });

  const updateAgentsMutation = useMutation({
    mutationFn: ({ provider, agents }: { provider: string; agents: string[] }) =>
      updateBYOAAgents(provider, agents),
    onSuccess: () => refetchCredentials(),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeCredential,
    onSuccess: () => refetchCredentials(),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: ({ agentName, settings }: { agentName: string; settings: { temperature?: number; maxTokens?: number; systemPrompt?: string } }) =>
      updateAgentSettings(agentName, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const agents = serverAgents || [];
  const credentials = credentialsData?.credentials || [];
  const providers = byoaProviders?.providers || [];

  const getConfigForAgent = (agentName: string) => {
    return configs?.find((c: any) => c.agentId === agentName || c.agentName === agentName);
  };

  const getCredentialForProvider = (providerId: string) =>
    credentials.find((c) => c.provider === providerId);

  const isAgentUsingBYOA = (agentName: string) => {
    return credentials.some((c) => c.status === 'active' && c.assignedAgents.includes(agentName));
  };

  const getBYOAProviderForAgent = (agentName: string) => {
    const cred = credentials.find((c) => c.status === 'active' && c.assignedAgents.includes(agentName));
    return cred?.provider;
  };

  const getAgentSettings = (agent: any) => {
    if (agentSettings[agent.name]) {
      return agentSettings[agent.name];
    }
    return {
      temperature: agent.temperature ?? 0.7,
      maxTokens: agent.maxTokens ?? 4096,
      systemPrompt: agent.systemPrompt ?? '',
    };
  };

  const handleExpandAgent = (agentName: string, agent: any) => {
    if (expandedAgent === agentName) {
      setExpandedAgent(null);
    } else {
      setExpandedAgent(agentName);
      if (!agentSettings[agentName]) {
        setAgentSettings(prev => ({
          ...prev,
          [agentName]: {
            temperature: agent.temperature ?? 0.7,
            maxTokens: agent.maxTokens ?? 4096,
            systemPrompt: agent.systemPrompt ?? '',
          }
        }));
      }
    }
  };

  const handleSettingChange = (agentName: string, field: 'temperature' | 'maxTokens' | 'systemPrompt', value: number | string) => {
    setAgentSettings(prev => ({
      ...prev,
      [agentName]: {
        ...prev[agentName],
        [field]: value,
      }
    }));
  };

  const handleSaveSettings = (agentName: string) => {
    const settings = agentSettings[agentName];
    if (settings) {
      updateSettingsMutation.mutate({ agentName, settings });
    }
  };

  const getAgentStatus = (agent: any) => {
    // Check if agent is using BYOA credentials
    if (isAgentUsingBYOA(agent.name)) return 'byoa';

    // Check if agent has a project-specific config
    const config = getConfigForAgent(agent.name);
    if (config) return 'active';

    // Check if the agent's default provider has an API key configured in Admin Panel
    const agentProvider = agent.defaultProvider || 'openai';
    const providerConfig = providerStatus?.find((p: ProviderStatus) => p.provider === agentProvider);
    if (providerConfig?.apiKeyConfigured && providerConfig?.enabled) {
      return 'active';
    }

    return 'inactive';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'byoa':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'inactive':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const hasActiveCredentials = credentials.some((c) => c.status === 'active');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">

      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Agent Management</h1>
            <p className="text-slate-600">
              Configure AI providers for all {agents.length} agents across project lanes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowGlobalSettings(true)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50 ${
                hasActiveCredentials ? 'border-purple-300 text-purple-700 bg-purple-50' : 'border-slate-200'
              }`}
            >
              <Settings className="h-4 w-4" />
              Global Settings
              {hasActiveCredentials && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-200 text-purple-800 rounded">BYOA</span>
              )}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Bot className="h-4 w-4" />
              Deploy All Agents
            </button>
          </div>
        </div>

        {!currentProjectId && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-sm">
              Select a project to configure agent providers. Default settings shown below.
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {agents.map((agent: any) => {
            const config = getConfigForAgent(agent.name);
            const provider = config?.provider || agent.defaultProvider;
            const model = config?.model || agent.defaultModel;
            const status = getAgentStatus(agent);
            const byoaProvider = getBYOAProviderForAgent(agent.name);

            return (
              <div
                key={agent.name}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                      status === 'byoa' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      <Bot className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{agent.displayName}</h3>
                      <p className="text-xs text-slate-500">{agent.name}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(status)}`}>
                    {status === 'byoa' ? 'BYOA' : status}
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  {agent.description}
                </p>

                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {agent.allowedLanes?.map((lane: string) => (
                      <span key={lane} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                        Lane {lane}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">AI Provider</label>
                    <select
                      value={byoaProvider || provider}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.startsWith('byoa_')) {
                          const byoaProv = value.replace('byoa_', '');
                          const currentAgents = credentials.find((c) => c.provider === byoaProv)?.assignedAgents || [];
                          if (!currentAgents.includes(agent.name)) {
                            updateAgentsMutation.mutate({ provider: byoaProv, agents: [...currentAgents, agent.name] });
                          }
                        } else {
                          if (byoaProvider) {
                            const cred = credentials.find((c) => c.provider === byoaProvider);
                            if (cred) {
                              updateAgentsMutation.mutate({
                                provider: byoaProvider,
                                agents: cred.assignedAgents.filter((a) => a !== agent.name),
                              });
                            }
                          }
                          if (currentProjectId) {
                            updateConfig.mutate({ agentName: agent.name, provider: value, model });
                          }
                        }
                      }}
                      disabled={!currentProjectId && !hasActiveCredentials}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-500"
                    >
                      <optgroup label="Platform Providers">
                        {PROVIDERS.map((p) => (
                          <option key={p} value={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </option>
                        ))}
                      </optgroup>
                      {credentials.filter((c) => c.status === 'active').length > 0 && (
                        <optgroup label="Your BYOA Credentials">
                          {credentials
                            .filter((c) => c.status === 'active')
                            .map((c) => (
                              <option key={`byoa_${c.provider}`} value={`byoa_${c.provider}`}>
                                BYOA: {c.provider.replace('_', ' ')} {c.subscriptionTier ? `(${c.subscriptionTier})` : ''}
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  {!byoaProvider && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Model</label>
                      <select
                        value={model}
                        onChange={(e) =>
                          currentProjectId &&
                          updateConfig.mutate({
                            agentName: agent.name,
                            provider,
                            model: e.target.value,
                          })
                        }
                        disabled={!currentProjectId}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-500"
                      >
                        <option value="">Select a model</option>
                        {(PROVIDER_MODELS[provider] || []).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleExpandAgent(agent.name, agent)}
                    className="flex-1 flex items-center justify-center gap-2 text-xs px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <Sliders className="h-3 w-3" />
                    Fine-Tune
                    {expandedAgent === agent.name ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  <button className="text-xs px-3 py-2 text-slate-500 hover:text-slate-700">
                    Logs
                  </button>
                  <button className="text-xs px-3 py-2 text-slate-500 hover:text-slate-700">
                    Metrics
                  </button>
                </div>

                {expandedAgent === agent.name && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-2">
                        Temperature: {getAgentSettings(agent).temperature.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={getAgentSettings(agent).temperature}
                        onChange={(e) => handleSettingChange(agent.name, 'temperature', parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Precise (0)</span>
                        <span>Balanced (1)</span>
                        <span>Creative (2)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Max Tokens</label>
                      <input
                        type="number"
                        min="1"
                        max="32000"
                        step="256"
                        value={getAgentSettings(agent).maxTokens}
                        onChange={(e) => handleSettingChange(agent.name, 'maxTokens', parseInt(e.target.value) || 4096)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                      <p className="text-xs text-slate-400 mt-1">Max output length (1-32,000)</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">System Prompt</label>
                      <textarea
                        value={getAgentSettings(agent).systemPrompt}
                        onChange={(e) => handleSettingChange(agent.name, 'systemPrompt', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                        placeholder="Define the agent's behavior and expertise..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveSettings(agent.name)}
                        disabled={updateSettingsMutation.isPending}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                      </button>
                      <button
                        onClick={() => setExpandedAgent(null)}
                        className="px-3 py-2 border border-slate-200 text-xs rounded-lg hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showGlobalSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Global Agent Settings</h2>
                <p className="text-sm text-slate-600">Configure BYOA credentials and default providers</p>
              </div>
              <button
                onClick={() => setShowGlobalSettings(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Bring Your Own Agent (BYOA)</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Connect your own AI provider subscriptions. BYOA requests are billed directly by your provider - no AgentWorks markup.
                </p>

                <div className="space-y-4">
                  {providers.map((provider) => {
                    const credential = getCredentialForProvider(provider.id);
                    const isConnected = credential && credential.status === 'active';

                    return (
                      <div
                        key={provider.id}
                        className={`border rounded-lg p-4 ${
                          isConnected ? 'border-green-200 bg-green-50' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-slate-100'}`}>
                              <Key className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-slate-500'}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-slate-900">{provider.name}</h4>
                                {isConnected && credential.isDefault && (
                                  <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    Default
                                  </span>
                                )}
                                {isConnected && (
                                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                    Connected
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600">{provider.description}</p>
                              {credential?.subscriptionTier && (
                                <p className="text-sm text-purple-600 mt-1">Tier: {credential.subscriptionTier}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isConnected ? (
                              <button
                                onClick={() => revokeMutation.mutate(provider.id)}
                                className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-600 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="password"
                                  placeholder="API Key"
                                  value={apiKeyInput[provider.id] || ''}
                                  onChange={(e) => setApiKeyInput({ ...apiKeyInput, [provider.id]: e.target.value })}
                                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-48"
                                />
                                <button
                                  onClick={() =>
                                    connectApiKeyMutation.mutate({
                                      provider: provider.id,
                                      apiKey: apiKeyInput[provider.id],
                                    })
                                  }
                                  disabled={!apiKeyInput[provider.id] || connectApiKeyMutation.isPending}
                                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50"
                                >
                                  Save
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {isConnected && credential && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-medium text-slate-900">
                                Assigned Agents ({credential.assignedAgents.length})
                              </h5>
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    updateAgentsMutation.mutate({
                                      provider: provider.id,
                                      agents: agents.map((a: any) => a.name),
                                    })
                                  }
                                  className="text-xs text-blue-600 hover:text-blue-500"
                                >
                                  Assign All
                                </button>
                                <button
                                  onClick={() =>
                                    updateAgentsMutation.mutate({
                                      provider: provider.id,
                                      agents: ['ceo_copilot'],
                                    })
                                  }
                                  className="text-xs text-slate-600 hover:text-slate-500"
                                >
                                  CoPilot Only
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {credential.assignedAgents.map((agentName) => {
                                const agent = agents.find((a: any) => a.name === agentName);
                                return (
                                  <span
                                    key={agentName}
                                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded flex items-center gap-1"
                                  >
                                    {agent?.displayName || agentName}
                                    <button
                                      onClick={() =>
                                        updateAgentsMutation.mutate({
                                          provider: provider.id,
                                          agents: credential.assignedAgents.filter((a) => a !== agentName),
                                        })
                                      }
                                      className="hover:text-red-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {provider.features.map((feature, i) => (
                            <span key={i} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">How BYOA Works</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
                      <div>
                        <p className="font-medium text-slate-700 mb-1">Platform Billing</p>
                        <ul className="space-y-1">
                          <li>• Pay per API call with 2× markup</li>
                          <li>• Usage tracked in $0.25 increments</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-slate-700 mb-1">With BYOA</p>
                        <ul className="space-y-1">
                          <li>• Use your own subscription credits</li>
                          <li>• No AgentWorks markup</li>
                          <li>• Higher limits with Claude Max</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowGlobalSettings(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
