import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Play,
  X,
  Bot,
  Rocket,
  Lightbulb,
  FileText,
  Target,
  Columns3,
  Monitor,
  Database,
  Zap,
} from 'lucide-react';
import { useTour, TOUR_STEPS } from '../../contexts/TourContext';
import clsx from 'clsx';

const STEP_ICONS: Record<string, React.ElementType> = {
  welcome: Bot,
  'create-project': Rocket,
  'planning-overview': Lightbulb,
  blueprint: FileText,
  'prd-mvp': Target,
  kanban: Columns3,
  'ui-builder': Monitor,
  'db-builder': Database,
  workflows: Zap,
  'agents-usage': Bot,
};

export function TourChecklist() {
  const {
    isActive,
    isDismissed,
    isCompleted,
    currentStep,
    completedSteps,
    totalSteps,
    goToStep,
    restartTour,
    dismissTour,
  } = useTour();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (isCompleted || !isVisible) return null;

  const progress = Math.round((completedSteps.length / totalSteps) * 100);

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9997]">
      <div
        className={clsx(
          'bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300',
          isExpanded ? 'w-80' : 'w-64'
        )}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Platform Tour</p>
              <p className="text-xs text-white/70">{progress}% complete</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </div>
        </button>

        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {isExpanded && (
          <div className="max-h-64 overflow-y-auto">
            {TOUR_STEPS.map((step, index) => {
              const Icon = STEP_ICONS[step.id] || Circle;
              const isStepCompleted = completedSteps.includes(index);
              const isCurrentStep = index === currentStep && isActive;

              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(index)}
                  className={clsx(
                    'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors border-b border-slate-100 last:border-b-0',
                    isCurrentStep
                      ? 'bg-blue-50'
                      : isStepCompleted
                      ? 'bg-green-50/50'
                      : 'hover:bg-slate-50'
                  )}
                >
                  <div
                    className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                      isStepCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrentStep
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    )}
                  >
                    {isStepCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={clsx(
                        'text-sm font-medium truncate',
                        isStepCompleted
                          ? 'text-green-700'
                          : isCurrentStep
                          ? 'text-blue-700'
                          : 'text-slate-700'
                      )}
                    >
                      {step.title}
                    </p>
                  </div>
                  <Icon
                    className={clsx(
                      'w-4 h-4 shrink-0',
                      isStepCompleted
                        ? 'text-green-500'
                        : isCurrentStep
                        ? 'text-blue-500'
                        : 'text-slate-400'
                    )}
                  />
                </button>
              );
            })}
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {isDismissed || !isActive ? (
            <button
              onClick={restartTour}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              {isDismissed ? 'Resume Tour' : 'Start Tour'}
            </button>
          ) : (
            <button
              onClick={dismissTour}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Maybe later
            </button>
          )}
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            title="Hide checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
