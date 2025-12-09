import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  ChevronLeft,
  ChevronRight,
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
    prompt: "I've drafted your **Blueprint**. Let's review it together.\n\nThe Blueprint includes:\n- Vision & Problem Statement\n- Target Users & Value Proposition\n- Feature Requirements\n- Success Metrics\n- Technical Architecture\n\nReady to proceed to PRD?",
    nextPhase: 'prd-review',
    color: 'text-blue-600 bg-blue-50',
  },
  'prd-review': {
    title: 'PRD Review',
    icon: FileText,
    prompt: "The **Product Requirements Document** is ready.\n\nIt details:\n- User Stories & Acceptance Criteria\n- Feature Specifications\n- API Requirements\n- Data Model\n\nShall we define the MVP scope?",
    nextPhase: 'mvp-review',
    color: 'text-green-600 bg-green-50',
  },
  'mvp-review': {
    title: 'MVP Review',
    icon: Target,
    prompt: "Your **MVP Definition** is complete!\n\nMVP includes:\n- Core features for launch\n- Agent Playbook (who builds what)\n- Priority matrix\n- Timeline estimate\n\nReady to start building?",
    nextPhase: 'planning-complete',
    color: 'text-purple-600 bg-purple-50',
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
      { label: 'Review Progress', prompt: 'Give me a summary of project progress across all lanes', icon: Target },
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
      { label: 'Accessibility Check', prompt: 'Check this component for accessibility issues', icon: Sparkles },
      { label: 'Style Guide', prompt: 'Show me the project style guide and design tokens', icon: Bot },
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
      { label: 'Add Indexes', prompt: 'Suggest indexes for better query performance', icon: Bot },
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
  'architecture', 'blueprint-review', 'prd-review', 'mvp-review', 'planning-complete'
];

export default function CoPilotDrawer() {
  const { 
    isOpen, isExpanded, toggleOpen, toggleExpand, 
    currentContext, setContext, currentPhase, setPhase, 
    isNewProject, endNewProjectFlow 
  } = useCoPilot();
  const { currentProjectId, currentWorkspaceId, projects, updateProject } = useWorkspaceStore();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [phaseResponses, setPhaseResponses] = useState<Record<CoPilotPhase, string>>({} as any);
  
  const _currentProjectList = currentWorkspaceId ? projects[currentWorkspaceId] || [] : [];
  void _currentProjectList;
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

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

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

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    if (isNewProject) {
      // Use AI API for real conversational responses during planning
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
        setMessages(prev => [...prev, assistantMessage]);

        // Handle auto-advance if AI suggests moving to next phase
        if (response.advancePhase) {
          const nextPhase = response.advancePhase as CoPilotPhase;
          const updatedResponses = { ...phaseResponses, [currentPhase]: userMessage.content };
          setPhaseResponses(updatedResponses);

          // Save current phase response before advancing
          if (currentProjectId) {
            await api.copilot.savePhase({
              projectId: currentProjectId,
              phase: currentPhase as any,
              response: userMessage.content,
            });

            // Generate documents at appropriate phases
            if (nextPhase === 'blueprint-review') {
              await api.copilot.generateDocument({ projectId: currentProjectId, documentType: 'blueprint' });
            } else if (nextPhase === 'prd-review') {
              await api.copilot.generateDocument({ projectId: currentProjectId, documentType: 'prd' });
            } else if (nextPhase === 'mvp-review') {
              await api.copilot.generateDocument({ projectId: currentProjectId, documentType: 'mvp' });
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
        // Fallback: use static prompts if AI fails
        const nextPhase = phase.nextPhase;
        if (nextPhase) {
          const nextConfig = phaseConfig[nextPhase];
          const updatedResponses = { ...phaseResponses, [currentPhase]: userMessage.content };
          setPhaseResponses(updatedResponses);

          if (currentProjectId) {
            await api.copilot.savePhase({
              projectId: currentProjectId,
              phase: currentPhase as any,
              response: userMessage.content,
            }).catch(console.error);
          }

          setPhase(nextPhase);
          if (currentProjectId) {
            updateProject(currentProjectId, { phase: nextPhase });
          }

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `(AI service unavailable - using guided flow)\n\n${nextConfig.prompt}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);

          if (nextPhase === 'planning-complete') {
            endNewProjectFlow();
            navigate('/kanban');
          }
        } else {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'I encountered an issue connecting to the AI service. Please check the Admin Panel to ensure API keys are configured.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
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
        setMessages(prev => [...prev, assistantMessage]);

        // Handle auto-advance if AI suggests moving to next phase
        if (response.advancePhase && isNewProject) {
          const nextPhase = response.advancePhase as CoPilotPhase;

          // Save current phase response before advancing
          if (currentProjectId) {
            await api.copilot.savePhase({
              projectId: currentProjectId,
              phase: currentPhase as any,
              response: userMessage.content,
            });

            // Generate documents at appropriate phases
            if (nextPhase === 'blueprint-review') {
              await api.copilot.generateDocument({ projectId: currentProjectId, documentType: 'blueprint' });
            } else if (nextPhase === 'prd-review') {
              await api.copilot.generateDocument({ projectId: currentProjectId, documentType: 'prd' });
            } else if (nextPhase === 'mvp-review') {
              await api.copilot.generateDocument({ projectId: currentProjectId, documentType: 'mvp' });
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
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I understand you're working on ${config.title}. I'm analyzing your request: "${userMessage.content}"\n\nAs your CEO CoPilot, I can help you with strategic planning, reviewing documents, and coordinating agent activities. What specific aspect would you like me to focus on?`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
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

  // Manual phase advancement for when user wants to skip ahead
  const handleManualAdvance = async () => {
    if (!phase.nextPhase || isLoading) return;

    const nextPhase = phase.nextPhase;
    setIsLoading(true);

    try {
      // Save current phase response (use last user message as the response)
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (currentProjectId && lastUserMessage) {
        await api.copilot.savePhase({
          projectId: currentProjectId,
          phase: currentPhase as any,
          response: lastUserMessage.content,
        }).catch(console.error);
      }

      // Generate documents at appropriate phases
      if (currentProjectId) {
        if (nextPhase === 'blueprint-review') {
          await api.copilot.generateDocument({ projectId: currentProjectId, documentType: 'blueprint' });
        } else if (nextPhase === 'prd-review') {
          await api.copilot.generateDocument({ projectId: currentProjectId, documentType: 'prd' });
        } else if (nextPhase === 'mvp-review') {
          await api.copilot.generateDocument({ projectId: currentProjectId, documentType: 'mvp' });
        } else if (nextPhase === 'planning-complete') {
          await api.copilot.generateCards(currentProjectId);
        }
      }

      // Advance the phase
      setPhase(nextPhase);
      if (currentProjectId) {
        updateProject(currentProjectId, { phase: nextPhase });
      }

      // Add transition message
      const nextConfig = phaseConfig[nextPhase];
      const transitionMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Moving to **${nextConfig.title}** phase.\n\n${nextConfig.prompt}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, transitionMessage]);

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

  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-r-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all group"
        title="Open CoPilot (Cmd+Shift+C)"
      >
        <Bot className="h-5 w-5 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div
      className={clsx(
        'fixed left-0 top-0 h-full bg-white shadow-2xl z-50 flex flex-col transition-all duration-300 border-r border-slate-200',
        isExpanded ? 'w-[600px]' : 'w-[400px]'
      )}
    >
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">CEO CoPilot</h2>
            <div className="flex items-center gap-2">
              {isNewProject ? (
                <div className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', phase.color)}>
                  <phase.icon className="h-3 w-3" />
                  <span>{phase.title}</span>
                </div>
              ) : (
                <div className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.color)}>
                  <config.icon className="h-3 w-3" />
                  <span>{config.title}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleExpand}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <button
            onClick={toggleOpen}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close CoPilot"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isNewProject && currentPhaseIndex >= 0 && (
        <div className="p-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">Discovery Progress</span>
            <span className="text-xs text-slate-500">{currentPhaseIndex + 1} / {phaseOrder.length}</span>
          </div>
          <div className="flex gap-1">
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
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <phase.icon className={clsx('h-4 w-4', phase.color.split(' ')[0])} />
              <span className="text-sm font-medium text-slate-700">{phase.title}</span>
            </div>
            {phase.nextPhase && (
              <button
                onClick={handleManualAdvance}
                disabled={isLoading}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                title={`Skip to ${phaseConfig[phase.nextPhase].title}`}
              >
                Next
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {messages.length === 0 && !isNewProject && config.quickActions.length > 0 && (
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <p className="text-sm text-slate-600 mb-3">Quick actions for {config.title}:</p>
          <div className="grid grid-cols-2 gap-2">
            {config.quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
              >
                <action.icon className="h-4 w-4 text-slate-400" />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isNewProject ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">How can I help?</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              I'm your CEO CoPilot - here to assist with strategic planning, project management, and coordinating your agent team.
            </p>
          </div>
        ) : (
          <>
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
                    'flex-1 px-4 py-3 rounded-xl text-sm relative group',
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-800'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <button
                    onClick={() => handleCopy(message.content, message.id)}
                    className={clsx(
                      'absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                      message.role === 'user'
                        ? 'text-white/70 hover:text-white hover:bg-white/10'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
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
                <div className="bg-slate-100 rounded-xl px-4 py-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-white shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask CoPilot anything..."
            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
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
    </div>
  );
}
