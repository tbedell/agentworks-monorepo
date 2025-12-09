import type { WorkflowNode, WorkflowEdge } from './types';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export const LOGIN_FLOW_TEMPLATE: WorkflowTemplate = {
  id: 'login-flow',
  name: 'Login Flow',
  description: 'User authentication workflow with DB, UI, and API touchpoints',
  category: 'auth',
  nodes: [
    { id: 'trigger-1', type: 'workflow', position: { x: 250, y: 0 }, data: { label: 'User Submits Login', nodeType: 'trigger', description: 'User enters credentials and clicks login' } },
    { id: 'ui-1', type: 'workflow', position: { x: 250, y: 100 }, data: { label: 'Login Form', nodeType: 'ui', description: 'Email/password input form' } },
    { id: 'api-1', type: 'workflow', position: { x: 250, y: 200 }, data: { label: 'POST /api/auth/login', nodeType: 'api', description: 'Send credentials to auth endpoint' } },
    { id: 'db-1', type: 'workflow', position: { x: 250, y: 300 }, data: { label: 'Query User Table', nodeType: 'database', description: 'Find user by email, verify password hash' } },
    { id: 'condition-1', type: 'workflow', position: { x: 250, y: 400 }, data: { label: 'Valid Credentials?', nodeType: 'condition', description: 'Check if password matches' } },
    { id: 'action-1', type: 'workflow', position: { x: 100, y: 500 }, data: { label: 'Create Session', nodeType: 'action', description: 'Generate JWT token and session' } },
    { id: 'action-2', type: 'workflow', position: { x: 400, y: 500 }, data: { label: 'Return Error', nodeType: 'action', description: 'Return 401 unauthorized' } },
    { id: 'ui-2', type: 'workflow', position: { x: 100, y: 600 }, data: { label: 'Redirect to Dashboard', nodeType: 'ui', description: 'Navigate to main app' } },
    { id: 'notification-1', type: 'workflow', position: { x: 400, y: 600 }, data: { label: 'Show Error Toast', nodeType: 'notification', description: 'Display invalid credentials message' } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'ui-1', animated: true },
    { id: 'e2', source: 'ui-1', target: 'api-1', animated: true },
    { id: 'e3', source: 'api-1', target: 'db-1', animated: true },
    { id: 'e4', source: 'db-1', target: 'condition-1', animated: true },
    { id: 'e5', source: 'condition-1', target: 'action-1', label: 'Yes', animated: true },
    { id: 'e6', source: 'condition-1', target: 'action-2', label: 'No', animated: true },
    { id: 'e7', source: 'action-1', target: 'ui-2', animated: true },
    { id: 'e8', source: 'action-2', target: 'notification-1', animated: true },
  ],
};

export const ONBOARDING_FLOW_TEMPLATE: WorkflowTemplate = {
  id: 'onboarding-flow',
  name: 'Onboarding Flow',
  description: 'New user onboarding with multi-step setup wizard',
  category: 'user',
  nodes: [
    { id: 'trigger-1', type: 'workflow', position: { x: 250, y: 0 }, data: { label: 'New User Registered', nodeType: 'trigger', description: 'User completes registration' } },
    { id: 'db-1', type: 'workflow', position: { x: 250, y: 100 }, data: { label: 'Create User Record', nodeType: 'database', description: 'Insert new user into database' } },
    { id: 'notification-1', type: 'workflow', position: { x: 250, y: 200 }, data: { label: 'Send Welcome Email', nodeType: 'notification', description: 'Trigger welcome email via email service' } },
    { id: 'ui-1', type: 'workflow', position: { x: 250, y: 300 }, data: { label: 'Show Setup Wizard', nodeType: 'ui', description: 'Display onboarding wizard UI' } },
    { id: 'ui-2', type: 'workflow', position: { x: 100, y: 400 }, data: { label: 'Company Setup', nodeType: 'ui', description: 'Collect company/workspace details' } },
    { id: 'ui-3', type: 'workflow', position: { x: 250, y: 500 }, data: { label: 'Team Invites', nodeType: 'ui', description: 'Invite team members' } },
    { id: 'ui-4', type: 'workflow', position: { x: 400, y: 400 }, data: { label: 'Preferences', nodeType: 'ui', description: 'Set notification and display preferences' } },
    { id: 'db-2', type: 'workflow', position: { x: 250, y: 600 }, data: { label: 'Save Onboarding Data', nodeType: 'database', description: 'Persist all onboarding choices' } },
    { id: 'action-1', type: 'workflow', position: { x: 250, y: 700 }, data: { label: 'Mark Onboarding Complete', nodeType: 'action', description: 'Update user onboarding status' } },
    { id: 'ui-5', type: 'workflow', position: { x: 250, y: 800 }, data: { label: 'Redirect to Dashboard', nodeType: 'ui', description: 'Navigate to main application' } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'db-1', animated: true },
    { id: 'e2', source: 'db-1', target: 'notification-1', animated: true },
    { id: 'e3', source: 'notification-1', target: 'ui-1', animated: true },
    { id: 'e4', source: 'ui-1', target: 'ui-2', animated: true },
    { id: 'e5', source: 'ui-1', target: 'ui-4', animated: true },
    { id: 'e6', source: 'ui-2', target: 'ui-3', animated: true },
    { id: 'e7', source: 'ui-3', target: 'db-2', animated: true },
    { id: 'e8', source: 'ui-4', target: 'db-2', animated: true },
    { id: 'e9', source: 'db-2', target: 'action-1', animated: true },
    { id: 'e10', source: 'action-1', target: 'ui-5', animated: true },
  ],
};

export const BILLING_FLOW_TEMPLATE: WorkflowTemplate = {
  id: 'billing-flow',
  name: 'Billing Flow',
  description: 'Payment processing and subscription management',
  category: 'billing',
  nodes: [
    { id: 'trigger-1', type: 'workflow', position: { x: 250, y: 0 }, data: { label: 'User Initiates Payment', nodeType: 'trigger', description: 'User clicks subscribe or pay' } },
    { id: 'ui-1', type: 'workflow', position: { x: 250, y: 100 }, data: { label: 'Payment Form', nodeType: 'ui', description: 'Stripe Elements payment form' } },
    { id: 'api-1', type: 'workflow', position: { x: 250, y: 200 }, data: { label: 'Create Payment Intent', nodeType: 'api', description: 'POST to Stripe API' } },
    { id: 'condition-1', type: 'workflow', position: { x: 250, y: 300 }, data: { label: 'Payment Successful?', nodeType: 'condition', description: 'Check Stripe response' } },
    { id: 'db-1', type: 'workflow', position: { x: 100, y: 400 }, data: { label: 'Create Subscription', nodeType: 'database', description: 'Store subscription in database' } },
    { id: 'action-1', type: 'workflow', position: { x: 400, y: 400 }, data: { label: 'Log Failed Payment', nodeType: 'action', description: 'Record failure for retry' } },
    { id: 'api-2', type: 'workflow', position: { x: 100, y: 500 }, data: { label: 'Provision Resources', nodeType: 'api', description: 'Enable premium features' } },
    { id: 'notification-1', type: 'workflow', position: { x: 100, y: 600 }, data: { label: 'Send Receipt Email', nodeType: 'notification', description: 'Send payment confirmation' } },
    { id: 'notification-2', type: 'workflow', position: { x: 400, y: 500 }, data: { label: 'Show Error Message', nodeType: 'notification', description: 'Display payment failed toast' } },
    { id: 'ui-2', type: 'workflow', position: { x: 100, y: 700 }, data: { label: 'Show Success Page', nodeType: 'ui', description: 'Display thank you page' } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'ui-1', animated: true },
    { id: 'e2', source: 'ui-1', target: 'api-1', animated: true },
    { id: 'e3', source: 'api-1', target: 'condition-1', animated: true },
    { id: 'e4', source: 'condition-1', target: 'db-1', label: 'Yes', animated: true },
    { id: 'e5', source: 'condition-1', target: 'action-1', label: 'No', animated: true },
    { id: 'e6', source: 'db-1', target: 'api-2', animated: true },
    { id: 'e7', source: 'api-2', target: 'notification-1', animated: true },
    { id: 'e8', source: 'action-1', target: 'notification-2', animated: true },
    { id: 'e9', source: 'notification-1', target: 'ui-2', animated: true },
  ],
};

export const AGENT_WORKFLOW_TEMPLATE: WorkflowTemplate = {
  id: 'agent-workflow',
  name: 'Agent Task Workflow',
  description: 'AI agent task execution with human oversight',
  category: 'agent',
  nodes: [
    { id: 'trigger-1', type: 'workflow', position: { x: 250, y: 0 }, data: { label: 'Card Assigned to Agent', nodeType: 'trigger', description: 'Card enters agent lane' } },
    { id: 'agent-1', type: 'workflow', position: { x: 250, y: 100 }, data: { label: 'Load Agent Config', nodeType: 'agent', description: 'Fetch agent system prompt and settings' } },
    { id: 'db-1', type: 'workflow', position: { x: 250, y: 200 }, data: { label: 'Get Card Context', nodeType: 'database', description: 'Load card data and related docs' } },
    { id: 'agent-2', type: 'workflow', position: { x: 250, y: 300 }, data: { label: 'Execute LLM Call', nodeType: 'agent', description: 'Send prompt to LLM provider' } },
    { id: 'condition-1', type: 'workflow', position: { x: 250, y: 400 }, data: { label: 'Execution Success?', nodeType: 'condition', description: 'Check agent response quality' } },
    { id: 'action-1', type: 'workflow', position: { x: 100, y: 500 }, data: { label: 'Apply Changes', nodeType: 'action', description: 'Update card with agent output' } },
    { id: 'action-2', type: 'workflow', position: { x: 400, y: 500 }, data: { label: 'Escalate to Human', nodeType: 'action', description: 'Flag for human review' } },
    { id: 'db-2', type: 'workflow', position: { x: 100, y: 600 }, data: { label: 'Log Usage', nodeType: 'database', description: 'Record tokens and cost' } },
    { id: 'notification-1', type: 'workflow', position: { x: 400, y: 600 }, data: { label: 'Notify Team', nodeType: 'notification', description: 'Send escalation alert' } },
    { id: 'action-3', type: 'workflow', position: { x: 100, y: 700 }, data: { label: 'Move to Next Lane', nodeType: 'action', description: 'Advance card in workflow' } },
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'agent-1', animated: true },
    { id: 'e2', source: 'agent-1', target: 'db-1', animated: true },
    { id: 'e3', source: 'db-1', target: 'agent-2', animated: true },
    { id: 'e4', source: 'agent-2', target: 'condition-1', animated: true },
    { id: 'e5', source: 'condition-1', target: 'action-1', label: 'Yes', animated: true },
    { id: 'e6', source: 'condition-1', target: 'action-2', label: 'No', animated: true },
    { id: 'e7', source: 'action-1', target: 'db-2', animated: true },
    { id: 'e8', source: 'action-2', target: 'notification-1', animated: true },
    { id: 'e9', source: 'db-2', target: 'action-3', animated: true },
  ],
};

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  LOGIN_FLOW_TEMPLATE,
  ONBOARDING_FLOW_TEMPLATE,
  BILLING_FLOW_TEMPLATE,
  AGENT_WORKFLOW_TEMPLATE,
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}
