/**
 * MCP Tool Integration Template
 *
 * Visual Layout:
 *               [Tool Request]
 *                      │
 *               [Architect Agent]
 *                      │
 *               [Tool Schema]
 *                      │
 *         ┌────────────┼────────────┐
 *         │            │            │
 *   [Input Validation] [Handler]  [Output Format]
 *         │            │            │
 *         └────────────┼────────────┘
 *                      │
 *               [Error Handling]
 *                      │
 *               [Register Tool]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const MCP_TOOL_INTEGRATION: WorkflowTemplateDefinition = {
  id: 'mcp-tool-integration',
  name: 'MCP Tool Integration',
  description: 'Add custom tools to an MCP server with validation and error handling',
  category: 'mcp',
  complexity: 'medium',
  platform: 'node',

  nodes: [
    {
      id: 'trigger-request',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Tool Request',
        nodeType: 'trigger',
        description: 'Define tool requirements',
        config: { event: 'tool-request' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design tool interface',
        config: { agentName: 'architect' },
      },
    },
    {
      id: 'action-schema',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Tool Schema',
        nodeType: 'action',
        description: 'Define JSON Schema for tool inputs',
        config: { command: 'create-schema' },
      },
    },
    {
      id: 'action-validation',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'Input Validation',
        nodeType: 'action',
        description: 'Validate inputs with Zod',
        config: { command: 'setup-validation' },
      },
    },
    {
      id: 'action-handler',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Tool Handler',
        nodeType: 'action',
        description: 'Implement tool logic',
        config: { command: 'create-handler' },
      },
    },
    {
      id: 'action-output',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'Output Format',
        nodeType: 'action',
        description: 'Format tool response',
        config: { command: 'format-output' },
      },
    },
    {
      id: 'action-errors',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Error Handling',
        nodeType: 'action',
        description: 'Handle errors and edge cases',
        config: { command: 'setup-errors' },
      },
    },
    {
      id: 'action-register',
      type: 'workflow',
      position: { x: 250, y: 500 },
      data: {
        label: 'Register Tool',
        nodeType: 'action',
        description: 'Register tool with MCP server',
        config: { command: 'register-tool' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-request', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'action-schema', animated: true },
    { id: 'e3', source: 'action-schema', target: 'action-validation', animated: true },
    { id: 'e4', source: 'action-schema', target: 'action-handler', animated: true },
    { id: 'e5', source: 'action-schema', target: 'action-output', animated: true },
    { id: 'e6', source: 'action-validation', target: 'action-errors', animated: true },
    { id: 'e7', source: 'action-handler', target: 'action-errors', animated: true },
    { id: 'e8', source: 'action-output', target: 'action-errors', animated: true },
    { id: 'e9', source: 'action-errors', target: 'action-register', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'service',
    stackProfile: getDefaultStackProfile('node'),
    fileSpecs: [
      { path: 'src/tools/my-tool.ts', template: 'mcp-server', variables: { toolName: 'my_tool' } },
      { path: 'src/tools/schemas.ts', template: 'mcp-server', variables: {} },
    ],
    dependencies: [
      { name: '@modelcontextprotocol/sdk', version: '^1.0.0', workspace: 'root' },
      { name: 'zod', version: '^3.0.0', workspace: 'root' },
    ],
  },

  variables: [
    {
      name: 'toolName',
      label: 'Tool Name',
      type: 'string',
      default: 'my_tool',
      description: 'Snake_case name for the tool',
      required: true,
    },
    {
      name: 'toolDescription',
      label: 'Tool Description',
      type: 'string',
      default: 'A custom MCP tool',
      description: 'Description shown to LLMs',
      required: true,
    },
  ],

  tags: ['mcp', 'tools', 'integration'],
  requiredAgents: ['architect', 'dev_backend'],
};
