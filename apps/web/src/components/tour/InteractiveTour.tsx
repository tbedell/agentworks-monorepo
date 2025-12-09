import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Bot,
  ArrowRight,
  ArrowLeft,
  X,
  Lightbulb,
  Columns3,
  Monitor,
  Database,
  Zap,
  Rocket,
  FileText,
  Target,
  Sparkles,
  MousePointer2,
} from 'lucide-react';
import { useTour, TOUR_STEPS } from '../../contexts/TourContext';
import clsx from 'clsx';

const STEP_ICONS: Record<string, React.ElementType> = {
  welcome: Sparkles,
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

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

function getArrowStyles(placement: TooltipPlacement): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
  };

  switch (placement) {
    case 'top':
      return {
        ...base,
        bottom: -10,
        left: '50%',
        transform: 'translateX(-50%)',
        borderWidth: '10px 10px 0 10px',
        borderColor: 'white transparent transparent transparent',
      };
    case 'bottom':
      return {
        ...base,
        top: -10,
        left: '50%',
        transform: 'translateX(-50%)',
        borderWidth: '0 10px 10px 10px',
        borderColor: 'transparent transparent white transparent',
      };
    case 'left':
      return {
        ...base,
        right: -10,
        top: '50%',
        transform: 'translateY(-50%)',
        borderWidth: '10px 0 10px 10px',
        borderColor: 'transparent transparent transparent white',
      };
    case 'right':
      return {
        ...base,
        left: -10,
        top: '50%',
        transform: 'translateY(-50%)',
        borderWidth: '10px 10px 10px 0',
        borderColor: 'transparent white transparent transparent',
      };
    default:
      return { display: 'none' };
  }
}

function AnimatedMousePointer({ targetRect }: { targetRect: SpotlightRect | null }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!targetRect) {
      setIsAnimating(false);
      return;
    }

    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    setIsAnimating(true);
    
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight - 100;
    
    setPosition({ x: startX, y: startY });

    const animationDuration = 1200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      const currentX = startX + (targetX - startX) * easeOutCubic;
      const currentY = startY + (targetY - startY) * easeOutCubic;
      
      setPosition({ x: currentX, y: currentY });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [targetRect]);

  if (!targetRect || !isAnimating) return null;

  return (
    <div
      className="fixed z-[10001] pointer-events-none transition-opacity duration-300"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-8px, -8px)',
      }}
    >
      <div className="relative">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          className="drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))' }}
        >
          <path
            d="M4 4L10.5 20L13 13L20 10.5L4 4Z"
            fill="white"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="absolute top-6 left-6 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75" />
        <div className="absolute top-6 left-6 w-4 h-4 bg-blue-400 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

function ClickIndicator({ targetRect }: { targetRect: SpotlightRect | null }) {
  if (!targetRect) return null;

  return (
    <div
      className="fixed z-[10000] pointer-events-none"
      style={{
        left: targetRect.left + targetRect.width / 2,
        top: targetRect.top + targetRect.height / 2,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="relative">
        <div className="absolute inset-0 w-16 h-16 -ml-8 -mt-8 bg-blue-500/20 rounded-full animate-ping" />
        <div className="absolute inset-0 w-12 h-12 -ml-6 -mt-6 bg-blue-500/30 rounded-full animate-pulse" />
        <div className="absolute inset-0 w-8 h-8 -ml-4 -mt-4 bg-blue-500/40 rounded-full" />
      </div>
    </div>
  );
}

export default function InteractiveTour() {
  const {
    isActive,
    isPaused,
    isDismissed,
    currentStep,
    currentStepData,
    totalSteps,
    completedSteps,
    nextStep,
    prevStep,
    skipTour,
    dismissTour,
  } = useTour();

  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<TooltipPlacement>('center');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPointer, setShowPointer] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentStep === 0 && isActive && !isPaused && !isDismissed) {
      setShowWelcome(true);
      setShowPointer(false);
    } else {
      setShowWelcome(false);
      if (currentStepData?.target) {
        setShowPointer(true);
      }
    }
  }, [currentStep, isActive, isPaused, isDismissed, currentStepData]);

  useEffect(() => {
    if (!isActive || isPaused || isDismissed || !currentStepData) {
      setSpotlightRect(null);
      return;
    }

    const updateSpotlight = () => {
      if (currentStepData.target) {
        const element = document.querySelector(currentStepData.target);
        if (element) {
          const rect = element.getBoundingClientRect();
          const padding = currentStepData.spotlightPadding || 12;
          setSpotlightRect({
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
          });

          const tooltipWidth = 380;
          const tooltipHeight = 220;
          let top = 0;
          let left = 0;
          let newPlacement: TooltipPlacement = currentStepData.position || 'bottom';

          switch (newPlacement) {
            case 'top':
              top = rect.top - tooltipHeight - 24;
              left = rect.left + rect.width / 2 - tooltipWidth / 2;
              if (top < 20) {
                newPlacement = 'bottom';
                top = rect.bottom + 24;
              }
              break;
            case 'bottom':
              top = rect.bottom + 24;
              left = rect.left + rect.width / 2 - tooltipWidth / 2;
              if (top + tooltipHeight > window.innerHeight - 20) {
                newPlacement = 'top';
                top = rect.top - tooltipHeight - 24;
              }
              break;
            case 'left':
              top = rect.top + rect.height / 2 - tooltipHeight / 2;
              left = rect.left - tooltipWidth - 24;
              if (left < 20) {
                newPlacement = 'right';
                left = rect.right + 24;
              }
              break;
            case 'right':
              top = rect.top + rect.height / 2 - tooltipHeight / 2;
              left = rect.right + 24;
              if (left + tooltipWidth > window.innerWidth - 20) {
                newPlacement = 'left';
                left = rect.left - tooltipWidth - 24;
              }
              break;
            default:
              top = window.innerHeight / 2 - tooltipHeight / 2;
              left = window.innerWidth / 2 - tooltipWidth / 2;
          }

          left = Math.max(20, Math.min(left, window.innerWidth - tooltipWidth - 20));
          top = Math.max(20, Math.min(top, window.innerHeight - tooltipHeight - 20));

          setPlacement(newPlacement);
          setTooltipPosition({ top, left });
        } else {
          setSpotlightRect(null);
          setPlacement('center');
          setTooltipPosition({
            top: window.innerHeight / 2 - 110,
            left: window.innerWidth / 2 - 190,
          });
        }
      } else {
        setSpotlightRect(null);
        setPlacement('center');
        setTooltipPosition({
          top: window.innerHeight / 2 - 110,
          left: window.innerWidth / 2 - 190,
        });
      }
    };

    updateSpotlight();

    const timer = setTimeout(updateSpotlight, 300);

    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight);
    };
  }, [isActive, isPaused, isDismissed, currentStepData]);

  if (!isActive || isPaused || isDismissed || !currentStepData) {
    return null;
  }

  if (showWelcome) {
    const handleStartTour = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      nextStep();
    };

    const handleMaybeLater = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dismissTour();
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        dismissTour();
      }
    };

    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        onClick={handleBackdropClick}
      >
        <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-[1px] pointer-events-none" />
        <div 
          className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 px-8 py-10 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <Bot className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome to AgentWorks!
            </h1>
            <p className="text-white/80">
              Your AI-powered development platform
            </p>
          </div>

          <div className="px-8 py-6">
            <p className="text-slate-600 text-center mb-6">
              I'm your CEO CoPilot, and I'll guide you through the platform.
              Let's explore how to build amazing projects together with AI agents.
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleStartTour}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Rocket className="w-5 h-5" />
                Start Tour
              </button>
              <button
                type="button"
                onClick={handleMaybeLater}
                className="w-full px-6 py-3 text-slate-500 font-medium rounded-xl hover:bg-slate-100 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>

          <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400">
              Press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">Esc</kbd> to dismiss • 
              Use <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">→</kbd> to navigate
            </p>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const Icon = STEP_ICONS[currentStepData.id] || Bot;

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ isolation: 'isolate' }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.15)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {spotlightRect && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
        >
          <div className="absolute inset-0 rounded-xl ring-4 ring-blue-500 ring-offset-4 ring-offset-white/50" />
          <div className="absolute inset-0 rounded-xl bg-blue-500/5" />
          <div className="absolute -inset-2 rounded-2xl border-2 border-dashed border-blue-400 animate-pulse" />
        </div>
      )}

      {showPointer && <AnimatedMousePointer targetRect={spotlightRect} />}
      {spotlightRect && <ClickIndicator targetRect={spotlightRect} />}

      <div
        ref={tooltipRef}
        className="absolute pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          width: 380,
        }}
      >
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
          {placement !== 'center' && (
            <div style={getArrowStyles(placement)} />
          )}

          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-600">CoPilot</span>
            </div>
            <button
              onClick={dismissTour}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Dismiss tour (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                <Icon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {currentStepData.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>
            </div>

            {currentStepData.action && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                    <MousePointer2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Click here!</p>
                    <p className="text-xs text-blue-600">{currentStepData.action}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {}}
                  className={clsx(
                    'h-2 rounded-full transition-all',
                    index === currentStep
                      ? 'w-6 bg-blue-600'
                      : completedSteps.includes(index)
                      ? 'w-2 bg-blue-300'
                      : 'w-2 bg-slate-200 hover:bg-slate-300'
                  )}
                />
              ))}
            </div>
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  skipTour();
                }}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Skip tour
              </button>
              <span className="text-xs text-slate-400">
                {currentStep + 1} of {totalSteps}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    prevStep();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  nextStep();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                {currentStep === totalSteps - 1 ? (
                  <>
                    Finish
                    <Sparkles className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
