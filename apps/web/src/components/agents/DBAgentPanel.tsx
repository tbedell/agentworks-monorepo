import { useState, useRef, useEffect } from 'react';
import {
  Database,
  Send,
  Loader2,
  User,
  Copy,
  Check,
  Table2,
  Plus,
  Sparkles,
  Trash2,
  Users,
  ShoppingCart,
  FileText,
} from 'lucide-react';
import { useDBBuilder, DBAgentMessage } from '../../contexts/DBBuilderContext';
import clsx from 'clsx';

interface QuickAction {
  label: string;
  prompt: string;
  icon: React.ElementType;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'User System',
    prompt: 'Create a user management schema with users, roles, and permissions tables. Include proper relationships and audit fields.',
    icon: Users,
  },
  {
    label: 'E-Commerce',
    prompt: 'Create an e-commerce schema with products, categories, orders, order_items, and customers tables. Include pricing, inventory, and proper foreign keys.',
    icon: ShoppingCart,
  },
  {
    label: 'Blog/CMS',
    prompt: 'Create a blog/CMS schema with posts, categories, tags, comments, and authors tables. Include SEO fields and proper relationships.',
    icon: FileText,
  },
  {
    label: 'Add Table',
    prompt: 'Create a new table for ',
    icon: Plus,
  },
];

export default function DBAgentPanel() {
  const {
    messages,
    addMessage,
    clearMessages,
    generateSchemaFromPrompt,
    isGenerating,
    tables,
  } = useDBBuilder();

  const [inputValue, setInputValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage: DBAgentMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    const prompt = inputValue.trim();
    setInputValue('');

    await generateSchemaFromPrompt(prompt);
  };

  const handleQuickAction = async (action: QuickAction) => {
    if (isGenerating) return;

    // For "Add Table", focus the input with the prompt
    if (action.label === 'Add Table') {
      setInputValue(action.prompt);
      inputRef.current?.focus();
      return;
    }

    setActiveAction(action.label);

    const userMessage: DBAgentMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: action.prompt,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    await generateSchemaFromPrompt(action.prompt);
    setActiveAction(null);
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

  const handleClearChat = () => {
    clearMessages();
  };

  // Format message content - hide the ACTION blocks but show the explanation
  const formatMessageContent = (content: string) => {
    // Remove ACTION blocks from display
    let formatted = content.replace(/\[ACTION:CREATE_SCHEMA\][\s\S]*?\[\/ACTION\]/g, '');
    formatted = formatted.replace(/\[ACTION:CREATE_TABLE\][\s\S]*?\[\/ACTION\]/g, '');
    return formatted.trim() || 'Schema created successfully!';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Quick Actions */}
      <div className="px-3 py-2 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Quick Start</span>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
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
                    ? 'bg-green-100 border border-green-300 text-green-700'
                    : 'text-slate-700 bg-slate-50 border border-slate-200 hover:border-green-300 hover:bg-green-50',
                  isGenerating && !isActive && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isActive ? (
                  <Loader2 className="h-3 w-3 text-green-600 animate-spin shrink-0" />
                ) : (
                  <action.icon className="h-3 w-3 text-slate-400 shrink-0" />
                )}
                <span className="truncate">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Schema Stats */}
      {tables.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-100 bg-green-50">
          <div className="flex items-center gap-2 text-xs">
            <Table2 className="h-3.5 w-3.5 text-green-600" />
            <span className="text-green-700 font-medium">{tables.length} tables in schema</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center mb-3">
              <Database className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">DB Schema Agent</h3>
            <p className="text-xs text-slate-500 mb-3">
              Describe your data model and I'll create the schema.
            </p>
            <div className="text-xs text-slate-400">
              Try: "Create a user authentication system" or use Quick Start above
            </div>
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
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gradient-to-br from-green-600 to-emerald-600 text-white'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <Database className="h-3 w-3" />
                  )}
                </div>
                <div
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-lg text-xs relative group',
                    message.role === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 text-slate-800'
                  )}
                >
                  <p className="whitespace-pre-wrap">
                    {message.role === 'assistant'
                      ? formatMessageContent(message.content)
                      : message.content}
                  </p>

                  {/* Show created tables badge */}
                  {message.tables && message.tables.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-1.5 text-green-600">
                        <Sparkles className="h-3 w-3" />
                        <span className="font-medium">
                          Created {message.tables.length} table{message.tables.length > 1 ? 's' : ''}:
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {message.tables.map((table) => (
                          <span
                            key={table.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs"
                          >
                            <Table2 className="h-2.5 w-2.5" />
                            {table.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

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
            {isGenerating && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shrink-0">
                  <Database className="h-3 w-3 text-white" />
                </div>
                <div className="bg-slate-100 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                  <span className="text-xs text-slate-600">Designing schema...</span>
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
            placeholder="Describe your data model..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            rows={1}
            style={{ minHeight: '36px', maxHeight: '80px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isGenerating}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
