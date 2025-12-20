import { useState, useEffect, useCallback } from 'react';
import { X, Settings, Save, Loader2 } from 'lucide-react';
import type { AgentConfigModalProps, ClaudeAgentConfig, AgentDetailsResponse } from './types';

const AVAILABLE_TOOLS = [
  { id: 'read_file', name: 'Read File', description: 'Read files from project workspace' },
  { id: 'write_file', name: 'Write File', description: 'Write/create files in project workspace' },
  { id: 'list_files', name: 'List Files', description: 'List directory contents' },
  { id: 'run_command', name: 'Run Command', description: 'Execute shell commands' },
  { id: 'update_docs', name: 'Update Docs', description: 'Update project documentation' },
  { id: 'update_kanban_card', name: 'Update Card', description: 'Update Kanban card status/content' },
  { id: 'append_card_todo', name: 'Add Todo', description: 'Add todo items to card' },
  { id: 'complete_card_todo', name: 'Complete Todo', description: 'Mark todo items as done' },
  { id: 'update_ui_builder_state', name: 'UI Builder', description: 'Update UI Builder state' },
  { id: 'update_db_builder_state', name: 'DB Builder', description: 'Update DB Builder state' },
  {
    id: 'update_workflow_builder_state',
    name: 'Workflow Builder',
    description: 'Update Workflow Builder state',
  },
  { id: 'log_run_summary', name: 'Log Summary', description: 'Log structured run summary' },
];

// Provider list from @agentworks/shared constants
const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'google', name: 'Google' },
];

// All models organized by provider - from @agentworks/shared PROVIDER_MODELS
const PROVIDER_MODELS: Record<string, { id: string; name: string }[]> = {
  anthropic: [
    { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
  ],
  openai: [
    { id: 'gpt-5', name: 'GPT-5' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'o3', name: 'o3' },
    { id: 'o3-mini', name: 'o3 Mini' },
    { id: 'o1', name: 'o1' },
    { id: 'o1-mini', name: 'o1 Mini' },
    { id: 'o1-preview', name: 'o1 Preview' },
  ],
  google: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B' },
  ],
};

const API_BASE = '/api';

export default function AgentConfigModal({
  isOpen,
  onClose,
  cardId: _cardId,
  projectId,
  agentName = 'claude_code_agent',
  config,
  onSave,
}: AgentConfigModalProps) {
  // cardId available for future use (e.g., per-card config persistence)
  void _cardId;
  const [localConfig, setLocalConfig] = useState<ClaudeAgentConfig>(config);
  const [isLoading, setIsLoading] = useState(false);
  const [serverDefaults, setServerDefaults] = useState<AgentDetailsResponse | null>(null);

  // Fetch agent defaults from API when modal opens
  const fetchAgentDefaults = useCallback(async () => {
    if (!isOpen || !agentName) return;

    setIsLoading(true);
    try {
      const url = projectId
        ? `${API_BASE}/agents/${agentName}?projectId=${projectId}`
        : `${API_BASE}/agents/${agentName}`;

      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = (await response.json()) as AgentDetailsResponse;
        setServerDefaults(data);

        // Update config with server defaults if not already set
        setLocalConfig((prev) => ({
          ...prev,
          provider: prev.provider || data.effectiveProvider,
          model: prev.model || data.effectiveModel,
          temperature: prev.temperature ?? data.defaultTemperature,
          maxTokens: prev.maxTokens ?? data.defaultMaxTokens,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch agent defaults:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, agentName, projectId]);

  useEffect(() => {
    fetchAgentDefaults();
  }, [fetchAgentDefaults]);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Get models for the selected provider
  const availableModels = PROVIDER_MODELS[localConfig.provider] || PROVIDER_MODELS.anthropic;

  // Handle provider change - reset model to first available model for that provider
  const handleProviderChange = (newProvider: string) => {
    const newModels = PROVIDER_MODELS[newProvider] || [];
    const defaultModel = newModels[0]?.id || 'claude-sonnet-4-20250514';
    setLocalConfig((prev) => ({
      ...prev,
      provider: newProvider,
      model: defaultModel,
    }));
  };

  if (!isOpen) return null;

  const handleToolToggle = (toolId: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      tools: prev.tools.includes(toolId)
        ? prev.tools.filter((t) => t !== toolId)
        : [...prev.tools, toolId],
    }));
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Agent Configuration</h2>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Server defaults info */}
        {serverDefaults && (
          <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <span className="font-medium">{serverDefaults.displayName}</span>
              {serverDefaults.projectConfig ? (
                <span className="ml-2 text-blue-600">
                  (Project config: {serverDefaults.projectConfig.provider}/{serverDefaults.projectConfig.model})
                </span>
              ) : (
                <span className="ml-2 text-blue-500">
                  (Using defaults: {serverDefaults.effectiveProvider}/{serverDefaults.effectiveModel})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
            <select
              value={localConfig.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <select
              value={localConfig.model}
              onChange={(e) => setLocalConfig((prev) => ({ ...prev, model: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature: {localConfig.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localConfig.temperature}
              onChange={(e) =>
                setLocalConfig((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Deterministic (0.0)</span>
              <span>Default (1.0)</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Default agent temperature is 1.0 (maximum creativity). Lower values produce more deterministic outputs.
            </p>
          </div>

          {/* Max Tokens */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
            <input
              type="number"
              value={localConfig.maxTokens}
              onChange={(e) =>
                setLocalConfig((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) || 0 }))
              }
              min="0"
              max="100000"
              step="1024"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Set to 0 to use model's maximum output tokens automatically.
            </p>
          </div>

          {/* Max Iterations */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Iterations</label>
            <input
              type="number"
              value={localConfig.maxIterations}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  maxIterations: parseInt(e.target.value) || 10,
                }))
              }
              min="1"
              max="50"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of tool-calling iterations per run
            </p>
          </div>

          {/* Tools */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Enabled Tools</label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_TOOLS.map((tool) => (
                <label
                  key={tool.id}
                  className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    localConfig.tools.includes(tool.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={localConfig.tools.includes(tool.id)}
                    onChange={() => handleToolToggle(tool.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700">{tool.name}</div>
                    <div className="text-xs text-gray-500">{tool.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Save className="h-4 w-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
