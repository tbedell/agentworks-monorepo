/**
 * Agent Recommendation Card
 *
 * Displays an inline recommendation from the CoPilot with action buttons.
 */

import { Bot, Check, Settings } from 'lucide-react';
import clsx from 'clsx';
import type { AgentRecommendation } from './types';

interface AgentRecommendationCardProps {
  recommendation: AgentRecommendation;
  onApply?: () => void;
  onConfigure?: () => void;
}

const PRIORITY_STYLES: Record<string, { badge: string; border: string; icon: string }> = {
  essential: {
    badge: 'bg-red-100 text-red-700 border-red-200',
    border: 'border-red-200',
    icon: 'text-red-500',
  },
  recommended: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    border: 'border-blue-200',
    icon: 'text-blue-500',
  },
  optional: {
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    border: 'border-slate-200',
    icon: 'text-slate-400',
  },
};

const DEFAULT_STYLE = {
  badge: 'bg-slate-100 text-slate-600 border-slate-200',
  border: 'border-slate-200',
  icon: 'text-slate-400',
};

export function AgentRecommendationCard({
  recommendation,
  onApply,
  onConfigure,
}: AgentRecommendationCardProps) {
  const styles = PRIORITY_STYLES[recommendation.priority] || DEFAULT_STYLE;

  return (
    <div className={clsx('p-3 rounded-lg border bg-white', styles.border)}>
      <div className="flex items-start gap-2">
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50', styles.icon)}>
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-slate-900 truncate">
              {recommendation.displayName}
            </span>
            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border font-medium', styles.badge)}>
              {recommendation.priority}
            </span>
          </div>
          <p className="text-xs text-slate-600 mb-2">{recommendation.reason}</p>

          {recommendation.suggestedSettings && (
            <div className="flex flex-wrap gap-1 mb-2">
              {recommendation.suggestedSettings.provider && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {recommendation.suggestedSettings.provider}
                </span>
              )}
              {recommendation.suggestedSettings.model && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {recommendation.suggestedSettings.model}
                </span>
              )}
              {recommendation.suggestedSettings.temperature !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                  temp: {recommendation.suggestedSettings.temperature}
                </span>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {onApply && (
              <button
                onClick={onApply}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <Check className="h-3 w-3" />
                Apply
              </button>
            )}
            {onConfigure && (
              <button
                onClick={onConfigure}
                className="flex items-center gap-1 px-2 py-1 text-xs border border-slate-200 text-slate-600 rounded hover:bg-slate-50 transition-colors"
              >
                <Settings className="h-3 w-3" />
                Configure
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentRecommendationCard;
