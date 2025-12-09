import { useState, useEffect } from 'react';
import { X, Settings, Save } from 'lucide-react';
import type { AgentConfigModalProps, ClaudeAgentConfig } from './types';

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

const AVAILABLE_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'Anthropic' },
];

export default function AgentConfigModal({
  isOpen,
  onClose,
  cardId: _cardId,
  config,
  onSave,
}: AgentConfigModalProps) {
  // cardId available for future use (e.g., per-card config persistence)
  void _cardId;
  const [localConfig, setLocalConfig] = useState<ClaudeAgentConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

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
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Model Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <select
              value={localConfig.model}
              onChange={(e) => setLocalConfig((prev) => ({ ...prev, model: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature: {localConfig.temperature}
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
              <span>Deterministic</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
            <input
              type="number"
              value={localConfig.maxTokens}
              onChange={(e) =>
                setLocalConfig((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) || 4096 }))
              }
              min="1024"
              max="100000"
              step="1024"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
