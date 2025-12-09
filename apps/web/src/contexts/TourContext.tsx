import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  route?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightPadding?: number;
  action?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AgentWorks!',
    description: "I'm your CEO CoPilot, and I'll guide you through the platform. Let's explore how to build amazing projects together with AI agents.",
    position: 'center',
  },
  {
    id: 'create-project',
    title: 'Create Your First Project',
    description: "Everything starts with a project. Click here to create your first project and begin your development journey.",
    target: '[data-tour="create-project"]',
    route: '/planning',
    position: 'bottom',
    action: 'Click to create a project',
  },
  {
    id: 'planning-overview',
    title: 'Planning Page',
    description: "This is where you'll define your project's vision. The Planning page helps you create Blueprints, PRDs, and MVPs with CoPilot's help.",
    route: '/planning',
    position: 'center',
  },
  {
    id: 'blueprint',
    title: 'The Blueprint',
    description: "A Blueprint is your project's north star. It captures your vision, problem statement, and solution approach. I'll help you create one when you start a project.",
    target: '[data-tour="blueprint-section"]',
    route: '/planning',
    position: 'right',
  },
  {
    id: 'prd-mvp',
    title: 'PRD & MVP',
    description: "After the Blueprint, we define the Product Requirements Document (PRD) and Minimum Viable Product (MVP). These documents guide the development process.",
    target: '[data-tour="prd-section"]',
    route: '/planning',
    position: 'right',
  },
  {
    id: 'kanban',
    title: 'The Kanban Board',
    description: "Your project flows through an 11-lane pipeline. Each lane represents a stage of development, from Vision to Learning. AI agents work on cards as they move through lanes.",
    route: '/kanban',
    position: 'center',
  },
  {
    id: 'ui-builder',
    title: 'UI Builder',
    description: "Design your user interface visually. Create components, layouts, and screens that agents can implement. No coding required for design!",
    route: '/ui-builder',
    position: 'center',
  },
  {
    id: 'db-builder',
    title: 'Database Builder',
    description: "Design your database schema visually. Define tables, relationships, and fields. Agents will generate the actual database migrations.",
    route: '/db-builder',
    position: 'center',
  },
  {
    id: 'workflows',
    title: 'Workflows',
    description: "Create automation workflows that connect different parts of your project. Trigger agents, send notifications, and automate repetitive tasks.",
    route: '/workflows',
    position: 'center',
  },
  {
    id: 'agents-usage',
    title: 'Agents & Usage',
    description: "Meet your AI agent team! Each agent specializes in different tasks. Monitor their work and track your usage and billing here.",
    route: '/agents',
    position: 'center',
  },
];

interface TourContextType {
  isActive: boolean;
  isPaused: boolean;
  isDismissed: boolean;
  isCompleted: boolean;
  showChecklist: boolean;
  currentStep: number;
  currentStepData: TourStep | null;
  totalSteps: number;
  completedSteps: number[];
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  dismissTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  goToStep: (step: number) => void;
  toggleChecklist: () => void;
  restartTour: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('agentworks-tour-dismissed') === 'true';
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadTourStatus = async () => {
      try {
        const status = await api.auth.getTourStatus();
        setIsCompleted(status.tourCompleted);
        setIsDismissed(status.tourDismissed);
        setCurrentStep(status.tourStep);
        
        if (status.shouldShowTour && status.tourStep < TOUR_STEPS.length && !status.tourDismissed) {
          setIsActive(true);
        }
        
        const completed: number[] = [];
        for (let i = 0; i < status.tourStep; i++) {
          completed.push(i);
        }
        setCompletedSteps(completed);
      } catch (e) {
        const savedStep = localStorage.getItem('agentworks-tour-step');
        const tourRequired = localStorage.getItem('agentworks-tour-required');
        const tourDismissed = localStorage.getItem('agentworks-tour-dismissed');
        
        if (tourDismissed === 'true') {
          setIsDismissed(true);
        } else if (tourRequired === 'true' && savedStep) {
          const step = parseInt(savedStep, 10);
          setCurrentStep(step);
          if (step < TOUR_STEPS.length) {
            setIsActive(true);
          }
        }
      }
    };
    
    loadTourStatus();
  }, []);

  useEffect(() => {
    if (isActive && !isPaused && !isDismissed) {
      localStorage.setItem('agentworks-tour-step', currentStep.toString());
      
      const step = TOUR_STEPS[currentStep];
      if (step?.route && location.pathname !== step.route) {
        navigate(step.route);
      }
    }
  }, [currentStep, isActive, isPaused, isDismissed, navigate, location.pathname]);

  const handleDismiss = useCallback(async () => {
    setIsActive(false);
    setIsDismissed(true);
    localStorage.setItem('agentworks-tour-dismissed', 'true');
    try {
      await api.auth.dismissTour();
    } catch (e) {
      console.error('Failed to dismiss tour:', e);
    }
  }, []);

  const handleSkip = useCallback(async () => {
    setIsActive(false);
    setIsCompleted(true);
    localStorage.removeItem('agentworks-tour-required');
    localStorage.removeItem('agentworks-tour-step');
    try {
      await api.auth.completeTour();
    } catch (e) {
      console.error('Failed to complete tour:', e);
    }
  }, []);

  const handleNext = useCallback(async () => {
    setCompletedSteps(prev => [...prev, currentStep]);
    
    if (currentStep < TOUR_STEPS.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      try {
        await api.auth.tourProgress(newStep);
      } catch (e) {
        console.error('Failed to save tour progress:', e);
      }
    } else {
      setIsActive(false);
      setIsCompleted(true);
      localStorage.removeItem('agentworks-tour-required');
      localStorage.removeItem('agentworks-tour-step');
      try {
        await api.auth.completeTour();
      } catch (e) {
        console.error('Failed to complete tour:', e);
      }
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || isPaused) return;
      
      if (e.key === 'Escape') {
        handleDismiss();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isPaused, handleDismiss, handleNext, handlePrev]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    setIsPaused(false);
    setIsDismissed(false);
    setIsCompleted(false);
    setCompletedSteps([]);
    localStorage.setItem('agentworks-tour-required', 'true');
    localStorage.setItem('agentworks-tour-step', '0');
    localStorage.removeItem('agentworks-tour-dismissed');
    
    api.auth.restartTour().catch(console.error);
  }, []);

  const nextStep = handleNext;
  const prevStep = handlePrev;
  const skipTour = handleSkip;
  const dismissTour = handleDismiss;

  const pauseTour = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeTour = useCallback(() => {
    setIsPaused(false);
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < TOUR_STEPS.length) {
      setCurrentStep(step);
      setIsActive(true);
      setIsPaused(false);
      setIsDismissed(false);
    }
  }, []);

  const toggleChecklist = useCallback(() => {
    setShowChecklist(prev => !prev);
  }, []);

  const restartTour = useCallback(async () => {
    setCurrentStep(0);
    setIsActive(true);
    setIsPaused(false);
    setIsDismissed(false);
    setIsCompleted(false);
    setCompletedSteps([]);
    localStorage.setItem('agentworks-tour-required', 'true');
    localStorage.setItem('agentworks-tour-step', '0');
    localStorage.removeItem('agentworks-tour-dismissed');
    
    try {
      await api.auth.restartTour();
    } catch (e) {
      console.error('Failed to restart tour:', e);
    }
  }, []);

  const currentStepData = isActive && !isPaused && !isDismissed ? TOUR_STEPS[currentStep] : null;

  return (
    <TourContext.Provider
      value={{
        isActive,
        isPaused,
        isDismissed,
        isCompleted,
        showChecklist,
        currentStep,
        currentStepData,
        totalSteps: TOUR_STEPS.length,
        completedSteps,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        dismissTour,
        pauseTour,
        resumeTour,
        goToStep,
        toggleChecklist,
        restartTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
