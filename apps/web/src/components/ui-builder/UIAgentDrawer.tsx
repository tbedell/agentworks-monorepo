import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  ChevronLeft,
  ChevronRight,
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
} from 'lucide-react';
import { useUIAgent } from '../../contexts/UIAgentContext';
import { useWorkspaceStore } from '../../stores/workspace';
import { api } from '../../lib/api';
import clsx from 'clsx';
import type {
  UIAgentMessage,
  UIAgentAction,
  CanvasComponent,
  AddComponentPayload,
  UpdateComponentPayload,
} from '../../types/ui-builder';

interface UIAgentDrawerProps {
  currentComponents: CanvasComponent[];
  currentBreakpoint: string;
  onGenerateHTML: (html: string, css: string) => void;
  onAddComponent: (component: CanvasComponent) => void;
  onUpdateComponent: (id: string, updates: Partial<CanvasComponent>) => void;
  onClearCanvas: () => void;
  projectId: string;
}

export function UIAgentDrawer({
  currentComponents,
  currentBreakpoint,
  onGenerateHTML,
  onAddComponent,
  onUpdateComponent,
  onClearCanvas,
  projectId,
}: UIAgentDrawerProps) {
  const {
    isOpen,
    isExpanded,
    mode,
    linkedCardId,
    messages,
    isLoading,
    generatedHTML,
    toggleOpen,
    toggleExpand,
    setMode,
    setLinkedCard,
    addMessage,
    setLoading,
    setGeneratedHTML,
    clearMessages,
  } = useUIAgent();

  const { currentWorkspaceId, projects } = useWorkspaceStore();
  const [inputValue, setInputValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [partialContent, setPartialContent] = useState<{ html: string; css: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get cards from current project for linking (placeholder for future card selector)
  const _currentProject = currentWorkspaceId && projectId
    ? projects[currentWorkspaceId]?.find(p => p.id === projectId)
    : null;
  void _currentProject; // Mark as intentionally unused for now

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Parse actions from AI response
  const parseActions = (content: string): UIAgentAction[] => {
    const actions: UIAgentAction[] = [];
    const actionRegex = /\[ACTION:(\w+)\]([\s\S]*?)\[\/ACTION\]/g;
    let match;

    while ((match = actionRegex.exec(content)) !== null) {
      const actionType = match[1];
      const actionContent = match[2].trim();

      // Special handling for GENERATE_HTML - parse html/css/description more carefully
      if (actionType === 'GENERATE_HTML') {
        const payload: Record<string, any> = {};

        // Find description (usually at the end, single line)
        const descMatch = actionContent.match(/\ndescription:\s*(.+?)$/m);
        if (descMatch) {
          payload.description = descMatch[1].trim();
        }

        // Find the css: marker and extract CSS
        const cssMarkerIndex = actionContent.indexOf('\ncss:');
        const cssMarkerAltIndex = actionContent.indexOf('css:');
        const cssStartIndex = cssMarkerIndex !== -1 ? cssMarkerIndex + 5 :
                              (cssMarkerAltIndex === 0 ? 4 : -1);

        // Find the html: marker
        const htmlMarkerIndex = actionContent.indexOf('html:');

        if (htmlMarkerIndex !== -1) {
          let htmlEndIndex: number;

          if (cssMarkerIndex !== -1) {
            // HTML ends where CSS begins
            htmlEndIndex = cssMarkerIndex;
          } else if (descMatch) {
            // HTML ends where description begins
            htmlEndIndex = actionContent.lastIndexOf('\ndescription:');
          } else {
            htmlEndIndex = actionContent.length;
          }

          payload.html = actionContent.substring(htmlMarkerIndex + 5, htmlEndIndex).trim();
        }

        if (cssStartIndex !== -1) {
          let cssEndIndex: number;
          if (descMatch) {
            cssEndIndex = actionContent.lastIndexOf('\ndescription:');
          } else {
            cssEndIndex = actionContent.length;
          }
          const cssContent = actionContent.substring(
            actionContent.indexOf('\ncss:') !== -1 ? actionContent.indexOf('\ncss:') + 5 : 4,
            cssEndIndex
          ).trim();
          payload.css = cssContent;
        }

        actions.push({
          type: 'GENERATE_HTML',
          payload,
        });
        continue;
      }

      // Parse key-value pairs from action content for other action types
      const payload: Record<string, any> = {};
      const lines = actionContent.split('\n');

      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();

          // Parse numeric values
          if (['x', 'y', 'width', 'height', 'zIndex'].includes(key)) {
            payload[key] = parseFloat(value) || 0;
          }
          // Parse boolean values
          else if (key === 'confirm') {
            payload[key] = value.toLowerCase() === 'true';
          }
          // Handle nested properties
          else if (key.startsWith('properties.')) {
            const propKey = key.replace('properties.', '');
            if (!payload.properties) payload.properties = {};
            payload.properties[propKey] = value;
          }
          else {
            payload[key] = value;
          }
        }
      }

      actions.push({
        type: actionType as UIAgentAction['type'],
        payload,
      });
    }

    return actions;
  };

  // Remove action blocks from displayed message
  const cleanMessageContent = (content: string): string => {
    return content.replace(/\[ACTION:\w+\][\s\S]*?\[\/ACTION\]/g, '').trim();
  };

  // Execute actions from AI response
  const executeActions = (actions: UIAgentAction[]) => {
    console.log('[UI Agent] Executing actions:', actions.length);
    for (const action of actions) {
      console.log('[UI Agent] Executing action:', action.type, action.payload);
      switch (action.type) {
        case 'GENERATE_HTML': {
          const { html, css } = action.payload as { html: string; css: string };
          console.log('[UI Agent] GENERATE_HTML - html length:', html?.length, 'css length:', css?.length);
          if (html) {
            console.log('[UI Agent] Calling onGenerateHTML callback');
            onGenerateHTML(html, css || '');
            setGeneratedHTML({ html, css: css || '' });
          }
          break;
        }
        case 'ADD_COMPONENT': {
          const payload = action.payload as AddComponentPayload;
          const newComponent: CanvasComponent = {
            id: `${payload.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: payload.type,
            name: payload.name || `${payload.type} ${Date.now()}`,
            x: payload.x || 100,
            y: payload.y || 100,
            width: payload.width || 120,
            height: payload.height || 40,
            properties: {
              text: payload.properties?.text || '',
              color: payload.properties?.color || '#000000',
              backgroundColor: payload.properties?.backgroundColor || '#FFFFFF',
              padding: payload.properties?.padding || '8px',
              margin: payload.properties?.margin || '0',
            },
            parentId: payload.parentId || null,
          };
          onAddComponent(newComponent);
          break;
        }
        case 'UPDATE_COMPONENT': {
          const { id, ...updates } = action.payload as UpdateComponentPayload & { id: string };
          if (id) {
            onUpdateComponent(id, updates as Partial<CanvasComponent>);
          }
          break;
        }
        case 'CLEAR_CANVAS': {
          if (action.payload.confirm) {
            onClearCanvas();
          }
          break;
        }
      }
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userInput = inputValue.trim();
    const isContinueCommand = userInput.toLowerCase() === 'continue' && isTruncated && partialContent;

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
      // Build message for continuation or new request
      let messageToSend = userInput;
      if (isContinueCommand && partialContent) {
        messageToSend = `Continue generating the CSS from where you left off. The current partial CSS ends with:
\`\`\`
${partialContent.css.slice(-500)}
\`\`\`
Continue from this point and complete the CSS. Include the [ACTION:GENERATE_HTML] block with the remaining CSS appended to complete the styles.`;
      }

      const response = await api.uiAgent.chat({
        message: messageToSend,
        projectId,
        cardId: linkedCardId || undefined,
        mode,
        context: {
          currentComponents,
          currentBreakpoint,
          currentHTML: isContinueCommand && partialContent
            ? { html: partialContent.html, css: partialContent.css }
            : generatedHTML || undefined,
        },
      });

      // Parse actions from response
      console.log('[UI Agent] Full response length:', response.message.content.length);
      console.log('[UI Agent] Response has [ACTION:', response.message.content.includes('[ACTION:'));
      console.log('[UI Agent] Response has [/ACTION]:', response.message.content.includes('[/ACTION]'));

      // Extract action block for debugging
      const actionMatch = response.message.content.match(/\[ACTION:GENERATE_HTML\]([\s\S]*?)\[\/ACTION\]/);
      console.log('[UI Agent] Action match found:', !!actionMatch);
      if (actionMatch) {
        console.log('[UI Agent] Action content preview:', actionMatch[1].substring(0, 200));
      }

      let actions = parseActions(response.message.content);
      console.log('[UI Agent] Parsed actions:', actions);

      // If we successfully parsed a complete action, clear truncation state
      if (actions.length > 0) {
        // If this was a continuation, merge with existing content
        if (isContinueCommand && partialContent) {
          const existingAction = actions.find(a => a.type === 'GENERATE_HTML');
          if (existingAction) {
            const payload = existingAction.payload as { html?: string; css?: string };
            // Keep existing HTML, append new CSS
            if (payload.css) {
              payload.html = partialContent.html;
              payload.css = partialContent.css + '\n' + payload.css;
            }
          }
        }
        setIsTruncated(false);
        setPartialContent(null);
      }

      // Fallback: Try to extract HTML/CSS from markdown code blocks if no actions found
      if (actions.length === 0 && mode === 'html') {
        console.log('[UI Agent] No actions found, trying fallbacks...');

        // Fallback 1: Try incomplete action block (response was truncated)
        const incompleteActionMatch = response.message.content.match(/\[ACTION:GENERATE_HTML\]\s*html:\s*([\s\S]*?)(?:css:\s*([\s\S]*))?$/);
        if (incompleteActionMatch) {
          console.log('[UI Agent] Found incomplete action block (response was likely truncated)');
          const html = incompleteActionMatch[1].trim();
          // Try to separate html and css if css: marker exists
          const cssMarkerIndex = html.indexOf('\ncss:');
          let finalHtml = html;
          let finalCss = incompleteActionMatch[2] || '';

          if (cssMarkerIndex !== -1) {
            finalHtml = html.substring(0, cssMarkerIndex).trim();
            finalCss = html.substring(cssMarkerIndex + 5).trim();
          }

          // Clean up any trailing incomplete CSS
          if (finalCss && !finalCss.includes('}')) {
            // CSS was cut off, try to make it valid by closing any open braces
            const openBraces = (finalCss.match(/{/g) || []).length;
            const closeBraces = (finalCss.match(/}/g) || []).length;
            for (let i = 0; i < openBraces - closeBraces; i++) {
              finalCss += ' }';
            }
          }

          // If this is a continuation, append to existing content
          if (isContinueCommand && partialContent) {
            finalHtml = partialContent.html;
            finalCss = partialContent.css + '\n' + finalCss;
          }

          actions = [{
            type: 'GENERATE_HTML',
            payload: { html: finalHtml, css: finalCss, description: 'Generated (response may have been truncated)', truncated: true }
          }];

          // Mark as truncated so user can continue
          setIsTruncated(true);
          setPartialContent({ html: finalHtml, css: finalCss });
          console.log('[UI Agent] Created action from incomplete block, html length:', finalHtml.length, 'css length:', finalCss.length);
        } else {
          // Response was complete, clear truncation state
          setIsTruncated(false);
          setPartialContent(null);
        }

        // Fallback 2: Try markdown code blocks
        if (actions.length === 0) {
          const htmlMatch = response.message.content.match(/```html\s*([\s\S]*?)```/);
          const cssMatch = response.message.content.match(/```css\s*([\s\S]*?)```/);

          if (htmlMatch) {
            console.log('[UI Agent] Found HTML in markdown code block');
            const html = htmlMatch[1].trim();
            const css = cssMatch ? cssMatch[1].trim() : '';

            actions = [{
              type: 'GENERATE_HTML',
              payload: { html, css, description: 'Generated from markdown code blocks' }
            }];
            console.log('[UI Agent] Created fallback action with html length:', html.length);
          }
        }
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

      // Execute any actions
      if (actions.length > 0) {
        executeActions(actions);
      }

      // If response includes generated HTML directly
      if (response.generatedHTML) {
        onGenerateHTML(response.generatedHTML.html, response.generatedHTML.css);
        setGeneratedHTML(response.generatedHTML);
      }
    } catch (error) {
      console.error('Error in UI Agent chat:', error);
      const errorMessage: UIAgentMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I encountered an error connecting to the AI service. Please check that the API is configured correctly and try again.',
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
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

  const handleClearChat = () => {
    clearMessages();
  };

  // Handle continue button click for truncated responses
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
Continue from this point and complete the CSS. Include the [ACTION:GENERATE_HTML] block with the remaining CSS appended to complete the styles.`;

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
        // Merge with existing content
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
      } else if (mode === 'html') {
        // Try incomplete action fallback
        const incompleteMatch = response.message.content.match(/\[ACTION:GENERATE_HTML\]\s*html:\s*([\s\S]*?)(?:css:\s*([\s\S]*))?$/);
        if (incompleteMatch) {
          let newCss = incompleteMatch[2] || incompleteMatch[1].split('\ncss:')[1] || '';
          const mergedCss = partialContent.css + '\n' + newCss.trim();

          // Close any open braces
          const openBraces = (mergedCss.match(/{/g) || []).length;
          const closeBraces = (mergedCss.match(/}/g) || []).length;
          let finalCss = mergedCss;
          for (let i = 0; i < openBraces - closeBraces; i++) {
            finalCss += ' }';
          }

          actions = [{
            type: 'GENERATE_HTML',
            payload: { html: partialContent.html, css: finalCss, truncated: true }
          }];
          setPartialContent({ html: partialContent.html, css: finalCss });
          // Still truncated, user can continue again
        } else {
          setIsTruncated(false);
          setPartialContent(null);
        }
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

  // Closed state - show toggle button
  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 rounded-r-xl shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all group"
        title="Open UI Agent (Alt+U)"
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
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">UI Agent</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                {mode === 'html' ? (
                  <>
                    <Code className="h-3 w-3" />
                    <span>HTML/CSS</span>
                  </>
                ) : (
                  <>
                    <LayoutGrid className="h-3 w-3" />
                    <span>Components</span>
                  </>
                )}
              </div>
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
            title="Close UI Agent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mode Toggle & Card Link */}
      <div className="p-3 border-b border-slate-100 bg-slate-50 space-y-3">
        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Mode:</span>
          <div className="flex bg-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => setMode('html')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                mode === 'html'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              )}
            >
              <Code className="h-3 w-3" />
              HTML/CSS
            </button>
            <button
              onClick={() => setMode('components')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                mode === 'components'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              )}
            >
              <LayoutGrid className="h-3 w-3" />
              Components
            </button>
          </div>
        </div>

        {/* Card Link */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {linkedCardId ? (
              <>
                <Link2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs text-slate-600">
                  Linked to card
                </span>
                <button
                  onClick={() => setLinkedCard(null)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  title="Unlink card"
                >
                  <Unlink className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <Unlink className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-500">No card linked</span>
              </>
            )}
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-red-600 transition-colors"
              title="Clear chat"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">UI Agent Ready</h3>
            <p className="text-sm text-slate-500 max-w-xs mb-4">
              {mode === 'html'
                ? "Describe your UI and I'll generate HTML/CSS mockups for you."
                : "Tell me what components to add and I'll place them on the canvas."}
            </p>
            <div className="space-y-2 text-left text-xs text-slate-400">
              <p><strong>Try:</strong></p>
              {mode === 'html' ? (
                <>
                  <p>"Create a hero section with a gradient background"</p>
                  <p>"Build a pricing table with 3 tiers"</p>
                  <p>"Design a modern navigation bar"</p>
                </>
              ) : (
                <>
                  <p>"Add a blue submit button at the bottom"</p>
                  <p>"Create a form with name and email fields"</p>
                  <p>"Add a navigation bar at the top"</p>
                </>
              )}
            </div>
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
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
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
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-800'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500">
                      {message.actions.map((action, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 mr-2">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          {action.type}
                        </span>
                      ))}
                    </div>
                  )}
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
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-100 rounded-xl px-4 py-3">
                  <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                </div>
              </div>
            )}
            {/* Truncation notice */}
            {isTruncated && !isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Code className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                  <p className="text-amber-800 font-medium">Response was truncated</p>
                  <p className="text-amber-600 text-xs mt-1">
                    The CSS was too long to generate in one response. Type <span className="font-mono bg-amber-100 px-1 rounded">continue</span> to generate the remaining styles.
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white shrink-0">
        {/* Quick continue button when truncated */}
        {isTruncated && !isLoading && (
          <button
            onClick={handleContinue}
            className="w-full mb-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-xl hover:bg-amber-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <ChevronRight className="h-4 w-4" />
            Continue generating CSS
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
                ? 'Type "continue" or click the button above...'
                : mode === 'html'
                ? 'Describe your UI mockup...'
                : 'Tell me what components to add...'
            }
            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

export default UIAgentDrawer;
