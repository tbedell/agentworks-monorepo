import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type CoPilotPhase = 
  | 'welcome'
  | 'vision'
  | 'requirements'
  | 'goals'
  | 'roles'
  | 'architecture'
  | 'blueprint-review'
  | 'prd-review'
  | 'mvp-review'
  | 'planning-complete'
  | 'general';

interface CoPilotContextType {
  isOpen: boolean;
  isExpanded: boolean;
  currentContext: string;
  currentPhase: CoPilotPhase;
  selectedCardId: string | null;
  conversationId: string | null;
  isNewProject: boolean;
  toggleOpen: () => void;
  toggleExpand: () => void;
  setContext: (context: string) => void;
  setPhase: (phase: CoPilotPhase) => void;
  setSelectedCard: (cardId: string | null) => void;
  openWithContext: (context: string, cardId?: string) => void;
  startNewProjectFlow: () => void;
  endNewProjectFlow: () => void;
  openDrawer: () => void;
}

const CoPilotContext = createContext<CoPilotContextType | null>(null);

export function CoPilotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('agentworks-copilot-open');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('agentworks-copilot-expanded');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [currentContext, setCurrentContext] = useState('planning');
  const [currentPhase, setCurrentPhase] = useState<CoPilotPhase>('general');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [conversationId] = useState<string | null>(null);
  const [isNewProject, setIsNewProject] = useState(false);

  useEffect(() => {
    localStorage.setItem('agentworks-copilot-open', JSON.stringify(isOpen));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('agentworks-copilot-expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        setIsOpen((prev: boolean) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev: boolean) => !prev);
  }, []);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev: boolean) => !prev);
  }, []);

  const setContext = useCallback((context: string) => {
    setCurrentContext(context);
  }, []);

  const setSelectedCard = useCallback((cardId: string | null) => {
    setSelectedCardId(cardId);
  }, []);

  const openWithContext = useCallback((context: string, cardId?: string) => {
    setCurrentContext(context);
    if (cardId) {
      setSelectedCardId(cardId);
    }
    setIsOpen(true);
  }, []);

  const setPhase = useCallback((phase: CoPilotPhase) => {
    setCurrentPhase(phase);
  }, []);

  const startNewProjectFlow = useCallback(() => {
    setIsNewProject(true);
    setCurrentPhase('welcome');
    setCurrentContext('project-init');
    setIsOpen(true);
    setIsExpanded(true);
  }, []);

  const endNewProjectFlow = useCallback(() => {
    setIsNewProject(false);
    setCurrentPhase('general');
    setCurrentContext('planning');
  }, []);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <CoPilotContext.Provider
      value={{
        isOpen,
        isExpanded,
        currentContext,
        currentPhase,
        selectedCardId,
        conversationId,
        isNewProject,
        toggleOpen,
        toggleExpand,
        setContext,
        setPhase,
        setSelectedCard,
        openWithContext,
        startNewProjectFlow,
        endNewProjectFlow,
        openDrawer,
      }}
    >
      {children}
    </CoPilotContext.Provider>
  );
}

export function useCoPilot() {
  const context = useContext(CoPilotContext);
  if (!context) {
    throw new Error('useCoPilot must be used within a CoPilotProvider');
  }
  return context;
}
