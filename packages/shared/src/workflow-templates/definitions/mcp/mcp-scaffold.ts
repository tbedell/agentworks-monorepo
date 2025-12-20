/**
 * MCP Server Scaffold Template
 *
 * Visual Layout:
 *               [Server Init]
 *                      │
 *               [Architect Agent]
 *                      │
 *               [Server Setup]
 *                      │
 *         ┌────────────┼────────────┐
 *         │            │            │
 *   [Tools Config]  [Resources]  [Prompts]
 *         │            │            │
 *         └────────────┼────────────┘
 *                      │
 *               [Transport Layer]
 *                      │
 *               [Test & Debug]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const MCP_SCAFFOLD: WorkflowTemplateDefinition = {
  id: 'mcp-scaffold',
  name: 'MCP Server Scaffold',
  description: 'Model Context Protocol server with tools, resources, and prompts',
  category: 'mcp',
  complexity: 'medium',
  platform: 'node',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Server Init',
        nodeType: 'trigger',
        description: 'Initialize MCP server project',
        config: { event: 'server-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design MCP server architecture',
        config: { agentName: 'architect' },
      },
    },
    {
      id: 'action-setup',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Server Setup',
        nodeType: 'action',
        description: 'Configure MCP SDK and transport',
        config: { command: 'setup-mcp-server' },
      },
    },
    {
      id: 'action-tools',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'Tools Config',
        nodeType: 'action',
        description: 'Define tool schemas and handlers',
        config: { command: 'setup-tools' },
      },
    },
    {
      id: 'action-resources',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Resources',
        nodeType: 'action',
        description: 'Define resource providers',
        config: { command: 'setup-resources' },
      },
    },
    {
      id: 'action-prompts',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'Prompts',
        nodeType: 'action',
        description: 'Define prompt templates',
        config: { command: 'setup-prompts' },
      },
    },
    {
      id: 'action-transport',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Transport Layer',
        nodeType: 'action',
        description: 'Configure stdio or SSE transport',
        config: { command: 'setup-transport' },
      },
    },
    {
      id: 'action-test',
      type: 'workflow',
      position: { x: 250, y: 500 },
      data: {
        label: 'Test & Debug',
        nodeType: 'action',
        description: 'Test server with MCP Inspector',
        config: { command: 'test-mcp' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'action-setup', animated: true },
    { id: 'e3', source: 'action-setup', target: 'action-tools', animated: true },
    { id: 'e4', source: 'action-setup', target: 'action-resources', animated: true },
    { id: 'e5', source: 'action-setup', target: 'action-prompts', animated: true },
    { id: 'e6', source: 'action-tools', target: 'action-transport', animated: true },
    { id: 'e7', source: 'action-resources', target: 'action-transport', animated: true },
    { id: 'e8', source: 'action-prompts', target: 'action-transport', animated: true },
    { id: 'e9', source: 'action-transport', target: 'action-test', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'service',
    stackProfile: getDefaultStackProfile('node'),
    fileSpecs: [
      { path: 'src/index.ts', template: 'mcp-server', variables: { serverName: 'my-mcp-server', toolName: 'example_tool', toolDescription: 'An example tool' } },
      { path: 'src/tools/index.ts', template: 'mcp-server', variables: {} },
      { path: 'src/resources/index.ts', template: 'mcp-server', variables: {} },
    ],
    dependencies: [
      { name: '@modelcontextprotocol/sdk', version: '^1.0.0', workspace: 'root' },
      { name: 'zod', version: '^3.0.0', workspace: 'root' },
    ],
  },

  variables: [
    {
      name: 'serverName',
      label: 'Server Name',
      type: 'string',
      default: 'my-mcp-server',
      description: 'Name of the MCP server',
      required: true,
    },
    {
      name: 'transport',
      label: 'Transport',
      type: 'select',
      default: 'stdio',
      options: [
        { label: 'Standard I/O', value: 'stdio' },
        { label: 'Server-Sent Events', value: 'sse' },
      ],
      description: 'Communication transport',
    },
    {
      name: 'capabilities',
      label: 'Capabilities',
      type: 'select',
      default: 'tools',
      options: [
        { label: 'Tools Only', value: 'tools' },
        { label: 'Tools + Resources', value: 'tools-resources' },
        { label: 'All (Tools, Resources, Prompts)', value: 'all' },
      ],
      description: 'Server capabilities to enable',
    },
  ],

  tags: ['mcp', 'server', 'ai', 'tools'],
  requiredAgents: ['architect', 'dev_backend'],
};
