import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Palette,
  Layers,
  FolderOpen,
  Link2,
  Send,
  Loader2,
  User,
  Copy,
  Check,
  Code,
  LayoutGrid,
  Sparkles,
  Square,
  Type,
  Image,
  Columns,
} from 'lucide-react';
import BaseLeftPanel from './BaseLeftPanel';
import { Accordion } from '../../common/Accordion';
import { useWorkspaceStore } from '../../../stores/workspace';
import { useUIAgent } from '../../../contexts/UIAgentContext';
import { api } from '../../../lib/api';
import clsx from 'clsx';

interface UIBuilderLeftPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface QuickAction {
  label: string;
  prompt: string;
  icon: React.ElementType;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Login Form', prompt: 'Create a modern login form with email and password fields', icon: Square },
  { label: 'Nav Bar', prompt: 'Create a responsive navigation bar with logo and menu items', icon: Columns },
  { label: 'Hero Section', prompt: 'Create a hero section with headline, subtext, and CTA button', icon: Layers },
  { label: 'Card Grid', prompt: 'Create a responsive grid of cards with images and text', icon: LayoutGrid },
];

const COMPONENT_LIBRARY = [
  { name: 'Button', icon: Square, type: 'button' },
  { name: 'Input', icon: Type, type: 'input' },
  { name: 'Card', icon: Square, type: 'card' },
  { name: 'Image', icon: Image, type: 'image' },
  { name: 'Container', icon: Columns, type: 'container' },
  { name: 'Text', icon: Type, type: 'text' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// UI Agent Chat Component for bottom content
function UIAgentChat() {
  const { currentProjectId } = useWorkspaceStore();
  const { linkedCardId, mode, setMode } = useUIAgent();

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
      const response = await api.uiAgent.chat({
        message: userMessage.content,
        projectId: currentProjectId || '',
        cardId: linkedCardId || undefined,
        mode,
        context: {},
      });

      const assistantMessage: Message = {
        id: response.message?.id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message?.content || 'I can help you design UI components. What would you like to create?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I can help you design and build UI components. Describe what you want to create!',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
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

  return (
    <div className="flex flex-col h-full">
      {/* Mode Toggle */}
      <div className="px-3 py-2 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Mode:</span>
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setMode('html')}
              className={clsx(
                'flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
                mode === 'html'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Code className="h-3 w-3" />
              HTML
            </button>
            <button
              onClick={() => setMode('components')}
              className={clsx(
                'flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
                mode === 'components'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <LayoutGrid className="h-3 w-3" />
              Components
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center mb-2">
              <Palette className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-xs font-semibold text-slate-900 mb-1">UI Agent</h3>
            <p className="text-xs text-slate-500">
              Describe your UI and I'll help build it.
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
                    'w-5 h-5 rounded-md flex items-center justify-center shrink-0',
                    message.role === 'user'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-2.5 w-2.5" />
                  ) : (
                    <Bot className="h-2.5 w-2.5" />
                  )}
                </div>
                <div
                  className={clsx(
                    'flex-1 px-2.5 py-1.5 rounded-lg text-xs relative group',
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
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
                      <Check className="h-2.5 w-2.5" />
                    ) : (
                      <Copy className="h-2.5 w-2.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0">
                  <Bot className="h-2.5 w-2.5 text-white" />
                </div>
                <div className="bg-slate-100 rounded-lg px-2.5 py-1.5">
                  <Loader2 className="h-3 w-3 text-purple-600 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-slate-100 bg-white shrink-0">
        <div className="flex gap-1.5">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your UI..."
            className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={1}
            style={{ minHeight: '32px', maxHeight: '60px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="px-2.5 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UIBuilderLeftPanel({ collapsed, onToggle }: UIBuilderLeftPanelProps) {
  const { linkedCardId, generateFromPrompt, isGenerating } = useUIAgent();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleQuickAction = async (action: QuickAction) => {
    if (isGenerating) return;
    setActiveAction(action.label);
    await generateFromPrompt(action.prompt);
    setActiveAction(null);
  };

  const agentBadge = (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded text-xs">
      <Palette className="h-3 w-3" />
      <span className="font-medium">UI Agent</span>
    </div>
  );

  return (
    <BaseLeftPanel
      collapsed={collapsed}
      onToggle={onToggle}
      title="UI Builder"
      agentButton={agentBadge}
      bottomContent={<UIAgentChat />}
    >
      {/* Quick Actions */}
      <Accordion
        title="Quick Actions"
        icon={<Sparkles className="h-4 w-4" />}
        defaultOpen={true}
      >
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_ACTIONS.map((action) => {
            const isActive = activeAction === action.label;
            return (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action)}
                disabled={isGenerating}
                className={clsx(
                  'flex items-center gap-1.5 px-2 py-1.5 text-xs rounded transition-all text-left',
                  isActive
                    ? 'bg-purple-100 border border-purple-300 text-purple-700'
                    : 'text-slate-700 bg-slate-50 border border-slate-200 hover:border-purple-300 hover:bg-purple-50',
                  isGenerating && !isActive && 'opacity-50 cursor-not-allowed'
                )}
                title={action.prompt}
              >
                {isActive ? (
                  <Loader2 className="h-3 w-3 text-purple-600 animate-spin shrink-0" />
                ) : (
                  <action.icon className="h-3 w-3 text-slate-400 shrink-0" />
                )}
                <span className="truncate">{action.label}</span>
              </button>
            );
          })}
        </div>
      </Accordion>

      {/* Components Library */}
      <Accordion
        title="Components"
        icon={<Layers className="h-4 w-4" />}
        defaultOpen={false}
      >
        <div className="grid grid-cols-3 gap-1.5">
          {COMPONENT_LIBRARY.map((comp) => (
            <button
              key={comp.name}
              className="flex flex-col items-center gap-1 p-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded hover:border-purple-300 hover:bg-purple-50 transition-all"
              title={`Add ${comp.name}`}
            >
              <comp.icon className="h-4 w-4 text-slate-400" />
              <span className="text-xs">{comp.name}</span>
            </button>
          ))}
        </div>
      </Accordion>

      {/* Linked Card */}
      <Accordion
        title="Linked Card"
        icon={<Link2 className="h-4 w-4" />}
        defaultOpen={false}
      >
        <div className="space-y-2">
          {linkedCardId ? (
            <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <Link2 className="h-4 w-4 text-green-600" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-green-700 truncate">
                  Card Linked
                </div>
                <div className="text-xs text-green-600 truncate">
                  ID: {linkedCardId.slice(0, 8)}...
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-center py-2">
              No card linked. Open a card from Kanban to link it.
            </div>
          )}
        </div>
      </Accordion>

      {/* Saved Designs */}
      <Accordion
        title="Saved Designs"
        icon={<FolderOpen className="h-4 w-4" />}
        defaultOpen={false}
      >
        <div className="text-xs text-slate-400 text-center py-2">
          No saved designs yet
        </div>
      </Accordion>
    </BaseLeftPanel>
  );
}
