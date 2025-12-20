import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Loader2,
  User,
  Copy,
  Check,
  Code,
  LayoutGrid,
  Link2,
  Unlink,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { useUIAgent } from '../../contexts/UIAgentContext';
import { useWorkspaceStore } from '../../stores/workspace';
import { api } from '../../lib/api';
import type {
  UIAgentMessage,
  UIAgentAction,
  CanvasComponent,
  AddComponentPayload,
  UpdateComponentPayload,
} from '../../types/ui-builder';

interface UIAgentPanelProps {
  currentComponents: CanvasComponent[];
  currentBreakpoint: string;
  onGenerateHTML: (html: string, css: string) => void;
  onAddComponent: (component: CanvasComponent) => void;
  onUpdateComponent: (id: string, updates: Partial<CanvasComponent>) => void;
  onClearCanvas: () => void;
  projectId: string;
}

/**
 * UIAgentPanel - Embedded version of UI Agent for the right panel
 * This component renders the full chat interface without fixed positioning
 */
export function UIAgentPanel({
  currentComponents,
  currentBreakpoint,
  onGenerateHTML,
  onAddComponent,
  onUpdateComponent,
  onClearCanvas,
  projectId,
}: UIAgentPanelProps) {
  const {
    mode,
    linkedCardId,
    messages,
    isLoading,
    generatedHTML,
    setMode,
    setLinkedCard,
    addMessage,
    setLoading,
    setGeneratedHTML,
    clearMessages,
  } = useUIAgent();

  const { currentWorkspaceId: _currentWorkspaceId, projects: _projects } = useWorkspaceStore();
  const [inputValue, setInputValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [partialContent, setPartialContent] = useState<{ html: string; css: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Parse actions from AI response
  const parseActions = (content: string): UIAgentAction[] => {
    const actions: UIAgentAction[] = [];
    const actionRegex = /\[ACTION:(\w+)\]([\s\S]*?)\[\/ACTION\]/g;
    let match;

    while ((match = actionRegex.exec(content)) !== null) {
      const actionType = match[1];
      const actionBody = match[2].trim();

      if (actionType === 'GENERATE_HTML') {
        // Special handling for multi-line HTML/CSS content
        const htmlMatch = actionBody.match(/html:\s*([\s\S]*?)(?=\ncss:|$)/);
        const cssMatch = actionBody.match(/css:\s*([\s\S]*?)(?=\ndescription:|$)/);
        const descMatch = actionBody.match(/description:\s*(.+?)$/m);

        if (htmlMatch || cssMatch) {
          actions.push({
            type: 'GENERATE_HTML',
            payload: {
              html: htmlMatch ? htmlMatch[1].trim() : '',
              css: cssMatch ? cssMatch[1].trim() : '',
              description: descMatch ? descMatch[1].trim() : undefined,
            },
          });
        }
      } else {
        // Parse other action types normally
        const payload: Record<string, any> = {};
        const lines = actionBody.split('\n');
        for (const line of lines) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            if (key.includes('.')) {
              const [parent, child] = key.split('.');
              if (!payload[parent]) payload[parent] = {};
              payload[parent][child] = value;
            } else {
              payload[key] = value;
            }
          }
        }
        actions.push({ type: actionType as UIAgentAction['type'], payload });
      }
    }

    // Fallback: Try to extract incomplete GENERATE_HTML action (for truncated responses)
    if (actions.length === 0 && mode === 'html') {
      const incompleteMatch = content.match(/\[ACTION:GENERATE_HTML\]\s*html:\s*([\s\S]*?)(?:css:\s*([\s\S]*))?$/);
      if (incompleteMatch) {
        const html = incompleteMatch[1].trim();
        let css = incompleteMatch[2] || '';
        if (css) {
          css = css.split('\ndescription:')[0].trim();
        }
        if (html || css) {
          actions.push({
            type: 'GENERATE_HTML',
            payload: { html, css, truncated: true },
          });
          setIsTruncated(true);
          setPartialContent({ html, css });
        }
      }

      // Fallback to markdown code blocks
      if (actions.length === 0) {
        const htmlBlockMatch = content.match(/```html\s*([\s\S]*?)```/);
        const cssBlockMatch = content.match(/```css\s*([\s\S]*?)```/);
        if (htmlBlockMatch && cssBlockMatch) {
          actions.push({
            type: 'GENERATE_HTML',
            payload: {
              html: htmlBlockMatch[1].trim(),
              css: cssBlockMatch[1].trim(),
              description: 'Extracted from code blocks',
            },
          });
        }
      }
    }

    return actions;
  };

  // Clean message content by removing action blocks
  const cleanMessageContent = (content: string): string => {
    return content
      .replace(/\[ACTION:\w+\][\s\S]*?\[\/ACTION\]/g, '')
      .replace(/```html[\s\S]*?```/g, '')
      .replace(/```css[\s\S]*?```/g, '')
      .trim();
  };

  // Execute parsed actions
  const executeActions = (actions: UIAgentAction[]) => {
    for (const action of actions) {
      switch (action.type) {
        case 'GENERATE_HTML': {
          const payload = action.payload as { html: string; css: string };
          if (payload.html || payload.css) {
            onGenerateHTML(payload.html, payload.css);
            setGeneratedHTML({ html: payload.html, css: payload.css });
          }
          break;
        }
        case 'ADD_COMPONENT': {
          const payload = action.payload as AddComponentPayload;
          const defaultProps: CanvasComponent['properties'] = {
            text: payload.name || payload.type,
            color: '#000000',
            backgroundColor: '#FFFFFF',
            padding: '8px',
            margin: '0px',
          };
          const newComponent: CanvasComponent = {
            id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: payload.type,
            name: payload.name || payload.type,
            x: parseInt(String(payload.x)) || 100,
            y: parseInt(String(payload.y)) || 100,
            width: parseInt(String(payload.width)) || 120,
            height: parseInt(String(payload.height)) || 40,
            zIndex: currentComponents.length + 1,
            properties: { ...defaultProps, ...payload.properties },
            parentId: payload.parentId,
          };
          onAddComponent(newComponent);
          break;
        }
        case 'UPDATE_COMPONENT': {
          const payload = action.payload as UpdateComponentPayload;
          if (payload.id && payload.updates) {
            onUpdateComponent(payload.id, payload.updates);
          }
          break;
        }
        case 'CLEAR_CANVAS': {
          onClearCanvas();
          break;
        }
      }
    }
  };

  // Handle continue for truncated responses
  const handleContinue = () => {
    if (isLoading || !isTruncated || !partialContent) return;

    const userMessage: UIAgentMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: 'continue',
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setLoading(true);

    const continueMessage = `Continue generating the CSS from where you left off. The current partial CSS ends with:
\`\`\`
${partialContent.css.slice(-500)}
\`\`\`
Continue from this point and complete the CSS. Include the [ACTION:GENERATE_HTML] block with the remaining CSS.`;

    api.uiAgent.chat({
      message: continueMessage,
      projectId,
      cardId: linkedCardId || undefined,
      mode,
      context: {
        currentComponents,
        currentBreakpoint,
        currentHTML: { html: partialContent.html, css: partialContent.css },
      },
    }).then((response) => {
      let actions = parseActions(response.message.content);

      if (actions.length > 0) {
        const existingAction = actions.find(a => a.type === 'GENERATE_HTML');
        if (existingAction) {
          const payload = existingAction.payload as { html?: string; css?: string };
          if (payload.css) {
            payload.html = partialContent.html;
            payload.css = partialContent.css + '\n' + payload.css;
          }
        }
        setIsTruncated(false);
        setPartialContent(null);
      }

      const cleanContent = cleanMessageContent(response.message.content);
      const assistantMessage: UIAgentMessage = {
        id: response.message.id,
        role: 'assistant',
        content: cleanContent || response.message.content,
        timestamp: new Date(response.message.timestamp),
        actions: actions.length > 0 ? actions : undefined,
      };

      addMessage(assistantMessage);

      if (actions.length > 0) {
        executeActions(actions);
      }
    }).catch((error) => {
      console.error('Error continuing UI Agent response:', error);
      const errorMessage: UIAgentMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Failed to continue generating. Please try again.',
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    }).finally(() => {
      setLoading(false);
    });
  };

  // Handle message send
  const handleSend = async () => {
    const userInput = inputValue.trim();
    if (!userInput || isLoading) return;

    // Check if this is a continue command
    const isContinueCommand = userInput.toLowerCase() === 'continue' && isTruncated && partialContent;
    if (isContinueCommand) {
      setInputValue('');
      handleContinue();
      return;
    }

    const userMessage: UIAgentMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInputValue('');
    setLoading(true);

    try {
      const response = await api.uiAgent.chat({
        message: userInput,
        projectId,
        cardId: linkedCardId || undefined,
        mode,
        context: {
          currentComponents,
          currentBreakpoint,
          currentHTML: generatedHTML || undefined,
        },
      });

      let actions = parseActions(response.message.content);

      if (actions.length > 0) {
        setIsTruncated(false);
        setPartialContent(null);
      }

      const cleanContent = cleanMessageContent(response.message.content);
      const assistantMessage: UIAgentMessage = {
        id: response.message.id,
        role: 'assistant',
        content: cleanContent || response.message.content,
        timestamp: new Date(response.message.timestamp),
        actions: actions.length > 0 ? actions : undefined,
      };

      addMessage(assistantMessage);

      if (actions.length > 0) {
        executeActions(actions);
      }
    } catch (error) {
      console.error('Error sending message to UI Agent:', error);
      const errorMessage: UIAgentMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mode & Controls */}
      <div className="p-3 border-b border-gray-200 space-y-2">
        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Mode:</span>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setMode('html')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                mode === 'html'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Code className="h-3 w-3" />
              HTML
            </button>
            <button
              onClick={() => setMode('components')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                mode === 'components'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
              Components
            </button>
          </div>
        </div>

        {/* Card Link & Clear */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {linkedCardId ? (
              <button
                onClick={() => setLinkedCard(null)}
                className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs"
              >
                <Link2 className="h-3 w-3" />
                Linked
                <Unlink className="h-3 w-3 ml-1" />
              </button>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 text-gray-400 text-xs">
                <Link2 className="h-3 w-3" />
                No card linked
              </span>
            )}
          </div>
          <button
            onClick={clearMessages}
            className="p-1 text-gray-400 hover:text-red-500 rounded"
            title="Clear chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-medium text-gray-900 mb-1">UI Agent Ready</h3>
            <p className="text-xs text-gray-500 mb-3">
              {mode === 'html'
                ? 'Describe the UI you want and I\'ll generate HTML/CSS'
                : 'Tell me what components to add to the canvas'}
            </p>
            <div className="text-xs text-gray-400">
              <p className="mb-1">Try:</p>
              <p className="italic">
                {mode === 'html'
                  ? '"Create a modern login form with email and password"'
                  : '"Add a navigation bar with logo and menu items"'}
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  message.role === 'user'
                    ? 'bg-purple-600'
                    : 'bg-gradient-to-br from-purple-600 to-indigo-600'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="h-3 w-3 text-white" />
                ) : (
                  <Bot className="h-3 w-3 text-white" />
                )}
              </div>
              <div
                className={`group relative max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap break-words text-xs">
                  {message.content}
                </div>
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {message.actions.map((action, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs"
                      >
                        {action.type}
                      </span>
                    ))}
                  </div>
                )}
                {message.role === 'assistant' && (
                  <button
                    onClick={() => handleCopy(message.id, message.content)}
                    className="absolute -right-6 top-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                  >
                    {copiedId === message.id ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="h-3 w-3 text-white" />
            </div>
            <div className="bg-slate-100 rounded-xl px-3 py-2">
              <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
            </div>
          </div>
        )}
        {/* Truncation notice */}
        {isTruncated && !isLoading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Code className="h-3 w-3 text-amber-600" />
            </div>
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs">
              <p className="text-amber-800 font-medium">Response truncated</p>
              <p className="text-amber-600 text-xs mt-0.5">
                Type <span className="font-mono bg-amber-100 px-1 rounded">continue</span> or click the button below
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200">
        {/* Quick continue button when truncated */}
        {isTruncated && !isLoading && (
          <button
            onClick={handleContinue}
            className="w-full mb-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors text-xs font-medium flex items-center justify-center gap-1"
          >
            <ChevronRight className="h-3 w-3" />
            Continue generating
          </button>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isTruncated
                ? 'Type "continue"...'
                : mode === 'html'
                ? 'Describe your UI...'
                : 'What components to add...'
            }
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
            rows={1}
            style={{ minHeight: '36px', maxHeight: '80px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1 text-center">
          Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

export default UIAgentPanel;
