import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../stores/workspace';
import { api } from '../lib/api';
import type {
  UIAgentMode,
  UIAgentMessage,
  GeneratedHTML,
} from '../types/ui-builder';

interface UIAgentContextType {
  isOpen: boolean;
  isExpanded: boolean;
  mode: UIAgentMode;
  linkedCardId: string | null;
  messages: UIAgentMessage[];
  isLoading: boolean;
  isGenerating: boolean;
  generatedHTML: GeneratedHTML | null;
  // Actions
  toggleOpen: () => void;
  toggleExpand: () => void;
  setMode: (mode: UIAgentMode) => void;
  setLinkedCard: (cardId: string | null) => void;
  addMessage: (message: UIAgentMessage) => void;
  setMessages: (messages: UIAgentMessage[]) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setGeneratedHTML: (html: GeneratedHTML | null) => void;
  generateFromPrompt: (prompt: string) => Promise<{ success: boolean; error?: string }>;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const UIAgentContext = createContext<UIAgentContextType | null>(null);

// Helper to get storage key for messages
const getMessagesStorageKey = (projectId: string | null, cardId: string | null) => {
  const base = projectId ? `ui-agent-messages-${projectId}` : 'ui-agent-messages-default';
  return cardId ? `${base}-card-${cardId}` : base;
};

// Helper to load messages from localStorage
const loadMessages = (projectId: string | null, cardId: string | null): UIAgentMessage[] => {
  try {
    const saved = localStorage.getItem(getMessagesStorageKey(projectId, cardId));
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert timestamp strings back to Date objects
      return parsed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    }
  } catch (e) {
    console.error('Failed to load UI Agent messages:', e);
  }
  return [];
};

// Helper to save messages to localStorage
const saveMessages = (projectId: string | null, cardId: string | null, messages: UIAgentMessage[]) => {
  try {
    localStorage.setItem(getMessagesStorageKey(projectId, cardId), JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to save UI Agent messages:', e);
  }
};

// Helper to load generated HTML from localStorage
const getHTMLStorageKey = (projectId: string | null, cardId: string | null) => {
  const base = projectId ? `ui-agent-html-${projectId}` : 'ui-agent-html-default';
  return cardId ? `${base}-card-${cardId}` : base;
};

const loadGeneratedHTML = (projectId: string | null, cardId: string | null): GeneratedHTML | null => {
  try {
    const saved = localStorage.getItem(getHTMLStorageKey(projectId, cardId));
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load UI Agent HTML:', e);
  }
  return null;
};

const saveGeneratedHTML = (projectId: string | null, cardId: string | null, html: GeneratedHTML | null) => {
  try {
    if (html) {
      localStorage.setItem(getHTMLStorageKey(projectId, cardId), JSON.stringify(html));
    } else {
      localStorage.removeItem(getHTMLStorageKey(projectId, cardId));
    }
  } catch (e) {
    console.error('Failed to save UI Agent HTML:', e);
  }
};

export function UIAgentProvider({ children }: { children: React.ReactNode }) {
  const { currentProjectId } = useWorkspaceStore();
  const previousProjectIdRef = useRef<string | null>(null);

  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('agentworks-ui-agent-open');
    return saved ? JSON.parse(saved) : false;
  });

  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('agentworks-ui-agent-expanded');
    return saved ? JSON.parse(saved) : false;
  });

  const [mode, setModeState] = useState<UIAgentMode>(() => {
    const saved = localStorage.getItem('agentworks-ui-agent-mode');
    return saved ? (JSON.parse(saved) as UIAgentMode) : 'html';
  });

  const [linkedCardId, setLinkedCardIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Message persistence - load from localStorage on mount and project change
  const [messages, setMessagesState] = useState<UIAgentMessage[]>(() =>
    loadMessages(currentProjectId, null)
  );

  // Generated HTML persistence
  const [generatedHTML, setGeneratedHTMLState] = useState<GeneratedHTML | null>(() =>
    loadGeneratedHTML(currentProjectId, null)
  );

  // Reload messages when project changes
  useEffect(() => {
    if (previousProjectIdRef.current !== currentProjectId) {
      const loadedMessages = loadMessages(currentProjectId, linkedCardId);
      setMessagesState(loadedMessages);
      const loadedHTML = loadGeneratedHTML(currentProjectId, linkedCardId);
      setGeneratedHTMLState(loadedHTML);
      previousProjectIdRef.current = currentProjectId;
    }
  }, [currentProjectId, linkedCardId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    saveMessages(currentProjectId, linkedCardId, messages);
  }, [messages, currentProjectId, linkedCardId]);

  // Save generated HTML to localStorage whenever it changes
  useEffect(() => {
    saveGeneratedHTML(currentProjectId, linkedCardId, generatedHTML);
  }, [generatedHTML, currentProjectId, linkedCardId]);

  // Persist open state
  useEffect(() => {
    localStorage.setItem('agentworks-ui-agent-open', JSON.stringify(isOpen));
  }, [isOpen]);

  // Persist expanded state
  useEffect(() => {
    localStorage.setItem('agentworks-ui-agent-expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  // Persist mode
  useEffect(() => {
    localStorage.setItem('agentworks-ui-agent-mode', JSON.stringify(mode));
  }, [mode]);

  // Keyboard shortcut removed - UI Agent is now embedded in the right panel
  // The drawer-related state (isOpen, isExpanded) is kept for backwards compatibility

  const toggleOpen = useCallback(() => {
    setIsOpen((prev: boolean) => !prev);
  }, []);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev: boolean) => !prev);
  }, []);

  const setMode = useCallback((newMode: UIAgentMode) => {
    setModeState(newMode);
  }, []);

  const setLinkedCard = useCallback((cardId: string | null) => {
    setLinkedCardIdState(cardId);
    // Load messages for this card
    const loadedMessages = loadMessages(currentProjectId, cardId);
    setMessagesState(loadedMessages);
    const loadedHTML = loadGeneratedHTML(currentProjectId, cardId);
    setGeneratedHTMLState(loadedHTML);
  }, [currentProjectId]);

  const addMessage = useCallback((message: UIAgentMessage) => {
    setMessagesState((prev) => [...prev, message]);
  }, []);

  const setMessages = useCallback((newMessages: UIAgentMessage[]) => {
    setMessagesState(newMessages);
  }, []);

  const clearMessages = useCallback(() => {
    setMessagesState([]);
    setGeneratedHTMLState(null);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const setGeneratedHTML = useCallback((html: GeneratedHTML | null) => {
    setGeneratedHTMLState(html);
  }, []);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const generateFromPrompt = useCallback(async (prompt: string): Promise<{ success: boolean; error?: string }> => {
    setIsGenerating(true);
    try {
      const response = await api.uiAgent.chat({
        message: prompt,
        projectId: currentProjectId || '',
        cardId: linkedCardId || undefined,
        mode: 'html',
        context: { currentHTML: generatedHTML || undefined },
      });

      // Parse [ACTION:GENERATE_HTML] from response
      const content = response.message?.content || '';
      const htmlMatch = content.match(/\[ACTION:GENERATE_HTML\]([\s\S]*?)\[\/ACTION\]/);

      if (htmlMatch) {
        const actionContent = htmlMatch[1];
        const html = actionContent.match(/html:\s*([\s\S]*?)(?=css:|description:|$)/)?.[1]?.trim();
        const css = actionContent.match(/css:\s*([\s\S]*?)(?=description:|$)/)?.[1]?.trim();

        if (html) {
          setGeneratedHTMLState({ html, css: css || '' });
          return { success: true };
        }
      }

      // If no action block, check if response contains HTML directly
      if (content.includes('<') && content.includes('>')) {
        // Try to extract HTML from code block
        const codeBlockMatch = content.match(/```html?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          setGeneratedHTMLState({ html: codeBlockMatch[1].trim(), css: '' });
          return { success: true };
        }
      }

      return { success: false, error: 'No HTML generated in response' };
    } catch (error) {
      console.error('Failed to generate from prompt:', error);
      return { success: false, error: String(error) };
    } finally {
      setIsGenerating(false);
    }
  }, [currentProjectId, linkedCardId, generatedHTML]);

  return (
    <UIAgentContext.Provider
      value={{
        isOpen,
        isExpanded,
        mode,
        linkedCardId,
        messages,
        isLoading,
        isGenerating,
        generatedHTML,
        toggleOpen,
        toggleExpand,
        setMode,
        setLinkedCard,
        addMessage,
        setMessages,
        clearMessages,
        setLoading,
        setGeneratedHTML,
        generateFromPrompt,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </UIAgentContext.Provider>
  );
}

export function useUIAgent() {
  const context = useContext(UIAgentContext);
  if (!context) {
    throw new Error('useUIAgent must be used within a UIAgentProvider');
  }
  return context;
}
