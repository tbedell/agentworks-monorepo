/**
 * Agent CoPilot Panel
 *
 * Intelligent chat interface for agent management with:
 * - Quick actions for common tasks
 * - AI-powered recommendations
 * - Preset application
 * - Natural language configuration
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  Send,
  Loader2,
  User,
  Copy,
  Check,
  Sparkles,
  Settings,
  BarChart3,
  Layers,
} from 'lucide-react';
import { useWorkspaceStore } from '../../../stores/workspace';
import { api } from '../../../lib/api';
import { Accordion } from '../../common/Accordion';
import clsx from 'clsx';
import type {
  AgentCoPilotMessage,
  AgentContext,
  AgentRecommendation,
  AgentCoPilotAction,
  AgentAnalysis,
} from './types';
import { AgentRecommendationCard } from './AgentRecommendationCard';
import { AgentPresetSelector } from './AgentPresetSelector';
import type { AgentPreset } from './types';

interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon: React.ElementType;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'analyze',
    label: 'Analyze Setup',
    prompt: 'Analyze my current agent configuration and identify any issues or improvements.',
    icon: BarChart3,
  },
  {
    id: 'recommend',
    label: 'Get Recommendations',
    prompt: 'What agents do you recommend for my project?',
    icon: Sparkles,
  },
  {
    id: 'preset',
    label: 'Apply Preset',
    prompt: '__SHOW_PRESET_SELECTOR__',
    icon: Layers,
  },
  {
    id: 'optimize',
    label: 'Optimize Settings',
    prompt: 'Review and optimize the temperature and token settings for all my active agents.',
    icon: Settings,
  },
];

interface AgentCoPilotPanelProps {
  agentContext: AgentContext;
  onApplyRecommendation?: (recommendation: AgentRecommendation) => void;
  onApplyPreset?: (preset: AgentPreset) => void;
  onConfigureAgent?: (agentName: string, settings: Record<string, unknown>) => void;
}

export function AgentCoPilotPanel({
  agentContext,
  onApplyRecommendation,
  onApplyPreset,
  onConfigureAgent,
}: AgentCoPilotPanelProps) {
  const { currentProjectId } = useWorkspaceStore();
  const [messages, setMessages] = useState<AgentCoPilotMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPresetSelector, setShowPresetSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (message?: string) => {
    const messageToSend = message || inputValue.trim();
    if (!messageToSend || isLoading) return;

    // Special handling for preset selector
    if (messageToSend === '__SHOW_PRESET_SELECTOR__') {
      setShowPresetSelector(true);
      return;
    }

    const userMessage: AgentCoPilotMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await api.copilot.agentsChat({
        message: messageToSend,
        projectId: currentProjectId || undefined,
        agentContext,
      });

      const assistantMessage: AgentCoPilotMessage = {
        id: response.message?.id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message?.content || "I'm here to help optimize your agent configuration. What would you like to do?",
        timestamp: new Date(),
        recommendations: response.recommendations,
        actions: response.actions,
        analysis: response.analysis,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Auto-apply actions if configured
      if (response.actions) {
        for (const action of response.actions) {
          handleAction(action);
        }
      }
    } catch (error) {
      console.error('Agent CoPilot error:', error);
      const assistantMessage: AgentCoPilotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I encountered an issue. Please try again or use one of the quick actions above.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, currentProjectId, agentContext]);

  const handleAction = (action: AgentCoPilotAction) => {
    switch (action.type) {
      case 'CONFIGURE_AGENT':
        if (action.agentName && action.settings && onConfigureAgent) {
          onConfigureAgent(action.agentName, action.settings);
        }
        break;
      case 'APPLY_PRESET':
        if (action.presetId) {
          setShowPresetSelector(true);
        }
        break;
      // Other actions handled by parent
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.prompt === '__SHOW_PRESET_SELECTOR__') {
      setShowPresetSelector(true);
    } else {
      handleSend(action.prompt);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePresetSelect = (preset: AgentPreset) => {
    setShowPresetSelector(false);
    onApplyPreset?.(preset);

    const systemMessage: AgentCoPilotMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Applied the "${preset.name}" preset. This configuration enables ${preset.agents.filter((a) => a.enabled).length} agents optimized for ${preset.projectType} development.`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  const renderAnalysis = (analysis: AgentAnalysis) => (
    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
      <div className="grid grid-cols-4 gap-2 mb-2">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-900">{analysis.totalAgents}</div>
          <div className="text-slate-500">Total</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">{analysis.activeAgents}</div>
          <div className="text-slate-500">Active</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-purple-600">{analysis.byoaAgents}</div>
          <div className="text-slate-500">BYOA</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-400">{analysis.inactiveAgents}</div>
          <div className="text-slate-500">Inactive</div>
        </div>
      </div>
      {analysis.misconfigurations.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-200">
          <div className="font-medium text-amber-700 mb-1">Issues Found:</div>
          {analysis.misconfigurations.map((issue, i) => (
            <div key={i} className="flex items-start gap-1 text-amber-600">
              <span>!</span>
              <span>{issue.displayName}: {issue.issue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Quick Actions Accordion */}
      <Accordion
        title="Quick Actions"
        icon={<Sparkles className="h-4 w-4" />}
        defaultOpen={messages.length === 0}
      >
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
            >
              <action.icon className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="truncate">{action.label}</span>
            </button>
          ))}
        </div>
      </Accordion>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mb-3">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Agent CoPilot</h3>
            <p className="text-xs text-slate-500">
              Intelligent agent configuration and optimization.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id}>
                <div
                  className={clsx(
                    'flex gap-2',
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  )}
                >
                  <div
                    className={clsx(
                      'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
                      message.role === 'user'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                    )}
                  >
                    {message.role === 'user' ? (
                      <User className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3 w-3" />
                    )}
                  </div>
                  <div
                    className={clsx(
                      'flex-1 px-3 py-2 rounded-lg text-xs relative group',
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-800'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <button
                      onClick={() => handleCopy(message.content, message.id)}
                      className={clsx(
                        'absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                        message.role === 'user'
                          ? 'text-white/70 hover:text-white hover:bg-white/10'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Analysis section */}
                {message.analysis && renderAnalysis(message.analysis)}

                {/* Recommendations section */}
                {message.recommendations && message.recommendations.length > 0 && (
                  <div className="mt-2 space-y-2 ml-8">
                    {message.recommendations.map((rec, i) => (
                      <AgentRecommendationCard
                        key={i}
                        recommendation={rec}
                        onApply={() => onApplyRecommendation?.(rec)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0">
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <div className="bg-slate-100 rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 bg-white shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about agents, presets..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={1}
            style={{ minHeight: '36px', maxHeight: '80px' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Preset Selector Modal */}
      {showPresetSelector && (
        <AgentPresetSelector
          onSelect={handlePresetSelect}
          onClose={() => setShowPresetSelector(false)}
          projectType={agentContext.projectType}
        />
      )}
    </div>
  );
}

export default AgentCoPilotPanel;
