import type { Node, Edge } from '@xyflow/react';

export type WorkflowNodeType = 
  | 'trigger'
  | 'action'
  | 'condition'
  | 'database'
  | 'api'
  | 'ui'
  | 'agent'
  | 'notification';

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  nodeType: WorkflowNodeType;
  config?: Record<string, unknown>;
  icon?: string;
}

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  category: string;
  status: 'draft' | 'active' | 'paused';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: Record<string, unknown>;
}

export const NODE_TYPE_CONFIG: Record<WorkflowNodeType, { 
  color: string; 
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  trigger: { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', label: 'Trigger' },
  action: { color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300', label: 'Action' },
  condition: { color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300', label: 'Condition' },
  database: { color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-300', label: 'Database' },
  api: { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', label: 'API' },
  ui: { color: 'text-pink-700', bgColor: 'bg-pink-50', borderColor: 'border-pink-300', label: 'UI' },
  agent: { color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-300', label: 'Agent' },
  notification: { color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-300', label: 'Notification' },
};

export const WORKFLOW_TEMPLATES = {
  loginFlow: {
    name: 'Login Flow',
    description: 'User authentication workflow with DB, UI, and API touchpoints',
    category: 'auth',
  },
  onboardingFlow: {
    name: 'Onboarding Flow',
    description: 'New user onboarding with multi-step setup',
    category: 'user',
  },
  billingFlow: {
    name: 'Billing Flow',
    description: 'Payment processing and subscription management',
    category: 'billing',
  },
  agentWorkflow: {
    name: 'Agent Workflow',
    description: 'AI agent task execution with human oversight',
    category: 'agent',
  },
};
