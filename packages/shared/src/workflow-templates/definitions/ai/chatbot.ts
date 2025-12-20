/**
 * AI Chatbot Template
 *
 * Visual Layout:
 *               [Chatbot Init]
 *                      │
 *               [Architect Agent]
 *                      │
 *               [LLM Integration]
 *                      │
 *         ┌────────────┼────────────┐
 *         │            │            │
 *   [System Prompt] [Memory]  [Tools Config]
 *         │            │            │
 *         └────────────┼────────────┘
 *                      │
 *               ┌──────┼──────┐
 *               │      │      │
 *          [Chat UI] [API] [Webhooks]
 *               │      │      │
 *               └──────┼──────┘
 *                      │
 *               [Streaming Response]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const AI_CHATBOT: WorkflowTemplateDefinition = {
  id: 'ai-chatbot',
  name: 'AI Chatbot',
  description: 'Conversational AI chatbot with streaming, memory, and tool use',
  category: 'ai',
  complexity: 'medium',
  platform: 'react',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Chatbot Init',
        nodeType: 'trigger',
        description: 'Initialize chatbot system',
        config: { event: 'chatbot-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design chatbot architecture',
        config: { agentName: 'architect' },
      },
    },
    {
      id: 'action-llm',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'LLM Integration',
        nodeType: 'action',
        description: 'Configure AI provider SDK',
        config: { command: 'setup-llm' },
      },
    },
    {
      id: 'action-prompt',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'System Prompt',
        nodeType: 'action',
        description: 'Define chatbot personality and rules',
        config: { command: 'create-prompt' },
      },
    },
    {
      id: 'action-memory',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Conversation Memory',
        nodeType: 'action',
        description: 'Store and retrieve chat history',
        config: { command: 'setup-memory' },
      },
    },
    {
      id: 'action-tools',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'Tools Config',
        nodeType: 'action',
        description: 'Define tool functions',
        config: { command: 'setup-tools' },
      },
    },
    {
      id: 'ui-chat',
      type: 'workflow',
      position: { x: 100, y: 400 },
      data: {
        label: 'Chat UI',
        nodeType: 'ui',
        description: 'Chat interface component',
        config: { component: 'ChatInterface' },
      },
    },
    {
      id: 'api-chat',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Chat API',
        nodeType: 'api',
        description: 'Chat completion endpoint',
        config: { endpoint: 'chat' },
      },
    },
    {
      id: 'api-webhooks',
      type: 'workflow',
      position: { x: 400, y: 400 },
      data: {
        label: 'Webhooks',
        nodeType: 'api',
        description: 'Integration webhooks',
        config: { endpoint: 'webhooks' },
      },
    },
    {
      id: 'action-streaming',
      type: 'workflow',
      position: { x: 250, y: 500 },
      data: {
        label: 'Streaming Response',
        nodeType: 'action',
        description: 'Enable response streaming',
        config: { command: 'setup-streaming' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'action-llm', animated: true },
    { id: 'e3', source: 'action-llm', target: 'action-prompt', animated: true },
    { id: 'e4', source: 'action-llm', target: 'action-memory', animated: true },
    { id: 'e5', source: 'action-llm', target: 'action-tools', animated: true },
    { id: 'e6', source: 'action-prompt', target: 'ui-chat', animated: true },
    { id: 'e7', source: 'action-memory', target: 'api-chat', animated: true },
    { id: 'e8', source: 'action-tools', target: 'api-webhooks', animated: true },
    { id: 'e9', source: 'ui-chat', target: 'action-streaming', animated: true },
    { id: 'e10', source: 'api-chat', target: 'action-streaming', animated: true },
    { id: 'e11', source: 'api-webhooks', target: 'action-streaming', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'monorepo',
    stackProfile: getDefaultStackProfile('react'),
    fileSpecs: [
      { path: 'apps/web/src/components/ChatInterface.tsx', template: 'react-component', variables: { componentName: 'ChatInterface' } },
      { path: 'apps/api/src/routes/chat.ts', template: 'api-route', variables: { routeName: 'Chat', endpoint: 'chat' } },
      { path: 'apps/api/src/lib/llm.ts', template: 'api-route', variables: { routeName: 'LLM', endpoint: 'llm' } },
    ],
    dependencies: [
      { name: 'ai', version: '^3.0.0', workspace: 'apps/api' },
      { name: '@anthropic-ai/sdk', version: '^0.20.0', workspace: 'apps/api' },
      { name: 'openai', version: '^4.0.0', workspace: 'apps/api' },
    ],
  },

  variables: [
    {
      name: 'llmProvider',
      label: 'LLM Provider',
      type: 'select',
      default: 'anthropic',
      options: [
        { label: 'Anthropic (Claude)', value: 'anthropic' },
        { label: 'OpenAI (GPT)', value: 'openai' },
        { label: 'Google (Gemini)', value: 'google' },
      ],
      description: 'AI model provider',
    },
    {
      name: 'memoryType',
      label: 'Memory Type',
      type: 'select',
      default: 'buffer',
      options: [
        { label: 'Buffer (last N)', value: 'buffer' },
        { label: 'Summary', value: 'summary' },
        { label: 'Vector Store', value: 'vector' },
      ],
      description: 'Conversation memory strategy',
    },
  ],

  tags: ['ai', 'chatbot', 'llm', 'conversational'],
  requiredAgents: ['architect', 'dev_backend', 'dev_frontend'],
};
