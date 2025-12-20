/**
 * Agent Orchestration Template
 *
 * Visual Layout:
 *                     [Orchestration Init]
 *                            │
 *                     [Architect Agent]
 *                            │
 *                     [Agent Registry]
 *                            │
 *        ┌────────────┬──────┼──────┬────────────┐
 *        │            │      │      │            │
 *   [Agent 1]    [Agent 2] [Agent 3] [Agent 4]  [Router]
 *        │            │      │      │            │
 *        └────────────┴──────┼──────┴────────────┘
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Supervisor]  [Memory]    [Tools]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Execution Engine]
 *                            │
 *                     [Result Aggregation]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const AGENT_ORCHESTRATION: WorkflowTemplateDefinition = {
  id: 'agent-orchestration',
  name: 'Agent Orchestration',
  description: 'Multi-agent system with routing, supervision, and tool execution',
  category: 'ai',
  complexity: 'complex',
  platform: 'node',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 300, y: 0 },
      data: {
        label: 'Orchestration Init',
        nodeType: 'trigger',
        description: 'Initialize agent orchestration system',
        config: { event: 'orchestration-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 300, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design agent system architecture',
        config: { agentName: 'architect' },
      },
    },
    {
      id: 'action-registry',
      type: 'workflow',
      position: { x: 300, y: 200 },
      data: {
        label: 'Agent Registry',
        nodeType: 'action',
        description: 'Register and configure agents',
        config: { command: 'setup-registry' },
      },
    },
    {
      id: 'agent-1',
      type: 'workflow',
      position: { x: 75, y: 300 },
      data: {
        label: 'Research Agent',
        nodeType: 'agent',
        description: 'Research and analysis tasks',
        config: { agentName: 'research' },
      },
    },
    {
      id: 'agent-2',
      type: 'workflow',
      position: { x: 187, y: 300 },
      data: {
        label: 'Planning Agent',
        nodeType: 'agent',
        description: 'Task planning and breakdown',
        config: { agentName: 'planner' },
      },
    },
    {
      id: 'agent-3',
      type: 'workflow',
      position: { x: 300, y: 300 },
      data: {
        label: 'Execution Agent',
        nodeType: 'agent',
        description: 'Task execution with tools',
        config: { agentName: 'executor' },
      },
    },
    {
      id: 'agent-4',
      type: 'workflow',
      position: { x: 412, y: 300 },
      data: {
        label: 'Review Agent',
        nodeType: 'agent',
        description: 'Quality review and validation',
        config: { agentName: 'reviewer' },
      },
    },
    {
      id: 'action-router',
      type: 'workflow',
      position: { x: 525, y: 300 },
      data: {
        label: 'Task Router',
        nodeType: 'action',
        description: 'Route tasks to appropriate agents',
        config: { command: 'setup-router' },
      },
    },
    {
      id: 'action-supervisor',
      type: 'workflow',
      position: { x: 150, y: 400 },
      data: {
        label: 'Supervisor',
        nodeType: 'action',
        description: 'Monitor and coordinate agents',
        config: { command: 'setup-supervisor' },
      },
    },
    {
      id: 'action-memory',
      type: 'workflow',
      position: { x: 300, y: 400 },
      data: {
        label: 'Shared Memory',
        nodeType: 'action',
        description: 'Inter-agent memory and state',
        config: { command: 'setup-memory' },
      },
    },
    {
      id: 'action-tools',
      type: 'workflow',
      position: { x: 450, y: 400 },
      data: {
        label: 'Tool Library',
        nodeType: 'action',
        description: 'Shared tools and capabilities',
        config: { command: 'setup-tools' },
      },
    },
    {
      id: 'action-engine',
      type: 'workflow',
      position: { x: 300, y: 500 },
      data: {
        label: 'Execution Engine',
        nodeType: 'action',
        description: 'Run agent workflows',
        config: { command: 'run-engine' },
      },
    },
    {
      id: 'action-aggregate',
      type: 'workflow',
      position: { x: 300, y: 600 },
      data: {
        label: 'Result Aggregation',
        nodeType: 'action',
        description: 'Combine agent outputs',
        config: { command: 'aggregate-results' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'action-registry', animated: true },
    { id: 'e3', source: 'action-registry', target: 'agent-1', animated: true },
    { id: 'e4', source: 'action-registry', target: 'agent-2', animated: true },
    { id: 'e5', source: 'action-registry', target: 'agent-3', animated: true },
    { id: 'e6', source: 'action-registry', target: 'agent-4', animated: true },
    { id: 'e7', source: 'action-registry', target: 'action-router', animated: true },
    { id: 'e8', source: 'agent-1', target: 'action-supervisor', animated: true },
    { id: 'e9', source: 'agent-2', target: 'action-supervisor', animated: true },
    { id: 'e10', source: 'agent-3', target: 'action-memory', animated: true },
    { id: 'e11', source: 'agent-4', target: 'action-tools', animated: true },
    { id: 'e12', source: 'action-router', target: 'action-tools', animated: true },
    { id: 'e13', source: 'action-supervisor', target: 'action-engine', animated: true },
    { id: 'e14', source: 'action-memory', target: 'action-engine', animated: true },
    { id: 'e15', source: 'action-tools', target: 'action-engine', animated: true },
    { id: 'e16', source: 'action-engine', target: 'action-aggregate', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'monorepo',
    stackProfile: getDefaultStackProfile('node'),
    fileSpecs: [
      { path: 'apps/orchestrator/src/index.ts', template: 'api-route', variables: { routeName: 'Orchestrator', endpoint: 'orchestrator' } },
      { path: 'apps/orchestrator/src/agents/registry.ts', template: 'agent-config', variables: {} },
      { path: 'apps/orchestrator/src/lib/executor.ts', template: 'agent-config', variables: {} },
    ],
    dependencies: [
      { name: '@anthropic-ai/sdk', version: '^0.20.0', workspace: 'apps/orchestrator' },
      { name: 'openai', version: '^4.0.0', workspace: 'apps/orchestrator' },
      { name: 'zod', version: '^3.0.0', workspace: 'apps/orchestrator' },
    ],
  },

  variables: [
    {
      name: 'orchestrationPattern',
      label: 'Orchestration Pattern',
      type: 'select',
      default: 'supervisor',
      options: [
        { label: 'Supervisor', value: 'supervisor' },
        { label: 'Hierarchical', value: 'hierarchical' },
        { label: 'Swarm', value: 'swarm' },
      ],
      description: 'How agents are coordinated',
    },
    {
      name: 'agentCount',
      label: 'Number of Agents',
      type: 'number',
      default: 4,
      description: 'Number of specialized agents',
    },
  ],

  tags: ['ai', 'agents', 'orchestration', 'multi-agent'],
  requiredAgents: ['architect', 'dev_backend'],
};
