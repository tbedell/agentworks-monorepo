import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Lightbulb,
  FileText,
  Target,
  Columns3,
  Monitor,
  Database,
  Zap,
  Sparkles,
  Loader2,
  User,
  Copy,
  Check,
  Rocket,
  Users,
  Layers,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCoPilot, CoPilotPhase } from '../../contexts/CoPilotContext';
import { useWorkspaceStore } from '../../stores/workspace';
import { api } from '../../lib/api';
import { Accordion } from '../common/Accordion';
import clsx from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  label: string;
  prompt: string;
  icon: React.ElementType;
}

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
    prompt: "I've generated the **Blueprint** document.\n\n📄 **View it in:** Planning → Project Documentation\n📋 **Review card created:** Check Lane 0 on your Kanban board\n\n**Please review and let me know:**\n- Say **\"approve\"** to proceed\n- Or describe any changes",
    nextPhase: 'prd-review',
    color: 'text-blue-600 bg-blue-50',
  },
  'prd-review': {
    title: 'PRD Review',
    icon: FileText,
    prompt: "I've generated the **PRD**.\n\n**Please review and let me know:**\n- Say **\"approve\"** to proceed to MVP\n- Or describe any changes",
    nextPhase: 'mvp-review',
    color: 'text-green-600 bg-green-50',
  },
  'mvp-review': {
    title: 'MVP Review',
    icon: Target,
    prompt: "I've generated the **MVP Definition**.\n\n**Please review and let me know:**\n- Say **\"approve\"** to proceed\n- Or describe any changes",
    nextPhase: 'playbook-review',
    color: 'text-purple-600 bg-purple-50',
  },
  'playbook-review': {
    title: 'Agent Playbook Review',
    icon: Users,
    prompt: "I've generated the **Agent Playbook**.\n\n**Please review and let me know:**\n- Say **\"approve\"** to start building\n- Or describe any changes",
    nextPhase: 'planning-complete',
    color: 'text-indigo-600 bg-indigo-50',
  },
  'planning-complete': {
    title: 'Ready to Build',
    icon: CheckCircle2,
    prompt: "**Planning Complete!** Your project is ready.\n\nCheck your Kanban board to start development!",
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

const contextConfig: Record<string, {
  title: string;
  icon: React.ElementType;
  color: string;
  quickActions: QuickAction[];
}> = {
  'project-init': {
    title: 'New Project',
    icon: Rocket,
    color: 'text-blue-600 bg-blue-50',
    quickActions: [],
  },
  planning: {
    title: 'Planning',
    icon: Lightbulb,
    color: 'text-amber-600 bg-amber-50',
    quickActions: [
      { label: 'Generate Blueprint', prompt: 'Help me create a comprehensive Blueprint for this project', icon: FileText },
      { label: 'Review PRD', prompt: 'Review the current PRD and suggest improvements', icon: Target },
      { label: 'Define MVP', prompt: 'Help me define the MVP scope for this project', icon: Sparkles },
      { label: 'Q&A Session', prompt: 'Let\'s start a strategic Q&A session for project planning', icon: Bot },
    ],
  },
  kanban: {
    title: 'Kanban',
    icon: Columns3,
    color: 'text-blue-600 bg-blue-50',
    quickActions: [
      { label: 'Create Card', prompt: 'Help me create a new card for this task', icon: FileText },
      { label: 'Assign Agent', prompt: 'Which agent should work on the selected card?', icon: Bot },
      { label: 'Review Progress', prompt: 'Give me a summary of project progress', icon: Target },
      { label: 'Resolve Blocker', prompt: 'Help me resolve blockers on current cards', icon: Sparkles },
    ],
  },
  'ui-builder': {
    title: 'UI Builder',
    icon: Monitor,
    color: 'text-purple-600 bg-purple-50',
    quickActions: [
      { label: 'Generate Component', prompt: 'Help me design a new React component', icon: FileText },
      { label: 'Review Design', prompt: 'Review the current UI design and suggest improvements', icon: Target },
      { label: 'Accessibility', prompt: 'Check this component for accessibility issues', icon: Sparkles },
      { label: 'Style Guide', prompt: 'Show me the project style guide', icon: Bot },
    ],
  },
  'db-builder': {
    title: 'DB Builder',
    icon: Database,
    color: 'text-green-600 bg-green-50',
    quickActions: [
      { label: 'Design Schema', prompt: 'Help me design the database schema', icon: FileText },
      { label: 'Create Migration', prompt: 'Generate a migration for schema changes', icon: Target },
      { label: 'Optimize Queries', prompt: 'Review and optimize database queries', icon: Sparkles },
      { label: 'Add Indexes', prompt: 'Suggest indexes for better performance', icon: Bot },
    ],
  },
  workflows: {
    title: 'Workflows',
    icon: Zap,
    color: 'text-orange-600 bg-orange-50',
    quickActions: [
      { label: 'Create Workflow', prompt: 'Help me create a new automation workflow', icon: FileText },
      { label: 'Add Trigger', prompt: 'Set up a trigger for this workflow', icon: Target },
      { label: 'Test Flow', prompt: 'Help me test this workflow end-to-end', icon: Sparkles },
      { label: 'Debug Issue', prompt: 'Help me debug an issue with this workflow', icon: Bot },
    ],
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

export default function CoPilotPanel() {
  const {
    currentContext, setContext, currentPhase, setPhase,
    isNewProject, endNewProjectFlow,
    messages, setMessages, addMessage
  } = useCoPilot();
  const { currentProjectId, updateProject } = useWorkspaceStore();
  const navigate = useNavigate();
  const [phaseResponses, setPhaseResponses] = useState<Record<CoPilotPhase, string>>({} as any);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.replace('/', '') || 'planning';
    setContext(path);
  }, [location.pathname, setContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const config = contextConfig[currentContext] || contextConfig.planning;
  const phase = phaseConfig[currentPhase];
  const currentPhaseIndex = phaseOrder.indexOf(currentPhase);

  useEffect(() => {
    if (isNewProject && messages.length === 0 && currentPhase === 'welcome') {
      const welcomeMessage: Message = {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: phase.prompt,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isNewProject, currentPhase]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInputValue('');
    setIsLoading(true);

    if (isNewProject) {
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
          let approvalMessage = `**${docTypeName} Approved!**\n\nThe review card has been moved to Complete.`;

          if (nextPhase && nextPhase !== 'planning-complete') {
            const nextDocType = reviewPhaseToDocType[nextPhase];
            if (nextDocType) {
              approvalMessage += `\n\nGenerating ${nextDocType.toUpperCase()}...`;
              const assistantMsg: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: approvalMessage,
                timestamp: new Date(),
              };
              addMessage(assistantMsg);

              await api.copilot.generateDocument({ projectId: currentProjectId, documentType: nextDocType });

              setPhase(nextPhase);
              updateProject(currentProjectId, { phase: nextPhase });

              const nextConfig = phaseConfig[nextPhase];
              const nextPhaseMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: nextConfig.prompt,
                timestamp: new Date(),
              };
              addMessage(nextPhaseMsg);
            }
          } else if (nextPhase === 'planning-complete') {
            approvalMessage += '\n\nAll documents approved! Generating development cards...';
            const assistantMsg: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: approvalMessage,
              timestamp: new Date(),
            };
            addMessage(assistantMsg);

            await api.copilot.generateCards(currentProjectId);

            setPhase('planning-complete');
            updateProject(currentProjectId, { phase: 'planning-complete' });

            const completeMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: phaseConfig['planning-complete'].prompt,
              timestamp: new Date(),
            };
            addMessage(completeMsg);

            endNewProjectFlow();
            navigate('/kanban');
          }
        } catch (error) {
          console.error('Error approving document:', error);
          const errorMsg: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Error approving the document. Please try again.',
            timestamp: new Date(),
          };
          addMessage(errorMsg);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await api.copilot.chat({
          message: userMessage.content,
          context: 'planning',
          projectId: currentProjectId || undefined,
          phase: currentPhase,
        });

        const assistantMessage: Message = {
          id: response.message.id,
          role: 'assistant',
          content: response.message.content,
          timestamp: new Date(response.message.timestamp),
        };
        addMessage(assistantMessage);

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
              const generatingMessage: Message = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: `**Generating all documents in parallel...**\n\n- Blueprint\n- PRD\n- MVP\n- Agent Playbook\n\nCheck the Kanban board for review cards.`,
                timestamp: new Date(),
              };
              addMessage(generatingMessage);
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
            navigate('/kanban');
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

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `(Using guided flow)\n\n${nextConfig.prompt}`,
            timestamp: new Date(),
          };
          addMessage(assistantMessage);

          if (nextPhase === 'planning-complete') {
            endNewProjectFlow();
            navigate('/kanban');
          }
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        const response = await api.copilot.chat({
          message: userMessage.content,
          context: currentContext,
          projectId: currentProjectId || undefined,
          phase: currentPhase,
        });

        const assistantMessage: Message = {
          id: response.message.id,
          role: 'assistant',
          content: response.message.content,
          timestamp: new Date(response.message.timestamp),
        };
        addMessage(assistantMessage);
      } catch (error) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I understand you're working on ${config.title}. What specific aspect would you like me to focus on?`,
          timestamp: new Date(),
        };
        addMessage(assistantMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setInputValue(action.prompt);
    inputRef.current?.focus();
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
      const transitionMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Moving to **${nextConfig.title}** phase.\n\n${nextConfig.prompt}`,
        timestamp: new Date(),
      };
      addMessage(transitionMessage);

      if (nextPhase === 'planning-complete') {
        endNewProjectFlow();
        navigate('/kanban');
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
      const generatingMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**Generating all planning documents...**\n\nCreating Blueprint, PRD, MVP, and Playbook...`,
        timestamp: new Date(),
      };
      addMessage(generatingMessage);

      await api.copilot.generateAll(currentProjectId);

      setPhase('blueprint-review');
      updateProject(currentProjectId, { phase: 'blueprint-review' });

      const successMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `**All documents generated!**\n\nReview cards created in the Kanban board. Please review each document.`,
        timestamp: new Date(),
      };
      addMessage(successMessage);
    } catch (error) {
      console.error('Error generating documents:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**Error generating documents**\n\nPlease try again.`,
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Quick Actions Accordion */}
      <Accordion
        title="Actions"
        icon={<Sparkles className="h-4 w-4" />}
        defaultOpen={messages.length === 0}
      >
        <div className="space-y-2">
          {isNewProject && currentPhaseIndex >= 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600">Progress</span>
                <span className="text-xs text-slate-500">{currentPhaseIndex + 1}/{phaseOrder.length}</span>
              </div>
              <div className="flex gap-0.5">
                {phaseOrder.map((p, idx) => (
                  <div
                    key={p}
                    className={clsx(
                      'flex-1 h-1.5 rounded-full',
                      idx < currentPhaseIndex ? 'bg-green-500' : idx === currentPhaseIndex ? 'bg-blue-500' : 'bg-slate-200'
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <phase.icon className={clsx('h-3.5 w-3.5', phase.color.split(' ')[0])} />
                <span className="text-xs font-medium text-slate-700">{phase.title}</span>
              </div>
            </div>
          )}

          {isNewProject && ['welcome', 'vision', 'requirements', 'goals', 'roles', 'architecture'].includes(currentPhase) && (
            <button
              onClick={handleGenerateAllDocuments}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              Generate All Docs
            </button>
          )}

          {isNewProject && phase.nextPhase && (
            <button
              onClick={handleManualAdvance}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Next Phase
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {!isNewProject && config.quickActions.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {config.quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action)}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                >
                  <action.icon className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="truncate">{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Accordion>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mb-3">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">CEO CoPilot</h3>
            <p className="text-xs text-slate-500">
              Your strategic assistant for planning and development.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
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
            placeholder="Ask CoPilot..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={1}
            style={{ minHeight: '36px', maxHeight: '80px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
