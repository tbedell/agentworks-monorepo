import { useState } from 'react';
import {
  Bot,
  Rocket,
  FileText,
  Target,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  Columns3,
} from 'lucide-react';
import clsx from 'clsx';

interface OnboardingWizardProps {
  onComplete: () => void;
  userName?: string;
  projectName?: string;
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to AgentWorks',
    description: 'Your AI-powered development platform',
  },
  {
    id: 'overview',
    title: 'How It Works',
    description: 'The 11-lane development pipeline',
  },
  {
    id: 'copilot',
    title: 'Meet Your CoPilot',
    description: 'Your AI project advisor',
  },
];

export default function OnboardingWizard({ onComplete, userName = 'there', projectName = 'My First Project' }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Bot className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">AgentWorks</h2>
                <p className="text-sm text-white/80">Getting Started</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={clsx(
                    'w-3 h-3 rounded-full transition-all',
                    index === currentStep
                      ? 'bg-white scale-125'
                      : index < currentStep
                      ? 'bg-white/80'
                      : 'bg-white/30'
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-8">
          {currentStep === 0 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Rocket className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Welcome, {userName}!
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                You're about to transform how you build software. AgentWorks uses AI agents 
                to help you plan, build, test, and deploy applications faster than ever.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-slate-600">
                  Your first project: <span className="font-semibold text-slate-900">{projectName}</span>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <FileText className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900">Plan</p>
                  <p className="text-xs text-slate-500">Blueprint & PRD</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <Columns3 className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900">Build</p>
                  <p className="text-xs text-slate-500">Kanban & Agents</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <Rocket className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900">Deploy</p>
                  <p className="text-xs text-slate-500">GCP Publishing</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Target className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                The 11-Lane Pipeline
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Every idea flows through a structured development pipeline, 
                with specialist AI agents at each stage.
              </p>
              <div className="space-y-2 text-left max-w-md mx-auto">
                {[
                  { lane: '0', name: 'Vision & CoPilot', desc: 'Strategic planning with your AI advisor' },
                  { lane: '1', name: 'PRD / MVP', desc: 'Define requirements and scope' },
                  { lane: '2-4', name: 'Research → Architecture → Planning', desc: 'Design and task breakdown' },
                  { lane: '5-6', name: 'Scaffolding → Build', desc: 'AI agents implement your vision' },
                  { lane: '7-10', name: 'Test → Deploy → Docs → Learn', desc: 'Quality, publishing, and improvement' },
                ].map((item) => (
                  <div key={item.lane} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                      {item.lane}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-10 w-10 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Your CEO CoPilot
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                CoPilot is always available to help you plan, review progress, 
                and coordinate your AI agent team.
              </p>
              <div className="bg-slate-50 rounded-xl p-6 text-left max-w-md mx-auto">
                <p className="text-sm font-medium text-slate-900 mb-4">CoPilot can help you:</p>
                <ul className="space-y-3">
                  {[
                    'Create and refine your project Blueprint',
                    'Generate PRD and define MVP scope',
                    'Assign agents to tasks and review their work',
                    'Track progress and resolve blockers',
                    'Design UI components and database schemas',
                    'Create automation workflows',
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-slate-500 mt-4">
                Press <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs">⌘</kbd> + 
                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs">Shift</kbd> + 
                <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs">C</kbd> to open CoPilot anytime
              </p>
            </div>
          )}
        </div>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Skip tutorial
          </button>
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              {currentStep === STEPS.length - 1 ? (
                <>
                  Get Started
                  <Rocket className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
