/**
 * Agent Preset Selector
 *
 * Modal for selecting and applying agent presets.
 */

import { useState } from 'react';
import {
  X,
  Check,
  Layers,
  Globe,
  Server,
  Smartphone,
  ShoppingCart,
  Sparkles,
  Bot,
} from 'lucide-react';
import clsx from 'clsx';
import { AGENT_PRESETS, countEnabledAgents } from './presets';
import type { AgentPreset, ProjectType } from './types';

interface AgentPresetSelectorProps {
  onSelect: (preset: AgentPreset) => void;
  onClose: () => void;
  projectType?: ProjectType;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Layers,
  Globe,
  Server,
  Smartphone,
  ShoppingCart,
  Sparkles,
};

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  saas: 'SaaS / Web App',
  wordpress: 'WordPress',
  ecommerce: 'E-commerce',
  mobile: 'Mobile App',
  api: 'API / Backend',
  custom: 'Custom',
};

export function AgentPresetSelector({
  onSelect,
  onClose,
  projectType,
}: AgentPresetSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [previewPreset, setPreviewPreset] = useState<AgentPreset | null>(null);

  const handleSelect = () => {
    const preset = AGENT_PRESETS.find((p) => p.id === selectedPreset);
    if (preset) {
      onSelect(preset);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Select Agent Preset</h2>
            <p className="text-sm text-slate-500">Choose a configuration optimized for your project type</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex max-h-[60vh]">
          {/* Preset List */}
          <div className="w-1/2 p-4 border-r border-slate-200 overflow-y-auto">
            <div className="space-y-2">
              {AGENT_PRESETS.map((preset) => {
                const IconComponent = ICON_MAP[preset.icon] || Layers;
                const isRecommended = projectType && preset.projectType === projectType;

                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      setPreviewPreset(preset);
                    }}
                    onMouseEnter={() => setPreviewPreset(preset)}
                    className={clsx(
                      'w-full p-3 rounded-lg border text-left transition-all',
                      selectedPreset === preset.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={clsx(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        selectedPreset === preset.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-slate-100 text-slate-500'
                      )}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{preset.name}</span>
                          {isRecommended && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {preset.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400">
                            {countEnabledAgents(preset)} agents enabled
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                            {PROJECT_TYPE_LABELS[preset.projectType]}
                          </span>
                        </div>
                      </div>
                      {selectedPreset === preset.id && (
                        <Check className="h-5 w-5 text-blue-600 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="w-1/2 p-4 bg-slate-50 overflow-y-auto">
            {previewPreset ? (
              <>
                <h3 className="font-medium text-slate-900 mb-3">
                  Agent Configuration Preview
                </h3>
                <div className="space-y-2">
                  {previewPreset.agents.map((agent) => (
                    <div
                      key={agent.name}
                      className={clsx(
                        'flex items-center gap-2 p-2 rounded-lg text-xs',
                        agent.enabled
                          ? 'bg-white border border-green-200'
                          : 'bg-slate-100 border border-slate-200 opacity-50'
                      )}
                    >
                      <div className={clsx(
                        'w-6 h-6 rounded flex items-center justify-center',
                        agent.enabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'
                      )}>
                        <Bot className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-700 truncate">
                          {agent.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </div>
                        {agent.enabled && agent.provider && (
                          <div className="text-slate-400 truncate">
                            {agent.provider} / {agent.model?.split('-').slice(0, 2).join('-')}
                          </div>
                        )}
                      </div>
                      <span className={clsx(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium',
                        agent.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-200 text-slate-500'
                      )}>
                        {agent.enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Layers className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">
                  Hover over a preset to preview its configuration
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedPreset}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Preset
          </button>
        </div>
      </div>
    </div>
  );
}

export default AgentPresetSelector;
