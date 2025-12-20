/**
 * Subscription Billing Template
 *
 * Visual Layout:
 *                     [Initialize Billing]
 *                            │
 *                     [Architect Agent]
 *                            │
 *                     [Billing Schema]
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Plans API]  [Subscriptions]  [Invoices]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Stripe Integration]
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Pricing UI]  [Checkout]  [Portal]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Webhook Handler]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const SUBSCRIPTION_BILLING: WorkflowTemplateDefinition = {
  id: 'subscription-billing',
  name: 'Subscription Billing',
  description: 'Stripe-powered subscription billing with plans, checkout, and customer portal',
  category: 'saas',
  complexity: 'medium',
  platform: 'react',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Initialize Billing',
        nodeType: 'trigger',
        description: 'Set up billing module structure',
        config: { event: 'billing-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design billing data model and Stripe integration',
        config: { agentName: 'architect' },
      },
    },
    {
      id: 'db-billing',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Billing Schema',
        nodeType: 'database',
        description: 'Plans, subscriptions, invoices, payment methods',
        config: { tableName: 'Subscription' },
      },
    },
    {
      id: 'api-plans',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'Plans API',
        nodeType: 'api',
        description: 'List and manage subscription plans',
        config: { endpoint: 'plans' },
      },
    },
    {
      id: 'api-subscriptions',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Subscriptions API',
        nodeType: 'api',
        description: 'Create, update, cancel subscriptions',
        config: { endpoint: 'subscriptions' },
      },
    },
    {
      id: 'api-invoices',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'Invoices API',
        nodeType: 'api',
        description: 'Invoice history and downloads',
        config: { endpoint: 'invoices' },
      },
    },
    {
      id: 'action-stripe',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Stripe Integration',
        nodeType: 'action',
        description: 'Stripe SDK setup and configuration',
        config: { command: 'setup-stripe' },
      },
    },
    {
      id: 'ui-pricing',
      type: 'workflow',
      position: { x: 100, y: 500 },
      data: {
        label: 'Pricing Page',
        nodeType: 'ui',
        description: 'Plan comparison and selection',
        config: { component: 'PricingPage' },
      },
    },
    {
      id: 'ui-checkout',
      type: 'workflow',
      position: { x: 250, y: 500 },
      data: {
        label: 'Checkout Flow',
        nodeType: 'ui',
        description: 'Stripe Checkout or Elements integration',
        config: { component: 'CheckoutFlow' },
      },
    },
    {
      id: 'ui-portal',
      type: 'workflow',
      position: { x: 400, y: 500 },
      data: {
        label: 'Customer Portal',
        nodeType: 'ui',
        description: 'Manage subscription and payment methods',
        config: { component: 'CustomerPortal' },
      },
    },
    {
      id: 'api-webhooks',
      type: 'workflow',
      position: { x: 250, y: 600 },
      data: {
        label: 'Webhook Handler',
        nodeType: 'api',
        description: 'Handle Stripe webhook events',
        config: { endpoint: 'webhooks/stripe' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'db-billing', animated: true },
    { id: 'e3', source: 'db-billing', target: 'api-plans', animated: true },
    { id: 'e4', source: 'db-billing', target: 'api-subscriptions', animated: true },
    { id: 'e5', source: 'db-billing', target: 'api-invoices', animated: true },
    { id: 'e6', source: 'api-plans', target: 'action-stripe', animated: true },
    { id: 'e7', source: 'api-subscriptions', target: 'action-stripe', animated: true },
    { id: 'e8', source: 'api-invoices', target: 'action-stripe', animated: true },
    { id: 'e9', source: 'action-stripe', target: 'ui-pricing', animated: true },
    { id: 'e10', source: 'action-stripe', target: 'ui-checkout', animated: true },
    { id: 'e11', source: 'action-stripe', target: 'ui-portal', animated: true },
    { id: 'e12', source: 'ui-pricing', target: 'api-webhooks', animated: true },
    { id: 'e13', source: 'ui-checkout', target: 'api-webhooks', animated: true },
    { id: 'e14', source: 'ui-portal', target: 'api-webhooks', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'monorepo',
    stackProfile: getDefaultStackProfile('react'),
    fileSpecs: [
      { path: 'apps/api/src/routes/billing/plans.ts', template: 'api-route', variables: { routeName: 'Plans', endpoint: 'plans' } },
      { path: 'apps/api/src/routes/billing/subscriptions.ts', template: 'api-route', variables: { routeName: 'Subscriptions', endpoint: 'subscriptions' } },
      { path: 'apps/api/src/lib/stripe.ts', template: 'api-route', variables: { routeName: 'Stripe', endpoint: 'stripe' } },
    ],
    dependencies: [
      { name: 'stripe', version: '^14.0.0', workspace: 'apps/api' },
      { name: '@stripe/stripe-js', version: '^2.0.0', workspace: 'apps/web' },
      { name: '@stripe/react-stripe-js', version: '^2.0.0', workspace: 'apps/web' },
    ],
  },

  variables: [
    {
      name: 'stripeMode',
      label: 'Stripe Mode',
      type: 'select',
      default: 'test',
      options: [
        { label: 'Test Mode', value: 'test' },
        { label: 'Live Mode', value: 'live' },
      ],
      description: 'Stripe API mode',
    },
    {
      name: 'billingInterval',
      label: 'Billing Interval',
      type: 'select',
      default: 'monthly',
      options: [
        { label: 'Monthly Only', value: 'monthly' },
        { label: 'Annual Only', value: 'annual' },
        { label: 'Both', value: 'both' },
      ],
      description: 'Subscription billing intervals',
    },
  ],

  tags: ['billing', 'stripe', 'subscriptions', 'payments'],
  requiredAgents: ['architect', 'dev_backend', 'dev_frontend'],
};
