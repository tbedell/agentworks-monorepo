import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../stores/workspace';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

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
  | 'playbook-review'
  | 'planning-complete'
  | 'general';

export interface CoPilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CoPilotContextType {
  isOpen: boolean;
  isExpanded: boolean;
  currentContext: string;
  currentPhase: CoPilotPhase;
  selectedCardId: string | null;
  conversationId: string | null;
  isNewProject: boolean;
  // Project data for context
  projectName: string | null;
  projectId: string | null;
  // Message persistence
  messages: CoPilotMessage[];
  addMessage: (message: CoPilotMessage) => void;
  setMessages: (messages: CoPilotMessage[]) => void;
  clearMessages: () => void;
  // Actions
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

// Helper to get storage key for messages
const getMessagesStorageKey = (projectId: string | null) =>
  projectId ? `copilot-messages-${projectId}` : 'copilot-messages-default';

// Helper to load messages from localStorage
const loadMessages = (projectId: string | null): CoPilotMessage[] => {
  try {
    const saved = localStorage.getItem(getMessagesStorageKey(projectId));
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert timestamp strings back to Date objects
      return parsed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    }
  } catch (e) {
    console.error('Failed to load CoPilot messages:', e);
  }
  return [];
};

// Helper to save messages to localStorage
const saveMessages = (projectId: string | null, messages: CoPilotMessage[]) => {
  try {
    localStorage.setItem(getMessagesStorageKey(projectId), JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to save CoPilot messages:', e);
  }
};

export function CoPilotProvider({ children }: { children: React.ReactNode }) {
  const { currentProjectId } = useWorkspaceStore();
  const previousProjectIdRef = useRef<string | null>(null);

  // Fetch project data to sync phase
  const { data: projectData } = useQuery({
    queryKey: ['project', currentProjectId],
    queryFn: () => currentProjectId ? api.projects.get(currentProjectId) : null,
    enabled: !!currentProjectId,
  });

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

  // Sync phase with project's actual phase
  useEffect(() => {
    if (projectData?.phase && !isNewProject) {
      const validPhases: CoPilotPhase[] = [
        'welcome', 'vision', 'requirements', 'goals', 'roles', 'architecture',
        'blueprint-review', 'prd-review', 'mvp-review', 'playbook-review', 'planning-complete', 'general'
      ];
      const projectPhase = projectData.phase as CoPilotPhase;
      if (validPhases.includes(projectPhase)) {
        setCurrentPhase(projectPhase);
      }
    }
  }, [projectData?.phase, isNewProject]);

  // Message persistence - load from localStorage on mount and project change
  const [messages, setMessagesState] = useState<CoPilotMessage[]>(() =>
    loadMessages(currentProjectId)
  );

  // Reload messages when project changes
  useEffect(() => {
    if (previousProjectIdRef.current !== currentProjectId) {
      const loadedMessages = loadMessages(currentProjectId);
      setMessagesState(loadedMessages);
      previousProjectIdRef.current = currentProjectId;
    }
  }, [currentProjectId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    saveMessages(currentProjectId, messages);
  }, [messages, currentProjectId]);

  useEffect(() => {
    localStorage.setItem('agentworks-copilot-open', JSON.stringify(isOpen));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('agentworks-copilot-expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  // Note: Keyboard shortcut removed - CoPilot is now embedded in the right panel of UIBuilder
  // rather than being a floating drawer.

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

  // Message manipulation functions
  const addMessage = useCallback((message: CoPilotMessage) => {
    setMessagesState((prev) => [...prev, message]);
  }, []);

  const setMessages = useCallback((newMessages: CoPilotMessage[]) => {
    setMessagesState(newMessages);
  }, []);

  const clearMessages = useCallback(() => {
    setMessagesState([]);
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
        projectName: projectData?.name || null,
        projectId: currentProjectId,
        messages,
        addMessage,
        setMessages,
        clearMessages,
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
