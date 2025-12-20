/**
 * MCP Resource Provider Template
 *
 * Visual Layout:
 *               [Resource Init]
 *                      │
 *               [Architect Agent]
 *                      │
 *         ┌────────────┼────────────┐
 *         │            │            │
 *   [List Resources] [Read Resource] [Templates]
 *         │            │            │
 *         └────────────┼────────────┘
 *                      │
 *               [Subscription]
 *                      │
 *               [Register Provider]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const MCP_RESOURCE_PROVIDER: WorkflowTemplateDefinition = {
  id: 'mcp-resource-provider',
  name: 'MCP Resource Provider',
  description: 'Expose files, data, and dynamic content as MCP resources',
  category: 'mcp',
  complexity: 'medium',
  platform: 'node',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Resource Init',
        nodeType: 'trigger',
        description: 'Initialize resource provider',
        config: { event: 'resource-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design resource schema',
        config: { agentName: 'architect' },
      },
    },
    {
      id: 'action-list',
      type: 'workflow',
      position: { x: 100, y: 200 },
      data: {
        label: 'List Resources',
        nodeType: 'action',
        description: 'Implement resource listing',
        config: { command: 'list-resources' },
      },
    },
    {
      id: 'action-read',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Read Resource',
        nodeType: 'action',
        description: 'Implement resource reading',
        config: { command: 'read-resource' },
      },
    },
    {
      id: 'action-templates',
      type: 'workflow',
      position: { x: 400, y: 200 },
      data: {
        label: 'Resource Templates',
        nodeType: 'action',
        description: 'Define URI templates',
        config: { command: 'create-templates' },
      },
    },
    {
      id: 'action-subscription',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Subscriptions',
        nodeType: 'action',
        description: 'Handle resource change notifications',
        config: { command: 'setup-subscriptions' },
      },
    },
    {
      id: 'action-register',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Register Provider',
        nodeType: 'action',
        description: 'Register with MCP server',
        config: { command: 'register-provider' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'action-list', animated: true },
    { id: 'e3', source: 'agent-architect', target: 'action-read', animated: true },
    { id: 'e4', source: 'agent-architect', target: 'action-templates', animated: true },
    { id: 'e5', source: 'action-list', target: 'action-subscription', animated: true },
    { id: 'e6', source: 'action-read', target: 'action-subscription', animated: true },
    { id: 'e7', source: 'action-templates', target: 'action-subscription', animated: true },
    { id: 'e8', source: 'action-subscription', target: 'action-register', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'service',
    stackProfile: getDefaultStackProfile('node'),
    fileSpecs: [
      { path: 'src/resources/file-provider.ts', template: 'mcp-server', variables: {} },
      { path: 'src/resources/database-provider.ts', template: 'mcp-server', variables: {} },
    ],
    dependencies: [
      { name: '@modelcontextprotocol/sdk', version: '^1.0.0', workspace: 'root' },
      { name: 'chokidar', version: '^3.0.0', workspace: 'root' },
    ],
  },

  variables: [
    {
      name: 'resourceType',
      label: 'Resource Type',
      type: 'select',
      default: 'file',
      options: [
        { label: 'File System', value: 'file' },
        { label: 'Database', value: 'database' },
        { label: 'API', value: 'api' },
      ],
      description: 'Type of resource to expose',
    },
    {
      name: 'supportSubscriptions',
      label: 'Support Subscriptions',
      type: 'boolean',
      default: true,
      description: 'Enable resource change notifications',
    },
  ],

  tags: ['mcp', 'resources', 'data', 'provider'],
  requiredAgents: ['architect', 'dev_backend'],
};
