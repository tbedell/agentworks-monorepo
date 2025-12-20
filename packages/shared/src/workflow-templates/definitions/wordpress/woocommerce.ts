/**
 * WooCommerce Store Template
 *
 * Visual Layout:
 *                     [Store Init]
 *                            │
 *                     [Architect Agent]
 *                            │
 *                     [WooCommerce Setup]
 *                            │
 *        ┌────────────┬──────┼──────┬────────────┐
 *        │            │      │      │            │
 *   [Products]    [Cart]  [Checkout] [Payments] [Shipping]
 *        │            │      │      │            │
 *        └────────────┴──────┼──────┴────────────┘
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Shop Theme] [Custom Fields] [Emails]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Import Products]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';

export const WOOCOMMERCE: WorkflowTemplateDefinition = {
  id: 'woocommerce',
  name: 'WooCommerce Store',
  description: 'Complete WooCommerce store with custom theme, payments, and product import',
  category: 'wordpress',
  complexity: 'complex',
  platform: 'wordpress',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 300, y: 0 },
      data: {
        label: 'Store Init',
        nodeType: 'trigger',
        description: 'Initialize WooCommerce store',
        config: { event: 'store-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 300, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design store architecture',
        config: { agentName: 'cms_wordpress' },
      },
    },
    {
      id: 'action-woo',
      type: 'workflow',
      position: { x: 300, y: 200 },
      data: {
        label: 'WooCommerce Setup',
        nodeType: 'action',
        description: 'Install and configure WooCommerce',
        config: { command: 'setup-woocommerce' },
      },
    },
    {
      id: 'action-products',
      type: 'workflow',
      position: { x: 75, y: 300 },
      data: {
        label: 'Products',
        nodeType: 'action',
        description: 'Product types and attributes',
        config: { command: 'setup-products' },
      },
    },
    {
      id: 'action-cart',
      type: 'workflow',
      position: { x: 187, y: 300 },
      data: {
        label: 'Cart',
        nodeType: 'action',
        description: 'Cart customizations',
        config: { command: 'setup-cart' },
      },
    },
    {
      id: 'action-checkout',
      type: 'workflow',
      position: { x: 300, y: 300 },
      data: {
        label: 'Checkout',
        nodeType: 'action',
        description: 'Checkout flow customization',
        config: { command: 'setup-checkout' },
      },
    },
    {
      id: 'action-payments',
      type: 'workflow',
      position: { x: 412, y: 300 },
      data: {
        label: 'Payments',
        nodeType: 'action',
        description: 'Payment gateway configuration',
        config: { command: 'setup-payments' },
      },
    },
    {
      id: 'action-shipping',
      type: 'workflow',
      position: { x: 525, y: 300 },
      data: {
        label: 'Shipping',
        nodeType: 'action',
        description: 'Shipping zones and methods',
        config: { command: 'setup-shipping' },
      },
    },
    {
      id: 'ui-theme',
      type: 'workflow',
      position: { x: 150, y: 400 },
      data: {
        label: 'Shop Theme',
        nodeType: 'ui',
        description: 'Custom shop page templates',
        config: { component: 'ShopTheme' },
      },
    },
    {
      id: 'action-fields',
      type: 'workflow',
      position: { x: 300, y: 400 },
      data: {
        label: 'Custom Fields',
        nodeType: 'action',
        description: 'Product custom fields and meta',
        config: { command: 'setup-custom-fields' },
      },
    },
    {
      id: 'action-emails',
      type: 'workflow',
      position: { x: 450, y: 400 },
      data: {
        label: 'Email Templates',
        nodeType: 'action',
        description: 'Custom transactional emails',
        config: { command: 'setup-emails' },
      },
    },
    {
      id: 'action-import',
      type: 'workflow',
      position: { x: 300, y: 500 },
      data: {
        label: 'Import Products',
        nodeType: 'action',
        description: 'Bulk product import from CSV',
        config: { command: 'import-products' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'action-woo', animated: true },
    { id: 'e3', source: 'action-woo', target: 'action-products', animated: true },
    { id: 'e4', source: 'action-woo', target: 'action-cart', animated: true },
    { id: 'e5', source: 'action-woo', target: 'action-checkout', animated: true },
    { id: 'e6', source: 'action-woo', target: 'action-payments', animated: true },
    { id: 'e7', source: 'action-woo', target: 'action-shipping', animated: true },
    { id: 'e8', source: 'action-products', target: 'ui-theme', animated: true },
    { id: 'e9', source: 'action-cart', target: 'ui-theme', animated: true },
    { id: 'e10', source: 'action-checkout', target: 'action-fields', animated: true },
    { id: 'e11', source: 'action-payments', target: 'action-emails', animated: true },
    { id: 'e12', source: 'action-shipping', target: 'action-emails', animated: true },
    { id: 'e13', source: 'ui-theme', target: 'action-import', animated: true },
    { id: 'e14', source: 'action-fields', target: 'action-import', animated: true },
    { id: 'e15', source: 'action-emails', target: 'action-import', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'theme',
    stackProfile: {
      frontend: { framework: 'wordpress', styling: 'sass' },
      backend: { runtime: 'php', framework: 'wordpress', database: 'mysql' },
      infrastructure: { containerization: 'docker', hosting: 'self-hosted' },
    },
    fileSpecs: [
      { path: 'woocommerce/archive-product.php', template: 'wp-functions', variables: {} },
      { path: 'woocommerce/single-product.php', template: 'wp-functions', variables: {} },
      { path: 'includes/class-woocommerce-customizations.php', template: 'wp-functions', variables: {} },
    ],
    dependencies: [],
  },

  variables: [
    {
      name: 'paymentGateways',
      label: 'Payment Gateways',
      type: 'select',
      default: 'stripe',
      options: [
        { label: 'Stripe', value: 'stripe' },
        { label: 'PayPal', value: 'paypal' },
        { label: 'Both', value: 'both' },
      ],
      description: 'Payment processors to configure',
    },
    {
      name: 'productTypes',
      label: 'Product Types',
      type: 'select',
      default: 'simple',
      options: [
        { label: 'Simple Products', value: 'simple' },
        { label: 'Variable Products', value: 'variable' },
        { label: 'Subscriptions', value: 'subscriptions' },
      ],
      description: 'Types of products to support',
    },
  ],

  tags: ['wordpress', 'woocommerce', 'ecommerce', 'store'],
  requiredAgents: ['architect', 'dev_backend', 'dev_frontend'],
};
