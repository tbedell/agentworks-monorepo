import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  Send,
  Lightbulb,
  FileText,
  Target,
  Loader2,
  User,
  Copy,
  Check,
  Rocket,
  Users,
  Layers,
  CheckCircle2,
  ArrowRight,
  Terminal,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useCoPilot, CoPilotPhase, CoPilotMessage } from '../../contexts/CoPilotContext';
import { useWorkspaceStore } from '../../stores/workspace';
import { api } from '../../lib/api';
import clsx from 'clsx';
import XTerminal from '../terminal/XTerminal';

const phaseConfig: Record<CoPilotPhase, {
  title: string;
  icon: React.ElementType;
  prompt: string;
  nextPhase: CoPilotPhase | null;
  color: string;
}> = {
  welcome: {
    title: 'Welcome',
    icon: Rocket,
    prompt: "Welcome! I'm your CEO CoPilot. Let's build something amazing together.\n\n**What do you want to build today?**\n\nDescribe your project idea - what problem does it solve and who is it for?",
    nextPhase: 'vision',
    color: 'text-blue-600 bg-blue-50',
  },
  vision: {
    title: 'Vision',
    icon: Lightbulb,
    prompt: "Great start! Now let's clarify your **vision**:\n\n1. What's the core problem you're solving?\n2. Who are your target users?\n3. What value will they get?\n4. What makes this unique?",
    nextPhase: 'requirements',
    color: 'text-amber-600 bg-amber-50',
  },
  requirements: {
    title: 'Requirements',
    icon: FileText,
    prompt: "Excellent! Now let's define **requirements**:\n\n1. What are the must-have features?\n2. What are nice-to-have features?\n3. Any technical requirements?\n4. What integrations are needed?",
    nextPhase: 'goals',
    color: 'text-green-600 bg-green-50',
  },
  goals: {
    title: 'Goals & Metrics',
    icon: Target,
    prompt: "Now let's set **goals and success metrics**:\n\n1. What does success look like?\n2. What KPIs should we track?\n3. What's your timeline?\n4. Any specific milestones?",
    nextPhase: 'roles',
    color: 'text-purple-600 bg-purple-50',
  },
  roles: {
    title: 'Roles & Agents',
    icon: Users,
    prompt: "Let's identify **roles and agents** needed:\n\nBased on your project, I recommend these agents:\n- **Architect Agent** - System design\n- **UI Agent** - Frontend development\n- **Backend Agent** - API & business logic\n- **QA Agent** - Testing & quality\n\nAny specific expertise needed?",
    nextPhase: 'architecture',
    color: 'text-indigo-600 bg-indigo-50',
  },
  architecture: {
    title: 'Architecture',
    icon: Layers,
    prompt: "Now let's outline the **high-level architecture**:\n\n1. What tech stack fits best?\n2. How should we structure the frontend?\n3. What backend services are needed?\n4. What's the data model?\n\nI'll help create your Blueprint after this!",
    nextPhase: 'blueprint-review',
    color: 'text-cyan-600 bg-cyan-50',
  },
  'blueprint-review': {
    title: 'Blueprint Review',
    icon: FileText,
    prompt: "I've generated the **Blueprint** document.\n\n📄 **View it in:** Planning → Blueprint tab\n📋 **Review card created:** Check Lane 0 on your Kanban board\n\n**Please review the Blueprint and let me know:**\n- Say **\"approve\"** to proceed to PRD\n- Or describe any changes you'd like me to make",
    nextPhase: 'prd-review',
    color: 'text-blue-600 bg-blue-50',
  },
  'prd-review': {
    title: 'PRD Review',
    icon: FileText,
    prompt: "I've generated the **PRD** (Product Requirements Document).\n\n📄 **View it in:** Planning → PRD tab\n\n**Please review the PRD and let me know:**\n- Say **\"approve\"** to proceed to MVP\n- Or describe any changes you'd like me to make",
    nextPhase: 'mvp-review',
    color: 'text-green-600 bg-green-50',
  },
  'mvp-review': {
    title: 'MVP Review',
    icon: Target,
    prompt: "I've generated the **MVP Definition**.\n\n📄 **View it in:** Planning → MVP tab\n\n**Please review the MVP and let me know:**\n- Say **\"approve\"** to proceed to Agent Playbook\n- Or describe any changes you'd like me to make",
    nextPhase: 'playbook-review',
    color: 'text-purple-600 bg-purple-50',
  },
  'playbook-review': {
    title: 'Agent Playbook Review',
    icon: Users,
    prompt: "I've generated the **Agent Playbook**.\n\n📄 **View it in:** Planning → Agent Playbook tab\n\n**Please review the Agent Playbook and let me know:**\n- Say **\"approve\"** to start building\n- Or describe any changes you'd like me to make",
    nextPhase: 'planning-complete',
    color: 'text-indigo-600 bg-indigo-50',
  },
  'planning-complete': {
    title: 'Ready to Build',
    icon: CheckCircle2,
    prompt: "**Planning Complete!** Your project is ready.\n\nI've created:\n- Blueprint saved\n- PRD documented\n- MVP defined\n- Kanban cards generated\n\nThe agents are ready to start working. Check your Kanban board!",
    nextPhase: null,
    color: 'text-emerald-600 bg-emerald-50',
  },
  general: {
    title: 'Assistant',
    icon: Bot,
    prompt: "How can I help you today?",
    nextPhase: null,
    color: 'text-slate-600 bg-slate-50',
  },
};

const phaseOrder: CoPilotPhase[] = [
  'welcome', 'vision', 'requirements', 'goals', 'roles',
  'architecture', 'blueprint-review', 'prd-review', 'mvp-review', 'playbook-review', 'planning-complete'
];

const isApprovalMessage = (message: string): boolean => {
  const approvalKeywords = [
    'approve', 'approved', 'looks good', 'lgtm', 'yes', 'accept',
    'move forward', 'proceed', 'go ahead', 'ship it', 'perfect',
    'great', 'good to go', 'ready', 'confirm', 'confirmed'
  ];
  const lowerMessage = message.toLowerCase();
  return approvalKeywords.some(keyword => lowerMessage.includes(keyword));
};

const reviewPhaseToDocType: Record<string, 'blueprint' | 'prd' | 'mvp' | 'playbook'> = {
  'blueprint-review': 'blueprint',
  'prd-review': 'prd',
  'mvp-review': 'mvp',
  'playbook-review': 'playbook',
};

interface CoPilotTabProps {
  onDocumentSelect?: (docType: string) => void;
}

export default function CoPilotTab({ onDocumentSelect: _onDocumentSelect }: CoPilotTabProps) {
  const {
    currentPhase, setPhase,
    isNewProject: _isNewProject, endNewProjectFlow,
    messages, addMessage
  } = useCoPilot();
  const { currentProjectId, currentWorkspaceId, projects, updateProject } = useWorkspaceStore();

  // Get current project to access localPath for terminal cwd
  const currentProject = currentWorkspaceId && currentProjectId
    ? projects[currentWorkspaceId]?.find(p => p.id === currentProjectId)
    : null;
  const [phaseResponses, setPhaseResponses] = useState<Record<CoPilotPhase, string>>({} as any);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Terminal state
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Create a terminal session for CoPilot context
  const createTerminalSession = useCallback(async () => {
    if (!currentProjectId || isCreatingSession) return;

    setIsCreatingSession(true);
    try {
      const terminalGatewayUrl = `http://${window.location.hostname}:8005/api/terminal/sessions`;
      const response = await fetch(terminalGatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          userId: 'current-user',
          cwd: currentProject?.localPath,
          // Pass full context for Claude CLI integration
          workspaceId: currentWorkspaceId,
          boardId: currentProject?.boardId,
          projectName: currentProject?.name,
          metadata: {
            context: 'CoPilot Planning',
            phase: currentPhase,
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setTerminalSessionId(data.id);
        setShowTerminal(true);
      } else {
        console.error('Failed to create terminal session:', response.status);
      }
    } catch (error) {
      console.error('Failed to create terminal session:', error);
    } finally {
      setIsCreatingSession(false);
    }
  }, [currentProjectId, currentPhase, isCreatingSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const phase = phaseConfig[currentPhase];
  const currentPhaseIndex = phaseOrder.indexOf(currentPhase);

  useEffect(() => {
    // Only add welcome message if there are no messages (fresh session)
    if (messages.length === 0) {
      const welcomeMessage: CoPilotMessage = {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: phase.prompt,
        timestamp: new Date(),
      };
      addMessage(welcomeMessage);
    }
  }, [currentPhase, messages.length, phase.prompt, addMessage]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: CoPilotMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInputValue('');
    setIsLoading(true);

    // Check if we're in a review phase and user is approving
    const isReviewPhase = currentPhase in reviewPhaseToDocType;
    const userApproved = isApprovalMessage(userMessage.content);

    if (isReviewPhase && userApproved && currentProjectId) {
      const docType = reviewPhaseToDocType[currentPhase];
      const nextPhase = phase.nextPhase;

      try {
        await api.copilot.approveReviewCard({
          projectId: currentProjectId,
          documentType: docType,
        });

        const docTypeName = docType.charAt(0).toUpperCase() + docType.slice(1);
        let approvalMessage = `**${docTypeName} Approved!**\n\nThe review card has been moved to the Complete lane.`;

        if (nextPhase && nextPhase !== 'planning-complete') {
          const nextDocType = reviewPhaseToDocType[nextPhase];
          if (nextDocType) {
            approvalMessage += `\n\nNow reviewing ${nextDocType.toUpperCase()}...`;
            const assistantMsg: CoPilotMessage = {
              id: Date.now().toString(),
              role: 'assistant',
              content: approvalMessage,
              timestamp: new Date(),
            };
            addMessage( assistantMsg);

            setPhase(nextPhase);
            updateProject(currentProjectId, { phase: nextPhase });

            const nextConfig = phaseConfig[nextPhase];
            const nextPhaseMsg: CoPilotMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: nextConfig.prompt,
              timestamp: new Date(),
            };
            addMessage( nextPhaseMsg);
          }
        } else if (nextPhase === 'planning-complete') {
          approvalMessage += '\n\nAll documents approved! Generating development cards...';
          const assistantMsg: CoPilotMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: approvalMessage,
            timestamp: new Date(),
          };
          addMessage( assistantMsg);

          await api.copilot.generateCards(currentProjectId);

          setPhase('planning-complete');
          updateProject(currentProjectId, { phase: 'planning-complete' });

          const completeMsg: CoPilotMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: phaseConfig['planning-complete'].prompt,
            timestamp: new Date(),
          };
          addMessage( completeMsg);

          endNewProjectFlow();
        }
      } catch (error) {
        console.error('Error approving document:', error);
        const errorMsg: CoPilotMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'I encountered an error approving the document. Please try again.',
          timestamp: new Date(),
        };
        addMessage( errorMsg);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Use AI API for real conversational responses
    try {
      const response = await api.copilot.chat({
        message: userMessage.content,
        context: 'planning',
        projectId: currentProjectId || undefined,
        phase: currentPhase,
      });

      const assistantMessage: CoPilotMessage = {
        id: response.message.id,
        role: 'assistant',
        content: response.message.content,
        timestamp: new Date(response.message.timestamp),
      };
      addMessage( assistantMessage);

      if (response.advancePhase) {
        const nextPhase = response.advancePhase as CoPilotPhase;
        const updatedResponses = { ...phaseResponses, [currentPhase]: userMessage.content };
        setPhaseResponses(updatedResponses);

        if (currentProjectId) {
          await api.copilot.savePhase({
            projectId: currentProjectId,
            phase: currentPhase as any,
            response: userMessage.content,
          });

          if (nextPhase === 'blueprint-review') {
            await api.copilot.generateAll(currentProjectId);
            const generatingMessage: CoPilotMessage = {
              id: (Date.now() + 2).toString(),
              role: 'assistant',
              content: `**Launching document generation agents in parallel...**

I'm generating all 4 planning documents simultaneously:
- **Blueprint** - High-level vision and architecture
- **PRD** - Product Requirements Document
- **MVP** - Minimum Viable Product scope
- **Agent Playbook** - Agent execution plan

Each document has a **review card** in the Review lane on the Kanban board.
Check the **Todo** tab in the sidebar to see your review checklist.

Click any card to review, chat about changes, or approve.`,
              timestamp: new Date(),
            };
            addMessage( generatingMessage);
          } else if (nextPhase === 'planning-complete') {
            await api.copilot.generateCards(currentProjectId);
          }
        }

        setPhase(nextPhase);
        if (currentProjectId) {
          updateProject(currentProjectId, { phase: nextPhase });
        }

        if (nextPhase === 'planning-complete') {
          endNewProjectFlow();
        }
      }
    } catch (error) {
      console.error('Error in planning chat:', error);
      const nextPhase = phase.nextPhase;
      if (nextPhase) {
        const nextConfig = phaseConfig[nextPhase];

        setPhase(nextPhase);
        if (currentProjectId) {
          updateProject(currentProjectId, { phase: nextPhase });
        }

        const assistantMessage: CoPilotMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `(AI service unavailable - using guided flow)\n\n${nextConfig.prompt}`,
          timestamp: new Date(),
        };
        addMessage( assistantMessage);

        if (nextPhase === 'planning-complete') {
          endNewProjectFlow();
        }
      } else {
        const errorMessage: CoPilotMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I encountered an issue connecting to the AI service. Please check the Admin Panel to ensure API keys are configured.',
          timestamp: new Date(),
        };
        addMessage( errorMessage);
      }
    } finally {
      setIsLoading(false);
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

  const handleManualAdvance = async () => {
    if (!phase.nextPhase || isLoading) return;

    const nextPhase = phase.nextPhase;
    setIsLoading(true);

    try {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (currentProjectId && lastUserMessage) {
        await api.copilot.savePhase({
          projectId: currentProjectId,
          phase: currentPhase as any,
          response: lastUserMessage.content,
        }).catch(console.error);
      }

      if (currentProjectId) {
        if (nextPhase === 'blueprint-review') {
          await api.copilot.generateDocument({ projectId: currentProjectId, documentType: 'blueprint' });
        } else if (nextPhase === 'prd-review') {
          await api.copilot.generateDocument({ projectId: currentProjectId, documentType: 'prd' });
        } else if (nextPhase === 'mvp-review') {
          await api.copilot.generateDocument({ projectId: currentProjectId, documentType: 'mvp' });
        } else if (nextPhase === 'playbook-review') {
          await api.copilot.generateDocument({ projectId: currentProjectId, documentType: 'playbook' });
        } else if (nextPhase === 'planning-complete') {
          await api.copilot.generateCards(currentProjectId);
        }
      }

      setPhase(nextPhase);
      if (currentProjectId) {
        updateProject(currentProjectId, { phase: nextPhase });
      }

      const nextConfig = phaseConfig[nextPhase];
      const transitionMessage: CoPilotMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Moving to **${nextConfig.title}** phase.\n\n${nextConfig.prompt}`,
        timestamp: new Date(),
      };
      addMessage( transitionMessage);

      if (nextPhase === 'planning-complete') {
        endNewProjectFlow();
      }
    } catch (error) {
      console.error('Error advancing phase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAllDocuments = async () => {
    if (!currentProjectId || isLoading) return;

    setIsLoading(true);

    try {
      const generatingMessage: CoPilotMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**Generating all planning documents...**\n\nI'm now creating:\n- Blueprint\n- PRD (Product Requirements Document)\n- MVP Scope\n- Agent Playbook\n\nThis may take a moment...`,
        timestamp: new Date(),
      };
      addMessage( generatingMessage);

      await api.copilot.generateAll(currentProjectId);

      setPhase('blueprint-review');
      updateProject(currentProjectId, { phase: 'blueprint-review' });

      const successMessage: CoPilotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `**All documents generated successfully!**\n\nI've created review cards for each document in the **Review** lane:\n\n- **Blueprint** - High-level vision and architecture\n- **PRD** - Product Requirements Document\n- **MVP** - Minimum Viable Product scope\n- **Agent Playbook** - Agent execution plan\n\nClick the document tabs above to review each one.`,
        timestamp: new Date(),
      };
      addMessage( successMessage);

    } catch (error) {
      console.error('Error generating documents:', error);
      const errorMessage: CoPilotMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**Error generating documents**\n\nSomething went wrong. Please try again.`,
        timestamp: new Date(),
      };
      addMessage( errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50">
      {/* Phase Progress Header */}
      {currentPhaseIndex >= 0 && (
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Discovery Progress</span>
            <span className="text-xs text-slate-500">{currentPhaseIndex + 1} / {phaseOrder.length}</span>
          </div>
          <div className="flex gap-1 mb-3">
            {phaseOrder.map((p, idx) => {
              const pConfig = phaseConfig[p];
              const isComplete = idx < currentPhaseIndex;
              const isCurrent = idx === currentPhaseIndex;
              return (
                <div
                  key={p}
                  className={clsx(
                    'flex-1 h-2 rounded-full transition-all',
                    isComplete ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-slate-200'
                  )}
                  title={pConfig.title}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={clsx('p-1.5 rounded-lg', phase.color)}>
                <phase.icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-slate-700">{phase.title}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Terminal Toggle Button */}
              <button
                onClick={() => {
                  if (terminalSessionId) {
                    setShowTerminal(!showTerminal);
                  } else {
                    createTerminalSession();
                  }
                }}
                disabled={isCreatingSession}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50',
                  showTerminal
                    ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200'
                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                )}
                title={showTerminal ? 'Hide Terminal' : 'Show Terminal'}
              >
                {isCreatingSession ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Terminal className="h-3.5 w-3.5" />
                )}
                Terminal
              </button>
              {['welcome', 'vision', 'requirements', 'goals', 'roles', 'architecture'].includes(currentPhase) && (
                <button
                  onClick={handleGenerateAllDocuments}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Generate All Docs
                </button>
              )}
              {phase.nextPhase && (
                <button
                  onClick={handleManualAdvance}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              'flex gap-3',
              message.role === 'user' ? 'flex-row-reverse' : ''
            )}
          >
            <div
              className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                message.role === 'user'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
              )}
            >
              {message.role === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>
            <div
              className={clsx(
                'flex-1 px-4 py-3 rounded-xl text-sm relative group max-w-[85%]',
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-800 shadow-sm border border-slate-200'
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <button
                onClick={() => handleCopy(message.content, message.id)}
                className={clsx(
                  'absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                  message.role === 'user'
                    ? 'text-white/70 hover:text-white hover:bg-white/10'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                )}
              >
                {copiedId === message.id ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-200">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask CoPilot anything..."
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>

      {/* Terminal Panel */}
      {showTerminal && terminalSessionId && currentProjectId && (
        <div className="border-t border-slate-200 bg-slate-900">
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-slate-200">Agent Terminal</span>
              <span className="text-xs text-slate-400">Session: {terminalSessionId.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowTerminal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                title="Collapse Terminal"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Terminal Content */}
          <div className="h-64">
            <XTerminal
              sessionId={terminalSessionId}
              projectId={currentProjectId}
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* Collapsed Terminal Bar */}
      {!showTerminal && terminalSessionId && (
        <button
          onClick={() => setShowTerminal(true)}
          className="flex items-center justify-center gap-2 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border-t border-slate-700"
        >
          <ChevronRight className="h-4 w-4" />
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="text-sm">Show Terminal</span>
        </button>
      )}
    </div>
  );
}
