import { useState, useRef, useEffect } from 'react';
import {
  Zap,
  Send,
  Loader2,
  User,
  Copy,
  Check,
  Play,
  Plus,
  Bell,
  Clock,
  Sparkles,
} from 'lucide-react';
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

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Create Workflow', prompt: 'Help me create a new automation workflow for...', icon: Plus },
  { label: 'Add Trigger', prompt: 'Help me set up a trigger that fires when...', icon: Bell },
  { label: 'Schedule Task', prompt: 'Help me schedule a recurring task that...', icon: Clock },
  { label: 'Test Flow', prompt: 'Help me test this workflow end-to-end...', icon: Play },
];

export default function WorkflowAgentPanel() {
  const { currentProjectId } = useWorkspaceStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    try {
      // Check if user wants to create/generate a workflow
      const lowerMessage = userMessage.content.toLowerCase();
      const isWorkflowRequest = lowerMessage.includes('create') ||
        lowerMessage.includes('make') ||
        lowerMessage.includes('build') ||
        lowerMessage.includes('generate') ||
        lowerMessage.includes('workflow') ||
        lowerMessage.includes('automate');

      if (isWorkflowRequest) {
        // Use the workflow generation endpoint
        const workflowResponse = await api.copilot.generateWorkflow({
          prompt: userMessage.content,
          projectId: currentProjectId || undefined,
        });

        if (workflowResponse.success && workflowResponse.workflow) {
          // Dispatch the workflow to the canvas
          window.dispatchEvent(new CustomEvent('load-workflow-template', {
            detail: {
              nodes: workflowResponse.workflow.nodes,
              edges: workflowResponse.workflow.edges,
              name: workflowResponse.workflow.name,
            }
          }));

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `✅ I've created the "${workflowResponse.workflow.name}" workflow with ${workflowResponse.workflow.nodes.length} nodes and loaded it onto the canvas!\n\nThe workflow includes:\n${workflowResponse.workflow.nodes.map(n => `• ${n.data?.label || n.id}`).join('\n')}\n\nYou can now edit and customize it on the canvas.`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          throw new Error('Failed to generate workflow');
        }
      } else {
        // Regular chat for non-workflow requests
        const response = await api.copilot.chat({
          message: userMessage.content,
          context: 'workflows',
          projectId: currentProjectId || undefined,
        });

        const assistantMessage: Message = {
          id: response.message?.id || (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message?.content || 'I can help you design and automate workflows. What would you like to create?',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Workflow agent error:', error);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I encountered an issue generating the workflow. Please try again with a clearer description of what you want to automate.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
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

  return (
    <div className="flex flex-col h-full">
      {/* Quick Actions Accordion */}
      <Accordion
        title="Quick Actions"
        icon={<Sparkles className="h-4 w-4" />}
        defaultOpen={messages.length === 0}
      >
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded hover:border-orange-300 hover:bg-orange-50 transition-all text-left"
            >
              <action.icon className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="truncate">{action.label}</span>
            </button>
          ))}
        </div>
      </Accordion>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center mb-3">
              <Zap className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Workflow Agent</h3>
            <p className="text-xs text-slate-500">
              Automation, triggers, and scheduled tasks.
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
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-gradient-to-br from-orange-600 to-amber-600 text-white'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <Zap className="h-3 w-3" />
                  )}
                </div>
                <div
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-lg text-xs relative group',
                    message.role === 'user'
                      ? 'bg-orange-600 text-white'
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
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center shrink-0">
                  <Zap className="h-3 w-3 text-white" />
                </div>
                <div className="bg-slate-100 rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
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
            placeholder="Ask about workflows, triggers..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            rows={1}
            style={{ minHeight: '36px', maxHeight: '80px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
